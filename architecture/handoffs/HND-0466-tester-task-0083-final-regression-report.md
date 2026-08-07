---
id: HND-0466
type: report
from: tester
to: orchestrator
title: TASK-0083 complete local regression
task_section: ../tasks/TASK-0083-test-explicit-apply-and-math-contracts.md#acceptance-criteria
applied_skills: [tester/tester-workflow, tester/backend-unit-testing, tester/backend-api-testing, tester/frontend-static-behavior-testing]
skipped_requested_skills: []
evidence_status: local_complete_production_e2e_pending
---

## Result

The authoritative full backend runner
`julia --startup-file=no --project=. test/back/runtests.jl` completed with exit
code 0. All service, lifecycle, session, calculation, settings, route and API
testsets reached terminal passing summaries. The final migrated legacy set,
`DEC-043 Persistence Density Limits are authoritative presentation`, passed
26/26. Its provider payload is now established only through explicit active
output; field responses remain lightweight, passive snapshots reuse cached raw
data, and presentation-only density changes cause zero provider calls.

The final frontend static/behavior runner completed with exit code 0 and 15/15
test files passing. V8 coverage contains four project scripts and reports 456
of 666 functions covered (68.47%). No static, behavior or Node runtime error was
reported. Browser visual/runtime interaction remains production E2E ownership.

Previously completed evidence retained by this gate:

- isolated settings/API matrix: 528/528;
- explicit Apply and MATLAB Time contracts: 22/22;
- production EngeeDSP 0.72.0 matrix: 365 accepted cases, with three intentional
  validation gaps recorded in the Engee bug document;
- `git diff --check`: exit code 0.

TASK-0083 is complete. TASK-0077 remains open only for production root-404
diagnostics, exact deployment and foreground E2E after the mandatory DevOps
lock becomes available.
