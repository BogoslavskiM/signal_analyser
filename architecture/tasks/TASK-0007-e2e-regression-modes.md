---
id: TASK-0007
kind: task
title: Добавить три режима E2E regression
status: done
priority: P1
queue_order: 7
owner: orchestrator
assignees: [orchestrator]
parent: null
depends_on: [TASK-0006]
blocks: []
source_handoffs: []
related_handoffs: []
blocked_by: []
blocker_reason: null
---

# Добавить три режима E2E regression

## User value

Orchestrator может точно запросить быструю проверку, performance-анализ или
проверку новой feature, не меняя общий handoff contract.

## Scope

`quick_regression`, `analysis_regression` и `new_functionality_regression` в
`description` E2E task handoff и разные ожидания от отчёта.

## Out of scope

Изменение глобальных типов handoff и детализация Playwright scenarios.

## Acceptance criteria

- [x] Три режима определены без добавления нового global handoff type.
- [x] Quick regression возвращает краткий статус ключевого функционала.
- [x] Analysis regression включает полный прогон, timing и performance findings.
- [x] New-functionality regression покрывает полный workflow feature.
- [x] Manifest и role adapter валидны.

## Queue decision

- Priority: P1
- Rationale: разделяет цели запусков E2E.
- Queue order: 7
- Eligibility: TASK-0006 завершена.

## Verification and results

Обновлены E2E workflow и role. Проверены 15 skill manifests, 19 TOML-файлов
и generated Codex adapter.

## Supersession note

TASK-0025 уточняет routing: quick после обычной done task, new-functionality с
новым coverage и quick после новой функции, analysis при пустом actionable
backlog. Quick operational threshold равен 75% planned checks.
