---
id: TASK-0056
kind: task
title: Зафиксировать корректную принадлежность всех настроек вкладкам
status: done
priority: P1
queue_order: 2
model: gpt-5.6-sol
reasoning: high
owner: orchestrator
assignees: [backender]
parent: TASK-0055
depends_on: []
blocks: [TASK-0058]
source_handoffs: [HND-0222]
related_handoffs: [HND-0228, HND-0232, HND-0233, HND-0236]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_refinement
ui_impact: none
---

# Settings tab ownership contract

## User value

Поля настроек расположены по функциональному смыслу и не дублируются между
Display, Time, Measurements и type-specific вкладками.

## Scope

Инвентаризировать каждое существующее settings field и закрепить единственную
вкладку. Показанный пользователем блок Options/Time units/X limits/Y limits
закрепить за Time. Зафиксировать mapping, defaults, visibility conditions и
отсутствие дублей для всех трёх страниц `Display`, `Time`, `Measurements` и
всех поддерживаемых plot types; при необходимости обновить authoritative
settings sections.

## Out of scope

Визуальная композиция, CSS, frontend rendering, performance и новые settings.

## Acceptance criteria

- [x] Полная field→tab matrix охватывает все текущие settings fields.
- [x] Каждая из трёх страниц имеет полный перечень полей и dynamic states.
- [x] Screenshot block однозначно принадлежит Time.
- [x] Дубли, потерянные и неверно условные поля отсутствуют.
- [x] Backend/API contract и migration/no-op behavior документированы и покрыты.

## Verification and results

Backender report HND-0232 confirms the current typed state/API/session contract
already contains all required fields, so backend implementation is a no-op.
The complete authoritative projection is persisted at
`../backend_documentation/TASK-0056-settings-page-ownership.md`. Existing
backend suite passes; no local runtime or dependency-file access occurred.
Designer factual FYI is HND-0233.

## Queue decision

- Priority: P1, обязательный factual contract для UI correction.
- Queue order: null; intake ещё открыт.
- Eligibility: после сигнала пользователя о завершении текущего пакета правок
  и создания общей feature branch.
