// n8n "Plan of Day" düğümündeki sabitlerin aynısı. Değiştirirsen sadece burada değiştir.
// Plan anahtarları (family adları) JSON'daki "id" alanlarıyla eşleşir
// (tek istisna: translation_test_question / translation_test_answer -> JSON'da "translation_test").

export const ANCHOR = "2026-09-28"; // Döngünün 1. haftasının PAZARTESİ günü

// Family -> paylaşım formatı: carousel | feed | story | reels
export const FORMAT = {
  word_of_day: "carousel",
  gramar_of_day: "carousel",
  words_test: "carousel",
  colloquial_usage: "carousel",
  beautiful_sentence: "carousel",
  translation_test_question: "carousel",
  translation_test_answer: "feed",
  reading_comprehension: "carousel",
  difference_tow_words: "carousel",
  one_word_many_uses: "carousel",
  tips: "carousel",
  popular_proverbs: "carousel",
  five_word: "carousel",
  quick_test: "carousel",
  situation: "carousel",

  colloquial_usage_cover_story: "story",
  five_word_story: "story",
  reading_comprehension_story: "story",
  stories_sentence_of_day: "story",
  stories_clock: "story",
  stories_test_your_turkish: "story",
  stories_test_your_understanding: "story",
  stories_exam_of_day: "story",

  conversation: "reels", // content/conversation.json -> "id": "conversation"
  shadow: "reels",       // content/shadow.json       -> "id": "shadow"
};

// Her hafta bir satır; sütunlar: Pzt Sal Çar Per Cum Cmt Paz. Hücre: "family HH:MM"
// Reels dağılımı (her hafta): conversation Pzt + Çar + Cmt, shadow Sal + Cum
export const PLAN = [
  [ /* Week 1 */
    ["word_of_day 08:00", "colloquial_usage 20:00", "colloquial_usage_cover_story 20:30", "stories_clock 10:00", "stories_test_your_turkish 18:00", "stories_sentence_of_day 13:00", "conversation 19:00"],
    ["word_of_day 10:00", "stories_clock 12:00", "stories_test_your_understanding 17:00", "shadow 19:00"],
    ["word_of_day 12:00", "translation_test_question 15:00", "translation_test_answer 16:00", "stories_test_your_turkish 21:00", "stories_sentence_of_day 09:00", "conversation 19:00"],
    ["word_of_day 14:00", "quick_test 21:00", "stories_clock 09:00", "stories_sentence_of_day 17:00", "stories_exam_of_day 22:00"],
    ["reading_comprehension 13:00", "reading_comprehension_story 13:30", "stories_sentence_of_day 18:00", "stories_exam_of_day 21:00", "shadow 19:30"],
    ["beautiful_sentence 09:00", "five_word 12:00", "five_word_story 12:30", "stories_clock 17:00", "stories_test_your_understanding 20:00", "conversation 19:00"],
    ["word_of_day 08:00", "words_test 20:00", "stories_test_your_turkish 19:00", "stories_exam_of_day 16:00"],
  ],
  [ /* Week 2 */
    ["word_of_day 09:00", "stories_clock 12:00", "stories_test_your_understanding 17:00", "stories_sentence_of_day 13:00", "conversation 19:00"],
    ["word_of_day 13:00", "difference_tow_words 20:00", "stories_clock 09:00", "stories_test_your_turkish 18:00", "stories_exam_of_day 22:00", "shadow 19:00"],
    ["word_of_day 15:00", "stories_test_your_understanding 19:00", "stories_sentence_of_day 09:00", "conversation 21:00"],
    ["word_of_day 11:00", "words_test 20:00", "stories_clock 09:00", "stories_sentence_of_day 17:00", "stories_exam_of_day 22:00"],
    ["gramar_of_day 13:00", "stories_test_your_turkish 18:00", "stories_sentence_of_day 10:00", "shadow 20:00"],
    ["situation 09:00", "five_word 12:00", "five_word_story 12:30", "stories_clock 17:00", "stories_test_your_understanding 20:00", "conversation 19:00"],
    ["word_of_day 14:00", "one_word_many_uses 20:00", "stories_clock 10:00", "stories_exam_of_day 21:00"],
  ],
  [ /* Week 3 */
    ["word_of_day 12:00", "colloquial_usage 20:00", "colloquial_usage_cover_story 20:30", "stories_clock 09:00", "stories_test_your_turkish 18:00", "stories_sentence_of_day 15:00", "conversation 19:00"],
    ["word_of_day 08:00", "stories_sentence_of_day 13:00", "stories_test_your_turkish 19:00", "shadow 20:00"],
    ["word_of_day 10:00", "translation_test_question 15:00", "translation_test_answer 16:00", "stories_exam_of_day 21:00", "stories_clock 12:00", "conversation 19:00"],
    ["word_of_day 14:00", "quick_test 21:00", "stories_sentence_of_day 09:00", "stories_test_your_understanding 18:00"],
    ["reading_comprehension 13:00", "reading_comprehension_story 13:30", "stories_test_your_understanding 18:00", "stories_clock 10:00", "shadow 20:00"],
    ["tips 09:00", "five_word 12:00", "five_word_story 12:30", "stories_sentence_of_day 17:00", "stories_exam_of_day 20:00", "conversation 19:00"],
    ["word_of_day 09:00", "words_test 20:00", "stories_test_your_turkish 18:00", "stories_clock 12:00"],
  ],
  [ /* Week 4 */
    ["word_of_day 15:00", "stories_clock 10:00", "stories_test_your_understanding 18:00", "stories_sentence_of_day 12:00", "conversation 20:00"],
    ["word_of_day 11:00", "difference_tow_words 20:00", "stories_sentence_of_day 09:00", "stories_test_your_turkish 18:00", "stories_exam_of_day 22:00", "shadow 19:00"],
    ["word_of_day 13:00", "stories_clock 09:00", "stories_sentence_of_day 17:00", "conversation 19:00"],
    ["word_of_day 09:00", "words_test 20:00", "stories_test_your_turkish 12:00", "stories_sentence_of_day 15:00", "stories_exam_of_day 22:00"],
    ["gramar_of_day 13:00", "stories_test_your_understanding 18:00", "stories_clock 10:00", "shadow 20:00"],
    ["situation 09:00", "five_word 12:00", "five_word_story 12:30", "stories_clock 17:00", "stories_test_your_understanding 20:00", "conversation 19:00"],
    ["word_of_day 12:00", "popular_proverbs 20:00", "stories_test_your_turkish 18:00", "stories_exam_of_day 21:00", "stories_sentence_of_day 09:00"],
  ],
];
