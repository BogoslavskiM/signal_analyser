---
id: HND-0172
type: report
from: frontend
to: orchestrator
title: Healthy-API layout bootstrap ordering defect fixed
task_section: ../tasks/TASK-0052-fix-healthy-api-layout-bootstrap.md#verification-and-results
applied_skills:
  - frontend/frontend-workflow
  - frontend/task-analysis
  - frontend/zone-structure-api
  - frontend/design-implementation
  - frontend/output-loading-flow
  - frontend/frontend-project-structure
description: |
  Initial no-layout render detached plot/overflow controls, then attempted to
  rediscover detached nodes through document.querySelector; renderSettings failed
  on null select.value and entered the misleading global load-error path. Permanent
  node references now survive grid materialization, layout GET starts in parallel,
  stale responses queue one monotonic refresh, and state/layout recovery cannot be
  overwritten by older responses. Five frontend/test paths changed. Syntax 5/5,
  focused 846/846, full frontend 1449/1449 and deterministic Chromium 5/5 pass.
  Orchestrator independently reviewed diff and repeated full suite 6/6. No visual,
  backend, dependency, Git, deploy or session changes.
design_ref: ../design/TASK-0044-multilayout-ui/DESIGN.md
design_version: 2
design_status: ready
---
