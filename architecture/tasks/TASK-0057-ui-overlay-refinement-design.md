---
id: TASK-0057
kind: task
title: Спроектировать UI corrections и единую overlay layer system
status: done
priority: P1
queue_order: 3
model: gpt-5.6-sol
reasoning: high
owner: orchestrator
assignees: [designer]
parent: TASK-0055
depends_on: []
blocks: [TASK-0058, TASK-0064]
source_handoffs: [HND-0222]
related_handoffs: [HND-0227, HND-0233, HND-0237, HND-0239, HND-0240, HND-0241, HND-0242, HND-0258]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_refinement
ui_impact: new_or_changed
design_mode: autonomous
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: 2
---

# UI and overlay refinement design

## Scope

Подготовить versioned design package для обновлённой settings structure,
уменьшенной на 5–10 px нижней таблицы, отсутствующей inline Info, канонической
эмблемы Engee из templates и прямого основного диалога по `+`. Определить одну
layer token matrix для modal, nested modal, popover, dropdown, tooltip, toast,
backdrop, sticky headers и focus indicators. Закрепить legend каждого plot pane
внутри plot area справа сверху; определить единые малые typography, line-height,
marker size, padding, gap, max-width, wrapping/overflow и collision rules.
Полностью переработать все три страницы `Display settings` (`Display`, `Time`,
`Measurements`) как одну стандартную settings form system. Для каждой страницы
и каждого plot type задать field inventory, строки `label: control`, geometry,
states, validation и responsive overflow. Использовать применимые design
skill-patterns для стандартных dropdowns и checkboxes; checkbox не размещать
слева перед label. Полностью убрать pane-binding caption. В Signals header
оставить только название вкладки без count; рядом разместить `+` и template
vertical-ellipsis trigger, перенеся действие с eye icon внутрь его menu.
Подготовить полный русский copy inventory для production и accessibility.
По обновлённым canonical reference catalogs составить component→reference
matrix для всех button families и bordered surfaces. Закрепить exact border
width/color/style, outline, divider, radius и визуальные состояния default,
hover, active/pressed, focus-visible, disabled и loading, включая сочетания
icon-only, primary, secondary, destructive, tab и menu actions.
Обновить layout selector до разрешённого максимума `10×10`, определить
recommended envelope и точный non-blocking warning state для больших раскладок.
Показать постоянно видимую icon-only `+` action добавления экрана в строке
Display tabs на всех viewports/states, без видимой подписи `Добавить экран`;
Signals `+` рядом с ellipsis остаётся отдельным control. Overflow arrows
кликабельны и полностью скрывают left/right arrow на соответствующем крайнем
положении. Каждый screen и pane prototype содержит репрезентативный mock-график,
отрисованный настоящим local Plotly, а не image/static placeholder. Без CDN/API
прототип поддерживает Shift+ЛКМ pan, drag-selection zoom и double-click autoscale.
Первой строкой Display settings добавить canonical plot-type
dropdown, двусторонне синхронизированный с pane selector как view одного state.
Для каждого plot pane полностью убрать видимый Plotly.js modebar и любые
кнопки graph tools, не оставляя пустой toolbar container. В меню троеточия
настроек области добавить keyboard-accessible кнопку справки, открывающую
компактную подсказку с точными инструкциями `Перетаскивать график: Shift + ЛКМ`,
`Автомасштабирование: двойной клик` и
`Зум: зажать ЛКМ и выделить область`. Определить её anchor, dismissal,
focus restoration и место в общей overlay priority matrix. Compact legend
справа сверху не пересекается с area ellipsis trigger или открытой подсказкой.
Graph-help открывается отдельным overlay-слоем и не меняет layout/bounding boxes
графиков. Default startup state содержит один screen. Каждый screen tab имеет
крестик, открывающий confirmation dialog с delete/cancel и focus restoration.
В одном dropdown по area ellipsis разместить actions `Очистить область` и
`Управление графиком`; второе открывает закреплённую подсказку. Отдельных кнопок
этих действий вне menu нет. Canonical plot-type dropdown расположен вплотную
рядом с ellipsis в одном compact pane-control cluster. Cluster вертикально
центрирован внутри header row с equal top/bottom insets и не прилеплен к нижней
boundary. Chevron центрирован в control. Selected checks и ordinary checkboxes
следуют canonical references; dropdown states, item heights, padding, Roboto
typography и wrapping используют exact analytical-dense values.
Сохранить inline table row actions, кроме удаляемого Info: reserved action zone,
reveal on row hover/focus-within, точные button states и отсутствие layout shift.
Уменьшить нижнюю table zone дополнительно на 10px от текущего review layout.
Колонка `Имя` всегда видима и не имеет hide action в visibility menu/state.
В столбце цвета таблицы показывать compact color swatch без рамки вместо
видимого текстового имени/кода, сохраняя tooltip и accessible name.

## Acceptance criteria

- [ ] DESIGN.md, local prototype и screenshots покрывают 1440/1280/1024.
- [ ] Settings placement следует TASK-0056, а не visual guess.
- [ ] Все три Display settings pages и все их states представлены в DESIGN.md,
  prototype и screenshots, без placeholder или недетализированной страницы.
- [ ] Settings rows, dropdowns и checkboxes следуют выбранным skill-patterns;
  exact dimensions, alignment, menu anatomy и interaction states заданы.
- [ ] Pane-binding caption и signal count отсутствуют во всех состояниях.
- [ ] Inspector toolbar использует соседние `+` и template vertical-ellipsis;
  eye/column-visibility action находится внутри overflow menu.
- [ ] Полный русский copy inventory покрывает visible и accessibility strings;
  отдельно задан allowlist непереводимых units, user data и identifiers.
- [ ] Каждый button family и bordered component связан с конкретным reference;
  exact state tokens и допустимые отличия задокументированы.
- [ ] Hover и active/pressed состояния имеют screenshots на всех требуемых
  viewports и не изменяют layout, hit target или соседнюю геометрию.
- [ ] Layout prototype позволяет выбрать до 10 rows и 10 columns, показывает
  exact warning state для нерекомендуемых больших layouts и не блокирует Apply.
- [ ] Icon-only `+` постоянно виден в Display tabs без текста `Добавить экран`;
  Signals `+`/ellipsis показаны отдельно в inspector.
- [ ] Overflow arrows кликабельны; left/right arrow скрывается на своём краю,
  обе показаны и работают между краями.
- [ ] Каждый screen/pane в prototype и screenshots содержит график с mock data,
  axes и compact legend, реализованный interactive local Plotly без image/static
  substitute; pan/zoom/autoscale gestures реально пройдены walkthrough.
- [ ] Startup/default показывает один screen; каждый screen tab имеет close
  cross с delete/cancel confirmation и deterministic focus restoration.
- [ ] Plot type является первой строкой Display settings; оба selectors
  синхронизированы во всех states и имеют один semantic owner.
- [ ] Ни один graph pane не показывает modebar, graph-tool buttons или пустой
  toolbar container.
- [ ] Area ellipsis menu содержит доступную с клавиатуры кнопку graph-help;
  подсказка показывает три точные инструкции, закрывается детерминированно и
  возвращает focus на trigger.
- [ ] Graph-help находится в отдельном overlay layer и не изменяет geometry,
  size или Plotly viewport ни одного графика.
- [ ] Один area ellipsis dropdown содержит обе actions `Очистить область` и
  `Управление графиком`; plot-type dropdown вплотную примыкает к ellipsis как
  соседний control, без отдельной graph toolbar.
- [ ] Plot-type/ellipsis cluster вертикально центрирован в row с equal insets;
  chevron, canonical checks/checkboxes, all interaction states, item heights,
  padding и typography соответствуют source-derived profile без row inflation.
- [ ] Legend не конфликтует с area ellipsis trigger, graph-help подсказкой,
  plot-type selector или соседними panes.
- [ ] Table screenshots/prototype показывают hidden-resting и hover/focus-visible
  row actions; action column стабильна, Info отсутствует, остальные actions доступны.
- [ ] Table zone дополнительно уменьшена на 10px без clipping/scroll/hit-target
  regression; `Имя` всегда visible и не может быть скрыто из column menu.
- [ ] Цветовая ячейка показывает сам цвет swatch-элементом без видимого текста
  и без рамки/outline; selected row, tooltip и accessible name покрыты.
- [ ] Все overlay states имеют stacking, anchor, clipping и dismissal rules.
- [ ] Focus trap, Escape, outside click, scroll lock и nested restoration заданы.
- [ ] Engee asset указан точным template path и не растягивается.
- [ ] Все plot types используют единый compact legend token и upper-right anchor.
- [ ] Legend не конфликтует с pane type selector, area ellipsis/help overlay,
  axes, data labels, plotted data или overlays на 1440/1280/1024 и остаётся читаемой.

## Queue decision

- Priority: P1, required design gate for visible implementation.
- Queue order: null до записи общей feature branch.
- Eligibility: intake closed, updated canonical references available and
  feature branch created. TASK-0056 runs in parallel; any factual mapping
  delta is incorporated before the package is pinned for Frontend.
