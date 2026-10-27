import { NextResponse } from 'next/server';
import { fetchOrders, createOrder } from '../../../utils/dataService';

export async function GET() {
  try {
    const orders = await fetchOrders();
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const newOrder = await createOrder(body);

    // Trigger Telegram notification
    try {
      const rawBotToken = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN || process.env.BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
      const rawChatId = process.env.TELEGRAM_CHAT_ID || process.env.CHAT_ID || process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;

      const botToken = (rawBotToken || '').trim().replace(/^["']|["']$/g, '');
      const chatId = (rawChatId || '').trim().replace(/^["']|["']$/g, '');

      if (!botToken || !chatId) {
        console.error('[Telegram Vercel Config Error in /api/orders]: Missing environment variables', {
          hasBotToken: Boolean(botToken),
          hasChatId: Boolean(chatId),
        });
      } else {
        const itemsList = body.items || newOrder.order_items || [];
        const itemsFormatted = itemsList.length > 0
          ? itemsList
              .map((it, idx) => `  ${idx + 1}. <b>${it.name || it.product_name || 'Item'}</b> × ${it.quantity || 1} (₹${((it.price || it.unit_price || 0) * (it.quantity || 1)).toFixed(0)})`)
              .join('\n')
          : '  No items specified';

        const text = [
          `🚨 <b>NEW KHAOMOJO ORDER RECEIVED!</b> 🚀`,
          ``,
          `📍 <b>Room / Location:</b> <code>${newOrder.room_number || body.roomNumber || 'N/A'}</code>`,
          `👤 <b>Customer:</b> ${newOrder.customer_name || body.customerName || 'N/A'}`,
          `📞 <b>Phone:</b> ${newOrder.phone_number || body.phoneNumber || 'N/A'}`,
          `💳 <b>Payment:</b> <b>UPI Prepaid</b>`,
          ``,
          `🛒 <b>Items Ordered:</b>`,
          itemsFormatted,
          ``,
          `💰 <b>Total Amount:</b> <b>₹${Number(newOrder.total_amount || body.totalAmount || 0).toFixed(0)}</b>`,
          `⏰ <b>Timestamp:</b> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
        ].join('\n');

        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
          }),
          signal: AbortSignal.timeout(8000),
        });

        const data = await response.json();
        console.log('Telegram API Response:', data);

        if (!response.ok || !data?.ok) {
          console.error(`Telegram API Error: ${response.status} ${response.statusText} - ${data?.description || 'Request was rejected'}`, data);
        }
      }
    } catch (telegramError) {
      console.error('Telegram API Exception in /api/orders:', telegramError);
    }

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
