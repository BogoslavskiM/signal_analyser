---
id: HND-0036
type: task
from: orchestrator
to: tester
title: TASK-0033 — закрепить UI cleanup frontend regression
task_section: ../tasks/TASK-0033-test-ui-cleanup.md#scope
description: >
  Проверить HND-0035 строго в test/front/**. Добавить durable behavior/static
  assertions для hidden obsolete controls, Engee asset/name, fixed right
  actions, column eye/menu toggles и protected columns, tab overflow +
  drag/Alt+Arrow active preservation, Settings/table geometry selectors и
  session/import/help non-regression. Не менять public/backend/architecture,
  screenshot baselines или Playwright. Не откатывать параллельные backend edits.
acceptance_criteria:
  - Выполнены criteria TASK-0033.
  - Focused и полный frontend suites проходят.
  - Report содержит непокрываемые без browser geometry/transient states для E2E.
---
