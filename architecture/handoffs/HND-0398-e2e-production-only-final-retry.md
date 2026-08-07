---
id: HND-0398
type: task
from: orchestrator
to: e2e
title: Retry final production-only smoke once
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
production_url: https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/
expected_revision: 76cb9c6a360ed6d852203f9be0ed7a1a4003e156
description: |
  e2e_mode: new_functionality_regression
  One bounded production-only retry; prototype already passed and must not be
  repeated. Use the existing HND-0396 scenario, one visible Chrome worker and a
  reasonable navigation retry/timeout. Verify the exact final list at 1024x768
  and 1440x900, persist evidence and return immediately. Do not broaden scope,
  edit product code or launch a third cycle.
acceptance_criteria:
  - Exact SHA/readiness and final design/search/Plotly smoke pass.
  - Result is returned immediately after this single retry.
requested_skills: [e2e/e2e-workflow, e2e/visual-analysis]
---
