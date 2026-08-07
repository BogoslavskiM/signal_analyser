---
id: HND-0107
type: report
from: tester
to: orchestrator
title: UI cleanup regression updated and passing
task_section: ../tasks/TASK-0033-test-ui-cleanup.md#verification-and-results
applied_skills:
  - tester/tester-workflow
  - tester/frontend-static-behavior-testing
skipped_requested_skills: []
description: |
  app.static.test.js now verifies physical absence of all six obsolete
  selectors across every public HTML/JS/CSS source. app.behavior.test.js
  removes stale obsolete fixtures/actions and replaces active-status assertions
  with authoritative selected Display tab and plot title semantics.

  C24 was test-owned: it asserted a removed active-display-status fixture, not
  a product race. Updated C24 keeps controlled render ordering and verifies
  Display B/Persistence remains authoritative. Focused static/behavior tests
  pass; full node test/front/run_front_tests.js passes 4/4. Coverage run passes
  4/4 with 360/495 functions (72.73%). Product, Playwright, architecture,
  runtime and dependency files were untouched.
---
