---
id: TASK-0036
kind: task
title: Привести UI-элементы к применимым frontend design-pattern skills
status: done
priority: P1
queue_order: 34
model: gpt-5.6-terra
reasoning: high
owner: orchestrator
assignees: [frontend]
parent: null
depends_on: [TASK-0035]
blocks: []
source_handoffs: []
related_handoffs: [HND-0042, HND-0044, HND-0045, HND-0046, HND-0047, HND-0048, HND-0051, HND-0052, HND-0053, HND-0054, HND-0055, HND-0056, HND-0057, HND-0058, HND-0059, HND-0060, HND-0061, HND-0062, HND-0063, HND-0071, HND-0072, HND-0073, HND-0074, HND-0075, HND-0076, HND-0088, HND-0090]
blocked_by: []
blocker_reason: null
feature_slug: signal_analyser_ui_patterns
development_branch: neuro_signal_analyser_ui_patterns
integration_sha: null
---

# Привести UI-элементы к применимым frontend design-pattern skills

## User value

Все элементы Signal Analyzer используют согласованные паттерны интерфейса,
поэтому выглядят и ведут себя единообразно во всех поддерживаемых состояниях.

## Source evidence

Прямой запрос пользователя от 2026-08-04 после добавления конкретных
frontend design-pattern skills в `architecture/skills/frontend/`.

## Scope

Провести element-by-element review и привести реализации к применимым patterns
из `architecture/skills/frontend/`. В handoff Frontend запросить только skills,
которые реально покрывают соответствующую UI-зону:

- `frontend/application-toolbar` — верхняя панель и global actions;
- `frontend/settings-controls` — поля, dropdowns, checkboxes и states настроек;
- `frontend/inspector-ui` — таблицы Signals, selection и row actions;
- `frontend/multi-page-element` — Display и нижние tabs/pages;
- `frontend/graph-output-zone` — plot panes, type menus и overlays;
- `frontend/dialog-system`, `frontend/file-browser-dialog`,
  `frontend/session-import-export-ui`, `frontend/object-export-dialog` — только
  для фактически затронутых dialog/export flows;
- `frontend/zone-composition`, `frontend/zone-structure-api` и
  `frontend/styling` — для связанной структуры зон, поведения и визуальных states.

Зафиксировать в отчётах `applied_skills` и обоснованные
`skipped_requested_skills` по каждому запрошенному pattern.

## Out of scope

- Применение skill, если его trigger не соответствует UI-элементу.
- Изменение backend contracts без отдельной task/handoff.
- Копирование дизайна с внешних screenshots вместо локальных pattern assets.
- Dispatch, реализация, тестирование и deployment в рамках текущего backlog intake.

## Acceptance criteria

- [ ] Для всех поддерживаемых UI-зон составлен inventory элементов и их
  применимых design-pattern skills.
- [ ] Каждый затронутый элемент соответствует structure, states, interaction и
  a11y guidance применимого pattern.
- [ ] Для каждого неиспользованного запрошенного pattern указана причина skip.
- [ ] Существующие stable selectors, согласованные workflows и API semantics не
  нарушены; необходимые изменения переданы Tester и E2E.
- [ ] Frontend и relevant regression suites проходят после реализации.

## Queue decision

- Priority: P1.
- Rationale: прямое требование пользователя устанавливает единый критерий для
  всего текущего UI backlog и должно следовать за консолидацией канонических
  skills.
- Queue order: 34.
- Model/reasoning: `gpt-5.6-terra` / `high` из-за широкого frontend scope и
  нескольких component contracts.
- Eligibility: TASK-0035 завершена; отдельная branch опубликована HND-0048;
  TASK-0036 явно отделена от незавершённой TASK-0014 и выдана HND-0052.

## Stage matrix

| Stage | Decision | Reason |
|---|---|---|
| MATLAB research | not_applicable | Scope задаётся локальными design-pattern skills, новое MATLAB behavior не вводится. |
| Engee functionality analysis | not_applicable | Engee API/math contract не меняется. |
| Backend implementation | not_applicable | Authoritative state/API остаются без изменений; contract gap создаст отдельный handoff. |
| Frontend implementation | required | Меняются UI structure, interaction и styling в `public/**`. |
| Backend tests | not_applicable | Backend contract не меняется. |
| Frontend tests | required_after_frontend | Tester закрепляет structure/behavior после Frontend report. |
| Engee contract tests | not_applicable | Engee functionality не затрагивается. |
| Feature branch | required | Новый крупный UI cycle использует `neuro_signal_analyser_ui_patterns`. |
| Runtime deployment | required_after_tests | Production revision нужна для visual E2E. |
| E2E regression | required_after_deploy | Quick regression + `e2e/visual-analysis`. |
| Accepted integration | explicit_user_acceptance | Merge только после принятия пользователем. |

Branch boundary: этот новый пользовательский cycle не поглощает незавершённые
TASK-0014/TASK-0027/TASK-0029/TASK-0034. В новой ветке одновременно работает
только один Frontend writer HND-0052.

## Verification and results

Не начиналась: создана только backlog-запись.

DevOps HND-0044 создал branch от base `7ed0ef5` и commit `ceafd4e`, но push
остановлен из-за параллельно появившегося Orchestrator-owned E2E report. Retry
того же branch request отправлен как HND-0045.

HND-0046: retry сформировал clean branch SHA `4623200`, но push потребовал
явного подтверждения публикации в configured `origin`. Подтверждение в рамках
авторизованного autonomous cycle отправлено HND-0047.

HND-0048: branch опубликована в `origin` на SHA `ce65c02`, upstream настроен,
worktree был clean; Engee update/restart не требовались.

HND-0051 подтвердил role/stage matrix и branch boundary. Frontend implementation
выдана HND-0052; старые подготовленные HND-0049/HND-0050 не dispatch и удалены
до запуска агентов.

Frontend report HND-0053: изменены `public/index.html`, `public/css/theme.css`,
`public/css/app.css`; syntax/focused behavior/diff checks PASS. Full frontend
runner blocked на противоречивых test-owned static assertions, одновременно
требующих отсутствия и наличия obsolete selectors. Независимое исправление и
regression выданы Tester как HND-0054.

Tester report HND-0055: test-owned contradiction исправлен; focused static 1/1,
focused behavior 1/1, full frontend 4/4 и coverage-run 4/4 PASS; V8 functions
370/499 (74.15%). Stale product JS references к obsolete selectors возвращены
в существующую TASK-0034 и не расширяют standalone scope TASK-0036.

Deploy exact feature revision выдан DevOps как HND-0056.

DevOps report HND-0057: local/remote/production checkout совпадают на
`d170f87`, но restart blocked — production Julia project требует
`Pkg.instantiate()`, HTTP status 000. Пользователь явно разрешил самостоятельно
поднять приложение; ограниченный dependency/restart retry отправлен HND-0058.

DevOps report HND-0059: `Pkg.instantiate()` успешно установил recorded Genie
v6.0.4 и зависимости, repository unchanged/clean. PID 416 и precompile worker
активны, но HTTP 8080 ещё не ready после ~8 минут. Bounded readiness monitoring
без повторного restart отправлен HND-0060.

DevOps report HND-0061: precompile workers завершились, PID 416 остаётся жив
~10 минут без logs и listener; HTTP 000. `run.jl` contract требует explicit
production env `GENIE_HOST=0.0.0.0`, `GENIE_PORT=8080` вместо defaults
127.0.0.1:8000. Разрешён controlled replacement hung PID как HND-0062.

DevOps report HND-0063: replacement PID слушает 8080, но runtime routes дают
404. Exact-revision probe `Genie.loadapp()` воспроизвёл root cause:
`SignalDisplayPaneState(::String, ::SignalAnalyserPlot, ::Vector{String})`
constructor mismatch в `signal_display_default_layout`, после чего routes=0.
Создана P0 TASK-0037; TASK-0036 заблокирована до runtime fix.

DevOps report HND-0071: TASK-0037 fix опубликован и production checkout обновлён
до exact SHA `7d1329e2f930ee8348439afd4a0c406fde88e2ef`. Replacement PID 2073 жив, но
в первом bounded startup window HTTP ещё не открылся; readiness continuation
выдано HND-0072 до возобновления visual E2E.

HND-0073/HND-0074: production runtime exact SHA `3c06387` отвечает 200 на `/`
и `/api/status`, но `/api/state` возвращает 500: required EngeeDSP отсутствует
и в project contract, и во всех production depots. Visual E2E остаётся
заблокирован P0 TASK-0038; package identity research выдан HND-0075.

Frontend implementation и independent frontend regressions завершены; exact
feature revision опубликована. Constructor blocker TASK-0037 закрыт отдельно,
а dependency finding TASK-0038 по решению пользователя deferred и не входит в
UI-pattern scope. Task закрыта; обязательный UI post-task quick regression с
visual-analysis выдан E2E как HND-0088.

E2E visual report HND-0090: exact application runtime не был внешне доступен;
0/20 planned checks PASS, три viewport screenshots показывают empty Engee SPA
shell, zones/states not-run. UI regression не установлен, terminal task не
переоткрыта; routing finding передан TASK-0039.
