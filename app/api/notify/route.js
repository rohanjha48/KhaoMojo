import { NextResponse } from 'next/server';

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { roomNumber, customerName, phoneNumber, utrNumber, items, totalAmount, orderId, paymentMethod, payment_method } = body || {};

    // Read bot token and chat ID from environment variables (supporting standard and NEXT_PUBLIC prefixes)
    const rawBotToken = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN || process.env.BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
    const rawChatId = process.env.TELEGRAM_CHAT_ID || process.env.CHAT_ID || process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;

    const botToken = (rawBotToken || '').trim().replace(/^["']|["']$/g, '');
    const chatId = (rawChatId || '').trim().replace(/^["']|["']$/g, '');

    if (!botToken || !chatId) {
      console.error('[Telegram Vercel Config Error]: Missing environment variables', {
        hasBotToken: Boolean(botToken),
        hasChatId: Boolean(chatId),
        tip: 'Ensure TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are added to your Vercel Project Settings > Environment Variables for Production & Preview, then redeploy.',
      });
      return NextResponse.json(
        {
          success: false,
          error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing in Vercel environment variables.',
        },
        { status: 200 }
      );
    }

    // Format items list cleanly with safe HTML escaping
    const itemsFormatted = (items || [])
      .map((item, idx) => {
        const rawName = item.name || item.product_name || item.products?.name || 'Item';
        const name = escapeHtml(rawName);
        const qty = item.quantity || 1;
        const price = item.price || item.unit_price || 0;
        return `  ${idx + 1}. <b>${name}</b> × ${qty} (₹${(price * qty).toFixed(0)})`;
      })
      .join('\n');

    // Build notification message
    const methodStr = (payment_method || paymentMethod || (utrNumber ? 'UPI' : 'COD')).toUpperCase();
    const isCOD = methodStr === 'COD';
    const safeRoom = escapeHtml(roomNumber || 'N/A');
    const safeCustomer = customerName ? escapeHtml(customerName) : null;
    const safePhone = phoneNumber ? escapeHtml(phoneNumber) : null;
    const safeUtr = utrNumber ? escapeHtml(utrNumber) : null;
    const safeOrderId = orderId ? escapeHtml(orderId) : null;
    const paymentLabel = isCOD 
      ? 'Cash on Delivery (COD)' 
      : (safeUtr ? `UPI Prepaid (UTR: <code>${safeUtr}</code>)` : 'UPI Prepaid');

    const message = [
      `🚨 <b>NEW KHAOMOJO ${isCOD ? 'COD' : 'PREPAID'} ORDER RECEIVED!</b> 🚀`,
      ``,
      `📍 <b>Room / Location:</b> <code>${safeRoom}</code>`,
      safeCustomer ? `👤 <b>Customer:</b> ${safeCustomer}` : null,
      safePhone ? `📞 <b>Phone:</b> ${safePhone}` : null,
      `💳 <b>Payment:</b> <b>${paymentLabel}</b>`,
      ``,
      `🛒 <b>Items Ordered:</b>`,
      itemsFormatted || '  No items specified',
      ``,
      `💰 <b>Total Amount:</b> <b>₹${Number(totalAmount || 0).toFixed(0)}</b>`,
      `⏰ <b>Timestamp:</b> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
      safeOrderId ? `🆔 <b>Order ID:</b> <code>${safeOrderId}</code>` : null,
    ]
      .filter((line) => line !== null)
      .join('\n');

    const telegramEndpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;

    // 1. Wrap the API call in a try/catch block
    // 2. Ensure the Telegram fetch request is awaited properly
    // 3. Explicitly log the response from Telegram:
    //    const response = await fetch(...); const data = await response.json(); console.log('Telegram API Response:', data);
    // 4. Output exact failure reasons in Vercel logs (e.g. 400 Bad Request, 403 Forbidden)
    try {
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
        signal: AbortSignal.timeout(8000),
      });

      const data = await response.json();
      console.log('Telegram API Response:', data);

      if (!response.ok || !data?.ok) {
        console.error(
          `Telegram API Error [${response.status} ${response.statusText}]: ${data?.description || 'Request was rejected by Telegram'}`,
          {
            httpStatus: response.status,
            httpStatusText: response.statusText,
            telegramErrorCode: data?.error_code,
            telegramDescription: data?.description,
            parameters: data?.parameters,
            chatIdTarget: chatId,
            rawResponse: data,
          }
        );

        // Fallback retry with plain text if HTML parsing caused rejection (e.g. 400 Bad Request: can't parse entities)
        if (data?.description?.toLowerCase().includes("can't parse entities")) {
          console.warn('[Telegram Vercel Log]: Retrying sendMessage in plain text format...');
          const plainText = message.replace(/<[^>]+>/g, '');
          const retryResponse = await fetch(telegramEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: plainText,
            }),
          });
          const retryData = await retryResponse.json();
          console.log('Telegram API Response (Plain Text Fallback):', retryData);

          if (retryData?.ok) {
            return NextResponse.json({
              success: true,
              messageId: retryData.result?.message_id,
              fallback: true,
            });
          }

          console.error(
            `Telegram Plain Text Fallback Error [${retryResponse.status} ${retryResponse.statusText}]: ${retryData?.description}`
          );
        }

        return NextResponse.json(
          {
            success: false,
            error: data?.description || `Telegram API request rejected (${response.status})`,
            details: data,
          },
          { status: 200 }
        );
      }

      return NextResponse.json({
        success: true,
        messageId: data.result?.message_id,
      });
    } catch (fetchError) {
      console.error('Telegram API Fetch Network Exception:', {
        message: fetchError.message,
        stack: fetchError.stack,
      });
      return NextResponse.json(
        {
          success: false,
          error: fetchError.message || 'Network exception communicating with Telegram',
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Unhandled Exception in /api/notify Route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 200 }
    );
  }
}
