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
E2E: сценарий большой готовой фичи
       ↓
Engee User: deployment при отдельном запросе
       ↓
Orchestrator: review → user report → backlogging → next development cycle
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
