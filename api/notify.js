/* ═══════════════════════════════════════════════════════════
   УВЕДОМЛЕНИЯ ЧЕРЕЗ TELEGRAM БОТ
   Вызывается из Mini App когда:
   - Превышен лимит бюджета
   - Пользователь запрашивает дневной итог
   POST /api/notify { chatId, type, data }
═══════════════════════════════════════════════════════════ */

const BOT_TOKEN = process.env.BOT_TOKEN;

async function sendTG(chatId, text) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });
  return res.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { chatId, type, data } = req.body || {};
  if (!chatId || !type) return res.status(400).json({ error: "chatId и type обязательны" });

  let text = "";

  switch (type) {
    case "budget_alert":
      // Превышение бюджета
      text =
        `⚠️ <b>Лимит превышен!</b>\n\n` +
        `Категория: <b>${data.cat}</b>\n` +
        `Потрачено: <b>${data.spent} €</b>\n` +
        `Лимит: ${data.limit} €\n` +
        `Превышение: +${(data.spent - data.limit).toFixed(2)} €\n\n` +
        `Откройте приложение чтобы скорректировать бюджет 👇`;
      break;

    case "budget_warning":
      // 80% лимита
      text =
        `🟡 <b>Бюджет на исходе</b>\n\n` +
        `Категория: <b>${data.cat}</b>\n` +
        `Потрачено: ${data.spent} € из ${data.limit} €\n` +
        `Осталось: <b>${(data.limit - data.spent).toFixed(2)} €</b>\n\n` +
        `Будьте осторожны с расходами 💡`;
      break;

    case "daily_summary":
      // Ежедневный итог
      text =
        `📊 <b>Итог за сегодня</b>\n\n` +
        `💸 Потрачено: <b>${data.expense} €</b>\n` +
        `💰 Получено: <b>${data.income} €</b>\n` +
        (data.balance >= 0
          ? `✅ Баланс дня: +${data.balance} €`
          : `⚠️ Баланс дня: ${data.balance} €`) +
        `\n\n` +
        (data.topCat ? `📌 Больше всего на: ${data.topCat}\n\n` : "") +
        `Хорошего вечера! 🌙`;
      break;

    case "goal_reached":
      // Цель достигнута
      text =
        `🎉 <b>Цель достигнута!</b>\n\n` +
        `${data.icon} ${data.name}: <b>${data.target} €</b>\n\n` +
        `Поздравляем! Вы накопили нужную сумму 🏆`;
      break;

    default:
      text = data?.text || "Уведомление от FinanceAI";
  }

  try {
    await sendTG(chatId, text);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
