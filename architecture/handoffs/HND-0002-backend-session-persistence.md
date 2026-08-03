---
id: HND-0002
type: task
from: orchestrator
to: backender
title: Реализовать безопасный session export/import contract
task_section: ../tasks/TASK-0016-session-persistence-backend.md#scope
description: >
  Выполни TASK-0016 строго в app/** и lib/**. Спроектируй typed versioned
  session document и API для UI, опираясь на current authoritative state.
  Не меняй frontend или tests. Не сохраняй секреты и не заявляй deployment.
acceptance_criteria:
  - Выполнены все criteria TASK-0016.
  - API FYI отправлен Frontend, signature FYI — Tester, report — Orchestrator.
---
