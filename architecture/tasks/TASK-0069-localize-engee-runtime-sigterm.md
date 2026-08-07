---
id: TASK-0069
kind: task
title: Локализовать внешний SIGTERM и потерю production route Engee
status: done
priority: P0
queue_order: 1
model: gpt-5.6-sol
reasoning: xhigh
owner: orchestrator
assignees: [engee_user]
parent: TASK-0055
depends_on: []
blocks: [TASK-0059]
source_handoffs: [HND-0252, HND-0253, HND-0254]
related_handoffs: [HND-0255, HND-0259, HND-0260, HND-0268]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_refinement
ui_impact: none
---

# Engee production runtime lifecycle localization

## Scope

По LOG-0002 локализовать контракт production pod/runtime lifecycle для
`engee.genie.start`: приложение достигает Ready и отдаёт 200, затем получает
external SIGTERM без предшествующего Julia/product exception, process исчезает,
а route показывает Server maintenance. Определить repeatability, источник/
условия termination, ожидаемый process lifetime и корректный recovery path.
Создать минимальный persistent Engee contract test/probe, если platform API
позволяет детерминированную проверку. Не создавать product fallback/stub и не
менять app/lib/public или dependency files.

## Acceptance criteria

- [ ] Documented/help/observed contracts pod/app lifecycle разделены.
- [ ] Exact production version/environment, start call, timing and SIGTERM/route-loss evidence mapped.
- [ ] Persistent test/probe and exact execution result exist, or environment limitation is explicitly evidenced.
- [ ] Verdict is supported, suspected, confirmed_bug or environment_failure with `stub_authorization: false`.
- [ ] Recovery/redeploy recommendation is concrete and routed to DevOps; no product stub/fake success is proposed.

## Queue decision

- P0: production application is unavailable and blocks the active performance
  investigation. Dispatched immediately through HND-0255.
