---
id: HND-0182
type: task
from: orchestrator
to: frontend
title: Fix clipped expanded Inspector signal row
task_section: ../tasks/TASK-0053-fix-inspector-expanded-row.md#scope
description: |
  Reproduce HND-0181 and implement the minimum Frontend-owned fix so an expanded
  signal row exposes Samples, Sample rate, Duration and Type instead of remaining
  41.78125px and clipping metadata. Preserve collapsed density, action-column
  reachability, checkbox/focus/aria-expanded behavior, table scroll owners and all
  required viewports. Add static/behavior tests for expanded/collapsed visibility
  and geometry contract. Own only necessary public frontend and test/front paths.
  No backend/session/design/dependency/Git/deploy changes; never inspect/use/edit
  Project.toml or Manifest.toml.
acceptance_criteria:
  - Root CSS/DOM cause and exact changed paths are reported.
  - Expanded and collapsed states are deterministic and accessible.
  - Focused/full frontend suites and bounded browser geometry pass.
requested_skills:
  - frontend/frontend-workflow
  - frontend/task-analysis
  - frontend/inspector-ui
  - frontend/design-implementation
  - frontend/frontend-project-structure
design_ref: ../design/TASK-0040-detailed-current-layout/DESIGN.md
design_version: 1
design_status: ready
required_viewports: [1440x900, 1280x720, 1024x768]
---
