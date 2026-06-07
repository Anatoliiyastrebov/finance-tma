/* ════════════════════════════════════════════════════════════
   ГОЛОСОВОЙ ВВОД  (исправленная версия)
   - повторное нажатие ПРИНУДИТЕЛЬНО останавливает запись
   - автостоп когда человек замолчал (по таймеру тишины)
   - последний распознанный кусок сохраняется как результат
════════════════════════════════════════════════════════════ */
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";

const isNative = Capacitor.isNativePlatform();

/* общее состояние */
let lastPartial = "";        // последний распознанный текст
let silenceTimer = null;     // таймер автостопа по тишине
let finished = false;        // чтобы финал не сработал дважды

const SILENCE_MS = 2500;     // автостоп через 2.5 сек тишины

/* ── НАТИВНЫЙ ПУТЬ (Android / iOS) ─────────────────────────── */
async function nativeAvailable() {
  try { const { available } = await SpeechRecognition.available(); return available; }
  catch { return false; }
}

async function nativeStart(onPartial, onFinal, onError) {
  lastPartial = ""; finished = false;
  try {
    const perm = await SpeechRecognition.requestPermissions();
    if (perm.speechRecognition !== "granted") {
      onError("Нет доступа к микрофону. Разрешите в настройках телефона.");
      return false;
    }

    await SpeechRecognition.removeAllListeners();

    // приходят куски распознанного текста
    SpeechRecognition.addListener("partialResults", (data) => {
      if (data.matches && data.matches.length) {
        lastPartial = data.matches[0];
        onPartial(lastPartial);
        // сбрасываем таймер тишины: человек ещё говорит
        if (silenceTimer) clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => { finalize(onFinal); }, SILENCE_MS);
      }
    });

    // система сама сообщила что слушание закончилось
    SpeechRecognition.addListener("listeningState", (data) => {
      if (data.status === "stopped") finalize(onFinal);
    });

    await SpeechRecognition.start({
      language: "ru-RU",
      maxResults: 1,
      partialResults: true,
      popup: false,
    });
    return true;
  } catch (e) {
    cleanup();
    onError("Ошибка распознавания: " + (e.message || e));
    return false;
  }
}

// завершить распознавание один раз, отдать накопленный текст
function finalize(onFinal) {
  if (finished) return;
  finished = true;
  if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
  const text = lastPartial.trim();
  SpeechRecognition.stop().catch(() => {});
  SpeechRecognition.removeAllListeners().catch(() => {});
  if (text) onFinal(text);
  else onFinal(""); // пусто — просто закрываем, UI снимет "слушаю"
}

function cleanup() {
  if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
  SpeechRecognition.removeAllListeners?.().catch?.(() => {});
}

async function nativeStop(onFinal) {
  // ПРИНУДИТЕЛЬНАЯ остановка по кнопке — сразу отдаём что есть
  finalize(onFinal || (() => {}));
  try { await SpeechRecognition.stop(); } catch {}
  try { await SpeechRecognition.removeAllListeners(); } catch {}
}

/* ── ВЕБ-ПУТЬ (браузер для разработки) ─────────────────────── */
let webRec = null;

function webAvailable() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

async function webStart(onPartial, onFinal, onError) {
  lastPartial = ""; finished = false;
  try { await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch { onError("🎤 Нет доступа к микрофону. Разрешите в браузере."); return false; }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { onError("Браузер не поддерживает голосовой ввод."); return false; }

  const rec = new SR();
  rec.lang = "ru-RU"; rec.continuous = false; rec.interimResults = true;
  rec.onresult = (e) => {
    const t = Array.from(e.results).map((x) => x[0].transcript).join("");
    lastPartial = t;
    onPartial(t);
    if (e.results[e.results.length - 1].isFinal) {
      if (!finished) { finished = true; onFinal(t.trim()); }
    }
  };
  rec.onerror = (e) => {
    if (e.error === "not-allowed") onError("🎤 Доступ запрещён.");
    else if (e.error === "no-speech") onError("Речь не обнаружена.");
  };
  rec.onend = () => {
    // если завершилось без финала — отдаём накопленное
    if (!finished) { finished = true; onFinal(lastPartial.trim()); }
  };
  webRec = rec;
  try { rec.start(); return true; }
  catch (e) { onError("Ошибка: " + e.message); return false; }
}

function webStop(onFinal) {
  try { webRec?.stop(); } catch {}
  // onend сам отдаст результат
  webRec = null;
}

/* ── ЕДИНЫЙ ИНТЕРФЕЙС ──────────────────────────────────────── */
export const Voice = {
  isNative,
  async available() { return isNative ? await nativeAvailable() : webAvailable(); },
  async start(onPartial, onFinal, onError) {
    return isNative
      ? await nativeStart(onPartial, onFinal, onError)
      : await webStart(onPartial, onFinal, onError);
  },
  async stop(onFinal) {
    return isNative ? await nativeStop(onFinal) : webStop(onFinal);
  },
};
