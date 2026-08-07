---
id: HND-0162
type: task
from: orchestrator
to: e2e
title: Verify healthy API browser bootstrap after runtime stabilization
task_section: ../tasks/TASK-0042-diagnose-visible-load-error.md#verification-and-results
description: |
  After TASK-0051 stabilizes exact production SHA
  8c0d37e525268b2acf4781a4cb61e823a50639f8, open at least three independent
  clean browser contexts while DevOps monitors runtime. Verify root/assets and
  status/state/session/layouts product HTTP 200, app-shell/layout-trigger/plot
  materialization, absence of false app-error/load-error, and clean console/
  network state. Read-only; do not mutate session.
acceptance_criteria:
  - Three clean contexts complete bootstrap with exact timing and DOM evidence.
  - No product API 200 leaves missing shell or false load error.
  - Runtime availability failure is separated from frontend behavior.
requested_skills: [e2e/e2e-workflow, e2e/visual-analysis]
design_ref: ../design/TASK-0044-multilayout-ui/DESIGN.md
design_version: 2
---
