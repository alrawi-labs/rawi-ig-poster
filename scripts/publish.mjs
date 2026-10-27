import fs from "node:fs";
import path from "node:path";
import { DateTime } from "luxon";
import { ANCHOR, FORMAT, PLAN } from "./plan.mjs";

// ================= AYARLAR =================
const TZ = "Europe/Istanbul";
const API = `https://graph.facebook.com/${process.env.GRAPH_API_VERSION || "v23.0"}`;
const IG_USER_ID = process.env.IG_USER_ID;
const TOKEN = process.env.IG_ACCESS_TOKEN;
const DRY_RUN = process.env.DRY_RUN === "true";
const TEST_NOW = process.env.TEST_NOW || ""; // örn. "2026-10-28T15:00" (İstanbul saati)
const LOOKBACK_MIN = Number(process.env.LOOKBACK_MIN || 120); // GitHub cron gecikmesine tolerans
const CONTENT_DIR = "content";
const LOG_FILE = "state/posted_log.json";

// Family -> JSON'daki "id"
const ID_OF = {
  translation_test_question: "translation_test",
  translation_test_answer: "translation_test",
};
// Family -> durum akışı (varsayılan: pending -> posted)
const FLOW = {
  translation_test_question: { pick: "pending", done: "question_posted" },
  translation_test_answer: { pick: "question_posted", done: "posted" },
};
const DEFAULT_FLOW = { pick: "pending", done: "posted" };

if (!DRY_RUN && (!IG_USER_ID || !TOKEN)) {
  throw new Error("IG_USER_ID ve IG_ACCESS_TOKEN secret'ları tanımlı olmalı");
}

// ================= YARDIMCILAR =================
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readJson = (f, fallback) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : fallback);
const writeJson = (f, data) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(data, null, 2) + "\n");
};

// ================= PLAN =================
const FAMILIES = Object.keys(FORMAT);
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function parseCell(cell, week, dayIdx) {
  const where = `week ${week}, ${DAY_NAMES[dayIdx]}`;
  const items = Array.isArray(cell) ? cell : String(cell ?? "").split(",");
  return items
    .map((x) => String(x).trim())
    .filter(Boolean)
    .map((item) => {
      const m = item.match(/^([A-Za-z0-9_]+)\s+(\d{1,2}):(\d{2})$/);
      if (!m) throw new Error(`Plan hatası (${where}): "${item}" -> "family HH:MM" olmalı`);
      const [, family, h, min] = m;
      if (!FAMILIES.includes(family)) throw new Error(`Plan hatası (${where}): bilinmeyen family "${family}"`);
      if (+h > 23 || +min > 59) throw new Error(`Plan hatası (${where}): geçersiz saat "${h}:${min}"`);
      return { family, minutes: +h * 60 + +min, time: `${String(h).padStart(2, "0")}:${min}` };
    });
}

// Tüm planı her çalışmada doğrula (yazım hatası hemen görünsün)
const parsed = PLAN.map((row, w) => {
  if (!Array.isArray(row) || row.length !== 7) throw new Error(`Plan hatası: hafta ${w + 1} için 7 gün olmalı`);
  return row.map((cell, d) => parseCell(cell, w + 1, d));
});

const now = TEST_NOW ? DateTime.fromISO(TEST_NOW, { zone: TZ }) : DateTime.now().setZone(TZ);
if (!now.isValid) throw new Error(`Geçersiz TEST_NOW: ${TEST_NOW}`);
const anchor = DateTime.fromISO(ANCHOR, { zone: TZ }).startOf("day");
if (anchor.weekday !== 1) throw new Error(`ANCHOR (${ANCHOR}) Pazartesi olmalı`);

const daysSince = Math.round(now.startOf("day").diff(anchor, "days").days);
if (daysSince < 0) throw new Error(`ANCHOR (${ANCHOR}) gelecekte`);
const week = Math.floor(daysSince / 7) % parsed.length;
const dayIdx = now.weekday - 1;

// Saati gelmiş, LOOKBACK_MIN içinde ve daha önce paylaşılmamış olanlar
const log = readJson(LOG_FILE, {});
const due = parsed[week][dayIdx]
  .map((p) => ({ ...p, plannedAt: now.startOf("day").plus({ minutes: p.minutes }) }))
  .filter((p) => p.plannedAt <= now && now.diff(p.plannedAt, "minutes").minutes <= LOOKBACK_MIN)
  .map((p) => ({ ...p, key: `${now.toISODate()}|${p.family}|${p.time}` }))
  .filter((p) => !log[p.key])
  .sort((a, b) => a.minutes - b.minutes);

console.log(
  `[${now.toFormat("yyyy-LL-dd HH:mm")} ${TZ}] hafta ${week + 1}, ${DAY_NAMES[dayIdx]} -> ${due.length} paylaşım bekliyor` +
    (DRY_RUN ? " (DRY RUN)" : ""),
);
if (due.length === 0) process.exit(0);

// ================= İÇERİK =================
function loadContent() {
  if (!fs.existsSync(CONTENT_DIR)) throw new Error(`"${CONTENT_DIR}/" klasörü yok`);
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const file = path.join(CONTENT_DIR, f);
      return { file, items: JSON.parse(fs.readFileSync(file, "utf8")) };
    });
}

function findItem(files, id, state) {
  for (const f of files) {
    // "repeat": true olan öğe tükenmez: state ne olursa olsun her seferinde yeniden seçilir
    const item = f.items.find((x) => x.id === id && (x.repeat === true || x.state === state));
    if (item) return { ...f, item };
  }
  return null;
}

// ================= INSTAGRAM GRAPH API =================
async function graph(method, endpoint, params = {}) {
  const body = new URLSearchParams({ ...params, access_token: TOKEN });
  const res =
    method === "GET"
      ? await fetch(`${API}/${endpoint}?${body}`)
      : await fetch(`${API}/${endpoint}`, { method, body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error(`Graph ${endpoint}: ${JSON.stringify(json.error ?? json)}`);
  return json;
}

async function waitFinished(containerId, { tries = 30, delayMs = 5000 } = {}) {
  for (let i = 0; i < tries; i++) {
    const r = await graph("GET", containerId, { fields: "status_code,status" });
    if (r.status_code === "FINISHED") return;
    if (r.status_code === "ERROR" || r.status_code === "EXPIRED") {
      throw new Error(`Container ${containerId} ${r.status_code}: ${r.status ?? ""}`);
    }
    await sleep(delayMs);
  }
  throw new Error(`Container ${containerId} zaman aşımı`);
}

async function publishContainer(creationId) {
  let last;
  for (let i = 0; i < 3; i++) {
    try {
      return await graph("POST", `${IG_USER_ID}/media_publish`, { creation_id: creationId });
    } catch (e) {
      last = e;
      await sleep(5000);
    }
  }
  throw last;
}

async function postCarousel(urls, caption) {
  if (urls.length < 2 || urls.length > 10) throw new Error(`Carousel 2-10 görsel olmalı, gelen: ${urls.length}`);
  const children = [];
  for (const url of urls) {
    const c = await graph("POST", `${IG_USER_ID}/media`, { image_url: url, is_carousel_item: "true" });
    await waitFinished(c.id, { tries: 12, delayMs: 3000 });
    children.push(c.id);
  }
  const parent = await graph("POST", `${IG_USER_ID}/media`, {
    media_type: "CAROUSEL",
    children: children.join(","),
    caption,
  });
  await waitFinished(parent.id);
  return publishContainer(parent.id);
}

async function postFeed(urls, caption) {
  const c = await graph("POST", `${IG_USER_ID}/media`, { image_url: urls[0], caption });
  await waitFinished(c.id);
  return publishContainer(c.id);
}

async function postStory(urls) {
  const c = await graph("POST", `${IG_USER_ID}/media`, { image_url: urls[0], media_type: "STORIES" });
  await waitFinished(c.id);
  return publishContainer(c.id);
}

async function postReel(urls, caption) {
  const c = await graph("POST", `${IG_USER_ID}/media`, {
    media_type: "REELS",
    video_url: urls[0],
    caption,
    share_to_feed: "true",
  });
  await waitFinished(c.id, { tries: 60, delayMs: 10000 }); // video işleme uzun sürebilir
  return publishContainer(c.id);
}

// ================= ANA AKIŞ =================
const files = loadContent();
let failed = false;

for (const d of due) {
  try {
    const format = FORMAT[d.family];
    const flow = FLOW[d.family] ?? DEFAULT_FLOW;
    const id = ID_OF[d.family] ?? d.family;

    const hit = findItem(files, id, flow.pick);
    if (!hit) throw new Error(`"${id}" için state="${flow.pick}" olan içerik kalmadı`);
    const { item } = hit;

    if (item.format && item.format !== format) {
      throw new Error(`"${id}" içeriği format="${item.format}" ama plan "${format}" bekliyor`);
    }

    const isAnswer = d.family === "translation_test_answer";
    const urls = isAnswer ? item.answerUrls : item.urls;
    const caption = (isAnswer ? item.answerCaption : item.caption) ?? "";
    if (!Array.isArray(urls) || urls.length === 0) throw new Error(`"${id}" için görsel/video URL'si yok`);
    if (caption.length > 2200) throw new Error(`Caption ${caption.length} karakter, Instagram sınırı 2200`);

    console.log(`→ ${d.time} ${d.family} (${format}, ${urls.length} dosya) [${flow.pick} -> ${flow.done}]`);
    if (DRY_RUN) continue;

    let result;
    if (format === "carousel" && urls.length === 1) {
      // Instagram carousel en az 2 görsel ister; tek görsel varsa normal feed postu olarak at
      console.log("  ! carousel öğesinde tek görsel var, feed postu olarak paylaşılıyor");
      result = await postFeed(urls, caption);
    } else if (format === "carousel") result = await postCarousel(urls, caption);
    else if (format === "feed") result = await postFeed(urls, caption);
    else if (format === "story") result = await postStory(urls);
    else if (format === "reels") result = await postReel(urls, caption);
    else throw new Error(`Bilinmeyen format: ${format}`);

    // Başarılı: durumu ve logu hemen diske yaz
    if (item.repeat === true) {
      // Tekrar eden öğe: state değişmez, içerik dosyasına yazılmaz (gereksiz commit olmasın)
      console.log("  (repeat öğe: state değiştirilmedi)");
    } else {
      item.state = flow.done;
      item[`${flow.done}_at`] = now.toISO();
      item[`${flow.done}_media_id`] = result.id;
      writeJson(hit.file, hit.items);
    }
    log[d.key] = { media_id: result.id, at: now.toISO() };
    console.log(`  ✓ paylaşıldı: ${result.id}`);

    await sleep(5000);
  } catch (err) {
    failed = true;
    console.error(`  ✗ ${d.family} ${d.time}: ${err.message}`);
  }
}

// Logu 14 günden eski kayıtlardan temizle
if (!DRY_RUN) {
  const limit = now.minus({ days: 14 }).toISODate();
  for (const k of Object.keys(log)) if (k.split("|")[0] < limit) delete log[k];
  writeJson(LOG_FILE, log);
}

process.exit(failed ? 1 : 0);
