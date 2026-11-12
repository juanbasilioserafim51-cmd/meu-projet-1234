import crypto from 'node:crypto';

export const SESSION_COOKIE = 'eb_session';
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored ?? '').split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const candidate = crypto.scryptSync(String(password), salt, 64);
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

export function newToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const chunk of String(header).split(';')) {
    const index = chunk.indexOf('=');
    if (index < 0) continue;
    out[chunk.slice(0, index).trim()] = decodeURIComponent(chunk.slice(index + 1).trim());
  }
  return out;
}

export function sessionCookie(token, { secure = false, maxAgeSeconds = SESSION_TTL_MS / 1000 } = {}) {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearSessionCookie({ secure = false } = {}) {
  const parts = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}
