---
id: TASK-0026
kind: task
title: Добавить E2E skill визуального анализа и screenshots
status: in_progress
priority: P1
queue_order: 24
model: gpt-5.6-sol
reasoning: high
owner: orchestrator
assignees: [orchestrator]
parent: null
depends_on: [TASK-0025]
blocks: []
source_handoffs: []
related_handoffs: []
blocked_by: []
blocker_reason: null
---

# Добавить E2E skill визуального анализа и screenshots

## User value

Размеры таблиц/settings и все transient UI states проверяются по реальному
изображению и закрепляются устойчивыми browser tests.

## Scope

Добавить E2E stage skill для deterministic screenshots, visual inspection,
table/settings geometry assertions и inventory-driven покрытия всех dynamic
elements, dialogs, menus, popovers и tooltips.

## Out of scope

Немедленное изменение product CSS, выбор окончательных размеров без следующей
итерации ТЗ, автоматическое принятие screenshot baselines.

## Acceptance criteria

- [x] E2E role требует visual-analysis для UI-affecting handoff.
- [x] Skill определяет deterministic screenshot protocol и visual review.
- [x] Table/settings geometry закрепляется измеряемыми assertions.
- [x] Dynamic UI coverage matrix включает все transient element classes и
  keyboard/mouse/error/success states.
- [x] Baseline нельзя обновлять без явного approval/task.
- [ ] Skill manifest, role adapters и links проверены.

## Queue decision

- Priority: P1.
- Rationale: меняет обязательный quality gate для всех будущих UI tasks.
- Queue order: 24.
- Eligibility: выполняется Orchestrator после TASK-0025.

## Verification and results

Ожидается validation.
