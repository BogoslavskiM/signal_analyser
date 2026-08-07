---
id: HND-0236
type: task
from: orchestrator
to: e2e
title: Post-task quick regression for settings ownership contract
task_section: ../tasks/TASK-0056-settings-tab-ownership.md#verification-and-results
description: |
  e2e_mode: quick_regression
  Trigger task TASK-0056 is a no-source-change semantic contract. After HND-0235,
  run one separate production quick regression on exact revision
  cac83c5f445352a50f04aeeeb269b47007766d79. Confirm availability and current
  three-page settings baseline without asserting not-yet-implemented movement;
  prove no regression from the completed no-op backend task. Use foreground
  visible Chrome, headless:false, one worker and restore state. No local runtime.
acceptance_criteria:
  - Availability and operational percentage are reported.
  - No backend/API/session regression attributable to TASK-0056 exists.
  - Exact production target/revision and browser visibility are reported.
requested_skills: []
browser_channel: chrome
headless: false
browser_visibility: foreground
worker_count: 1
expected_revision: cac83c5f445352a50f04aeeeb269b47007766d79
---
