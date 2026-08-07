---
id: HND-0409
type: task
from: orchestrator
to: tester
title: Regress final 1024px settings-select width correction
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
description: |
  Add a durable CSS/static regression for the HND-0410 responsive rule. Assert
  the legacy desktop rule remains, the max-1080 correction reduces the left
  offset and guarantees a usable select width, and no broad viewport maximum or
  Plotly/static regression is introduced. Product code is read-only.
allowed_paths:
  - test/front/**
acceptance_criteria:
  - The 1024 responsive width contract is covered deterministically.
  - Existing page-minimum, design-v2 and Plotly contracts remain green.
  - Complete frontend corpus passes.
requested_skills: [tester/tester-workflow, tester/frontend-static-behavior-testing]
---
