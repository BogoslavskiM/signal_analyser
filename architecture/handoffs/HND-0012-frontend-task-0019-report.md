---
id: HND-0012
type: report
from: frontend
to: orchestrator
title: TASK-0019 busy lifecycle fixed
task_section: ../tasks/TASK-0019-fix-inspector-pending-state.md#verification-and-results
description: >
  В public/js/app.js action lifecycle теперь немедленно вызывает render после
  установки signalsActionBusy. Inspector row actions показывают disabled и
  aria-busy во время duplicate/delete request; finalizer восстанавливает
  authoritative state после success/stale/error/cancel. Проверка: node
  test/front/run_front_tests.js — 4/4 passed; git diff --check passed.
---
