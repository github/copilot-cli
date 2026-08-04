Integration example: wiring parsePlanReviewOptions into plan-mode flow

Context

- The parser prototype lives at src/parsePlanReview.ts in this branch.
- Many upstream CLI implementations parse model `function_call` metadata to build plan-approval menus. On strict OpenAI-compatible backends that do not provide `function_call` metadata, the parser provides a robust fallback.

TypeScript integration (example)

1) Import the parser near the code that builds the plan approval menu:

```ts
import parsePlanReviewOptions from 'path/to/parsePlanReview'; // adjust path
```

2) Replace or augment the menu building logic:

```ts
// existing variables available in scope:
// assistantText: string  -- raw assistant response text
// responseMetadata: any  -- model metadata (may include function_call)
// existing buildMenuFromFunctionCall(metadata) -> MenuItem[]

let menuItems: MenuItem[] = [];

// Prefer structured function_call metadata when present
if (responseMetadata && responseMetadata.function_call && responseMetadata.function_call.arguments) {
  try {
    const args = JSON.parse(responseMetadata.function_call.arguments);
    if (Array.isArray(args)) {
      menuItems = args.map((it: any, idx: number) => normalizeMenuItem(it, idx));
    }
  } catch {
    // Fall through to text parsing
    menuItems = parsePlanReviewOptions(assistantText, responseMetadata);
  }
} else {
  // No structured metadata — fallback to robust text parsing
  menuItems = parsePlanReviewOptions(assistantText, responseMetadata);
}

// Present menuItems to the user as before
```

3) Export/convert MenuItem shapes as needed by the UI layer.

Go integration (example)

If the CLI is implemented in Go, add a small wrapper that calls out to a TypeScript/Node helper (not ideal) or implement equivalent logic in Go using the same algorithm (JSON -> YAML -> lists). Example pseudo-code:

```go
// parsePlanReviewOptions(text string, metadata map[string]any) []MenuItem {
//   1. if metadata.function_call.arguments parse JSON
//   2. try find fenced code block with JSON/YAML — parse
//   3. search for inline JSON
//   4. look for YAML '---' docs
//   5. parse numbered lists
//   6. parse bullet lists
//   7. fallback Accept/Request changes
// }
```

Tests & validation

- Use tests/plan-review-fallback-cases.json in this branch as unit test vectors; adapt test harness to the repository's existing test framework.
- Add integration tests that simulate model responses without function_call metadata and assert the UI receives non-empty menuItems.

Notes for maintainers

- Keep existing behavior when `function_call` metadata is present.
- The parser intentionally prefers deterministic JSON/YAML parsing before heuristics.
- Consider adding optional configuration (toggle fallback parser off) for environments that must strictly avoid heuristic parsing.

If you want, generate a concrete patch (git diff) targeting a specific file path — provide the file path in the upstream repo where the plan approval menu is built and I will produce a patch-ready diff in this PR.