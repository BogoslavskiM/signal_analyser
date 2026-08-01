---
name: agent-handoff-plan
---
# Agent Handoff Plan

## When to Use
- Нужно передать задачу конкретному role-owned агенту.
- Нужно разделить одну большую задачу на backend/frontend/tester/e2e/devops/MATLAB research части.
- Нужно зафиксировать contracts, acceptance и verification до реализации.

## When NOT to Use
- Агент уже получил конкретный scope и работает только в своей зоне.
- Нужна общая архитектурная память без немедленного handoff.

## Workflow
1. Определи owner: backend, frontend, tester, e2e-tester, devops или
   matlab-researcher.
2. Сформулируй goal как проверяемый результат, а не список файлов.
3. Укажи scope: какие поведения, контракты и файлы можно менять.
4. Укажи out_of_scope: что агент не должен чинить или проектировать.
5. Опиши contracts: payloads, state fields, UI actions, tests или scenario evidence.
6. Для каждого составного skill перечисли `enabled_optional_capabilities`.
7. Опиши acceptance: что должно быть истинно после выполнения.
8. Укажи verification commands для роли.
9. Потребуй итоговый структурированный handoff с полями `goal`, `scope`,
   `contracts`, `changes`, `verification`, `risks`, `follow-ups`,
   `next_task_candidates`.
10. Укажи risks и ожидаемые follow-up, если агент найдёт проблему вне своей
   зоны.
11. Architect сохраняет постановку и каждый материальный результат в
    `architecture/documentation/agents/handoff/`, синхронизирует internal
    task/backlog/report и client specification/decision/history/traceability по
    `architect/task-documentation`.

## Reusable Role Threads
1. Для каждой объявленной роли поддерживай не более одного открытого
   сохраняемого chat/thread. Registry связывает canonical role с неизменным
   agent ID/session.
2. Максимально загружай доступные роли независимой полезной работой из active
   tasks и backlog, но не нарушай dependencies, strict ownership и реальную
   готовность входных contracts.
3. После завершения задания не закрывай role thread. Переведи его в
   `completed standby`, сохрани last handoff и оставь пригодным для resume.
4. Новое задание для роли отправляй в тот же thread через `send_input` или
   `resume_agent`, используя canonical role + сохранённый agent ID/session.
5. Если подходящей независимой работы нет, `completed standby` является
   допустимым вынужденным простоем.
6. В `architecture/documentation/agents/handoff/` поддерживай durable registry с
   полями canonical role, agent ID/session, status, current task и last handoff,
   чтобы координацию можно было восстановить после остановки.
7. Не создавай искусственные пустые сообщения, heartbeat spam или fake-running
   loops. Открытого completed thread достаточно для standby.
8. После restart сначала попробуй продолжить сохранённый ID. Если thread
   недоступен, создай replacement той же канонической роли и зафиксируй
   `replaces`, старый/new ID и причину. Недоступность исторического ID не
   блокирует цикл.

## Проверяемая Anti-idle Orchestration
1. Для каждой persistent role веди rolling queue: текущая задача и следующая
   eligible задача должны быть известны до завершения текущей, когда backlog и
   dependencies это позволяют.
2. После каждого completed/handoff в том же orchestration cycle либо отправь в
   тот же role ID meaningful next task через `send_input`/`resume_agent`, либо
   запиши в registry точную причину `blocker`, `dependency` или
   `no-eligible-work`. Не оставляй необъяснённый idle.
3. Documentation, deployment, commit/freeze и MATLAB research являются
   параллельными lanes. E2E research/diagnostics может идти параллельно, но
   authoring и запуск нового feature scenario получает eligibility только
   после product-complete, ordinary Tester regression и interaction design
   review coherent feature или полной вкладки.
4. Каждый material MATLAB/docs/test/runtime-target handoff сразу преобразуй в task
   candidates и backlog; не жди завершения всего research или каскада.
5. При blocked critical path назначай независимые sidecars без дублирования:
   next-contract design, test matrix, bug triage, evidence promotion,
   performance/security review.
6. На каждом cascade/deploy/test milestone публикуй heartbeat/status matrix:
   canonical role + agent ID/session, active task, next queued task, blocker и
   last handoff.
7. Fake-running loops, пустые сообщения и работа без проверяемого результата
   запрещены. Полезная работа либо честный completed standby с причиной.
8. Перед docs freeze или другой долгой задачей Architect проверяет, что все
   доступные роли назначены либо registry содержит точный blocker/dependency/
   no-eligible-work reason.
9. После restart сначала bootstrap durable registry, затем resume тех же
   canonical role IDs. Новый ID допустим только при доказанной недоступности
   старого и фиксируется как замена.

## Guardrails
- Не отдавай одному агенту задачу, которая требует редактировать чужой ownership.
- Handoff должен говорить о поведении и контрактах, не только о путях.
- Рабочие роли не получают shared write access к architecture documentation;
  они обязаны вернуть структурированный handoff Architect, который один
  сохраняет durable record.
- Не запускай второй thread той же роли, пока её сохранённый thread можно
  продолжить. Новый role ID допустим только если предыдущий thread фактически
  недоступен; зафиксируй замену в registry.
- Backend handoff должен называть state/mutations/routes/tests.
- Frontend handoff должен называть zones/elements/payload fields, typed controls,
  stable `data-testid`, interactions, style constraints,
  `interaction_design_review` каждого menu item/button и
  `feature_completion` evidence.
- Tester handoff должен называть contract surfaces, stable field ids, queue/revision behavior и evidence.
- E2E handoff должен описывать enabled frontend skill ids, enabled project
  product capability ids, пользовательский сценарий, stable `data-testid`,
  target application context и наблюдаемый UI результат.
- Не выдавай E2E новый scenario на отдельную добавленную кнопку или частично
  готовое меню. Минимальный milestone — законченный inspector, вкладка или
  другой coherent user workflow с product/test/design evidence.
- E2E handoff обязательно содержит `browser_workspace_setup`: background CDP
  preferred; при интерактивном Chrome — отдельный macOS Space/desktop либо
  fullscreen fallback. До Space/focus/window actions нужна координация с
  MATLAB Researcher. MATLAB нельзя перемещать или закрывать.
- DevOps handoff перед commit/deployment должен содержать краткое объяснение,
  явный список файлов и локальный verification context.
- Maintenance shell handoff не ограничивается HTTP status. E2E фиксирует
  base/auth, target status/title/final URL/body и API probe; DevOps добавляет
  Genie process/status и application log tail. При доступных base/auth это
  `target app/proxy failure`, вероятный app-side 5xx, даже с HTTP 200; при
  недоступных base/auth — `platform outage`. После start/redeploy обязательны
  повторный target probe и исходный E2E.
- Merge handoff DevOps допустим только от Architect после явного принятия
  задачи пользователем.
- MATLAB Researcher получает от Architect имя MATLAB-приложения и цель
  исследования. Каждый сохранённый сценарий он передаёт E2E напрямую по
  системному пути и одновременно уведомляет Architect; Architect зеркалирует
  material handoff в durable documentation.
- MATLAB research handoff всегда содержит `docs_sources`,
  `documented_direction`, `clicker_setup`, `observed_undocumented_behavior`,
  `docs_vs_app_delta`, `product_tasks`, `e2e_scenarios`. Official MathWorks
  docs исследуются обычным internet research вне MATLAB и задают research map;
  clicker дополняет её фактическим undocumented поведением. MATLAB Add-On
  Explorer запрещён, а clicker ограничен workspace/Command Window и Signal
  Analyzer app.
- MATLAB `clicker_setup` подтверждает keyboard precondition: English/ASCII до
  каждого text/code/name/path input, визуальная проверка до Enter, возврат в
  English после русского UI-ввода и полная очистка с повторным набором при
  повреждённой раскладке.
- Для каждой Command Window команды `clicker_setup` подтверждает новый полный
  цикл focus -> pre-input Enter -> English/ASCII -> type -> visual verify ->
  execution Enter. Для text fields вне Command Window pre-input Enter не
  применяется.
- MATLAB `clicker_setup` фиксирует нативные mouse actions: double-click — stable
  center и два быстрых LMB clicks в system interval без movement;
  drag-and-drop — `mouseDown`, move, pause, `mouseUp`. После каждого нужна
  visual verification; click-click substitutes запрещены.
- Backend handoff по математике предоставляет formulas actually implemented,
  symbols/units/conventions, code anchors и test evidence. MATLAB Researcher
  предоставляет docs/observations/deltas; ни одна роль не изобретает product
  math. Architect курирует client math specification.
- Backend, Tester, E2E Tester, DevOps и MATLAB Researcher при вероятном дефекте
  Engee добавляют `engee_bug_candidate`: surface, environment/versions/SHA,
  minimal safe reproduction, expected/actual/frequency, exact error/log,
  artifacts, severity, isolation evidence, workaround и regression link.
  Architect сохраняет intake и публикует `user/engee_bugs/`; без isolation
  status остаётся `suspected`.
- Ephemeral evidence path допустим во внутреннем handoff, но handoff помечает
  client relevance, provenance и promotion need. Architect до cascade DoD
  переносит значимый artifact в `documentation/user/assets/` или связывает с
  durable repo file; client docs не получают temporary/user-specific links.

## Reference
Шаблон:

```text
owner:
goal:
scope:
contracts:
enabled_optional_capabilities:
changes:
verification:
risks:
follow-ups:
next_task_candidates:
source_evidence:
engee_bug_candidate: optional
files_or_folders:
out_of_scope:
acceptance:
```
