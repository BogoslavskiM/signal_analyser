---
id: HND-0017
type: task
from: orchestrator
to: tester
title: Проверить frontend workflow сохранения и импорта сессии
task_section: ../tasks/TASK-0021-test-session-ui.md#scope
description: >
  Выполни TASK-0021 только в test/front/**. Исходный frontend report:
  HND-0014; API contract: HND-0009. Покрой exact requests, JSON parsing,
  busy/error/success, 422/409 recovery и authoritative state reload. Не
  меняй product code. Верни report Orchestrator.
acceptance_criteria:
  - Выполнены criteria TASK-0021.
---
