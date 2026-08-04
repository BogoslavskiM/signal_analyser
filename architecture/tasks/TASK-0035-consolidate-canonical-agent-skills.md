---
id: TASK-0035
kind: task
title: Собрать каноническую архитектуру ролей и вызываемых subskills
status: in_progress
priority: P1
queue_order: 33
model: gpt-5.6-sol
reasoning: high
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

# Каноническая архитектура ролей и subskills

## User value

Новая системная структура сохраняется, а полезная конкретика старой
архитектуры становится вызываемыми по trigger subskills без смешения Engee,
E2E и DevOps responsibilities.

## Scope

- Восстановить канонический `architecture/` из новой структуры
  `architecture_1/`.
- Добавить requested/applied subskill protocol в handoff и role workflows.
- Разделить Engee User, E2E и DevOps.
- Передать `test/engee/**` Engee User.
- Перенести согласованные Backender, Frontend и Tester subskills.
- Не создавать subskills с неясной самостоятельной ответственностью.

## Out of scope текущего этапа

- Решение по отдельным `frontend-state-management`, `ui-contract-change`,
  `layout-geometry` и `style-system`.
- Выделение дополнительных E2E subskills поверх общего workflow и
  `visual-analysis`.
- DevOps subskills: роль использует один полный автономный workflow.
- Перегенерация root adapters до завершения архитектурного обсуждения.

## Acceptance criteria

- [x] `architecture/` существует и архивы не изменены.
- [x] Handoff поддерживает `requested_skills`, `applied_skills` и причины skip.
- [x] Engee User владеет analysis, persistent contract tests и bug evidence.
- [x] E2E не владеет Git/deployment.
- [x] DevOps использует `neuro_dev`, feature branches и один полный pipeline
  для branch/deploy/accepted merge intake.
- [x] Согласованные backend/frontend/tester skills перенесены в schema 2.
- [x] Role-to-skill references валидируются.
- [ ] Закрыты решения по оставшимся спорным frontend skills.
- [ ] Source adapters перегенерированы после финального review.

## Queue decision

- Priority: P1.
- Rationale: пользователь явно начал сборку итоговой архитектуры; дальнейшая
  миграция зависит от стабильных role и skill boundaries.
- Queue order: 33.
- Eligibility: изменение находится целиком в Orchestrator ownership.

## Verification and results

- `ruby architecture/skills/validate_skills.rb` — 42 manifests, 8 role
  catalogs, schema 2 и role references проходят.
- Все source role TOML успешно разобраны Julia TOML parser.
- Перенесённые frontend/tester JavaScript assets проходят `node --check`.
- Julia templates Tester проходят `Meta.parseall`.
