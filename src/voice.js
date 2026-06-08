/* ════════════════════════════════════════════════════════════
   ГОЛОСОВОЙ ВВОД — финальная версия для Telegram Mini App

   КЛЮЧЕВОЕ РЕШЕНИЕ:
   getUserMedia() полностью убран.
   SpeechRecognition сам управляет микрофоном и разрешениями.
   Это даёт ОДИН диалог разрешения за сессию, не два.
════════════════════════════════════════════════════════════ */

let rec          = null;
let silenceTimer = null;
let safetyTimer  = null;
let lastText     = "";
let isDone       = false;

function cleanup() {
  if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
  if (safetyTimer)  { clearTimeout(safetyTimer);  safetyTimer  = null; }
  try { rec?.abort(); } catch {}
  rec = null;
}

function finish(text, onFinal) {
  if (isDone) return;
  isDone = true;
  cleanup();
  onFinal(text?.trim() || "");
}

export const Voice = {

  async available() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  },

  // Оставляем метод чтобы не сломать вызов в App.jsx — просто пустой
  async prewarm() {},

  async start(onPartial, onFinal, onError) {
    cleanup();
    isDone   = false;
    lastText = "";

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      onError("Голосовой ввод недоступен в этом браузере.");
      return false;
    }

    rec = new SR();
    rec.lang            = "ru-RU";
    rec.continuous      = false;
    rec.interimResults  = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      // Страховка: через 15 сек принудительно закрываем
      safetyTimer = setTimeout(() => finish(lastText, onFinal), 15000);
    };

    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .map(r => r[0].transcript)
        .join("");

      lastText = text;
      onPartial(text);

      // Сброс таймера тишины при каждом новом слове
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => finish(lastText, onFinal), 2000);

      if (e.results[e.results.length - 1].isFinal) {
        finish(text, onFinal);
      }
    };

    rec.onerror = (e) => {
      cleanup();
      isDone = true;
      switch (e.error) {
        case "not-allowed":
        case "permission-denied":
          onError(
            "🎤 Нет разрешения на микрофон.\n\n" +
            "На телефоне:\nНастройки → Приложения → Telegram → Разрешения → Микрофон → Разрешить\n\n" +
            "Затем снова откройте приложение."
          );
          break;
        case "no-speech":
          onError("Ничего не услышал 🤔\nПопробуйте говорить чуть громче.");
          break;
        case "audio-capture":
          onError("Микрофон занят другим приложением.\nЗакройте его и попробуйте снова.");
          break;
        case "network":
          onError("Ошибка сети. Проверьте интернет.");
          break;
        default:
          onError(`Ошибка распознавания: ${e.error}\nПопробуйте текстовый ввод.`);
      }
    };

    rec.onend = () => finish(lastText, onFinal);

    try {
      rec.start();
      return true;
    } catch (e) {
      cleanup();
      isDone = true;
      onError("Не удалось запустить микрофон: " + e.message);
      return false;
    }
  },

  async stop(onFinal) {
    finish(lastText, onFinal || (() => {}));
  },

  release() {
    cleanup();
  },
};
