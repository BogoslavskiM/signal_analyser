---
id: TASK-0074
kind: task
title: Привести production frontend к утверждённому design v2
status: in_progress
priority: P0
queue_order: 1
model: gpt-5.6-terra
reasoning: high
owner: orchestrator
assignees: [frontend]
parent: TASK-0055
depends_on: []
blocks: [TASK-0060, TASK-0063]
source_handoffs: []
related_handoffs: [HND-0348, HND-0352, HND-0353, HND-0354, HND-0356, HND-0357, HND-0358, HND-0359, HND-0360, HND-0363]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_refinement
ui_impact: covered
design_mode: review
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: 2
---

# Restore production design v2

## User value

Production должен выглядеть как утверждённый интерактивный design v2, а не как
устаревшая версия интерфейса. Пользователь прямо отклонил текущий production UI
на revision c7e0f9a4bbe145be14a197c25d0c8700c0f205ee как «древний и неправильный,
очень далёкий от истины» и требует прежде всего применения нового дизайна и
полного frontend review.

## Scope

Сопоставить каждую зону production frontend с pinned design v2 и реализовать
его в `public/**`: toolbar, Display navigation, plots/pane controls, три страницы
Display settings, inspector/table, dialogs, menus, overlays, typography, local
assets, geometry and interaction states. Сохранить принятые state-lite,
active-output, latest-only Plotly and mutation-dispatch contracts. Prototype
является visual/interaction specification; production demo JavaScript из него
не копируется.

## Out of scope

- Изменение backend API, DSP или authoritative state.
- Редизайн либо самостоятельное упрощение design v2.
- Local application runtime, CDN и dependency-file changes.

## Acceptance criteria

- [ ] Все пять design zones визуально и структурно соответствуют design v2 на
  1024×768, 1280×720 и 1440×900.
- [ ] Exact analytical-dense proportions, Roboto, canonical local SVG/assets,
  borders/radii/colors and hover/pressed/focus/disabled states применены без
  legacy shell или смешивания профилей.
- [ ] Display navigation, pane control cluster, settings pages, inspector table,
  dialogs/menus and overlay priority реализуют полный pinned interaction map.
- [ ] Все всплывающие слои — dropdown, tooltip, graph-help, pane/inspector menu,
  layout popover, основной dialog `+`, import/save, toast и nested/delete
  confirmations — соблюдают priority/hit/focus/dismissal/restoration contract,
  не пропускают pointer/focus к нижним слоям и не двигают/resize графики.
- [ ] Каждый pane содержит живой local Plotly graph; zoom/pan/autoscale,
  type/screen/layout updates and latest-only state survive the redesign.
- [ ] State-lite, active-output-only loading, revisions, 150/350 ms debounce and
  exactly-one mutation dispatch не регрессируют.
- [ ] Frontend static/behavior tests проходят; production visual E2E подтверждает
  design v2 и точную новую runtime revision.

## Queue decision

- P0: явный пользовательский rejection текущего production UI блокирует ревью.
- Queue order 1: немедленно выдан Frontend параллельно read-only E2E gap audit.
- Existing design v2 is ready and independently interaction-tested; no new
  Designer decision is required.
