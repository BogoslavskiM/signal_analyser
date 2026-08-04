---
id: HND-0038
type: task
from: orchestrator
to: frontend
title: TASK-0034 — удалить obsolete workspace nodes из DOM
task_section: ../tasks/TASK-0034-remove-obsolete-workspace-dom.md#scope
description: >
  Исправь tester finding HND-0037 строго в public/**: физически удали шесть
  obsolete index.html nodes и зависимые render/status writes. Не заменяй
  удаление на hidden/CSS и не трогай shared-worktree reorder implementation,
  которая ждёт TASK-0032. Сохрани session/import/help workflows. Не откатывай
  чужие edits. Запусти focused static regression и полный frontend suite.
acceptance_criteria:
  - Выполнены criteria TASK-0034.
  - Отчёт содержит команды и результаты тестов.
---
