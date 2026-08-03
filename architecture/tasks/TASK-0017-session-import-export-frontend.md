---
id: TASK-0017
kind: task
title: Добавить frontend сохранения и импорта сессии
status: done
priority: P1
queue_order: 18
model: gpt-5.6-terra
reasoning: medium
owner: orchestrator
assignees: [frontend]
parent: TASK-0014
depends_on: [TASK-0016]
blocks: []
source_handoffs: [HND-0013]
related_handoffs: []
blocked_by: []
blocker_reason: null
---

# Добавить frontend сохранения и импорта сессии

## Scope

После `TASK-0016: done` реализовать в `public/**` Engee-стиль для экспортa
session document из GET `/api/session` и импорта выбранного JSON document
через POST `/api/session` с `{state_revision, document}`. UI должен
предоставлять доступные диалоги/состояния, browser file download/upload,
schema/validation/stale recovery и применять authoritative returned state.

## Out of scope

- Изменение backend API или session schema.
- Мультилейаут.
- Изменение test/** или architecture/**.

## Acceptance criteria

- [ ] Save выгружает именно документ backend API, не клиентскую копию state.
- [ ] Import принимает файл только после явно понятного выбора пользователя,
  отображает parsing/validation/stale errors и не подменяет state локально.
- [ ] После успешного импорта UI перерисован из authoritative server state.
- [ ] Все controls имеют stable data-testid и доступные focus/busy/error/success
  states.
- [ ] Report handoffs отправлены Tester и Orchestrator.

## Queue decision

- Priority: P1.
- Rationale: непосредственно завершает запрошенный session workflow.
- Queue order: 18.
- Eligibility: TASK-0016 завершена; задача ожидает завершения P0 TASK-0019,
  поскольку один Frontend agent уже исполняет более приоритетное исправление.

## Verification and results

Frontend report HND-0014 принят. Save/export использует opaque server document;
import reloads authoritative snapshot. Self-verification front suite 4/4
passed; независимая проверка назначена TASK-0021.
