---
id: HND-0041
type: task
from: orchestrator
to: e2e
title: Quick regression после TASK-0035
task_section: ../tasks/TASK-0035-consolidate-canonical-agent-skills.md#verification-and-results
description: |
  e2e_mode: quick_regression
  trigger_task: TASK-0035
  target_status: unavailable
  target_link: https://engee.com
  planned_scope: Проверить доступность project-locked production target и
  выполнить доступную quick regression без devhub/fallback. TASK-0035 меняет
  agent architecture, а не runtime product; не трактовать отсутствие product
  revision как пройденную проверку.
acceptance_criteria:
  - Report содержит availability и planned/passed/failed/not-run с 75% metric.
  - Findings не переоткрывают terminal TASK-0035.
requested_skills: []
---
