---
id: HND-0052
type: task
from: orchestrator
to: frontend
title: TASK-0036 — привести весь UI к frontend design-pattern skills
task_section: ../tasks/TASK-0036-apply-frontend-design-patterns.md#scope
requested_skills:
  - frontend/zone-composition
  - frontend/application-toolbar
  - frontend/settings-controls
  - frontend/inspector-ui
  - frontend/multi-page-element
  - frontend/graph-output-zone
  - frontend/output-loading-flow
  - frontend/dialog-system
  - frontend/file-browser-dialog
  - frontend/session-import-export-ui
  - frontend/object-export-dialog
description: >
  Работай в `neuro_signal_analyser_ui_patterns` от published SHA `ce65c02` и
  только в `public/**`. Выполни element-by-element audit и implementation по
  TASK-0036. Зоны: application toolbar; Display tabs/pages; graph output и type
  controls; Settings; Signals/Measurements/Peaks inspector; session/object
  import-export, file browser и dialogs. Для каждого реально присутствующего
  элемента примени trigger-matched pattern asset/instructions; неприменимые
  явно запрошенные skills запиши в skipped_requested_skills с причиной.
  Проверь states default/hover/focus/active/disabled/busy/loading/error/success/
  empty/overflow на viewports 1440x900, 1280x720 и 1024x768. Сохрани backend
  API semantics, stable selectors и a11y; при contract gap верни отдельный
  Backender handoff вместо выдумывания API. Не меняй tests, backend,
  architecture и не выполняй старые TASK-0014 subtasks. Ты единственный
  Frontend writer этого cycle; не откатывай чужие изменения. Верни reports
  Tester и Orchestrator с applied/skipped skills, files и commands/results.
acceptance_criteria:
  - Выполнены все acceptance criteria TASK-0036.
  - Inventory связывает каждый UI element с applied/skipped pattern.
  - Stable selectors/a11y и API behavior сохранены.
  - Focused checks и полный frontend suite проходят.
---
