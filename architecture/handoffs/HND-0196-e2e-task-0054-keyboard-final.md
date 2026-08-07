---
id: HND-0196
type: task
from: orchestrator
to: e2e
title: Validate native Inspector keyboard activation in production
task_section: ../tasks/TASK-0054-fix-inspector-keyboard-activation.md#verification-and-results
description: |
  Run the one mandatory post-task E2E on exact production SHA
  a2320652445725678629ad24b325211d3100e275. At 1440x900, 1280x720 and
  1024x768 exercise native pointer, Enter and Space on Inspector Info. Prove each
  activation toggles exactly once, focus stays on the button, aria-expanded and
  accessible label track state, and metadata remains inside the expanded row.
  Assert zero mutating requests for Info and that ArrowRight on Info is inert.
  Also prove row Enter still performs exactly one /api/view request; restore the
  exact baseline session/layout before completion. No repo/Git/dependency mutation.
acceptance_criteria:
  - Production revision is independently attested from deployed static asset and report SHA.
  - Pointer, Enter and Space each pass exact click-count, focus, aria and label assertions.
  - Info and ArrowRight cause zero mutating requests; row Enter causes exactly one /api/view.
  - All three viewports pass geometry and no-overflow checks.
  - Final session/layout equals baseline and browser closes without unexpected errors.
requested_skills: [e2e/e2e-workflow, e2e/visual-analysis]
design_ref: ../design/TASK-0040-detailed-current-layout/DESIGN.md
design_version: 1
required_viewports: [1440x900, 1280x720, 1024x768]
---
