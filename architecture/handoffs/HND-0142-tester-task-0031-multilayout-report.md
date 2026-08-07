---
id: HND-0142
type: report
from: tester
to: orchestrator
title: Combined multi-layout regression passed
task_section: ../tasks/TASK-0031-test-ui-cleanup-and-multilayout.md#verification-and-results
applied_skills:
  - tester/tester-workflow
  - tester/backend-api-testing
  - tester/backend-unit-testing
  - tester/frontend-static-behavior-testing
description: |
  Three test-only files add 438 assertions for all sixteen topology variants,
  exact GET/200/409 layouts[].outputs, validation/atomic resize/session,
  strict frontend envelopes, four simultaneous renderer types, pane-local
  states, draft/Apply/Cancel/Escape/focus, 200/409/422, active bindings and v2
  responsive/tab-scroll contracts. Existing pane_outputs_test adds 87 focused
  output assertions unchanged. Focused frontend 141/141, focused backend
  384/384, full frontend 1435/1435 and full backend 2446/2446 pass. V8 function
  coverage is 76.33%; Julia executable-line coverage is 91.14%. Orchestrator
  independently reviewed tests and repeated syntax/full suites without failure.
  Browser-only computed geometry, native focus/pointer, sixteen real Plotly
  hosts and fixed actions during tab scroll are routed to production E2E. No
  product, design, dependency, Git, deploy or production changes.
design_ref: ../design/TASK-0044-multilayout-ui/DESIGN.md
design_version: 2
design_status: ready
---
