---
id: HND-0251
type: task
from: orchestrator
to: tester
title: Обновить regressions под layout 10×10 и active-only outputs
task_section: ../tasks/TASK-0068-update-layout-active-only-regressions.md#scope
description: |
  Apply HND-0247 to Tester-owned backend tests only. Replace obsolete max 4×4,
  sixteen-pane and eager output-for-every-pane assumptions with authoritative
  TASK-0066 contract: 1..10 dimensions, 100 ordered metadata panes, one active
  output for active Display and [] for inactive Displays. Add deterministic
  provider counters proving zero inactive calculations and exact session
  round-trip. Run focused sets, then full backend regression. Do not change
  product/frontend/Playwright/Engee/dependency files and do not start app.
acceptance_criteria:
  - All TASK-0068 criteria have direct test and command evidence.
  - Focused affected tests and full test/back/runtests.jl pass.
  - Any product failure is reported without changing lib/app code.
requested_skills:
  - tester/backend-unit-testing
  - tester/backend-api-testing
---
