---
id: HND-0243
type: task
from: orchestrator
to: backender
title: Завершить и проверить backend layout contract 10×10
task_section: ../tasks/TASK-0066-layout-10x10-contract.md#scope
description: |
  Продолжи незавершённый HND-0238 по уже существующим изменениям в
  lib/domain/signal_analyser_state.jl, lib/services/signal_analyser_service.jl
  и lib/services/signal_session_service.jl. Проведи requirement-by-requirement
  аудит, исправь только backend-owned defects, выполни source/backend checks и
  верни полный implementation report. Особо докажи 1/10 acceptance, 0/11
  rejection, session/API round-trip, stable pane identity/active pane/type/
  bindings и отсутствие eager outputs для inactive panes. Не запускай
  приложение локально и не читай/не изменяй Project.toml или Manifest.toml.
acceptance_criteria:
  - Все критерии TASK-0066 подтверждены прямыми source/test evidence.
  - Existing backend edits сохранены либо точечно исправлены без отката чужой работы.
  - Изменённые API/functions перечислены для Tester/Frontend FYI при применимости.
  - Report содержит changed paths, exact commands/results, residual risks и applied_skills.
requested_skills:
  - backender/state-model
  - backender/api-contract-planning
  - backender/calculation-planning
---
