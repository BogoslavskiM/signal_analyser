---
id: HND-0054
type: task
from: orchestrator
to: tester
title: Проверить TASK-0036 и исправить противоречивый static test contract
task_section: ../tasks/TASK-0036-apply-frontend-design-patterns.md#acceptance-criteria
requested_skills:
  - tester/frontend-static-behavior-testing
description: >
  Проверь HND-0053 строго в `test/front/**`. Добавь/обнови durable assertions
  для toolbar order import-export-help, shared interaction tokens/states,
  1024x768 minimum viewport, dialog stacking, inspector overflow и сохранённых
  selectors/a11y. Исправь test-owned contradiction в app.static.test.js:
  obsolete selectors не должны одновременно требоваться отсутствующими и
  обязательными в HTML. Используй актуальный product contract и явно сохрани
  coverage необходимых non-obsolete controls. Не исправляй product code и не
  расширяй scope на старые TASK-0014/TASK-0034; оставшиеся product findings
  верни Orchestrator. Запусти focused tests, полный frontend runner и coverage;
  верни exact counts, applied/skipped skills и report.
acceptance_criteria:
  - Test-owned contradiction устранён без ослабления новых design-pattern assertions.
  - Focused и полный frontend suites проходят либо возвращают точный product-owned blocker.
  - Изменения ограничены test/front/**.
---
