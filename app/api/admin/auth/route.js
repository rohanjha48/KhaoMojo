import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { 
  SESSION_COOKIE, 
  MAX_AGE_SECONDS, 
  getSecret, 
  signTimestamp, 
  verifyToken 
} from '../../../../utils/adminAuth';

export async function GET(request) {
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  const secret = getSecret();
  const isValid = verifyToken(cookie, secret);

  return NextResponse.json({ authenticated: isValid }, { status: 200 });
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const enteredPin = typeof body?.pin === 'string' ? body.pin.trim() : '';
    const secret = getSecret();

    if (!enteredPin) {
      return NextResponse.json({ error: 'PIN is required' }, { status: 400 });
    }

    const enteredBuf = Buffer.from(enteredPin);
    const secretBuf = Buffer.from(secret);
    const matches =
      enteredBuf.length === secretBuf.length &&
      crypto.timingSafeEqual(enteredBuf, secretBuf);

    if (!matches) {
      return NextResponse.json({ error: 'Incorrect admin password. Please try again.' }, { status: 401 });
    }

    const timestamp = Date.now();
    const signature = signTimestamp(timestamp, secret);
    const sessionToken = `${timestamp}:${signature}`;

    const response = NextResponse.json({ success: true }, { status: 200 });
    response.cookies.set({
      name: SESSION_COOKIE,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: MAX_AGE_SECONDS,
    });

    return response;
  } catch (err) {
    console.error('[Admin Auth API Error]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true }, { status: 200 });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
