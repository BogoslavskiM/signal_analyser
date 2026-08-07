---
id: TASK-0071
kind: task
title: Восстановить стабильный production runtime с auto_stop=false
status: done
priority: P0
queue_order: 1
model: gpt-5.6-terra
reasoning: medium
owner: orchestrator
assignees: [devops]
parent: TASK-0055
depends_on: [TASK-0069]
blocks: [TASK-0059]
source_handoffs: [HND-0254, HND-0259]
related_handoffs: [HND-0260, HND-0269]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_refinement
ui_impact: none
---

# Stable Engee production runtime recovery

## Scope

На production Engee восстановить уже опубликованный exact clean revision
`cac83c5f445352a50f04aeeeb269b47007766d79`, вызвав `engee.genie.start` с
явным `auto_stop=false`. Не публиковать текущий dirty worktree, не менять Git,
product или dependency files. Запустить persistent lifecycle probe сразу после
readiness и повторно после не менее чем 720 секунд бездействия.

## Acceptance criteria

- [ ] Registry содержит ровно одно приложение в состоянии STARTED.
- [ ] Root и `/api/status` возвращают 200 и exact revision сразу после старта.
- [ ] Те же проверки проходят после не менее 720 quiet seconds.
- [ ] Между проверками нет maintenance и нового SIGTERM в bounded log window.
- [ ] При повторном SIGTERM сохранены controller/pod/app events и задача
  возвращена Engee User; dependency/product/Git files не затронуты.

## Queue decision

- P0: production runtime блокирует TASK-0059 и последующий E2E.
