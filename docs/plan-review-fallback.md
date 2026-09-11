# Plan-review menu compatibility fallback

## Summary

When using strict OpenAI-compatible backends that do not provide function_call/tool metadata, plan review menus can be empty or malformed. This document specifies a backwards-compatible fallback parser: try extracting structured JSON from model text first, then fall back to heuristics for numbered/bulleted lists.

## Parsing algorithm (high-level)

1. If the model response contains a `function_call` or tool metadata, use existing flow.
2. Otherwise, extract code blocks from the assistant text. For each code block:
   a. Attempt JSON.parse — if it yields an array/object representing menu items, use it.
   b. Attempt YAML parse if a YAML fence is present.
3. If no code blocks with JSON/YAML found, run list heuristics on plain text:
   - Look for numbered lists (1., 2., etc.) or bullet lists (-, *, +).
   - Each list item becomes a menu action. If an item contains a leading marker like `Recommended:` prefer it.
4. Prefer deterministic parsing order: JSON -> YAML -> numbered lists -> bullets.
5. If parsing fails entirely, show a minimal fallback UI with a single 'Accept' and 'Reject' option and attach the raw model text for manual review.

## Example JSON format the parser should accept

[
  { "id": "accept", "label": "Accept plan", "description": "Apply the plan as-is" },
  { "id": "request_changes", "label": "Request changes", "description": "Ask the model for updates" }
]

## Test vectors
See tests/plan-review-fallback-cases.json for concrete examples.

## Rationale
This approach preserves rich function-calling behavior while ensuring users on restricted backends receive usable menus.

## Implementation notes for maintainers
- Add a small parser module (language consistent with CLI codebase) that exports `parsePlanReviewOptions(text, metadata)`.
- Write unit tests that call parsePlanReviewOptions with:
  - responses containing function_call metadata (ensure existing behavior)
  - raw assistant text with code-block JSON
  - plain text numbered lists
  - bullet lists
  - malformed JSON (should fallback gracefully)

