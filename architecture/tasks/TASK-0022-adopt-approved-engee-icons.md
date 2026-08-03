---
id: TASK-0022
kind: task
title: Заменить текстовые глифы на утверждённые Engee SVG
status: done
priority: P1
queue_order: 21
model: gpt-5.6-terra
reasoning: medium
owner: orchestrator
assignees: [frontend]
parent: TASK-0014
depends_on: [TASK-0017]
blocks: []
source_handoffs: [HND-0019]
related_handoffs: []
blocked_by: []
blocker_reason: null
---

# Заменить текстовые глифы на утверждённые Engee SVG

## Scope

В `public/**` завершить visual review TASK-0014: использовать локально
скопированные утверждённые SVG из user-authorized
`../windowdesigner/public/icons` или `../pulse_waveform_analyser/public/icons`
для save/import/help/copy/delete и релевантных новых inspector controls.
Сохранить существующие Engee CSS tokens, accessible labels и stable selectors.

## Out of scope

- Новая визуальная система или копирование CSS с референсных изображений.
- Мультилейаут, новые API, product/test/architecture changes.

## Acceptance criteria

- [ ] Текстовые action glyphs заменены уместными Engee SVG assets.
- [ ] SVG не ухудшают размер, focus/hover/disabled state или a11y names.
- [ ] Stable selectors и существующее поведение сохранены.
- [ ] Full frontend suite и git diff --check проходят.
- [ ] Report отправлен Tester и Orchestrator.

## Queue decision

- Priority: P1.
- Rationale: прямое требование финального Engee visual review; всё нужное
  локально доступно и изменение независимо от API.
- Queue order: 21.
- Eligibility: TASK-0017 завершена.

## Verification and results

Frontend report HND-0020 принят. Локальные Engee SVG заменили action glyphs;
full frontend suite прошёл. Независимая проверка выдана TASK-0024.
