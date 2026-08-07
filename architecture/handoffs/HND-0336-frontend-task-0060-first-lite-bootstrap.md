---
id: HND-0336
type: task
from: orchestrator
to: frontend
title: Accept the first app-published state-lite snapshot without a second GET
task_section: ../tasks/TASK-0060-remediate-frontend-performance-architecture.md#acceptance-criteria
description: |
  Own public/js/layouts.js only. In onAppRendered, establish the authoritative
  detail.activeDisplayId before normalize/acceptEnvelope validates the active
  output metadata. The first valid app-published state-lite snapshot must
  materialize layout and start active-output polling without a second metadata
  GET. Preserve all state/calculation revision and context-key stale guards;
  do not weaken liteOutputRecord or accept malformed/mismatched state. No
  duplicate lifecycle definitions, visual changes or app.js Plotly ownership.
  Run node --check, diff check and exact node test/front/run_front_tests.js.
  Do not change tests/backend/architecture/dependencies or start a local app.
acceptance_criteria:
  - First valid app-published lite snapshot is accepted once.
  - Mismatched active display/output remains rejected.
  - Complete eight-file frontend corpus passes.
requested_skills: [frontend/frontend-workflow, frontend/task-analysis, frontend/zone-structure-api, frontend/output-loading-flow]
---
