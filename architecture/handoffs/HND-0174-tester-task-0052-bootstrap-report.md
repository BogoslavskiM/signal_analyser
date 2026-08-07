---
id: HND-0174
type: report
from: tester
to: orchestrator
title: Healthy-API bootstrap regression verified
task_section: ../tasks/TASK-0052-fix-healthy-api-layout-bootstrap.md#verification-and-results
applied_skills: [tester/tester-workflow, tester/frontend-static-behavior-testing]
description: |
  Exact five-path review verified the old detached-node failure, permanent node
  retention, parallel bootstrap, one coalesced latest-authority refresh, stale
  rejection, layout-owned recovery, genuine state/layout failures and synchronous
  adapter cleanup. Two assertions were added for revision 2→4→6 coalescing.
  Syntax 5/5, focused 848/848 and full frontend 1451/1451 pass. V8 function
  coverage is 77.23%, +0.90 percentage points from the previous baseline.
  Orchestrator independently repeated syntax/full 6/6. No product, dependency,
  Git, deploy or production mutation by Tester.
design_ref: ../design/TASK-0044-multilayout-ui/DESIGN.md
design_version: 2
design_status: ready
---
