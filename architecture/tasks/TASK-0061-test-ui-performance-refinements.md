---
id: TASK-0061
kind: task
title: Покрыть UI corrections и performance budgets регрессиями
status: in_progress
priority: P1
queue_order: null
model: gpt-5.6-terra
reasoning: high
owner: orchestrator
assignees: [tester]
parent: TASK-0055
depends_on: [TASK-0058, TASK-0060, TASK-0064, TASK-0065]
blocks: []
source_handoffs: [HND-0222]
related_handoffs: [HND-0411]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_refinement
ui_impact: covered
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: 2
---

# UI and performance regression tests

## Scope

Добавить backend/frontend static/behavior tests для tab mapping, прямого `+`
dialog, отсутствия inline Info, template emblem, table geometry hooks и
performance architecture invariants/budgets. Добавить deterministic проверки
legend anchor, compact token, overflow и отсутствия пересечений с controls;
полноты трёх Display settings pages, стандартной dropdown/checkbox anatomy,
отсутствия binding caption/signal count и `+`/ellipsis/eye menu composition.
Проверить русскую UI-копию по inventory и allowlist технических значений.
Добавить deterministic token/state проверки reference borders и button
default/hover/active/pressed/focus-visible/disabled/loading variants.
Закрепить backend cache hit/miss, active-page-only CPU/network, lightweight
pending, monotonic state/calculation revisions и race rejection; frontend exact
debounce, lazy local Plotly, latest-only render и отсутствие browser DSP/CDN.
Покрыть layout boundary 1×1/10×10/out-of-range, recommendation warning,
постоянную видимость icon-only display `+` без visible label, отдельный Signals
`+`/ellipsis, кликабельные overflow arrows и их скрытие на left/right edge,
synchronized pane/settings plot selectors, полное отсутствие видимого Plotly
modebar/graph tools и наличие graph-help в area ellipsis menu. Проверить точную
copy подсказки, keyboard dismissal/focus restoration и отсутствие пересечения
legend с trigger/help overlay. Проверить один ellipsis dropdown с actions
`Очистить область`/`Управление графиком` и плотное соседство plot-type dropdown.
Проверить symmetric row embedding, centered chevron, canonical checks/checkboxes,
dropdown hover/pressed/selected/focus/disabled, exact item heights и Roboto fonts.
Добавить regression для сохранённых inline row actions: resting/hover/focus,
reserved geometry, action semantics и отсутствие Info. Закрепить цветовую
ячейку как swatch фактического значения без видимого имени/hex-кода, включая
отсутствие border/outline, tooltip/accessibility name и selected-row state.
Покрыть default одного screen и close-cross confirmation: cancel/confirm,
focus restoration и отсутствие преждевременного удаления.
Проверить дополнительное уменьшение table zone на 10px и invariant always-
visible колонки `Имя` во view state, visibility menu и session restore.

## Acceptance criteria

- [ ] Все новые contracts имеют deterministic positive/negative coverage.
- [ ] Legend geometry contract проверяется для каждого plot type и viewport.
- [ ] Каждая из трёх settings pages имеет deterministic state/field coverage.
- [ ] Запрещённые caption/count/checkbox-before-label patterns не возвращаются.
- [ ] Русская локализация покрыта автоматической проверкой без false positives
  на user data, units и technical identifiers.
- [ ] Reference border/button-state tokens защищены от локальных overrides и
  layout shift во время hover/active transitions.
- [ ] Performance regression падает при возврате исходного stall mechanism.
- [ ] State-lite/cache/revision/active-only и frontend render contracts имеют
  deterministic positive/negative coverage.
- [ ] Layout 10×10 round-trip, warning, оба `+` contracts, selector sync,
  отсутствие modebar/tools и area-menu graph-help защищены positive/negative tests.
- [ ] Tests подтверждают отсутствие видимого `Добавить экран`, accessible name
  icon-only `+`, scroll effect стрелок и их hidden state на обоих краях.
- [ ] Ready graph payload отображается графиком в каждом pane, а не пустым
  placeholder/image/static mock; interactive pan/zoom/autoscale защищены
  behavior tests, empty/loading/error остаются отдельными states.
- [ ] Точная help copy, overlay dismissal/focus restoration и отсутствие
  пересечения с legend защищены deterministic assertions.
- [ ] Help open/close не меняет graph bounding boxes и не инициирует Plotly
  resize; отдельный overlay layer подтверждён interaction assertions.
- [ ] Menu composition и geometry доказывают обе actions в одном dropdown и
  contiguous plot-type/ellipsis control cluster без отдельных action buttons.
- [ ] Computed styles/bounding boxes доказывают equal top/bottom inset,
  centered chevron, canonical mark assets, exact dropdown states, row/item
  dimensions и typography без unexpected wrapping/layout shift.
- [ ] Inline row actions не теряются и не сдвигают table на hover/focus; Info
  остаётся удалённым.
- [ ] Color cell tests подтверждают swatch rendering, отсутствие видимого
  text value, border/outline и сохранение доступного имени.
- [ ] Default one-screen и delete confirmation покрыты: cross, cancel, confirm,
  focus restore и no-delete-before-confirm.
- [ ] Table geometry отражает additional -10px без clipping; positive/negative
  tests запрещают скрытие `Имя` любым UI/state/session path.
- [ ] Полные frontend/backend suites проходят.

## Queue decision

- Priority: P1, обязательный gate feature package.
- Queue order: null; final implementation revision is deployed and exact
  debounce coverage is accepted in HND-0403.
- Eligibility: implementation dependencies are materially complete; final
  deterministic matrix is active in HND-0411.
