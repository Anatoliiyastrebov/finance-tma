/* ════════════════════════════════════════════════════════════
   ГОЛОСОВОЙ ВВОД — веб-версия для Telegram Mini App
   Использует Web Speech API (встроен в браузер)
════════════════════════════════════════════════════════════ */

let lastPartial = "";
let silenceTimer = null;
let finished = false;
let webRec = null;
const SILENCE_MS = 2500;

function finalize(onFinal) {
  if (finished) return;
  finished = true;
  if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
  try { webRec?.stop(); } catch {}
  const text = lastPartial.trim();
  if (text) onFinal(text);
  else onFinal("");
}

export const Voice = {
  isNative: false,

  async available() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  },

  async start(onPartial, onFinal, onError) {
    lastPartial = ""; finished = false;

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onError("🎤 Нет доступа к микрофону. Разрешите в настройках.");
      return false;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      onError("Голосовой ввод не поддерживается в этом браузере.");
      return false;
    }

    const rec = new SR();
    rec.lang = "ru-RU";
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (e) => {
      const t = Array.from(e.results).map(x => x[0].transcript).join("");
      lastPartial = t;
      onPartial(t);
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => finalize(onFinal), SILENCE_MS);
      if (e.results[e.results.length - 1].isFinal) finalize(onFinal);
    };

    rec.onerror = (e) => {
      if (e.error === "not-allowed") onError("🎤 Доступ к микрофону запрещён.");
      else if (e.error === "no-speech") onError("Речь не обнаружена, попробуйте ещё раз.");
      else onError("Ошибка: " + e.error);
    };

    rec.onend = () => finalize(onFinal);

    webRec = rec;
    try { rec.start(); return true; }
    catch (e) { onError("Не удалось запустить: " + e.message); return false; }
  },

  async stop(onFinal) {
    finalize(onFinal || (() => {}));
  },
};
