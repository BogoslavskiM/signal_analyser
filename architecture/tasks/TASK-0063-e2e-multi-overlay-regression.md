---
id: TASK-0063
kind: task
title: Провести browser-контроль многослойных popup и подсказок
status: backlog
priority: P1
queue_order: null
model: gpt-5.6-terra
reasoning: high
owner: orchestrator
assignees: [e2e]
parent: TASK-0055
depends_on: [TASK-0062, TASK-0064]
blocks: []
source_handoffs: [HND-0222]
related_handoffs: [HND-0307, HND-0310]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_refinement
ui_impact: covered
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: 2
---

# Browser multi-overlay regression

## Scope

На 1440×900, 1280×720 и 1024×768 открыть допустимые combinations основных
modal, nested confirmation, layout/settings popover, dropdown, tooltip и toast.
Измерить actual stacking/occlusion, viewport clipping, pointer target, focus,
keyboard dismissal, scroll locks и state restoration. Сделать semantic/geometry
assertions durable. На каждом viewport пройти все три Display settings pages,
их dropdown/checkbox states, русский copy, Signals header и toolbar overflow
menu с eye action. Снять и сравнить reference-relevant button/border states,
включая hover и active/pressed, без geometry shift.
Проверить 10×10 layout selection и non-blocking warning, постоянно видимый
icon-only display `+` без visible label, отдельный Signals toolbar,
двустороннюю синхронизацию plot type
и отсутствие Plotly.js modebar/tools каждого rendered graph. Открыть graph-help
из area ellipsis menu, проверить точные три инструкции, pointer/keyboard
dismissal, focus restoration и отсутствие пересечения с compact legend.
Проверить отсутствие graph layout shift при help open/close, default одного
screen и close-cross confirmation с cancel/confirm. Confirmation должен быть
topmost над ранее открытыми pane menu/help; до confirm screen не удаляется.
Проверить inline row actions pointer hover и keyboard focus без geometry shift.
На каждом pane выполнить реальные Plotly interactions: Shift+ЛКМ pan,
drag-selection zoom и double-click autoscale; image/static graph запрещён.

## Acceptance criteria

- [ ] Ни один активный overlay не скрыт неправильным layer или ancestor clipping.
- [ ] Tooltip/dropdown не перехватывают modal controls и наоборот.
- [ ] Focus/Escape/outside click/scroll restoration проходят во всех combinations.
- [ ] Нет orphan backdrops, document overflow или inaccessible content.
- [ ] Все три settings pages, русский интерфейс и inspector toolbar проходят
  visual/semantic regression на каждом viewport.
- [ ] Button borders и hover/active visuals совпадают с pinned references и не
  сдвигают controls или соседний content.
- [ ] 10×10/warning, оба `+` contracts, plot-type selectors, отсутствие Plotly
  modebar/tools и area-menu graph-help проходят production checks на viewports.
- [ ] Graph-help содержит точную copy, корректно закрывается/возвращает focus,
  а legend не пересекается с trigger или подсказкой.
- [ ] Graph-help не меняет geometry графиков; default one-screen и delete
  confirmation lifecycle проходят с hit/focus/restoration evidence.
- [ ] Inline row actions появляются на hover/focus, остаются кликабельными и не
  сдвигают cells; Info отсутствует.
- [ ] Interactive Plotly gestures работают на каждом representative pane при
  скрытом modebar и не заменены screenshot/image/static canvas.
- [ ] E2E доказывает изменение axis ranges после LMB zoom и Shift+ЛКМ pan,
  восстановление ranges после double-click autoscale и сохранение этих событий
  после смены типа графика и layout; одной визуальной проверки недостаточно.
- [ ] Production quick regression threshold и exact final state проходят.

## Queue decision

- Priority: P1, прямое требование системного контроля popup layers.
- Queue order: null; зависит от implementation и deterministic tests.
- Eligibility: TASK-0058/TASK-0062 done and exact deployed revision available.
