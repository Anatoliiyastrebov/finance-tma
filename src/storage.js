/* ════════════════════════════════════════════════════════════
   ХРАНИЛИЩЕ ДАННЫХ
   
   Приоритет:
   1. Telegram CloudStorage — если открыто в Telegram
      Данные в облаке Telegram, доступны на всех телефонах
   2. localStorage — fallback для браузера/разработки
   
   Telegram CloudStorage:
   - Привязан к аккаунту Telegram
   - Работает на любом телефоне с тем же аккаунтом
   - Бесплатно, без сервера
   - Лимит: 1024 ключа, 4096 символов каждый
   
   Из-за лимита храним данные постранично:
   tx_0, tx_1, tx_2 ... (по 50 транзакций на страницу)
════════════════════════════════════════════════════════════ */

const tg = window.Telegram?.WebApp;
const TCS = tg?.CloudStorage; // Telegram Cloud Storage API
const PAGE_SIZE = 50;          // транзакций на одну страницу

/* ── Определяем что использовать ───────────────────────────── */
const useTCS = !!(TCS && tg?.initData);

/* ══════════════════════════════════════════════════════════════
   TELEGRAM CLOUD STORAGE  (основной, если в Telegram)
══════════════════════════════════════════════════════════════ */

function tcsGet(key) {
  return new Promise((res, rej) =>
    TCS.getItem(key, (err, val) => err ? rej(err) : res(val || null))
  );
}

function tcsSet(key, value) {
  return new Promise((res, rej) =>
    TCS.setItem(key, value, (err, ok) => err ? rej(err) : res(ok))
  );
}

function tcsRemove(key) {
  return new Promise((res, rej) =>
    TCS.removeItem(key, (err, ok) => err ? rej(err) : res(ok))
  );
}

function tcsGetKeys() {
  return new Promise((res, rej) =>
    TCS.getKeys((err, keys) => err ? rej(err) : res(keys || []))
  );
}

/* Разбиваем транзакции на страницы (лимит 4096 символов/ключ) */
async function saveTxsTCS(txs) {
  // Удаляем старые страницы
  const keys = await tcsGetKeys();
  const oldPages = keys.filter(k => k.startsWith("tx_"));
  await Promise.all(oldPages.map(k => tcsRemove(k)));

  // Сохраняем новые страницы
  const pages = [];
  for (let i = 0; i < txs.length; i += PAGE_SIZE) {
    pages.push(txs.slice(i, i + PAGE_SIZE));
  }

  // Сохраняем кол-во страниц
  await tcsSet("tx_count", String(pages.length));

  // Сохраняем каждую страницу
  await Promise.all(
    pages.map((page, i) => tcsSet(`tx_${i}`, JSON.stringify(page)))
  );
}

async function loadTxsTCS() {
  const countStr = await tcsGet("tx_count");
  const count = parseInt(countStr || "0");
  if (!count) return null;

  const pages = await Promise.all(
    Array.from({ length: count }, (_, i) => tcsGet(`tx_${i}`))
  );

  return pages
    .filter(Boolean)
    .flatMap(page => {
      try { return JSON.parse(page); } catch { return []; }
    });
}

/* ══════════════════════════════════════════════════════════════
   localStorage FALLBACK  (браузер / разработка)
══════════════════════════════════════════════════════════════ */

function lsGet(key, def = null) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : def;
  } catch { return def; }
}

function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

/* ══════════════════════════════════════════════════════════════
   ЕДИНЫЙ ИНТЕРФЕЙС — используйте только эти функции
══════════════════════════════════════════════════════════════ */

export const DB = {
  /* Режим хранения для отображения в настройках */
  mode: useTCS ? "telegram" : "local",

  /* ── Транзакции ─────────────────────────────────────────── */
  async loadTxs(fallback) {
    if (useTCS) {
      try {
        const txs = await loadTxsTCS();
        if (txs && txs.length > 0) return txs;
      } catch (e) {
        console.warn("TCS loadTxs error:", e);
      }
    }
    return lsGet("fin_v2_tx", fallback);
  },

  async saveTxs(txs) {
    // Всегда сохраняем в localStorage как кэш
    lsSet("fin_v2_tx", txs);
    // И в Telegram Cloud если доступно
    if (useTCS) {
      try { await saveTxsTCS(txs); } catch (e) { console.warn("TCS saveTxs:", e); }
    }
  },

  /* ── Бюджеты ────────────────────────────────────────────── */
  async loadBudgets(fallback) {
    if (useTCS) {
      try {
        const v = await tcsGet("budgets");
        if (v) return JSON.parse(v);
      } catch {}
    }
    return lsGet("fin_v2_budgets", fallback);
  },

  async saveBudgets(data) {
    lsSet("fin_v2_budgets", data);
    if (useTCS) {
      try { await tcsSet("budgets", JSON.stringify(data)); } catch {}
    }
  },

  /* ── Цели ───────────────────────────────────────────────── */
  async loadGoals(fallback) {
    if (useTCS) {
      try {
        const v = await tcsGet("goals");
        if (v) return JSON.parse(v);
      } catch {}
    }
    return lsGet("fin_v2_goals", fallback);
  },

  async saveGoals(data) {
    lsSet("fin_v2_goals", data);
    if (useTCS) {
      try { await tcsSet("goals", JSON.stringify(data)); } catch {}
    }
  },

  /* ── Настройки ──────────────────────────────────────────── */
  async loadSettings(fallback) {
    if (useTCS) {
      try {
        const v = await tcsGet("settings");
        if (v) return { ...fallback, ...JSON.parse(v) };
      } catch {}
    }
    return lsGet("fin_v2_settings", fallback);
  },

  async saveSettings(data) {
    lsSet("fin_v2_settings", data);
    if (useTCS) {
      // Не храним PIN в облаке — только локально
      const { pin, ...safe } = data;
      try { await tcsSet("settings", JSON.stringify(safe)); } catch {}
    }
  },

  /* ── Очистить всё ───────────────────────────────────────── */
  async clearAll() {
    // Очищаем localStorage
    ["fin_v2_tx","fin_v2_budgets","fin_v2_goals","fin_v2_settings"].forEach(k =>
      localStorage.removeItem(k)
    );
    // Очищаем Telegram Cloud
    if (useTCS) {
      try {
        const keys = await tcsGetKeys();
        await Promise.all(keys.map(k => tcsRemove(k)));
      } catch {}
    }
  },
};
