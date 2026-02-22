#!/bin/sh
set -e

# Migration helper: top-level cleanup
# Usage:
#   ./scripts/migrate-top-level.sh         # dry-run
#   ./scripts/migrate-top-level.sh --apply # perform moves and commit

DRY_RUN=1
if [ "$1" = "--apply" ]; then
  DRY_RUN=0
fi

echo "Proposed moves:"
printf "  - gradio -> examples/gradio\n"

if [ $DRY_RUN -eq 1 ]; then
  echo "Dry-run mode; no changes made. Run with --apply to perform the migration."
  exit 0
fi

# Perform migration
mkdir -p examples
if [ -d "gradio" ]; then
  git mv gradio examples/ || true
fi

git add -A
git commit -m "Migration: move gradio into examples/ (scripted)\n\nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>" || true

echo "Migration applied."
