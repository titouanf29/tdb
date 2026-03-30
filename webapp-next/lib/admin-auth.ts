import { createHmac, timingSafeEqual } from 'crypto';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean);
}

export function tokenForEmail(email: string): string {
  const secret = process.env.ADMIN_SECRET ?? 'fallback-secret';
  return createHmac('sha256', secret).update(normalizeEmail(email)).digest('hex');
}

export function isAdminEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  return getAdminEmails().includes(normalized);
}

export function isValidAdminToken(token: string): boolean {
  if (!token) return false;

  return getAdminEmails().some((email) => {
    const expected = tokenForEmail(email);
    const tokenBuf = Buffer.from(token, 'utf8');
    const expectedBuf = Buffer.from(expected, 'utf8');

    if (tokenBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(tokenBuf, expectedBuf);
  });
}
