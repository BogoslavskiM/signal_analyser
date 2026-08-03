---
id: TASK-0006
kind: task
title: Зафиксировать E2E intake и границы selector ownership
status: done
priority: P1
queue_order: 6
owner: orchestrator
assignees: [orchestrator]
parent: null
depends_on: []
blocks: []
source_handoffs: []
related_handoffs: []
blocked_by: []
blocker_reason: null
---

# Зафиксировать E2E intake и границы selector ownership

## User value

E2E запускается только в нужный момент, использует заданный target и не
нарушает ownership Frontend.

## Scope

Отдельный task handoff Orchestrator, target link, запрос data-testid у
Frontend и report Orchestrator.

## Out of scope

Deployment, изменение frontend-кода и детализация Playwright skills.

## Acceptance criteria

- [x] E2E принимает только task handoff Orchestrator после readiness gate.
- [x] Target link задан во входящем handoff.
- [x] Отсутствующий data-testid запрашивается у Frontend.
- [x] Report возвращается Orchestrator.
- [x] Manifest и role adapter валидны.

## Queue decision

- Priority: P1
- Rationale: определяет корректный старт и ownership E2E.
- Queue order: 6
- Eligibility: выполняется Orchestrator в своей ownership-зоне.

## Verification and results

Обновлены E2E workflow и role. Проверены 15 skill manifests, 19 TOML-файлов
и generated Codex adapter.

## Supersession note

Политика readiness gate заменена TASK-0025: E2E handoff теперь отправляется
после каждой завершённой task; отсутствие runnable production target
фиксируется в handoff и возвращается blocker report, а не отменяет dispatch.
