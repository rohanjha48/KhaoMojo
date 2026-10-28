import { NextResponse } from 'next/server';
import crypto from 'crypto';

const SESSION_COOKIE = 'khaomojo_admin_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret() {
  return (
    process.env.ADMIN_PIN ||
    process.env.NEXT_PUBLIC_ADMIN_PIN ||
    'khaopiyoashkaro'
  ).trim();
}

function signTimestamp(timestamp, secret) {
  return crypto.createHmac('sha256', secret).update(String(timestamp)).digest('hex');
}

function verifyToken(token, secret) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split(':');
  if (parts.length !== 2) return false;
  const [timestampStr, signature] = parts;
  const timestamp = Number(timestampStr);
  if (!Number.isFinite(timestamp)) return false;

  // Max age check
  const now = Date.now();
  if (now - timestamp > MAX_AGE_SECONDS * 1000 || timestamp > now + 60_000) {
    return false;
  }

  const expectedSig = signTimestamp(timestamp, secret);
  try {
    const sigBuf = Buffer.from(signature, 'hex');
    const expBuf = Buffer.from(expectedSig, 'hex');
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

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

    // Timing-safe or direct comparison
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
