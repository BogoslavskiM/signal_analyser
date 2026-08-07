---
id: HND-0177
type: task
from: orchestrator
to: e2e
title: Validate fixed production bootstrap and remaining multi-layout gaps
task_section: ../tasks/TASK-0052-fix-healthy-api-layout-bootstrap.md#verification-and-results
description: |
  Run the one mandatory post-task E2E on exact production SHA
  17482dc4aef3d86e79815a36ae950045f74fd142. First prove three independent clean
  bootstraps materialize layout-trigger, pane roots, Settings and Plotly without
  global error/null-control exception. Use browser interception to verify delayed
  layouts-first, state-first, stale/out-of-order and genuine failure/Retry recovery.
  Then complete prioritized gaps: API GET/200/409 parity/immutability, 4x4 sixteen
  real hosts with autonomous type/bindings/tab actions, and 1440/1280/1024
  document geometry. Capture one session baseline and restore exact final hashes.
  Report transport separately; no repo/Git/dependency mutation.
acceptance_criteria:
  - Bootstrap/failure scenarios, API, 4x4 and responsive totals are separate.
  - No false global toast, stuck loading or detached-node exception occurs.
  - Exact session/layout restoration and browser closure are proven.
requested_skills: [e2e/e2e-workflow, e2e/visual-analysis]
design_ref: ../design/TASK-0044-multilayout-ui/DESIGN.md
design_version: 2
required_viewports: [1440x900, 1280x720, 1024x768]
---
