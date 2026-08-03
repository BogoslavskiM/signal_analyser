---
id: HND-0013
type: task
from: orchestrator
to: frontend
title: Реализовать UI сохранения и импорта сессии
task_section: ../tasks/TASK-0017-session-import-export-frontend.md#scope
description: >
  TASK-0016 завершена. Используй HND-0009 как точный API contract. Реализуй
  в public/** save/import dialogs, file download/upload, accessible lifecycle
  states and server-authoritative reload after POST. Не меняй backend/tests/
  architecture, не реализуй multi-layout и не изобретай API.
acceptance_criteria:
  - Выполнены criteria TASK-0017.
  - Report handoffs отправлены Tester и Orchestrator.
---
