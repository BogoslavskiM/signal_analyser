---
id: TASK-0027
kind: idea
title: Переработать размеры таблиц/settings и покрыть dynamic UI
status: backlog
priority: P2
queue_order: null
model: null
reasoning: null
owner: orchestrator
assignees: []
parent: TASK-0014
depends_on: []
blocks: []
source_handoffs: []
related_handoffs: []
blocked_by: []
blocker_reason: null
---

# Переработать размеры таблиц/settings и покрыть dynamic UI

## User value

Таблицы и settings имеют комфортную плотность, предсказуемые размеры и
визуально корректные динамические состояния в Engee style.

## Source evidence

Пользователя не устраивают текущие высоты строк, ширины колонок и размеры
controls/settings. Конкретные целевые размеры будут детализироваться следующими
backlog-итерациями и visual reference review.

## Scope

- Проанализировать screenshots текущего production UI и reference images.
- Зафиксировать целевые row/header heights, column sizing rules, settings
  control heights/widths, padding/gaps, overflow/wrapping и responsive limits.
- Инвентаризировать и покрыть E2E tests все menus, dialogs, dropdowns,
  popovers, tooltips, hover/focus row actions, toasts, loading/error/success,
  overlays, tabs и expandable states.
- Использовать semantic/interaction assertions, geometry checks и screenshot
  evidence по `e2e/visual-analysis`.

## Out of scope

- Мультилейаут графиков.
- Копирование CSS с reference images.
- Реализация до фиксации конкретных visual targets в следующих итерациях.

## Acceptance criteria

- [ ] Согласована измеряемая geometry specification для tables/settings.
- [ ] Frontend применил Engee style и geometry specification.
- [ ] Для каждого dynamic element/state есть stable selector и coverage row.
- [ ] E2E screenshots и geometry assertions подтверждают результат.
- [ ] Quick/new-functionality regression проходит по актуальному workflow.

## Queue decision

- Priority: P2.
- Rationale: важное UI/UX улучшение, которое пользователь продолжает
  детализировать; пока не готово к dispatch.
- Queue order: не назначен для `kind: idea`.
- Eligibility: ожидает следующие backlog-итерации с visual targets.

## Verification and results

Идея зафиксирована; product implementation не начиналась.
