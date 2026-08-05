---
name: handoff-management
---
# Handoff Management

Создавай handoff для любого межагентного сообщения: поручения, research
вопроса или отчёта.

1. Выбери тип: `task`, `research`, `report` или `FYI`.
2. Выдай глобально уникальный `HND-<number>` и смысловой title.
3. Укажи `from` и одного `to`.
4. Если есть task, добавь точную ссылку `task_section` на её раздел. Не
   дублируй содержание task.
5. В task/research handoff при необходимости добавь `requested_skills` с
   canonical ids `<role>/<skill>`. Запрашивай только skills адресата.
6. В report добавь `applied_skills`; для неприменимого явно запрошенного skill
   добавь причину в `skipped_requested_skills`.
7. При необходимости добавь короткие `description` и
   `acceptance_criteria`; все дополнительные поля опциональны.
8. Сохрани handoff в `architecture/handoffs/`.

Handoff без task разрешён для прямого обмена между агентами. Blocker, ошибка,
тестовый результат и follow-up оформляются как `type: report`.

Используй `FYI`, когда агент только сообщает другому агенту о выполненном
изменении и не ждёт ответа. Получатель сам решает, создавать ли следующий
handoff или task.

Skill request не расширяет ownership, не заменяет acceptance criteria и не
разрешает deployment/Git/external mutation. Такие действия получают отдельный
role-specific handoff. Для DevOps это один полный `devops_request`
(`clone_repo`, `deploy`, `new_feature_branch` или `merge_feature`), а не
цепочка clone/checkout/add/commit/push/restart handoff. Для `clone_repo`
передавай только URL без credentials и идентификатор protected PAT source;
секрет в handoff запрещён.
