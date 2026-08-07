---
id: HND-0094
type: design_task
from: orchestrator
to: designer
title: Детализировать дизайн текущей раскладки Signal Analyzer
task_section: ../tasks/TASK-0040-generate-detailed-current-layout-design.md#scope
description: Создать автономный versioned design package текущей раскладки без изменения информационной архитектуры или product code. Зафиксировать точную геометрию зон, строк, controls, таблиц и overlays и подтвердить её локальным prototype и screenshots.
acceptance_criteria:
  - Создан architecture/design/TASK-0040-detailed-current-layout/DESIGN.md с design_version и design_status ready.
  - Локальный HTML/CSS/JS prototype покрывает текущую раскладку, mock data и применимые dynamic states.
  - Точные размеры, spacing, alignment, resize и overflow rules заданы для 1440x900, 1280x720 и 1024x768.
  - Для inputs, selects, checkboxes, row actions, dropdowns, popovers, menus, dialogs и overlays заданы geometry, anchor, collision, focus и dismiss rules.
  - Reference screenshots и state/viewport matrix позволяют Frontend реализовать дизайн без визуальных догадок.
requested_skills:
  - designer/visual-system
  - designer/application-composition
  - designer/data-entry-and-inspection
  - designer/output-and-visualization
  - designer/dialog-and-file-flows
design_mode: autonomous
required_states: [default, hover, focus, active, disabled, loading, empty, error, warning, success]
required_viewports: [1440x900, 1280x720, 1024x768]
design_evidence: []
---

# Factual constraints

- Сохранять текущую продуктовую раскладку и информационную архитектуру.
- Источники решений применять в порядке: task specification, canonical
  Designer templates, corporate Engee Apps Figma, autonomous Designer
  judgment.
- Работать только в `architecture/design/**`; не менять `public/**`, backend,
  tests, Git, runtime, `Project.toml` или `Manifest.toml`.
- Учитывать существующие пользовательские изменения в worktree и ничего не
  откатывать.

# Expected report

Вернуть `design_report` с `design_ref`, `design_version`, `design_status`,
полным `applied_skills`, автономными решениями, state/viewport coverage и
точными evidence paths.
