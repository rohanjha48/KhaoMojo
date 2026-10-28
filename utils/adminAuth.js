import crypto from 'crypto';

export const SESSION_COOKIE = 'khaomojo_admin_session';
export const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export function getSecret() {
  return (
    process.env.ADMIN_PIN ||
    process.env.NEXT_PUBLIC_ADMIN_PIN ||
    'khaopiyoashkaro'
  ).trim();
}

export function signTimestamp(timestamp, secret) {
  return crypto.createHmac('sha256', secret).update(String(timestamp)).digest('hex');
}

export function verifyToken(token, secret) {
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

/**
 * Checks if incoming NextRequest has a valid admin session cookie or admin PIN header
 */
export function verifyAdminSession(request) {
  if (!request) return false;
  const secret = getSecret();

  // 1. Check HTTP-only session cookie
  const cookieVal = request.cookies?.get?.(SESSION_COOKIE)?.value;
  if (cookieVal && verifyToken(cookieVal, secret)) {
    return true;
  }

  // 2. Check x-admin-pin header (optional fallback for server-to-server or scripts)
  const pinHeader = request.headers?.get?.('x-admin-pin');
  if (pinHeader && pinHeader.trim() === secret) {
    return true;
  }

  return false;
}
