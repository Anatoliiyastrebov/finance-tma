/* ════════════════════════════════════════════════════════════
   OCR МОДУЛЬ — Tesseract.js
   Бесплатно, без API-ключей, работает в браузере.
   Поддерживает русский, немецкий, английский.
════════════════════════════════════════════════════════════ */
import { createWorker } from "tesseract.js";

let workerInstance = null;
let workerLoading  = false;
let workerReady    = false;

/* Инициализируем воркер один раз — потом переиспользуем */
async function getWorker(onProgress) {
  if (workerReady && workerInstance) return workerInstance;
  if (workerLoading) {
    // Ждём пока другой вызов загрузит
    await new Promise(r => {
      const check = setInterval(() => { if (workerReady) { clearInterval(check); r(); } }, 200);
    });
    return workerInstance;
  }

  workerLoading = true;
  try {
    workerInstance = await createWorker(["rus", "deu", "eng"], 1, {
      logger: m => {
        if (m.status === "recognizing text" && onProgress) {
          onProgress(Math.round(m.progress * 100));
        }
      },
    });
    workerReady = true;
  } finally {
    workerLoading = false;
  }
  return workerInstance;
}

/* ── Парсинг суммы из распознанного текста ─────────────────
   Ищет ключевые слова "итого / gesamt / total / summe"
   Если не нашёл — берёт наибольшее число на чеке            */
function parseAmount(text) {
  const t = text.replace(/\s+/g, " ");

  // Ключевые слова итого (РУ + DE + EN)
  const totalRe = [
    /(?:итого|всего|сумма|к оплате)[^\d]*(\d[\d\s]*[,.]\d{2})/i,
    /(?:gesamt|summe|total|betrag|zu zahlen|endbetrag)[^\d]*(\d[\d\s]*[,.]\d{2})/i,
    /(?:total|amount due|grand total)[^\d]*(\d[\d\s]*[,.]\d{2})/i,
    // Число + знак евро
    /(\d{1,4}[,.]\d{2})\s*€/,
    /€\s*(\d{1,4}[,.]\d{2})/,
  ];

  for (const re of totalRe) {
    const m = t.match(re);
    if (m) {
      const raw = m[1].replace(/\s/g, "").replace(",", ".");
      const n = parseFloat(raw);
      if (n > 0 && n < 50000) return n;
    }
  }

  // Все числа формата X,XX или X.XX
  const allAmounts = [...t.matchAll(/\b(\d{1,4}[,.]\d{2})\b/g)]
    .map(m => parseFloat(m[1].replace(",", ".")))
    .filter(n => n > 0 && n < 50000);

  // Возвращаем наибольшее (обычно это итого)
  return allAmounts.length ? Math.max(...allAmounts) : null;
}

/* ── Название магазина — первая значимая строка ──────────── */
function parseStore(text) {
  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 2 && /[a-zA-Zа-яА-Я]/.test(l));
  return lines[0]?.slice(0, 35) || "Магазин";
}

/* ── Дата чека ───────────────────────────────────────────── */
function parseDate(text) {
  const re = [
    /(\d{2})[./](\d{2})[./](\d{4})/,   // 07.06.2026
    /(\d{4})-(\d{2})-(\d{2})/,          // 2026-06-07
    /(\d{2})[./](\d{2})[./](\d{2})\b/, // 07.06.26
  ];
  for (const r of re) {
    const m = text.match(r);
    if (m) {
      try {
        const d = r === re[1]
          ? new Date(`${m[1]}-${m[2]}-${m[3]}`)
          : new Date(`${m[3].length===2?"20"+m[3]:m[3]}-${m[2]}-${m[1]}`);
        if (!isNaN(d)) return d.toISOString().slice(0, 10);
      } catch {}
    }
  }
  return null;
}

/* ── Основная функция ────────────────────────────────────── */
export async function recognizeReceipt(imageBase64, onProgress) {
  onProgress?.(0);

  const worker = await getWorker(onProgress);

  onProgress?.(10);

  const { data: { text } } = await worker.recognize(imageBase64);

  onProgress?.(100);

  return {
    rawText : text,
    amount  : parseAmount(text),
    store   : parseStore(text),
    date    : parseDate(text),
  };
}
