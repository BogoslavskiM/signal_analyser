---
id: HND-0242
type: design_task
from: orchestrator
to: designer
title: Пересобрать P0-навигацию экранов, graph help и таблицу сигналов
task_section: ../tasks/TASK-0067-revise-display-toolbar-and-signal-row-actions.md#scope
design_mode: review
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: null
design_status: partial
required_states: [default-one-screen, screen-list-overflow, left-scroll-edge, middle-scroll-position, right-scroll-edge, arrow-hover, arrow-focus-visible, arrow-active, screen-close-hover, screen-close-focus-visible, delete-screen-confirmation-open, delete-screen-cancelled, delete-screen-confirmed, active-area-context-action, area-ellipsis-menu, graph-help-open-no-layout-shift, graph-help-dismissed, table-row-hover, table-row-focus-within, color-swatch-borderless, color-swatch-selected, inline-action-hover, inline-action-focus-visible, inline-action-active, inline-action-disabled, long-last-cell]
required_viewports: [1440x900, 1280x720, 1024x768]
required_overlay_combinations: [area-menu-plus-graph-help, graph-help-plus-legend, delete-screen-confirmation-plus-pane-menu-help, blocking-dialog-plus-stale-dropdown-tooltip, passive-toast-plus-active-dialog]
description: |
  Выполни TASK-0067 как приоритетную ревизию единого пакета TASK-0057. Явные
  требования пользователя в TASK-0067 заменяют прежние HND-0239/HND-0241:
  видимые Plotly modebar и graph tools должны отсутствовать полностью, без
  пустого container; вместо них в меню троеточия каждой области нужна
  keyboard-accessible справка с закреплённой трёхстрочной copy. Цвет в таблице
  сигналов показывается самим цветом через canonical swatch, не видимым
  текстом. Display add — только icon-only `+` без видимой подписи. Overflow
  arrows реально прокручивают tabs и полностью скрываются на своём left/right
  edge. Каждый screen/pane показывает настоящий interactive local Plotly graph
  с axes/traces/legend, не image/static placeholder; Shift+ЛКМ pan, selection
  zoom и double-click autoscale реально работают. Один dropdown по area ellipsis
  содержит actions `Очистить область` и `Управление графиком`; вторая открывает
  graph-help. Plot-type dropdown расположен вплотную рядом с ellipsis в едином
  compact pane-control cluster. По user review cluster вертикально центрирован
  в header row с equal top/bottom insets и без bottom-edge attachment; chevron
  центрирован, checks/checkboxes и dropdown states/rows/fonts следуют exact
  canonical references. Остальной current visual design принят пользователем.
  Graph-help открывается отдельным overlay layer
  без изменения graph geometry. Default содержит один screen; close cross на
  каждом tab открывает delete/cancel confirmation. Table color swatch не имеет
  border/outline. Нижняя table zone дополнительно уменьшается на 10px от
  current review geometry; колонка `Имя` always-visible и не имеет hide action.
  Подготовь одно целостное review-ready
  решение и полностью кликабельный
  prototype; не редактируй production frontend.
acceptance_criteria:
  - Все acceptance criteria TASK-0067 покрыты DESIGN.md, prototype interaction map и screenshots.
  - Использован один source-derived analytical-dense profile без смешивания geometry или ad-hoc colors.
  - Graph tools отсутствуют; area-menu help, compact upper-right legend и overlay focus/restoration contract не конфликтуют.
  - Таблица показывает color swatch без видимого text value и сохраняет inline actions внутри последней content cell без layout shift.
  - Display add показан только `+`; arrows кликабельны и скрываются на краях; каждый screen/pane содержит interactive local Plotly graph with tested pan/zoom/autoscale.
  - Clear-area и graph-control actions находятся в одном ellipsis menu; plot-type dropdown вплотную примыкает к нему.
  - Help overlay не двигает графики; default один screen; close cross требует confirmation; table swatch без рамки.
  - Pane-control cluster/chevron центрированы; canonical checks, dropdown states, item geometry and typography исправлены по user review; остальной дизайн принят.
  - Lower table zone is additional 10px shorter; Name column cannot be hidden.
  - Пакет покрывает все три Display settings pages и связанные требования TASK-0057, включая русский copy inventory.
  - В review mode возвращается review-ready package либо один конкретный material user decision; Frontend до отчёта не запускается.
requested_skills:
  - designer/application-composition
  - designer/data-entry-and-inspection
  - designer/output-and-visualization
  - designer/dialog-and-file-flows
---
