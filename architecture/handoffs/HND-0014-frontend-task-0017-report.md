---
id: HND-0014
type: report
from: frontend
to: orchestrator
title: TASK-0017 session save/import UI implemented
task_section: ../tasks/TASK-0017-session-import-export-frontend.md#acceptance-criteria
description: >
  В public/** добавлены GET /api/session download и POST /api/session import.
  Save выгружает только opaque document. Import требует явного выбора JSON,
  обрабатывает parsing/422/409, не применяет локальный state и после success
  получает GET /api/state перед render. Добавлены доступный dialog и stable
  selectors. Проверка: node test/front/run_front_tests.js — 4/4 passed;
  git diff --check passed.
---
