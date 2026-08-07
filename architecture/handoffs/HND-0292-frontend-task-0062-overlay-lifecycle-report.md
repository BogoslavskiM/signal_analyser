---
id: HND-0292
type: report
from: frontend
to: orchestrator
title: Common newest-first overlay lifecycle implemented
task_section: ../tasks/TASK-0062-test-overlay-stacking-contract.md#acceptance-criteria
description: |
  Implemented one overlay stack covering modeless menus/help/tooltip and
  blocking main/screen-delete/nested layers. The newest blocker alone owns
  focus; older blockers are inert. Scroll lock is acquired on blocker depth
  0-to-1 and restored only at 1-to-0. Escape/outside dismissal and trigger
  restoration are centralized. Graph-help close retains the pane menu for the
  next Escape; screen delete dismisses stale pane overlays, traps Tab/Shift+Tab
  and supports pinned backdrop dismissal. Closing an older dialog cannot
  release inert while a newer blocker remains. Shared tooltip and nested
  confirmation owners use named design-v2 layers. Overlay code contains no
  Plotly.react/resize or graph geometry mutation. Syntax, diff, focused overlay
  and the full seven-file frontend suite pass. Tests, backend, architecture and
  dependency files were not changed.
applied_skills: [frontend/frontend-workflow, frontend/task-analysis, frontend/dialog-system, frontend/output-loading-flow, frontend/graph-output-zone, frontend/design-implementation]
skipped_requested_skills: []
---
