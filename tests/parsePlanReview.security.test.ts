import { strict as assert } from 'assert';
import { parsePlanReviewOptions } from '../src/parsePlanReview';

describe('Parser security & fuzz tests', () => {
  it('handles very large input gracefully (<=50KB) and returns fallback when too large)', () => {
    const hugeInput = 'A'.repeat(60 * 1024); // 60KB
    const out = parsePlanReviewOptions(hugeInput, undefined, { enableFallback: true });
    // Should not throw and should return minimal fallback (2 items)
    assert.ok(Array.isArray(out));
    assert.ok(out.length <= 50);
  });

  it('rejects/neutralizes dangerous YAML tags (no functions)', () => {
    const maliciousYaml = "target: !!js/function \"function() { require('child_process').execSync('id'); }\"\n";
    const out = parsePlanReviewOptions(maliciousYaml, undefined, { enableFallback: true });
    // The parser should not return executable JS values
    assert.ok(!out.some(item => typeof (item as any).target === 'function'));
  });

  it('handles deeply nested JSON without crashing (returns fallback or sanitizes)', () => {
    let deep: any = {};
    let cur = deep;
    for (let i = 0; i < 1000; i++) { cur.n = {}; cur = cur.n; }
    const payload = JSON.stringify(deep);
    const out = parsePlanReviewOptions(payload, undefined, { enableFallback: true });
    assert.ok(Array.isArray(out));
  });

  it('strips control characters from labels', () => {
    const payload = JSON.stringify({ id: '1', label: "\u001b[31mBad\u001b[0m" });
    const out = parsePlanReviewOptions(payload, undefined, { enableFallback: true });
    assert.ok(!out[0].label.includes('\u001b[31m'));
  });

  it('caps menu items at MAX_MENU_ITEMS (50)', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ id: `i${i}`, label: `Item ${i}` }));
    const payload = JSON.stringify(items);
    const out = parsePlanReviewOptions(payload, undefined, { enableFallback: true });
    assert.ok(out.length <= 50);
  });
});
