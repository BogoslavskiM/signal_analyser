---
name: task-documentation
version: 1.0.0
---
# Task Documentation

## When to Use
- Любая long-running/multi-agent задача, каскад, архитектурное или
  математическое решение.
- Нужна понятная клиенту история либо durable memory после потери чата.
- Появился Engee bug candidate, regression, deployment или correction.

## Audience Boundary

1. `architecture/documentation/user/` — русская client-readable документация:
   product overview, current specifications, mathematics, immutable ADR,
   append-only history/reports, traceability и `engee_bugs/`.
2. `architecture/documentation/agents/` — internal tasks, backlog, handoff,
   persistent agent registry, coordination/research reports/templates и bug
   candidate intake.
3. Root `architecture/documentation/README.md` только маршрутизирует аудиторию.
4. Не дублируй authoritative content: один слой владеет фактом, другой даёт
   cross-link.
5. В `user/` запрещены internal prompt jargon, random nickname, agent/thread
   ID и секреты. В `agents/` canonical role + ID/status допустимы, секреты — нет.
6. `user/` является authoritative repository-native delivery. Не создавай
   site/PDF build/publish pipeline без explicit future request. Используй
   relative repo links.

## Continuous Workflow

1. С первого handoff обновляй
   `architecture/documentation/agents/tasks/` и role record в
   `architecture/documentation/agents/handoff/`.
2. После material handoff синхронизируй internal task/backlog/report, не
   дожидаясь integration review.
3. Клиентский текущий контракт веди в `user/specifications/`; математику — в
   `user/specifications/mathematics/`.
4. Для решения создай ADR в `user/decisions/` с `id`, `date`, `status`,
   `context`, `alternatives`, `decision`, `consequences`, `supersedes`.
5. Обнови `user/traceability/`: requirement → research → decision/math →
   implementation file/symbol → unit/contract/E2E → branch/SHA. Различай
   `planned`, `implemented`, `verified`, `deployed`.
6. Добавь датированный append-only пункт в `user/history/` и при необходимости
   report в `user/reports/`. Active task/backlog могут изменяться; завершённый
   snapshot переносится в report/history.
7. Нерешённое оставь в `agents/backlog/`; client limitation публикуй только
   когда она влияет на контракт.
8. Перед финальным ответом сверяй docs с diff, tests, target SHA/URL/logs и
   последними handoff.
9. Client-relevant ephemeral evidence перенеси до DoD в
   `user/assets/<category>/` либо замени ссылкой на durable repo file. Добавь
   date/source/provenance/license/hash и regeneration command where relevant.

## Mathematics Policy

- Каждое математическое утверждение содержит formula/symbols/units,
  one/two-sided convention, complex handling, normalization/scale, algorithm,
  defaults, numeric constraints/edge cases, code file+symbol и verification.
- Не публикуй формулу, которой нет в implementation.
- MathWorks/Engee sources задают documented direction; MATLAB observed delta и
  product implementation указываются раздельно.
- Backend и MATLAB Researcher предоставляют source evidence; Architect
  сопоставляет его с кодом/tests и утверждает текст. Ни одна роль не придумывает
  математику.
- Facts, inferences и ambiguities маркируются отдельно. Screenshot не считается
  точным numeric oracle.

## Immutable and Append-only Records

- Старый ADR не переписывай: mark `superseded`, добавь dated note и successor.
- Опубликованные reports, history, handoff и Engee reproduction не затирай.
  Correction — новая датированная note/link.
- Verification нельзя отмечать passed без команды или named evidence source.

## Engee Bugs

- Candidate от рабочей роли сначала попадает в
  `agents/engee_bug_intake/`; Architect создаёт/обновляет human record в
  `user/engee_bugs/` со stable ID `ENGEE-YYYYMMDD-NNN-short-slug`.
- Обязательны environment/version/SHA, prerequisites, minimal safe reproduction,
  expected/actual/frequency, exact error/log/stack, artifacts, severity,
  isolation evidence, workaround, regression, owner/ticket и resolution.
- До `confirmed` повтори minimal reproduction when safe. Availability issue
  требует base/auth/target split. Неизолированное остаётся `suspected`.
- Workaround не закрывает bug. Не заменяй обязательную Engee engineering
  function hand-rolled implementation без bug record и отдельного ADR.

## Cascade Definition of Done

Каждый каскад обновляет: current specification, math (если затронута), ADR,
traceability, dated history/report, internal task/backlog/handoff и Engee bug
registry/intake при наличии evidence. Отдельно фиксируются implemented,
verified и deployed status. Client docs не должны оставлять `/tmp`,
`/private/tmp`, user-specific absolute или ephemeral artifact links.

## Documenter Decision

Architect сохраняет coherence. Отдельная роль Documenter вводится новым ADR
при устойчивом trigger из `DEC-20260731-002`, а не получает authority молча.

## Reference

- `architecture/documentation/README.md`
- `architecture/documentation/user/README.md`
- `architecture/documentation/agents/README.md`
