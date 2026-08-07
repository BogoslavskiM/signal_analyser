---
id: TASK-0033
kind: task
title: Закрепить UI cleanup и table/settings behavior frontend tests
status: done
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
related_handoffs: [HND-0036, HND-0037, HND-0107, HND-0109, HND-0111, HND-0113, HND-0117]
blocked_by: []
blocker_reason: null
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

Tester report `HND-0107`: stale fixtures всех obsolete selectors удалены,
static assertion теперь сканирует все public HTML/JS/CSS на физическое
отсутствие. C24 классифицирован как test-owned stale assertion и переведён на
authoritative active-tab/title semantics. Focused tests и full frontend suite
PASS `4/4`; coverage `360/495` functions (`72.73%`). Blocker устранён;
product/test paths переданы DevOps в `HND-0109`, task остаётся in_progress до
exact runtime report и post-task E2E.

DevOps `HND-0111` committed/deployed exact three cleanup/test paths на SHA
`4861fb9eb2bf1160524b8577278ad1ca0abe2723`; production clean/RUNNING, root и
status HTTP 200. Task закрыта; post-task quick regression — `HND-0113`.

E2E report `HND-0117`: `8/8`, 100%; active Display tab and plot title remain
authoritative through A→B switch, session document restored exactly.
