---
id: HND-0066
type: task
from: orchestrator
to: tester
title: Закрепить TASK-0037 typed pane и bootstrap regression
task_section: ../tasks/TASK-0037-fix-multilayout-bootstrap-constructor.md#acceptance-criteria
requested_skills:
  - tester/backend-unit-testing
  - tester/backend-api-testing
description: >
  Проверь HND-0065 строго в `test/back/**`. Добавь durable regression для
  default_signal_analyser_state/full 1x1 pane fields, Genie.loadapp route
  registration, /api/layouts update_pane preserve/rebind/empty semantics и
  explicit-layout session parse/import/export round-trip. Не меняй product,
  frontend, Engee tests или architecture. Используй deterministic providers;
  не добавляй fallback вместо EngeeDSP. Запусти focused unit/API и полный
  backend suite, верни exact counts/findings и applied/skipped skills.
acceptance_criteria:
  - Constructor/bootstrap regression падает на старом 3-argument behavior и проходит на fix.
  - update_pane и explicit-layout session flows покрыты независимо.
  - Full backend suite проходит либо возвращён точный product blocker.
---
