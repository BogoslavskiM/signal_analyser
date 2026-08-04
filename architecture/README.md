# Архитектура workflow

`architecture/` — новая каноническая система управления задачами и агентами.
Архивы [`../architecture_0/`](../architecture_0/) и
[`../architecture_1/`](../architecture_1/) не являются источником истины для
новых задач.

## Цикл задачи

```text
Orchestrator: intake → background MATLAB scenario research ↘
             backlogging → новая крупная feature → DevOps feature branch от neuro_dev
             → task separation → agent TS
       ↓
Backender / Frontend / MATLAB Researcher (последовательно или параллельно)
       ↓
Tester: backend unit/API + frontend static/behavior
Engee User: functionality analysis + persistent Engee contract tests
       ↓
DevOps: полный deploy pipeline, когда runtime должен получить revision
       ↓
E2E: quick после обычной task / new-functionality + quick после новой feature
       ↓
Orchestrator: review → user report → backlogging
       ↓ после явного принятия крупной feature
DevOps: полный merge pipeline feature → neuro_dev
       ↓ при пустом actionable backlog
E2E: analysis regression → test fixes → functional/performance follow-up
```

## Порядок чтения

1. [`agents/manifest.toml`](agents/manifest.toml)
2. контракт активной роли в [`agents/roles/`](agents/roles/)
3. соответствующий workflow в [`skills/`](skills/)
4. task registry в [`tasks/`](tasks/)

## Жёсткие правила

- Orchestrator — единственный владелец backlogging, task separation, handoff и
  итоговых пользовательских отчётов.
- Роли редактируют только свои зоны проекта; пересечение зон оформляется
  handoff.
- Исследование, контракт, реализация, тестирование и deployment — разные
  статусы. Успешный unit-тест не означает deployment.
- Секреты Engee не сохраняются в репозитории, отчётах, командах или логах.
- Production target проекта: `https://engee.com`; devhub не используется как
  runtime target или fallback.
- Backlogging может выполняться в фоне, пока независимые агенты реализуют
  текущие handoff: он не должен задерживать уже начатую разработку.
- Для каждого нового MATLAB-derived product scope Orchestrator сразу запускает
  или расширяет единственный background MATLAB research lane. Он читает
  сохранённые clicker scenarios, строит critical coverage matrix и не блокирует
  implementation.
- `all_critical_scenarios_covered: true` относится только к объявленному
  MATLAB reference catalog scope; E2E execution, Engee parity и production
  regression отражаются отдельными результатами.
- После каждой `done` task Orchestrator немедленно отправляет E2E handoff:
  `quick_regression` для обычной task либо `new_functionality_regression` для
  новой функциональности; второй режим уже включает quick regression.
- Quick regression использует порог 75% от planned checks при обязательной
  доступности приложения. При пустом actionable backlog запускается один
  `analysis_regression`, который допускает исправление E2E tests только внутри
  `test/playwright/**` и порождает functional или performance follow-up.
- Engee User владеет required-functionality analysis, `test/engee/**`,
  discrepancy localization и bug evidence.
- E2E владеет только Playwright/runtime/visual regression.
- `neuro_dev` — постоянная основная ветка автономной разработки. Перед каждым
  новым крупным feature-cycle Orchestrator запрашивает у DevOps feature branch
  от `neuro_dev`; после явного принятия feature запрашивает её merge обратно.
- DevOps — единственный владелец Git publication и deployment. Один request
  запускает полный conditional pipeline checkout/add/commit/push/Engee
  update/restart; ненужные этапы помечаются `not_needed`.
