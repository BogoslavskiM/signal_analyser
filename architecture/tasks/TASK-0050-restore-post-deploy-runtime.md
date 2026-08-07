---
id: TASK-0050
kind: task
title: Восстановить production runtime 8c0d37e после post-deploy maintenance
status: done
priority: P0
queue_order: 45
model: gpt-5.6-terra
reasoning: medium
owner: orchestrator
assignees: [devops]
parent: null
depends_on: []
blocks: []
source_handoffs: [HND-0145, HND-0150, HND-0151, HND-0152, HND-0153]
related_handoffs: [HND-0154, HND-0155]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_patterns
ui_impact: none
---

# Restore post-deploy production runtime

## User value

Развёрнутый multi-layout снова доступен по exact production URL, чтобы четыре
обязательных post-task E2E могли завершиться на проверенной ревизии.

## Scope

Проверить clean production checkout/remote SHA
`8c0d37e525268b2acf4781a4cb61e823a50639f8`, managed application/listener/logs
и platform status. Без source mutation запустить существующее Genie приложение,
если оно исчезло после успешного deploy, и подтвердить устойчивые root/status/
state/layouts HTTP 200 отдельными повторными probes.

## Out of scope

Product/tests/architecture edits, commits, dependency files, merge,
devhub/fallback и изменение E2E session state.

## Acceptance criteria

- [x] Checkout branch/SHA и private remote SHA точно совпадают с requested revision.
- [x] Runtime RUNNING; product DOM и status/state/layouts возвращают HTTP 200.
- [x] Повторные external probes подтверждают доступность после restart.
- [x] Source, Git, dependencies и credentials не изменены/не сохранены.
- [x] Те же HND-0146..0149 продолжены после recovery без duplicate handoffs.

## Queue decision

P0 external availability blocker mandatory production E2E; исполняется
немедленно и не меняет уже развёрнутый product revision.

## Verification and results

Runtime recovery выдан DevOps как `HND-0154`.

DevOps report `HND-0155`: managed application/process отсутствовали при intake;
существующий clean checkout запущен один раз без source/Git изменений. Exact
local/private/production SHA `8c0d37e525268b2acf4781a4cb61e823a50639f8` совпадают,
runtime RUNNING и listener принадлежит Julia process. Три раунда root/status/
state/layouts — 12/12 HTTP 200 без redirects; product/API contract подтверждён.
Те же HND-0146..0149 немедленно продолжены.
