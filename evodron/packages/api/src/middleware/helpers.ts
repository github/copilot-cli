import crypto from 'crypto';

/**
 * Hash an IP address so it is never stored in plaintext.
 */
export function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

/**
 * Generate a random alphanumeric string of the given length.
 */
export function randomCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i]! % chars.length];
  }
  return result;
}

/**
 * Generate a UUIDv4.
 */
export function uuid(): string {
  return crypto.randomUUID();
}

/**
 * Return the current ISO timestamp.
 */
export function now(): string {
  return new Date().toISOString();
}
