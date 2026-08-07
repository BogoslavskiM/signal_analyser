---
id: HND-0257
type: task
from: orchestrator
to: backender
title: Исправить active-only pane output path и typed errors
task_section: ../tasks/TASK-0070-fix-active-only-pane-output.md#scope
description: |
  Use HND-0256 and the retained Tester reproducer. Trace every snapshot/output
  path, remove provider invocation for inactive panes/Displays, and convert an
  active provider failure into the existing typed failed pane-output payload.
  Preserve 10×10 metadata/session/revision behavior. Change backend-owned files
  only; do not edit tests/frontend/architecture/dependency files, start app or
  use localhost. Run focused source/in-process checks and report exact calls.
acceptance_criteria:
  - All TASK-0070 criteria have direct evidence.
  - Existing tests are not weakened or bypassed.
  - Report lists changed paths, execution counts, payload shape and residual risks.
requested_skills:
  - backender/state-model
  - backender/api-contract-planning
  - backender/calculation-planning
---
