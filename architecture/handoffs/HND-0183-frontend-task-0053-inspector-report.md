---
id: HND-0183
type: report
from: frontend
to: orchestrator
title: Expanded Inspector signal row clipping fixed
task_section: ../tasks/TASK-0053-fix-inspector-expanded-row.md#verification-and-results
applied_skills:
  - frontend/frontend-workflow
  - frontend/task-analysis
  - frontend/zone-structure-api
  - frontend/design-implementation
  - frontend/inspector-ui
  - frontend/frontend-project-structure
description: |
  The absolute metadata card was clipped by sticky action-cell overflow and did
  not contribute row height. Explicit data-info-expanded state now reserves height,
  places the card below actions, releases clipping only while expanded and restores
  compact hidden state on collapse. Four frontend/test paths changed. Browser 9/9
  measured 41.78125→153.78125→41.78125px at 1440/1280/1024 with all labels,
  28px actions, focus and scroll intact. Focused 1108/1108 and full 1455/1455 pass;
  Orchestrator independently reviewed diff and repeated full 6/6. No backend,
  design, dependency, Git, deploy or session changes.
design_ref: ../design/TASK-0040-detailed-current-layout/DESIGN.md
design_version: 1
design_status: ready
---
