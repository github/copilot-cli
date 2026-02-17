---
name: Triage Issues
on:
  issues:
    types: [opened, reopened]

jobs:
  triage:
    runs-on: ubuntu-latest
    permissions:
      issues: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - name: Triage issues
        uses: github/gh-aw@v1
        with:
          engine: Claude
          prompt: |
            You are an issue triage assistant. Analyze the issue and:
            1. Determine if it's a bug, feature request, or documentation update
            2. Assign appropriate labels (bug, feature, documentation, etc.)
            3. Set priority based on severity/impact (low, medium, high, critical)
            4. Add any relevant context or questions to clarify the issue

            For bugs: Verify if it's reproducible and ask for minimal reproduction steps if needed.
            For features: Assess feasibility and alignment with project goals.
            For documentation: Identify what needs clarification or improvement.

            Respond with action items (labels to add, comments to post, assignments if applicable).
---

# Triage Issues Workflow

This agentic workflow automatically triages incoming GitHub issues by:

- **Categorizing** issues (bug, feature, documentation, question)
- **Assigning priority levels** based on urgency and impact
- **Applying labels** for better organization
- **Adding context** through comments when clarification is needed

The workflow runs on every new/reopened issue and also on a Monday morning schedule to catch any backlog.
