Title: Top-level cleanup: move examples/gradio and add scripts

Summary:
This branch performs a top-level cleanup: it moves the top-level gradio directory into examples/gradio, and adds scripts/migrate-top-level.sh, scripts/README.md, and examples/README.md. install.sh is intentionally left at the repository root to preserve the curl|sh installer behavior.

Patch:
A format-patch of the branch is saved at:
/home/vscode/.copilot/session-state/499fa254-c980-4afc-9b7c-4264fb5e64e5/patches/top-level-cleanup.patch

How to apply the patch locally (if you prefer to push from your environment):
  git checkout -b copilot/philosophical-cattle
  git am /home/vscode/.copilot/session-state/499fa254-c980-4afc-9b7c-4264fb5e64e5/patches/top-level-cleanup.patch
  git push --set-upstream origin copilot/philosophical-cattle
  gh pr create --title "Top-level cleanup: move examples/gradio and add scripts" --body "Moves gradio -> examples/gradio and adds migration helper script and READMEs. Patch available in session-state."

Notes:
- install.sh remains at the repo root to preserve installer compatibility.
- If you want me to push and open the PR from this environment, provide push access or add a fork remote I can push to.

