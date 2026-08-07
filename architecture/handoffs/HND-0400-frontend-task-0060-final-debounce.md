---
id: HND-0400
type: task
from: orchestrator
to: frontend
title: Finish TASK-0060 exact frontend debounce contracts
task_section: ../tasks/TASK-0060-remediate-frontend-performance-architecture.md#acceptance-criteria
description: |
  Implement the last confirmed TASK-0060 product gap. Add a 150 ms trailing,
  coalescing debounce for continuous settings edits and a 350 ms trailing,
  coalescing debounce for genuinely noncritical UI-state persistence. Keep
  semantic actions immediate: plot type, add/delete screen, layout, checkbox,
  search and explicit keyboard/blur commit. Flush or cancel pending work safely
  when the authoritative context changes; preserve state_revision rejection,
  exactly-one mutation semantics, active-output-only loading and latest-only
  Plotly rendering. Do not redesign the UI and do not touch dependency files.
  Before editing, identify the exact existing noncritical state path; do not add
  a synthetic network mutation merely to satisfy 350 ms wording.
allowed_paths:
  - public/js/settings.js
  - public/js/app.js
  - public/js/layouts.js
acceptance_criteria:
  - Continuous settings input coalesces to one mutation 150 ms after the last edit.
  - The existing noncritical UI-state persistence path coalesces at 350 ms, or the report proves no such mutable path exists and records the minimal contract-safe implementation.
  - Blur, Enter and semantic actions remain immediate and never double-send.
  - Pending timers cannot publish into a stale screen, pane or state revision.
  - Existing local Plotly, mutation and design behavior remain unchanged.
  - Relevant frontend tests pass; report exact changed paths and commands.
requested_skills: [frontend/frontend-workflow, frontend/performance-patterns, frontend/design-patterns]
---
