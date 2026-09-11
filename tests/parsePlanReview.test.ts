import { strict as assert } from 'assert';
import { parsePlanReviewOptions } from '../src/parsePlanReview';
import * as fs from 'fs';

const cases = JSON.parse(fs.readFileSync('tests/plan-review-fallback-cases.json', 'utf8'));

describe('parsePlanReviewOptions (prototype)', () => {
  for (const c of cases) {
    it(c.name, () => {
      const out = parsePlanReviewOptions(c.input, undefined, { enableFallback: true });
      // Compare labels and ids length-wise
      assert.equal(out.length, c.expected.length, `expected ${c.expected.length} items, got ${out.length}`);
      for (let i = 0; i < c.expected.length; i++) {
        assert.equal(out[i].label, c.expected[i].label, `item ${i} label mismatch`);
      }
    });
  }
});
