---
id: HND-0431
type: report
from: tester
to: orchestrator
title: Settings select static regression aligned with accepted design v1
task_section: ../tasks/TASK-0083-test-explicit-apply-and-math-contracts.md#scope
applied_skills: [tester/tester-workflow, tester/frontend-static-behavior-testing]
skipped_requested_skills: []
---

Updated only `test/front/public/js/settings_select_width.static.test.js` after
the source-of-truth decision. The static contract now requires the accepted
140px/minmax settings grid, rejects any selector-specific
`#display-settings-panel>#settings-view` rule at the 1080px breakpoint, and
rejects broad page/application maximum geometry. It no longer requires legacy
width or margin correction.

Verification: `node test/front/run_front_tests.js` completed successfully with
15/15 test files passed. No product file was changed by Tester.
