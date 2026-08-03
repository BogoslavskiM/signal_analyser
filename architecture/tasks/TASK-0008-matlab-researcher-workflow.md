---
id: TASK-0008
kind: task
title: Переработать workflow MATLAB Researcher
status: done
priority: P1
queue_order: 8
owner: orchestrator
assignees: [orchestrator]
parent: null
depends_on: [TASK-0007]
blocks: []
source_handoffs: []
related_handoffs: []
blocked_by: []
blocker_reason: null
---

# Переработать workflow MATLAB Researcher

## User value

Исследователь формирует полное описание бизнес-логики MATLAB-приложения и
передаёт критические сценарии профильным агентам.

## Scope

Опциональный intake, формирование направления, MATLAB Clicker, формирование
отчётов и маршрутизация research handoff.

## Out of scope

Запуск MATLAB-исследования и изменение product code.

## Acceptance criteria

- [x] Handoff на входе необязателен и может быть общим.
- [x] Целью закреплено полное описание бизнес-логики приложения.
- [x] Документация и материалы предметной области задают направление.
- [x] Этап называется «Формирование отчётов».
- [x] Критические сценарии направляются E2E или Engee User.
- [x] Clicker-инструкции вынесены в отдельный skill.
- [x] Role, manifests и adapters валидны.

## Queue decision

- Priority: P1
- Rationale: workflow определяет источник продуктовой логики и сценариев.
- Queue order: 8
- Eligibility: TASK-0007 завершена.

## Verification and results

Обновлены role и обязательный workflow, добавлен отдельный clicker skill.
Проверены 16 skill manifests, 19 TOML-файлов и generated Codex adapters.
