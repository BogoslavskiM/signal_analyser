---
id: HND-0064
type: task
from: orchestrator
to: backender
title: TASK-0037 — исправить default pane construction и Genie bootstrap
task_section: ../tasks/TASK-0037-fix-multilayout-bootstrap-constructor.md#scope
requested_skills:
  - backender/state-model
description: >
  Работай в `neuro_signal_analyser_ui_patterns`, backend ownership only.
  Воспроизведён exact error: signal_display_default_layout вызывает
  SignalDisplayPaneState(String, SignalAnalyserPlot, Vector{String}), но
  current type требует полный state. Исправь минимально и типобезопасно,
  сохрани all current defaults/settings/bindings и 1x1 migration semantics.
  Проверь default_signal_analyser_state, Genie.loadapp route registration и
  backend suite. Не меняй public, tests или architecture; Engee analysis
  not_applicable. Ты единственный Backend writer. Верни FYI Tester и report
  Orchestrator с applied/skipped skills, files и commands/results.
acceptance_criteria:
  - Выполнены acceptance criteria TASK-0037.
  - Product changes ограничены backend ownership.
  - Report содержит exact root cause и compatibility decision.
---
