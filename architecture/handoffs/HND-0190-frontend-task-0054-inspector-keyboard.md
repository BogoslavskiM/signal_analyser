---
id: HND-0190
type: task
from: orchestrator
to: frontend
title: Fix native Enter and Space Inspector Info activation
task_section: ../tasks/TASK-0054-fix-inspector-keyboard-activation.md#scope
description: |
  Reproduce HND-0189 with a real browser and identify the exact keydown/click/
  focus path that prevents native Enter/Space activation on the focused Info
  button. Implement the minimal fix so Enter and Space each toggle exactly once,
  retain focus and synchronize row/ARIA/label without an API mutation. Preserve
  pointer behavior, disclosure geometry, focus ring, row actions and unrelated
  keyboard shortcuts. Add behavior/static and real-browser repeat-toggle tests.
  Own only necessary public frontend and test/front paths. No backend/design/
  dependency/Git/deploy changes; never inspect Project.toml or Manifest.toml.
acceptance_criteria:
  - Exact event-handler/root cause is reported.
  - Enter/Space/pointer each toggle once with retained focus.
  - Focused/full frontend and browser tests pass without unrelated shortcut regressions.
requested_skills:
  - frontend/frontend-workflow
  - frontend/task-analysis
  - frontend/inspector-ui
  - frontend/design-implementation
  - frontend/frontend-project-structure
design_ref: ../design/TASK-0040-detailed-current-layout/DESIGN.md
design_version: 1
design_status: ready
---
