---
id: HND-0007
type: task
from: orchestrator
to: frontend
title: Исправить pending busy-state Inspector row actions
task_section: ../tasks/TASK-0019-fix-inspector-pending-state.md#scope
description: >
  HND-0006 выявил P0: duplicate request не вызывает re-render, поэтому
  row actions остаются enabled без aria-busy. Исправь lifecycle в public/**,
  не меняя API/tests, и прогони полный front suite. Отправь report Tester и
  Orchestrator.
acceptance_criteria:
  - Выполнены criteria TASK-0019.
---
