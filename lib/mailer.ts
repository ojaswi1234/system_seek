// lib/mailer.ts (or lib/telegram.ts)

interface AlertPayload {
  url: string;
  reason: string;
  ownerEmail: string;
}

export async function sendTelegramAlert({ url, reason, ownerEmail }: AlertPayload) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.error("Missing Telegram credentials in .env file.");
    return;
  }

  // Formatting the message using Markdown
  const message = `
🚨 *DRIFT DETECTED: Server Offline* 🚨

*Target URL:* ${url}
*Error Reason:* ${reason}
*Monitor Owner:* ${ownerEmail}
*Time:* ${new Date().toISOString()}
  `.trim();

  const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      }),
    });

    if (!response.ok) {
      throw new Error(`Telegram API responded with status: ${response.status}`);
    }

    console.log(`Telegram alert successfully fired for ${url}!`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to send Telegram alert:`, error);
    throw error;
  }
}