---
name: task-documentation
version: 0.1.0
---
# Task Documentation

## When to Use
- Нужно сохранить архитектурное решение, отчёт, backlog или проектную память.
- Результат должен быть понятен будущим агентам без истории чата.

## When NOT to Use
- Задача малая, результат очевиден из diff и не создаёт долговременного знания.
- Нужен только handoff на текущую реализацию.

## Workflow
1. Создай или обнови task file в `architecture/documentation/tasks/`, если есть активная задача.
2. Запиши durable result в `architecture/documentation/reports/`, если результат важен для будущей проверки.
3. Перенеси нерешённые follow-up в `architecture/documentation/backlog/`.
4. Обнови `architecture/documentation/project.md`, если изменилось проектное правило или постоянный контекст.

## Guardrails
- Не дублируй role ownership из TOML в документации как новый источник истины.
- Не превращай task docs в лог каждого мелкого действия.
- Документируй решения, tradeoffs и следующие действия, а не очевидный diff.

## Reference
- `architecture/documentation/tasks/`
- `architecture/documentation/reports/`
- `architecture/documentation/backlog/`
- `architecture/documentation/project.md`
