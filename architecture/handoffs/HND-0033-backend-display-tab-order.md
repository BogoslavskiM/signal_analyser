---
id: HND-0033
type: task
from: orchestrator
to: backender
title: TASK-0032 — persistent order Display tabs
task_section: ../tasks/TASK-0032-display-tab-order-contract.md#scope
description: >
  Это отдельный следующий backend handoff после TASK-0029. Добавь
  revision-aware authoritative exact-permutation mutation для порядка Display
  tabs и session persistence; верни Frontend request/response/error contract.
  Не меняй public/**, drag UI, tests или architecture и не смешивай с pane
  multi-layout contract без необходимости.
acceptance_criteria:
  - Выполнены TASK-0032 criteria и backend suite проходит.
  - Report содержит API contract для Frontend follow-up.
---
