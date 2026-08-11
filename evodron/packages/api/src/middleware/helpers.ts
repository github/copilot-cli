import crypto from 'crypto';

/**
 * Hash an IP address so it is never stored in plaintext.
 */
export function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

/**
 * Generate a random alphanumeric string of the given length.
 * Uses rejection sampling to avoid modulo bias.
 */
export function randomCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const charsLen = chars.length;
  // Maximum value that produces unbiased output with rejection sampling
  const maxUnbiased = 256 - (256 % charsLen);
  let result = '';
  while (result.length < length) {
    const bytes = crypto.randomBytes(length * 2); // over-generate to reduce rounds
    for (let i = 0; i < bytes.length && result.length < length; i++) {
      const byte = bytes[i]!;
      // Reject bytes in the biased range
      if (byte < maxUnbiased) {
        result += chars[byte % charsLen];
      }
    }
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
