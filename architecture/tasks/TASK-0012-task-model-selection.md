---
id: TASK-0012
kind: task
title: Добавить выбор model и reasoning в задачи
status: done
priority: P1
queue_order: 12
model: gpt-5.6-sol
reasoning: high
owner: orchestrator
assignees: [orchestrator]
parent: null
depends_on: [TASK-0011]
blocks: []
source_handoffs: []
related_handoffs: []
blocked_by: []
blocker_reason: null
---

# Добавить выбор model и reasoning в задачи

## Scope

Поля `model` и `reasoning`, правила выбора и этап выбора в workflow
Orchestrator.

## Acceptance criteria

- [x] Task template содержит оба поля.
- [x] Task registry определяет допустимые значения и правила выбора.
- [x] `max` запрещён.
- [x] Backlogging заполняет профиль до `queued`.
- [x] Workflow Orchestrator содержит model selection.
- [x] Manifests, TOML и adapters валидны.

## Verification and results

Поля и правила добавлены в task registry, backlogging и workflow Orchestrator.
Проверены 17 skill manifests, 19 TOML-файлов и generated Codex adapters.
