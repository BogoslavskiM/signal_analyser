---
id: HND-0019
type: task
from: orchestrator
to: frontend
title: Завершить Engee icon visual review
task_section: ../tasks/TASK-0022-adopt-approved-engee-icons.md#scope
description: >
  Выполни TASK-0022 строго в public/**. Можешь использовать user-authorized
  source assets из ../windowdesigner/public/icons и
  ../pulse_waveform_analyser/public/icons, но добавь нужные SVG локально в
  проект и не создавай runtime external dependency. Не меняй tests/backend/
  architecture. После изменений прогони полный front suite и отправь reports.
acceptance_criteria:
  - Выполнены criteria TASK-0022.
---
