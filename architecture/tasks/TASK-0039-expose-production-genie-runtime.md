---
id: TASK-0039
kind: task
title: Предоставить внешний exact-revision URL production Genie runtime
status: done
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
related_handoffs: [HND-0091, HND-0092, HND-0093, HND-0097]
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

- [x] Local/private remote/production checkout SHA совпадают.
- [x] External URL возвращает product DOM, а `/api/status` — runtime response,
  либо возвращён точный terminal platform routing blocker.
- [x] Existing application process/listener/proxy state и relevant logs указаны.
- [x] Dependency files untouched; credentials not persisted or reported.

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

DevOps HND-0092 подтвердил один exact SHA
`18cfe33b4cf170547adba23c76c744c9e79b42ed` локально, в private remote и
production checkout. Platform-managed Genie application имеет статус RUNNING.
Внешний URL
`https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/`
возвращает HTTP 200, `<title>Signal Analyzer</title>`, `#app-shell` и
`.signal-analyser`; `/api/status` возвращает HTTP 200 JSON runtime response без
redirect. `Project.toml` и `Manifest.toml` не использовались и не изменялись.
Post-task E2E назначен отдельным HND-0093 и не переоткрывает terminal task.

E2E report `HND-0097` подтвердил mandatory availability и product DOM:
`8/9` checks PASS, `88.89%`, operational threshold пройден. Runtime не
раскрывает exact SHA браузеру и в UI присутствовал load-error при HTTP 200 API;
эти findings вынесены в отдельные follow-up records и terminal TASK-0039 не
переоткрыта.
