---
id: HND-0146
type: task
from: orchestrator
to: e2e
title: Validate deployed multi-layout user workflow
task_section: ../tasks/TASK-0030-multilayout-frontend.md#verification-and-results
description: |
  Run the mandatory new-functionality production E2E on exact revision
  8c0d37e525268b2acf4781a4cb61e823a50639f8. Exercise layout selector draft,
  Apply/Cancel/Escape/focus, representative 1x1/2x2 and stress 4x4, autonomous
  pane activation/type/bindings, simultaneous real Time/Spectrum/Spectrogram/
  Persistence plots, empty/loading/error/conflict recovery, Display tabs and
  session export/import/reload. Preserve and restore the initial session exactly.
  Production only; no repository/Git/dependency mutation.
acceptance_criteria:
  - Report functional, visual, session and console/network totals separately.
  - Prove real browser DOM/Plotly behavior and active-pane checkbox isolation.
  - Restore the exact initial state and report any reproducible defect.
requested_skills: [e2e/e2e-workflow, e2e/visual-analysis]
design_ref: ../design/TASK-0044-multilayout-ui/DESIGN.md
design_version: 2
required_viewports: [1440x900, 1280x720, 1024x768]
---
