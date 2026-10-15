import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { roomNumber, customerName, phoneNumber, items, totalAmount, orderId } = body || {};

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.warn(
        '[Telegram Notification]: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not configured in .env.local.'
      );
      return NextResponse.json(
        {
          success: false,
          warning: 'Telegram bot token or chat ID is missing in environment variables (.env.local)',
        },
        { status: 200 }
      );
    }

    // Format items list cleanly
    const itemsFormatted = (items || [])
      .map((item, idx) => {
        const name = item.name || item.product_name || item.products?.name || 'Item';
        const qty = item.quantity || 1;
        const price = item.price || item.unit_price || 0;
        return `  ${idx + 1}. <b>${name}</b> × ${qty} (₹${(price * qty).toFixed(0)})`;
      })
      .join('\n');

    // Build notification message containing Order Room Number, Items, and Total Amount
    const message = [
      `🚨 <b>NEW KHAOMOJO ORDER RECEIVED!</b> 🚀`,
      ``,
      `📍 <b>Room Number:</b> <code>${roomNumber || 'N/A'}</code>`,
      customerName ? `👤 <b>Customer:</b> ${customerName}` : null,
      phoneNumber ? `📞 <b>Phone:</b> ${phoneNumber}` : null,
      ``,
      `🛒 <b>Items Ordered:</b>`,
      itemsFormatted || '  No items specified',
      ``,
      `💰 <b>Total Amount:</b> <b>₹${Number(totalAmount || 0).toFixed(0)}</b>`,
      `⏰ <b>Timestamp:</b> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
      orderId ? `🆔 <b>Order ID:</b> <code>${orderId}</code>` : null,
    ]
      .filter((line) => line !== null)
      .join('\n');

    const telegramEndpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response = await fetch(telegramEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const telegramData = await response.json();

    if (!response.ok || !telegramData.ok) {
      console.error('[Telegram Notification Error]:', telegramData);
      return NextResponse.json(
        {
          success: false,
          error: telegramData.description || 'Telegram API request failed',
        },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: telegramData.result?.message_id,
    });
  } catch (error) {
    console.error('[Telegram Notify Route Exception]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
