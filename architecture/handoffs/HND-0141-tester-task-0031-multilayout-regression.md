---
id: HND-0141
type: task
from: orchestrator
to: tester
title: Add combined multi-layout backend and frontend regression
task_section: ../tasks/TASK-0031-test-ui-cleanup-and-multilayout.md#scope
description: |
  Own test paths only. Add durable integration coverage for the accepted
  TASK-0030/TASK-0045/TASK-0046 implementation. Backend must cover exact
  layouts[].outputs identity/order and GET/200/409 shape, all four typed output
  forms, empty and pane-local error isolation, nonempty Spectrum
  frequency_scale, session exclusion/round-trip and maximum sixteen panes.
  Frontend must cover all 1x1..4x4 variants, strict envelope validation
  including failed/not-ready line data, draft/Apply/Cancel/Escape/focus,
  200/409/422 lifecycle, per-pane type/binding isolation, active Settings and
  checkbox context, simultaneous real plot hosts, pane-local states, split tab
  scroll/fixed actions, and v2 responsive geometry at 1440x900, 1280x720 and
  1024x768. Run full frontend and backend suites. Product code, design,
  architecture except this report, dependency files, Git/deploy and production
  are out of scope. Do not read, edit or rely on Project.toml or Manifest.toml.
acceptance_criteria:
  - Focused tests prove the exact authoritative contract and transient UI flows.
  - Existing full frontend and backend suites pass without regression.
  - Report exact changed test paths, assertion totals and browser-only E2E gaps.
  - Product and dependency files remain unchanged by Tester.
requested_skills:
  - tester/tester-workflow
  - tester/backend-api-testing
  - tester/backend-unit-testing
  - tester/frontend-static-behavior-testing
design_ref: ../design/TASK-0044-multilayout-ui/DESIGN.md
design_version: 2
design_status: ready
required_viewports: [1440x900, 1280x720, 1024x768]
---
