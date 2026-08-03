---
id: TASK-0021
kind: task
title: Проверить frontend workflow сохранения и импорта сессии
status: done
priority: P1
queue_order: 20
model: gpt-5.6-terra
reasoning: medium
owner: orchestrator
assignees: [tester]
parent: TASK-0014
depends_on: [TASK-0017, TASK-0020]
blocks: []
source_handoffs: [HND-0017]
related_handoffs: [HND-0014]
blocked_by: []
blocker_reason: null
---

# Проверить frontend workflow сохранения и импорта сессии

## Scope

В `test/front/**` проверить session download/import lifecycle: exact requests,
JSON parsing, busy/error/success, 422/409 recovery и authoritative state
reload. Запустить full frontend regression.

## Out of scope

Изменение product code, backend contract или E2E.

## Acceptance criteria

- [ ] Session UI covered by focused tests without browser-only assumptions.
- [ ] Full frontend suite passes.
- [ ] Report with commands/count/findings sent to Orchestrator.

## Queue decision

- Priority: P1.
- Rationale: функциональный user workflow должен пройти independent frontend
  regression до E2E.
- Queue order: 20.
- Eligibility: TASK-0017 и TASK-0020 завершены; выдана Tester.

## Verification and results

Focused static session UI contract и полный frontend regression прошли: 1/1 и
4/4 соответственно. Browser File/Blob lifecycle перенесён в TASK-0023.
