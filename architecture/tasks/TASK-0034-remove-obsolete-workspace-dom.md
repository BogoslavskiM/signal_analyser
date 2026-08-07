---
id: TASK-0034
kind: task
title: Физически удалить obsolete Display workspace nodes и status paths
status: done
priority: P1
queue_order: 32
model: gpt-5.6-terra
reasoning: medium
owner: frontend
assignees: [frontend]
parent: TASK-0014
depends_on: []
blocks: [TASK-0027]
source_handoffs: [HND-0037]
related_handoffs: [HND-0038, HND-0055, HND-0106, HND-0107, HND-0109, HND-0111, HND-0112, HND-0116]
blocked_by: []
blocker_reason: null
ui_impact: none
---

# Физическое удаление obsolete UI из DOM

## Scope

В `public/**` удалить из DOM и JS lifecycle `open-window-action`,
`signals-add-selection-action`, `signals-copy-action`, `signals-delete-action`,
`display-count-status`, `active-display-status`. Сохранить согласованные
session/import/help workflows и не трогать persistent tab reorder.

## Acceptance criteria

- [ ] Ни один из шести selectors не существует в runtime DOM или JS render path.
- [ ] Existing required actions и a11y navigation сохранены.
- [ ] Focused static test и полный frontend suite проходят.

## Queue decision

- Priority: P1.
- Rationale: прямой blocker user-requested cleanup; regression подтверждает
  невыполнение acceptance criterion.
- Queue order: 32.
- Eligibility: готова к немедленному Frontend follow-up.

## Follow-up evidence

HND-0055 подтвердил, что nodes отсутствуют в HTML, но `public/js/app.js` всё
ещё содержит lifecycle/render references к шести obsolete selectors. Это
product-owned остаток TASK-0034; Tester его не менял.

## Dispatch

Существующий `HND-0038` возобновлён у Frontend 2026-08-04 после принятия
design package v1. Работа ограничена физическим cleanup уже отсутствующих
элементов и не создаёт нового видимого design scope.

## Verification and results

Frontend report `HND-0106`: изменён только `public/js/app.js`; удалены все
оставшиеся lookup/render/disabled/click/keyboard/focus paths шести obsolete
selectors. `rg public/**`, JS syntax, diff check и focused static test PASS.
Full frontend suite обнаружил stale test fixture и C24 failure; product task
остаётся in_progress до Tester TASK-0033 rerun/classification.

Tester `HND-0107` устранил только test-owned stale fixture/assertions; full
frontend suite теперь PASS `4/4`, а scan подтверждает 0 obsolete occurrences в
public. Product/test paths переданы DevOps как `HND-0109`; task остаётся
in_progress до exact runtime report и post-task E2E.

DevOps `HND-0111`: exact three paths committed/deployed на
`4861fb9eb2bf1160524b8577278ad1ca0abe2723`; production `app.js` hash совпал,
runtime clean/RUNNING, root/status HTTP 200. Task закрыта; post-task quick
regression — `HND-0112`.

E2E report `HND-0116`: `14/14`, 100%, availability mandatory PASS; all six
selectors absent in DOM and loaded sources, retained workflows visible.
