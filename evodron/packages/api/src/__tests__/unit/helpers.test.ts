import { describe, it, expect } from 'vitest';
import { hashIp, randomCode, uuid, now } from '../../middleware/helpers';

describe('helpers', () => {
  describe('hashIp', () => {
    it('returns a 64-char hex string', () => {
      const hash = hashIp('192.168.1.1');
      expect(hash).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    });

    it('is deterministic for the same input', () => {
      expect(hashIp('10.0.0.1')).toBe(hashIp('10.0.0.1'));
    });

    it('produces different hashes for different IPs', () => {
      expect(hashIp('1.1.1.1')).not.toBe(hashIp('2.2.2.2'));
    });
  });

  describe('randomCode', () => {
    it('generates a code of the default length (8)', () => {
      expect(randomCode()).toHaveLength(8);
    });

    it('generates a code of a custom length', () => {
      expect(randomCode(12)).toHaveLength(12);
    });

    it('generates different codes on each call', () => {
      const codes = new Set(Array.from({ length: 20 }, () => randomCode()));
      expect(codes.size).toBeGreaterThan(15);
    });

    it('only contains safe alphanumeric characters', () => {
      const code = randomCode(100);
      expect(/^[A-Za-z0-9]+$/.test(code)).toBe(true);
    });
  });

  describe('uuid', () => {
    it('returns a valid UUID v4 format', () => {
      const id = uuid();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('generates unique values', () => {
      const ids = new Set(Array.from({ length: 50 }, () => uuid()));
      expect(ids.size).toBe(50);
    });
  });

  describe('now', () => {
    it('returns a valid ISO 8601 string', () => {
      const ts = now();
      expect(() => new Date(ts).toISOString()).not.toThrow();
      expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});
