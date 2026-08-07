---
id: TASK-0083
kind: task
title: Покрыть explicit Apply, MATLAB parity и frontend contracts тестами
status: done
priority: P0
queue_order: null
model: gpt-5.6-terra
reasoning: high
owner: orchestrator
assignees: [tester]
parent: TASK-0077
depends_on: [TASK-0078, TASK-0081, TASK-0082]
blocks: []
source_handoffs: [HND-0426]
related_handoffs: [HND-0415, HND-0420, HND-0423, HND-0425, HND-0426, HND-0427, HND-0430, HND-0431, HND-0466]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_refinement
ui_impact: covered
design_mode: autonomous
design_ref: null
design_version: null
---

# Scope

Add deterministic backend unit/API and frontend static/behavior tests proving
no passive/reactive calculation, draft field persistence plus one atomic Apply,
active-only materialization,
revision/race handling, draft recovery, design state wiring and MATLAB/Engee
scenario coverage. Run complete relevant suites without local app runtime.

## Acceptance criteria

- [x] Positive and negative tests fail on any passive math trigger.
- [x] Draft persistence without output invalidation, Apply atomicity, provider
  call counts, revisions and active-only behavior pass.
- [x] Frontend user events, API counts and every visible Apply state pass.
- [x] Complete backend/frontend/Engee suites pass with exact counts.

## Current result

Completed locally on 2026-08-06. The authoritative normal runner
`julia --startup-file=no --project=. test/back/runtests.jl` exited 0 after all
legacy reactive fixtures were migrated to draft → Apply → active-output
materialization. This includes DEC-043 at 26/26 and every following API/route
testset. The frontend runner exited 0 with 15/15 files; V8 function coverage is
456/666 (68.47%). Isolated API evidence remains 528/528, explicit Apply is
22/22, and the production Engee package contract is 365 accepted cases with
three documented upstream validation gaps. `git diff --check` passes.

Production browser/runtime verification remains TASK-0084 and the final
deploy/E2E stage of parent TASK-0077; it is not part of this local test task.
