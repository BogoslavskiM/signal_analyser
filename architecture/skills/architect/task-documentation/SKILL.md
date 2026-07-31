---
name: task-documentation
version: 0.2.0
---
# Task Documentation

## When to Use
- Нужно сохранить архитектурное решение, отчёт, backlog или проектную память.
- Результат должен быть понятен будущим агентам без истории чата.
- Начинается long-running или multi-agent задача: durable documentation для
  неё обязательна с первого handoff и до integration review.

## When NOT to Use
- Задача малая, результат очевиден из diff и не создаёт долговременного знания.
- Нужен только handoff на текущую реализацию.

## Workflow
1. Сразу создай или обнови active task file в
   `architecture/documentation/tasks/`. Зафиксируй цель, contract, роли,
   acceptance, текущий этап и verification plan.
2. Для каждого role handoff создай или обнови запись в
   `architecture/documentation/handoff/`. Сохраняй минимум `goal`, `scope`,
   `contracts`, `changes`, `verification`, `risks`, `follow-ups` и статус.
3. После каждого материального handoff или изменения решения обновляй active
   task и соответствующую handoff-запись, не дожидаясь конца задачи.
4. Запиши durable result в `architecture/documentation/reports/`, если
   результат важен для будущей проверки. Укажи решения, deployment context,
   verification evidence, исправленные дефекты и остаточные риски.
5. Перенеси нерешённые функциональные и технические follow-up в
   `architecture/documentation/backlog/`.
6. Обнови `architecture/documentation/project.md`, только если изменилось
   проектное правило или постоянный контекст.
7. Перед финальным ответом сверяй task, report, backlog и handoff records с
   фактическим diff и последними результатами агентов.

## Guardrails
- Не дублируй role ownership из TOML в документации как новый источник истины.
- Не превращай task docs в лог каждого мелкого действия.
- Документируй решения, tradeoffs и следующие действия, а не очевидный diff.
- Только Architect пишет durable task/report/backlog/handoff documentation.
  Рабочие роли сохраняют strict ownership и возвращают структурированный
  handoff в чат, даже если могут читать `architecture/**`.
- Не записывай токены, cookie, пароли и другие секреты в документацию.
- Не отмечай verification как passed без команды или явного evidence source.

## Reference
- `architecture/documentation/tasks/`
- `architecture/documentation/reports/`
- `architecture/documentation/backlog/`
- `architecture/documentation/handoff/`
- `architecture/documentation/project.md`
