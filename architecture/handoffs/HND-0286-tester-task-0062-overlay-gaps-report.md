---
id: HND-0286
type: report
from: tester
to: orchestrator
title: TASK-0062 deterministic overlay contract exposes nine Frontend gaps
task_section: ../tasks/TASK-0062-test-overlay-stacking-contract.md#acceptance-criteria
description: |
  Added 43 deterministic static clauses in one new overlay test while keeping
  the existing six-file 1732-assertion corpus green. The new gate fails on nine
  product gaps: missing pointer-inert tooltip owner and nested confirmation;
  graph-help close does not preserve pane menu for the next Escape; no shared
  newest-first overlay/focus/inert/scroll coordinator; dialogs do not lock and
  restore document scroll; screen delete does not dismiss stale pane overlays,
  trap Tab/Shift+Tab or handle backdrop dismissal; and an older dialog may
  release inert while a newer blocker remains. The test also verifies help does
  not resize/rerender Plotly. Runtime geometry remains E2E-owned. Only
  test/front/public/js/overlay.static.test.js changed; dependency/product files
  were not touched.
applied_skills: [tester/tester-workflow, tester/frontend-static-behavior-testing]
skipped_requested_skills: []
---
