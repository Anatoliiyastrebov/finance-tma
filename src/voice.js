/* ════════════════════════════════════════════════════════════
   ГОЛОСОВОЙ ВВОД — версия без повторных запросов разрешения

   Принцип:
   - getUserMedia() вызывается ОДИН РАЗ за сессию
   - Поток (stream) держится открытым → разрешение не сбрасывается
   - SpeechRecognition видит уже выданное разрешение → не спрашивает
   - Разрешение запрашивается заранее при инициализации голоса
════════════════════════════════════════════════════════════ */

let micStream   = null;   // MediaStream — держим открытым всю сессию
let rec         = null;   // SpeechRecognition instance
let silenceTimer= null;
let lastText    = "";
let isDone      = false;

/* ── Запросить разрешение один раз ─────────────────────────
   Вызывается при первом нажатии на 🎤.
   После этого поток хранится в micStream — разрешение выдано.  */
async function ensureMic() {
  if (micStream && micStream.active) return true; // уже есть, не спрашиваем
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return true;
  } catch (e) {
    micStream = null;
    return false;
  }
}

/* ── Очистка SpeechRecognition (НЕ закрываем micStream!) ─── */
function cleanupRec() {
  if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
  try { rec?.abort(); } catch {}
  rec = null;
}

/* ── Финализация — отдать результат ────────────────────────  */
function finish(text, onFinal) {
  if (isDone) return;
  isDone = true;
  cleanupRec();
  onFinal(text?.trim() || "");
}

export const Voice = {

  /* Проверить поддержку */
  async available() {
    return !!(
      window.SpeechRecognition || window.webkitSpeechRecognition
    ) && !!navigator.mediaDevices?.getUserMedia;
  },

  /* Предзагрузка разрешения — вызывать при инициализации приложения.
     Показывает диалог один раз при старте, потом молчит. */
  async prewarm() {
    await ensureMic();
  },

  /* Начать запись */
  async start(onPartial, onFinal, onError) {
    cleanupRec();
    isDone  = false;
    lastText = "";

    /* 1. Получаем разрешение (или берём сохранённое) */
    const ok = await ensureMic();
    if (!ok) {
      onError(
        "🎤 Нет доступа к микрофону.\n" +
        "Откройте Настройки телефона → Приложения → Telegram → Разрешения → Микрофон → Разрешить."
      );
      return false;
    }

    /* 2. Создаём распознавание — разрешение уже выдано, диалога не будет */
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      onError("Голосовой ввод не поддерживается в этом браузере.");
      return false;
    }

    rec = new SR();
    rec.lang            = "ru-RU";
    rec.continuous      = false;
    rec.interimResults  = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      const text = Array.from(e.results).map(r => r[0].transcript).join("");
      lastText = text;
      onPartial(text);

      // сбрасываем таймер тишины
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => finish(lastText, onFinal), 2000);

      if (e.results[e.results.length - 1].isFinal) finish(text, onFinal);
    };

    rec.onerror = (e) => {
      cleanupRec(); isDone = true;
      if (e.error === "not-allowed" || e.error === "permission-denied") {
        // Сбрасываем сохранённый поток — придётся запросить снова
        try { micStream?.getTracks().forEach(t => t.stop()); } catch {}
        micStream = null;
        onError("🎤 Доступ к микрофону запрещён.\nПроверьте разрешения Telegram в настройках телефона.");
      } else if (e.error === "no-speech") {
        onError("Ничего не услышал, попробуйте ещё раз.");
      } else if (e.error === "network") {
        onError("Ошибка сети при распознавании.");
      } else if (e.error === "audio-capture") {
        onError("Микрофон занят другим приложением.");
      } else {
        onError(`Ошибка: ${e.error}`);
      }
    };

    rec.onend = () => finish(lastText, onFinal);

    try {
      rec.start();
      return true;
    } catch (e) {
      cleanupRec(); isDone = true;
      onError("Не удалось запустить: " + e.message);
      return false;
    }
  },

  /* Принудительная остановка (кнопка нажата повторно) */
  async stop(onFinal) {
    finish(lastText, onFinal || (() => {}));
  },

  /* Освободить поток при закрытии приложения (опционально) */
  release() {
    cleanupRec();
    try { micStream?.getTracks().forEach(t => t.stop()); } catch {}
    micStream = null;
  },
};
