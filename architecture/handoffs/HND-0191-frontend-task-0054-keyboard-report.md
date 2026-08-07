---
id: HND-0191
type: report
from: frontend
to: orchestrator
title: Native Inspector Enter and Space activation fixed
task_section: ../tasks/TASK-0054-fix-inspector-keyboard-activation.md#verification-and-results
applied_skills:
  - frontend/frontend-workflow
  - frontend/task-analysis
  - frontend/zone-structure-api
  - frontend/design-implementation
  - frontend/inspector-ui
  - frontend/frontend-project-structure
description: |
  Delegated row keydown excluded only inputs, so native button Enter/Space was
  prevented, misrouted to POST /api/view and rerendered away from focus. The guard
  now excludes input,button; no synthetic key handler/click was added. Four paths
  changed including a real-browser regression. Pointer/Enter/Space each toggle
  once, retain focus and produce zero API mutations; row Enter remains intact.
  Browser 28/28, focused 1117/1117 and full 1464/1464 pass. Orchestrator reviewed
  diff, repeated full 6/6 and independently ran browser 28/28. No backend/design/
  dependency/Git/deploy changes.
design_ref: ../design/TASK-0040-detailed-current-layout/DESIGN.md
design_version: 1
design_status: ready
---
