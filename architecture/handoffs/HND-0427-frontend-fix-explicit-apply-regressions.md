---
id: HND-0427
type: task
from: orchestrator
to: frontend
title: Fix semantic Apply busy release and 1024px select regression
task_section: ../tasks/TASK-0085-fix-explicit-apply-frontend-regressions.md#scope
description: |
  Tester HND-0426 found two release blockers. In explicit-apply.js, semantic
  rejection must preserve dirty/retry state and clear data-apply-busy after the
  event-loop turn; fix product async behavior, not the test. In layouts.css,
  add only a scoped <=1080px correction for display settings select so a 300px
  settings panel has a visible computed control >=130px; preserve accepted
  wider sizing and do not add broad max/reflow. Run full frontend suite.
allowed_paths:
  - public/js/components/explicit-apply.js
  - public/css/layouts.css
acceptance_criteria:
  - explicit_apply.behavior semantic rejection assertion passes.
  - 1024px responsive select contract passes without weakening tests.
  - Full frontend suite passes.
requested_skills: [frontend/frontend-workflow, frontend/settings-controls, frontend/output-loading-flow, frontend/design-implementation]
---
