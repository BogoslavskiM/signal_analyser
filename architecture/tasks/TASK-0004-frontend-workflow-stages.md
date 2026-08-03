---
id: TASK-0004
kind: task
title: Объединить анализ контрактов и оформить implementation Frontend
status: done
priority: P1
queue_order: 4
owner: orchestrator
assignees: [orchestrator]
parent: null
depends_on: [TASK-0003]
blocks: []
source_handoffs: []
related_handoffs: []
blocked_by: []
blocker_reason: null
---

# Объединить анализ контрактов и оформить implementation Frontend

## User value

Frontend анализирует UI и API одним этапом, затем проходит понятный
implementation и выдаёт адресные отчёты.

## Scope

Task analysis с API contracts, implementation с тремя подпунктами, запрос
Backender при нехватке данных и отчёты Tester/Orchestrator.

## Out of scope

Содержимое будущих skills и examples для implementation-подпунктов.

## Acceptance criteria

- [x] Backend-contract analysis объединён с task analysis.
- [x] Implementation содержит zoning, zone structure/API и styling.
- [x] При нехватке API определён task handoff Backender.
- [x] Определены report handoff для Tester и Orchestrator.
- [x] Skill manifests и role adapters валидны.

## Queue decision

- Priority: P1
- Rationale: задаёт полный верхнеуровневый workflow Frontend.
- Queue order: 4
- Eligibility: TASK-0003 завершена.

## Verification and results

Обновлены `task-analysis`, `frontend-workflow`, frontend role и Codex adapter.
Проверены 13 skill manifests и 19 TOML-файлов. Skills с примерами для трёх
implementation-подпунктов оставлены следующими отдельными этапами.
