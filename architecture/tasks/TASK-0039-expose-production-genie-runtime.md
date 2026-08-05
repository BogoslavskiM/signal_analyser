---
id: TASK-0039
kind: task
title: Предоставить внешний exact-revision URL production Genie runtime
status: in_progress
priority: P1
queue_order: 37
model: gpt-5.6-terra
reasoning: medium
owner: orchestrator
assignees: [devops]
parent: null
depends_on: []
blocks: []
source_handoffs: [HND-0089, HND-0090]
related_handoffs: [HND-0091]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_patterns
---

# Предоставить внешний exact-revision URL production Genie runtime

## User value

Production Signal Analyzer открывается по внешнему URL как приложение, а E2E
может подтвердить exact revision вместо пустой Engee SPA shell.

## Source evidence

E2E HND-0089/HND-0090: supplied URL отвечает HTTP 200, но возвращает Engee HTML
shell; `#root` пуст, product selectors отсутствуют, relative API probes получают
тот же HTML. Constructor/UI regressions не установлены.

## Scope

DevOps фиксирует текущий private feature checkpoint, обновляет verified
production checkout и диагностирует routing/proxy/process для Genie listener.
Вернуть внешний URL, который демонстрируемо отдаёт product DOM и runtime API,
или точный platform routing blocker. Допускаются команды/restart на production
pod в рамках DevOps pipeline.

## Out of scope

Любые изменения или использование `Project.toml`/`Manifest.toml`, dependency
installation/resolution, product source fixes, devhub/fallback и feature merge.

## Acceptance criteria

- [ ] Local/private remote/production checkout SHA совпадают.
- [ ] External URL возвращает product DOM, а `/api/status` — runtime response,
  либо возвращён точный terminal platform routing blocker.
- [ ] Existing application process/listener/proxy state и relevant logs указаны.
- [ ] Dependency files untouched; credentials not persisted or reported.

## Queue decision

- Priority: P1: blocker post-task E2E, но product implementation tasks могут
  продолжаться независимо.
- Queue order: 37.
- Model/reasoning: `gpt-5.6-terra` / `medium` по DevOps role contract.

## Stage matrix

| Stage | Decision | Reason |
|---|---|---|
| Backend/frontend/tests | not_applicable | Product contracts не меняются. |
| Dependency files | forbidden_by_user | Project/Manifest нельзя использовать. |
| Deploy/runtime routing | required | Нужен exact external application target. |
| E2E | required_after_runtime | Новый quick handoff только после DevOps exact URL/SHA. |

## Verification and results

Полный checkpoint/deploy/runtime diagnostic выдан DevOps как HND-0091.
