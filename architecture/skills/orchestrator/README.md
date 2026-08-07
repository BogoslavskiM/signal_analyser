# Скиллы Orchestrator

- `orchestrator-workflow` — обязательный полный цикл координации;
- `user-intake` — фиксация нового пользовательского ТЗ;
- `backlogging` — единый task registry, зависимости и очередь;
- `handoff-management` — формат и проверка межагентных сообщений.
- `product-question-resolution` — один relevant-skill attempt, optional
  `ai_manager`/`$ask-to-ceo` и autonomous/interactive fallback.

Review и краткий пользовательский отчёт остаются этапами обязательного
workflow. Отдельный reporting/documentation skill не используется. Workflow
также владеет automatic integration gate, confirmed-Engee blocker routing и
evidence-based deployment-failure routing.
