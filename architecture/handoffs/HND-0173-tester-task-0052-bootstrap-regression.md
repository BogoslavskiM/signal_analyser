---
id: HND-0173
type: task
from: orchestrator
to: tester
title: Verify healthy-API bootstrap ordering fix and regressions
task_section: ../tasks/TASK-0052-fix-healthy-api-layout-bootstrap.md#verification-and-results
description: |
  Review the exact five-path TASK-0052 diff and independently verify permanent
  detached runtime-node retention, parallel state/layout startup, one queued
  monotonic refresh, stale/out-of-order rejection, layouts-owned recovery,
  genuine state/layout failure and sync adapter exception cleanup. Tester owns
  test/front paths only; add assertions only for a concrete uncovered risk and
  do not alter product code. Run focused and full frontend suites and report exact
  assertion totals, coverage delta and browser-only E2E scenarios. Never inspect,
  use or modify Project.toml/Manifest.toml; no Git/deploy/production mutation.
acceptance_criteria:
  - Exact root-cause regression fails on old logic and passes fixed logic.
  - Delayed/out-of-order/recovery/genuine-failure paths are deterministic.
  - Full frontend suite passes with no product or dependency edits by Tester.
requested_skills:
  - tester/tester-workflow
  - tester/frontend-static-behavior-testing
design_ref: ../design/TASK-0044-multilayout-ui/DESIGN.md
design_version: 2
design_status: ready
---
