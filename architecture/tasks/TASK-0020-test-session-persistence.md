---
id: TASK-0020
kind: task
title: Проверить backend session export/import contract
status: done
priority: P1
queue_order: 19
model: gpt-5.6-terra
reasoning: medium
owner: orchestrator
assignees: [tester]
parent: TASK-0014
depends_on: [TASK-0016]
blocks: []
source_handoffs: [HND-0010]
related_handoffs: []
blocked_by: []
blocker_reason: null
---

# Проверить backend session export/import contract

## Scope

В `test/back/**` добавить targeted contract/regression coverage для
TASK-0016. Проверить session schema, exact parser, валидный round-trip,
atomic rollback, revision/stale semantics и API envelopes.

## Out of scope

Изменение backend/product code, frontend и Playwright.

## Acceptance criteria

- [ ] Новые typed session branches имеют достаточное unit/API coverage.
- [ ] Выполнен полный backend regression suite.
- [ ] Report с командами/count/findings отправлен Orchestrator.

## Queue decision

- Priority: P1.
- Rationale: session API требует независимой regression-проверки до UI.
- Queue order: 19.
- Eligibility: TASK-0016 завершена.

## Verification and results

Focused session contract прошёл 38/38. Повторный полный запуск
`julia --project=. test/back/runtests.jl` завершился exit 0.
