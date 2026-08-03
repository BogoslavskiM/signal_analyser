# Архитектура workflow

`architecture/` — новая каноническая система управления задачами и агентами.
Старая версия сохранена в [`../template/`](../template/) и не является
источником истины для новых задач.

## Цикл задачи

```text
Orchestrator: intake/backlogging → task separation → agent TS
       ↓
Backender / Frontend / Research / Engee User (последовательно или параллельно)
       ↓
Tester: unit + regression
       ↓
E2E: quick после обычной task / new-functionality + quick после новой feature
       ↓ при отдельном явном deploy handoff
E2E: production deployment
       ↓
Orchestrator: review → user report → backlogging
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
- После каждой `done` task Orchestrator немедленно отправляет E2E handoff:
  `quick_regression` для обычной task либо `new_functionality_regression` для
  новой функциональности; второй режим уже включает quick regression.
- Quick regression использует порог 75% от planned checks при обязательной
  доступности приложения. При пустом actionable backlog запускается один
  `analysis_regression`, который допускает исправление E2E tests только внутри
  `test/playwright/**` и порождает functional или performance follow-up.
- E2E — единственный владелец deployment skill. Все роли направляют deployment
  requests E2E отдельным handoff; Engee User выполняет только analysis/bug
  evidence. Regression никогда не запускает deployment автоматически.
