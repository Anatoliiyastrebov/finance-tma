/* ═══════════════════════════════════════════════
   TELEGRAM MINI APP HELPER
   Безопасная обёртка над window.Telegram.WebApp
═══════════════════════════════════════════════ */
const tg = window.Telegram?.WebApp || null;

export const TG = {
  /* инициализация — вызвать один раз при старте */
  init() {
    if (!tg) return;
    tg.ready();          // сообщаем Telegram что приложение готово
    tg.expand();         // раскрываем на весь экран
    tg.setHeaderColor("#080C14");
    tg.setBackgroundColor("#080C14");
  },

  /* данные пользователя из Telegram */
  get user() { return tg?.initDataUnsafe?.user || null; },
  get firstName() { return tg?.initDataUnsafe?.user?.first_name || ""; },
  get userId() { return tg?.initDataUnsafe?.user?.id || null; },

  /* тема Telegram (тёмная / светлая) */
  get isDark() { return tg?.colorScheme === "dark"; },

  /* вибрация / тактильный отклик */
  haptic(type = "light") {
    tg?.HapticFeedback?.impactOccurred(type); // light | medium | heavy
  },
  hapticSuccess() { tg?.HapticFeedback?.notificationOccurred("success"); },
  hapticError()   { tg?.HapticFeedback?.notificationOccurred("error"); },

  /* главная кнопка внизу */
  mainButton: {
    show(text, color = "#F5A623") {
      if (!tg?.MainButton) return;
      tg.MainButton.setText(text);
      tg.MainButton.color = color;
      tg.MainButton.textColor = "#000000";
      tg.MainButton.show();
    },
    hide() { tg?.MainButton?.hide(); },
    onClick(fn) { tg?.MainButton?.onClick(fn); },
    offClick(fn) { tg?.MainButton?.offClick(fn); },
  },

  /* кнопка «Назад» */
  backButton: {
    show() { tg?.BackButton?.show(); },
    hide() { tg?.BackButton?.hide(); },
    onClick(fn) { tg?.BackButton?.onClick(fn); },
    offClick(fn) { tg?.BackButton?.offClick(fn); },
  },

  /* закрыть Mini App */
  close() { tg?.close(); },

  /* работаем внутри Telegram или в браузере? */
  get isInsideTelegram() { return !!tg?.initData; },
};
