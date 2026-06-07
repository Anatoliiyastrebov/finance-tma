/* ═══════════════════════════════════════════════════════════
   TELEGRAM BOT WEBHOOK  —  Vercel Serverless Function
   Файл: api/webhook.js
   Принимает обновления от Telegram, отвечает кнопкой открытия приложения
═══════════════════════════════════════════════════════════ */

const BOT_TOKEN = process.env.BOT_TOKEN;
const APP_URL   = process.env.APP_URL;   // https://your-app.vercel.app

async function sendMessage(chatId, text, replyMarkup = null) {
  const body = { chat_id: chatId, text, parse_mode: "HTML" };
  if (replyMarkup) body.reply_markup = replyMarkup;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method not allowed");

  try {
    const { message, callback_query } = req.body || {};

    /* ── обычное сообщение ─────────────────────────────────── */
    if (message) {
      const chatId = message.chat.id;
      const text   = message.text || "";
      const name   = message.from?.first_name || "друг";

      if (text === "/start" || text.startsWith("/start")) {
        await sendMessage(chatId,
          `💶 Привет, ${name}!\n\n` +
          `Я твой личный <b>финансовый помощник</b>.\n\n` +
          `📊 Веду учёт расходов и доходов\n` +
          `🎤 Понимаю голосовые команды\n` +
          `📷 Распознаю чеки\n` +
          `📈 Строю графики за неделю, месяц, год\n\n` +
          `Нажми кнопку ниже чтобы открыть приложение 👇`,
          {
            inline_keyboard: [[
              { text: "📊 Открыть FinanceAI", web_app: { url: APP_URL } }
            ]]
          }
        );
        return res.status(200).json({ ok: true });
      }

      if (text === "/help") {
        await sendMessage(chatId,
          "💡 <b>Как пользоваться:</b>\n\n" +
          "• Нажми <b>📊 Открыть FinanceAI</b> — откроется приложение\n" +
          "• Внутри говори или пиши команды боту\n" +
          "• Данные хранятся прямо на твоём телефоне"
        );
        return res.status(200).json({ ok: true });
      }

      // любое другое сообщение
      await sendMessage(chatId,
        "Открой приложение чтобы управлять финансами 👇",
        { inline_keyboard: [[{ text: "📊 FinanceAI", web_app: { url: APP_URL } }]] }
      );
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: err.message });
  }
}
