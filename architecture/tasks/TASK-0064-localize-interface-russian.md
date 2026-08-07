---
id: TASK-0064
kind: task
title: Полностью локализовать интерфейс на русский язык
status: in_progress
priority: P1
queue_order: null
model: gpt-5.6-terra
reasoning: high
owner: orchestrator
assignees: [frontend]
parent: TASK-0055
depends_on: [TASK-0057, TASK-0058]
blocks: [TASK-0061, TASK-0063]
source_handoffs: [HND-0222]
related_handoffs: [HND-0258, HND-0267, HND-0271, HND-0272, HND-0303, HND-0304, HND-0305, HND-0306, HND-0308, HND-0309]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_refinement
ui_impact: new_or_changed
design_mode: autonomous
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: 2
---

# Russian interface localization

## User value

Пользователь работает в целостном русскоязычном интерфейсе без смешения
английских и русских системных надписей.

## Scope

По pinned copy inventory перевести все product-owned visible и accessibility
strings: navigation, settings, labels, controls, buttons, menus, dialogs,
tooltips, table headers, validation, status, empty/loading/error/success states.
Сохранить без перевода и искажения user-provided names/data, conventional units,
форматы чисел, API values и технические identifiers из design allowlist.

## Out of scope

Перевод пользовательских данных, изменение backend enum/API values и создание
многоязычного переключателя, если он не будет отдельно запрошен.

## Acceptance criteria

- [ ] Весь product-owned интерфейс и accessibility copy отображаются на русском.
- [ ] Английская системная UI-копия отсутствует вне документированного allowlist.
- [ ] User data, units, numeric values и API contracts не изменены локализацией.
- [ ] Layout не ломается из-за длины русских строк на 1440/1280/1024.
- [ ] TASK-0061 static/behavior и TASK-0063 browser gates проходят.

## Queue decision

- Priority: P1, явное пользовательское требование ко всему visible product.
- Queue order: null; intake открыт, design/implementation dependencies не готовы.
- Eligibility: TASK-0057/TASK-0058 done and pinned design version available.
