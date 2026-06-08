/* ════════════════════════════════════════════════════════════
   ГОЛОСОВОЙ ВВОД — чистая версия для Telegram Mini App
   
   Главные исправления:
   - ОДИН запрос микрофона (убран лишний getUserMedia)
   - SpeechRecognition сам запрашивает разрешение
   - Нет зависания кнопки — состояние всегда сбрасывается
   - Автостоп через 2.5 сек тишины
   - Страховка: принудительный сброс через 15 сек
════════════════════════════════════════════════════════════ */

let rec = null;
let silenceTimer = null;
let safetyTimer = null;
let lastText = "";
let isDone = false;

function cleanup() {
  if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
  if (safetyTimer)  { clearTimeout(safetyTimer);  safetyTimer  = null; }
  try { rec?.stop(); } catch {}
  rec = null;
}

function finish(text, onFinal) {
  if (isDone) return;
  isDone = true;
  cleanup();
  if (text?.trim()) onFinal(text.trim());
  else onFinal("");
}

export const Voice = {

  async available() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  },

  async start(onPartial, onFinal, onError) {
    // сбрасываем предыдущее состояние
    cleanup();
    isDone = false;
    lastText = "";

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      onError("Голосовой ввод не поддерживается.\nИспользуйте текстовый ввод.");
      return false;
    }

    rec = new SR();
    rec.lang = "ru-RU";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      // страховка: если через 15 сек ничего — сбрасываем
      safetyTimer = setTimeout(() => {
        finish(lastText, onFinal);
      }, 15000);
    };

    rec.onresult = (e) => {
      // собираем текст из всех результатов
      const text = Array.from(e.results)
        .map(r => r[0].transcript)
        .join("");

      lastText = text;
      onPartial(text);

      // сброс таймера тишины при каждом новом слове
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => finish(lastText, onFinal), 2500);

      // финальный результат от движка
      if (e.results[e.results.length - 1].isFinal) {
        finish(text, onFinal);
      }
    };

    rec.onerror = (e) => {
      cleanup();
      isDone = true;
      if (e.error === "not-allowed" || e.error === "permission-denied") {
        onError("🎤 Нет доступа к микрофону.\nРазрешите в настройках телефона.");
      } else if (e.error === "no-speech") {
        onError("Ничего не услышал. Попробуйте ещё раз.");
      } else if (e.error === "network") {
        onError("Ошибка сети. Проверьте интернет.");
      } else if (e.error === "audio-capture") {
        onError("Микрофон занят другим приложением.");
      } else {
        onError("Ошибка: " + e.error + ". Попробуйте текстовый ввод.");
      }
    };

    rec.onend = () => {
      // движок завершил — отдаём что успели накопить
      finish(lastText, onFinal);
    };

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
};
