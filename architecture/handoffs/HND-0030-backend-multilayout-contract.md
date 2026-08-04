---
id: HND-0030
type: task
from: orchestrator
to: backender
title: TASK-0029 — authoritative multi-layout state и session contract
task_section: ../tasks/TASK-0029-multilayout-state-contract.md#scope
description: >
  Выполни TASK-0029 строго в backend ownership (app/**, lib/**, app.jl, run.jl,
  config/**, Project.toml при необходимости). Определи versioned authoritative
  state для Display grid 1..4 по rows/columns: ordered stable pane IDs, active
  pane, independent per-pane plot type и ordered signal bindings; atomic
  revision-aware API mutation; validation; deterministic preserve/drop; session
  export/import и migration single-pane documents. Public UI/rendering,
  Playwright и architecture не изменяй. Учти, что Frontend параллельно делает
  TASK-0027, но multi-layout UI ждёт этот contract. Не откатывай чужие правки.
acceptance_criteria:
  - Выполнены criteria TASK-0029 с explicit API/session contract для Frontend/Tester.
  - Полный backend suite проходит.
  - Report перечисляет stable API payloads, errors и migration rules.
---
