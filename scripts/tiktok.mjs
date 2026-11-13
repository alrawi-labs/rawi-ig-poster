import fs from "node:fs";
import path from "node:path";

const TT_API = "https://open.tiktokapis.com/v2";
const TOKEN_FILE = "state/tiktok_token.json";

export const TT_ENABLED = process.env.TIKTOK_ENABLED === "true";
// Audit onayına kadar SELF_ONLY kalmalı. Onaydan sonra: PUBLIC_TO_EVERYONE
const PRIVACY = process.env.TIKTOK_PRIVACY || "SELF_ONLY";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readJson = (f, fb) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : fb);
const writeJson = (f, d) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(d, null, 2) + "\n");
};

export const ttSupports = (format) => ["reels", "carousel", "feed"].includes(format);

// ---------- Token (çalışma başına bir kez yenilenir) ----------
let cachedToken = null;
async function getAccessToken() {
  if (cachedToken) return cachedToken;
  const saved = readJson(TOKEN_FILE, {});
  const refreshToken = saved.refresh_token || process.env.TIKTOK_REFRESH_TOKEN;
  if (!refreshToken) throw new Error("TIKTOK_REFRESH_TOKEN yok");

  const res = await fetch(`${TT_API}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY || "",
      client_secret: process.env.TIKTOK_CLIENT_SECRET || "",
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const j = await res.json().catch(() => ({}));
  if (!j.access_token) throw new Error(`TikTok token: ${JSON.stringify(j)}`);

  // Refresh token değişmiş olabilir: yenisini hemen sakla
  writeJson(TOKEN_FILE, {
    refresh_token: j.refresh_token || refreshToken,
    updated_at: new Date().toISOString(),
  });
  cachedToken = j.access_token;
  return cachedToken;
}

// ---------- API ----------
async function tt(endpoint, body) {
  const token = await getAccessToken();
  const res = await fetch(`${TT_API}${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || (j.error?.code && j.error.code !== "ok")) {
    throw new Error(`TikTok ${endpoint}: ${JSON.stringify(j.error ?? j)}`);
  }
  return j.data;
}

async function waitPublished(publishId, { tries = 30, delayMs = 10000 } = {}) {
  for (let i = 0; i < tries; i++) {
    const d = await tt("/post/publish/status/fetch/", { publish_id: publishId });
    if (d.status === "PUBLISH_COMPLETE") return { ...d, publish_id: publishId };
    if (d.status === "FAILED") throw new Error(`TikTok başarısız: ${d.fail_reason}`);
    await sleep(delayMs);
  }
  throw new Error(`TikTok zaman aşımı (publish_id: ${publishId})`);
}

// entry: { format, urls, caption }
export async function ttPost({ format, urls, caption }) {
  if (!ttSupports(format)) throw new Error(`TikTok'ta "${format}" formatı yok`);

  if (format === "reels") {
    const d = await tt("/post/publish/video/init/", {
      post_info: { title: caption.slice(0, 2200), privacy_level: PRIVACY },
      source_info: { source: "PULL_FROM_URL", video_url: urls[0] },
    });
    return waitPublished(d.publish_id, { tries: 60, delayMs: 10000 });
  }

  // carousel / feed -> fotoğraf modu (sadece JPEG / WEBP kabul edilir, PNG olmaz)
  const bad = urls.find((u) => !/\.(jpe?g|webp)(\?|$)/i.test(u));
  if (bad) console.warn(`  ! TikTok sadece JPEG/WEBP kabul eder, kontrol et: ${bad}`);

  const firstLine = caption.split("\n")[0] || "";
  const d = await tt("/post/publish/content/init/", {
    post_info: {
      title: firstLine.slice(0, 90),
      description: caption.slice(0, 4000),
      privacy_level: PRIVACY,
    },
    source_info: { source: "PULL_FROM_URL", photo_cover_index: 0, photo_images: urls.slice(0, 35) },
    post_mode: "DIRECT_POST",
    media_type: "PHOTO",
  });
  return waitPublished(d.publish_id);
}