---
id: TASK-0009
kind: task
title: Разделить Engee User на два mode skill
status: done
priority: P1
queue_order: 9
owner: orchestrator
assignees: [orchestrator]
parent: null
depends_on: [TASK-0008]
blocks: []
source_handoffs: []
related_handoffs: []
blocked_by: []
blocker_reason: null
---

# Разделить Engee User на два mode skill

## Scope

`engee-analysis` и `genie-deploy`, report output, самостоятельный bug-файл и
обязательный branch prefix `neuro_`.

## Acceptance criteria

- [x] У Engee User ровно два skill.
- [x] Название analysis skill не содержит слова function.
- [x] Analysis возвращает `report` handoff.
- [x] Engee User создаёт bug-файл и передаёт Orchestrator ссылку с summary.
- [x] Deploy создаёт `neuro_` branch до add/commit/push при неверном prefix.
- [x] Manifests, roles и adapters валидны.

## Verification and results

Добавлены `engee-analysis` и `genie-deploy`; прежний общий workflow удалён.
Проверены 17 skill manifests, 19 TOML-файлов и generated Codex adapters.
