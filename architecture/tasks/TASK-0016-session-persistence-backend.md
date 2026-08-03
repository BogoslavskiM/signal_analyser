---
id: TASK-0016
kind: task
title: Реализовать контракт сохранения и импорта сессии
status: done
priority: P1
queue_order: 15
model: gpt-5.6-sol
reasoning: high
owner: orchestrator
assignees: [backender]
parent: TASK-0014
depends_on: []
blocks: []
source_handoffs: [HND-0002]
related_handoffs: []
blocked_by: []
blocker_reason: null
---

# Реализовать контракт сохранения и импорта сессии

## Scope

В owner-зоне backend спроектировать и реализовать typed, versioned и
validated contract session export/import для текущего Signal Analyzer.
Определить безопасный сериализуемый состав сессии на основе authoritative
state, обеспечить предсказуемые ошибки и revision/conflict semantics, добавить
API routes и не ломать существующие state/display/signal contracts.

До реализации проанализировать, какие данные можно корректно восстановить в
рамках текущего server-owned state. Не сохранять секреты, не создавать
неявный fallback и не заявлять frontend UI готовым.

## Out of scope

- HTML/JS/CSS и file-picker UX.
- Мультилейаут графиков.
- Тесты в `test/**` и deployment.

## Acceptance criteria

- [ ] Экспорт формирует версионированный session document из разрешённого
  authoritative state без секретов.
- [ ] Импорт валидирует schema/version/content до атомарной замены состояния.
- [ ] Ошибки input/conflict возвращаются через согласованный API response.
- [ ] Существующие API-контракты сохраняют совместимость.
- [ ] Backender передаёт API contract Frontend и затронутые сигнатуры Tester.
- [ ] Backender report отправлен Orchestrator с командами проверки.

## Queue decision

- Priority: P1.
- Rationale: это обязательная функциональная основа для нормального session
  save/import и зависимого frontend flow.
- Queue order: 15.
- Eligibility: независима от TASK-0015.

## Verification and results

Backender report HND-0008 принят. Реализованы typed versioned document,
strict parser, atomic import, stable error envelopes и GET/POST /api/session.
Полный существующий backend suite прошёл; дополнительное coverage выдано
TASK-0020.
