---
id: TASK-0058
kind: task
title: Реализовать структурные и interaction UI corrections
status: done
priority: P1
queue_order: 2
model: gpt-5.6-terra
reasoning: high
owner: orchestrator
assignees: [frontend]
parent: TASK-0055
depends_on: [TASK-0056, TASK-0057, TASK-0066]
blocks: [TASK-0061, TASK-0062, TASK-0063, TASK-0064]
source_handoffs: [HND-0222]
related_handoffs: [HND-0258, HND-0263, HND-0267, HND-0271, HND-0272, HND-0275, HND-0276, HND-0281, HND-0282, HND-0283, HND-0284]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_refinement
ui_impact: new_or_changed
design_mode: autonomous
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: 2
---

# Implement UI refinements

## Scope

Реализовать pinned settings mapping/design package; уменьшить table zone на
5–10 px; удалить inline Info; заменить Engee emblem точным template asset;
удалить первичный `+` popup и сразу открывать основной dialog; внедрить единую
overlay layer/focus/scroll/dismissal систему без локальных z-index исключений;
реализовать compact upper-right legend для каждого plot pane по design tokens,
без локальных offset-исключений. Реализовать все три Display settings pages
по стандартным form/dropdown/checkbox patterns; удалить pane-binding caption и
signal count; собрать inspector toolbar из соседних `+` и template vertical
ellipsis, переместив eye/column visibility внутрь overflow menu. Реализовать
pinned reference tokens для borders/outlines/dividers/radii и всех button
hover/active/pressed/focus/disabled/loading states без ad-hoc overrides.
Реализовать layout selection до 10×10 с pinned non-blocking recommendation
warning; сохранить icon-only `+` добавления экрана постоянно видимой в Display
tabs без visible label и отдельный Signals `+` рядом с ellipsis; реализовать
кликабельные overflow arrows со скрытием соответствующей стрелки на каждом
крайнем положении; первой строкой Display settings реализовать
plot-type dropdown, synchronized bidirectionally with the active pane selector
through one authoritative state. Полностью скрыть/отключить видимый Plotly.js
modebar и graph-tool buttons без пустого container. В area ellipsis menu
реализовать actions `Очистить область` и `Управление графиком` в одном dropdown;
вторая открывает pinned трёхстрочную подсказку с keyboard flow, dismissal и
focus restoration. Plot-type dropdown разместить вплотную рядом с ellipsis в
одном pane-control cluster, вертикально центрированном внутри row с равными
top/bottom insets без bottom-edge attachment. Chevron центрировать; selected
checks/checkboxes, dropdown states, row/item sizes, padding и Roboto typography
реализовать по exact canonical tokens. Legend не должна пересекаться с trigger или
открытой подсказкой. Graph-help рендерить отдельным overlay layer без layout
shift/Plotly resize. Default state содержит один screen. У каждого screen tab
есть close cross, открывающий delete/cancel confirmation dialog.
Сохранить inline table row actions (кроме Info) с reveal на hover/focus-within
в зарезервированной зоне без изменения table geometry. В цветовой колонке
отрисовывать canonical swatch фактического цвета без видимого имени/hex-кода,
без border/outline, с tooltip и доступным именем.
Уменьшить table zone ещё на 10px от pinned review geometry. Колонку `Имя`
сделать обязательной: исключить её скрытие из menu/state/session restore.

## Acceptance criteria

- [ ] Все требования TASK-0055 реализованы без скрытых дубликатов controls.
- [ ] Все три Display settings pages реализованы по pinned design во всех states.
- [ ] Dropdown/checkbox DOM, geometry, keyboard и accessibility semantics
  соответствуют стандартным patterns без checkbox-before-label layout.
- [ ] Binding caption и signal count удалены; `+`/ellipsis/eye menu соответствуют
  закреплённой toolbar architecture и template assets.
- [ ] Button и component borders, hover и active states совпадают с pinned
  reference matrix и не вызывают layout shift.
- [ ] 10×10 layout разрешён, warning не блокирует Apply и state/session round-trip.
- [ ] Icon-only display `+` виден на всех viewports/states; Signals toolbar
  сохраняет отдельные `+`/ellipsis controls по pinned design.
- [ ] У display `+` нет видимой подписи `Добавить экран`; tooltip/accessibility
  name сохранены, а overflow arrows кликабельны и скрываются на своём краю.
- [ ] Каждый rendered screen/pane содержит график для текущего ready payload;
  интерактивный Plotly принимает готовые graph data, а image/static placeholder
  их не заменяет; pan/zoom/autoscale работают при скрытом modebar.
- [ ] Рендер и последующие layout/type/data updates сохраняют живой Plotly DOM
  instance и event handling; raster snapshot, background image, static SVG/
  Canvas или другой неинтерактивный fallback запрещены.
- [ ] По умолчанию существует один screen; close cross каждого tab открывает
  confirmation, cancel сохраняет screen, confirm удаляет, focus восстановлен.
- [ ] Settings/pane plot-type selectors остаются двусторонне синхронны без race.
- [ ] Ни один rendered graph не показывает modebar, graph tools или пустое
  место под них; lazy rendering не создаёт лишний browser DSP.
- [ ] Area-menu graph-help доступен pointer/keyboard users, содержит точную
  pinned copy, корректно закрывается и восстанавливает focus.
- [ ] Graph-help overlay не меняет layout/Plotly viewport и не запускает
  resize/reflow графиков при open/close.
- [ ] `Очистить область` и `Управление графиком` находятся в одном ellipsis
  menu; plot-type dropdown вплотную примыкает к trigger, отдельных кнопок нет.
- [ ] Pane-control cluster и chevron центрированы; equal vertical insets,
  canonical checks/checkboxes, hover/pressed/selected/focus/disabled, item
  heights и fonts совпадают с pinned design без bottom attachment/layout shift.
- [ ] Legend не пересекается с area ellipsis или graph-help подсказкой.
- [ ] Inline row actions доступны на hover и keyboard focus, не меняют ширины
  колонок и не возвращают удалённый Info.
- [ ] Table zone дополнительно уменьшена на 10px без clipping/scroll regression;
  `Имя` всегда отображается и не имеет hide control/state.
- [ ] Цветовая колонка отображает фактический цвет swatch-элементом без
  видимого текста и без рамки/outline, сохраняя tooltip и accessible name.
- [ ] `+` открывает основной dialog одним click/keyboard activation.
- [ ] Overlay system не содержит ad-hoc layer conflicts.
- [ ] Легенда каждого графика использует pinned upper-right anchor и compact
  token, не перекрывая данные или controls.
- [ ] Responsive geometry и accessibility соответствуют design package.

## Queue decision

- Priority: P1, основной visible implementation package.
- Queue order: null; dependencies и intake не завершены.
- Eligibility: TASK-0056/TASK-0057 done and feature branch recorded.
