---
id: TASK-0073
kind: task
title: Исправить зависание до отправки plot-type и delete-display mutations
status: in_progress
priority: P0
queue_order: 1
model: gpt-5.6-terra
reasoning: high
owner: orchestrator
assignees: [frontend]
parent: TASK-0055
depends_on: []
blocks: [TASK-0059, TASK-0060, TASK-0063]
source_handoffs: [HND-0310]
related_handoffs: [HND-0311, HND-0313, HND-0314, HND-0315, HND-0316, HND-0317, HND-0318, HND-0319, HND-0343, HND-0349, HND-0350, HND-0351]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_refinement
ui_impact: covered
design_mode: autonomous
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: 2
---

# Frontend mutation dispatch recovery

## User value

Смена типа интерактивного графика и удаление экрана завершаются немедленной
серверной mutation, а интерфейс не остаётся навсегда в busy-состоянии.

## Source evidence

HND-0310 на production SHA `555b6815...` зафиксировал переход в
`Обновление…`/disabled без POST приложения и browser error
`Cannot set properties of null (setting 'textContent')`. Активный Plotly при
этом остаётся live и не является причиной stalls.

## Scope

Устранить исключение в синхронном render path до enqueue/dispatch. Рендер
должен безопасно обновлять заголовок как при legacy shell host, так и когда
active Plotly host принадлежит pane runtime. Plot-type change и подтверждённое
delete-display обязаны отправлять ровно один корректный product mutation и
завершать busy lifecycle. Сохранить latest-only Plotly.react, overlay lifecycle
и pinned визуальный дизайн без видимых изменений.

## Out of scope

Backend payload architecture, изменение API contract, новый дизайн, локальный
application runtime и изменения dependency files.

## Acceptance criteria

- [ ] Ни один supported pane-host topology не вызывает null DOM write в render.
- [ ] Plot-type change отправляет ровно один product mutation и принимает
  authoritative ready snapshot без вечного disabled/loading.
- [ ] Delete confirmation отправляет ровно один `/api/displays` mutation,
  закрывает dialog и восстанавливает active screen/focus.
- [ ] После обеих mutations график остаётся live `Plotly.react`; zoom,
  Shift+ЛКМ pan и double-click autoscale не регрессируют.
- [ ] Full deterministic frontend corpus проходит без ослабления assertions.
- [ ] Production E2E восстанавливает один canonical screen и повторяет
  незавершённые HND-0302/HND-0307 проверки.

## Queue decision

- Priority: P0 — блокирует базовые действия и оставляет production state
  незавершённым.
- Queue order: 1, раньше дальнейшей performance architecture.
- Eligibility: root cause evidence HND-0310 и pinned design готовы.
---
