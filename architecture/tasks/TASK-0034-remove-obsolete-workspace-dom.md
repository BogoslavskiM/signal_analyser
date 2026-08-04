---
id: TASK-0034
kind: task
title: Физически удалить obsolete Display workspace nodes и status paths
status: queued
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
related_handoffs: [HND-0038]
blocked_by: []
blocker_reason: null
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
