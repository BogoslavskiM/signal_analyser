---
id: TASK-0033
kind: task
title: Закрепить UI cleanup и table/settings behavior frontend tests
status: in_progress
priority: P1
queue_order: 31
model: gpt-5.6-terra
reasoning: medium
owner: orchestrator
assignees: [tester]
parent: TASK-0014
depends_on: []
blocks: []
source_handoffs: [HND-0035]
related_handoffs: [HND-0036, HND-0037]
blocked_by: [TASK-0034]
blocker_reason: "Strict cleanup regression needs physical DOM removal from TASK-0034 before rerun."
---

# Frontend regression для UI cleanup

## Scope

В `test/front/**` добавить устойчивые assertions для физического удаления лишних
range/top/status controls, локального Engee asset/capitalization, fixed right
row actions, optional-column eye/menu behavior, protected columns, Display tab
overflow/drag/Alt+Arrow reorder и Settings/table geometry contracts. Проверить
сохранение active display и отсутствие regression session/import/help.

## Out of scope

Product code, backend, multi-layout panes, Playwright screenshots и deployment.

## Acceptance criteria

- [ ] Tests проверяют positive interaction и negative absence из DOM (не hidden state).
- [ ] Column visibility не меняет source data и не скрывает required columns.
- [ ] Mouse/keyboard reorder сохраняет active display в client state.
- [ ] Geometry/style assertions не зависят от хрупких screenshot pixels.
- [ ] Полный frontend suite проходит и report отправлен Orchestrator.

## Queue decision

- Priority: P1.
- Rationale: пользователь требует закреплять все dynamic elements тестами.
- Queue order: 31.
- Eligibility: frontend artifact HND-0035 готов; независима от backend
  persistence и multi-layout integration.

## Verification and results

Tester handoff HND-0036 отправлен.
