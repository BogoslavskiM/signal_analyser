# Handoff Management

Создавай handoff для любого межагентного сообщения: поручения, research
вопроса или отчёта.

Входом служит конкретная передача между одним отправителем и одним адресатом,
а также связанная task при её наличии. Не используй handoff как замену task
registry или пользовательскому отчёту.

1. Выбери тип: `task`, `research`, `report`, `FYI`, `deployment_failure`,
   `design_task`, `design_report`, `design_revision` или
   `design_revision_report`.
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

Если report содержит неразрешённый вопрос, добавь применимые
`resolution_attempted_skill`, формулировку неоднозначности и затронутую
зависимую работу. Orchestrator может пометить его как `product_question`, но
решает его только через `orchestrator/product-question-resolution`; новый тип
handoff для этого не вводится.

Для design handoff используй только применимые поля:

- intake: `design_mode`, `required_states`, `required_viewports`, применимые
  `required_overlay_combinations`;
- package/report: `design_ref`, `design_version`, `design_status`,
  `design_evidence`, `proportion_contract`, `page_sizing_contract`,
  `overlay_inventory`, `overlay_priority_contract`;
- revision: существующие ref/version, affected screen/state/viewport, exact
  constraint and current evidence.

`design_ref` всегда указывает на `architecture/design/**/DESIGN.md`. Frontend
реализует pinned version; новая version становится authoritative только после
Designer report и записи Orchestrator.

Handoff без task разрешён для прямого обмена между агентами. Обычный blocker,
тестовый результат и follow-up оформляются как `type: report`. Failed Engee
deployment/start/readiness оформляется DevOps как `type: deployment_failure`
после диагностики.

`deployment_failure` обязан содержать `source_branch`, exact `revision`,
`failure_owner`, `diagnosis_ref`, `log_refs` либо явный evidence status
`missing|unreadable|blocked` и критерий повторного deploy. Получатель выбирается
по evidence: `backender`, `frontend` или `engee_user`; для `mixed` создаются
отдельные handoff. Любой suspected/confirmed Engee bug идёт Engee User. DevOps
отдельно отправляет FYI Orchestrator с теми же refs и не вставляет полный лог в
description.

Используй `FYI`, когда агент только сообщает другому агенту о выполненном
изменении и не ждёт ответа. Получатель сам решает, создавать ли следующий
handoff или task.

Skill request не расширяет ownership, не заменяет acceptance criteria и не
разрешает deployment/Git/external mutation. Такие действия получают отдельный
role-specific handoff. Для DevOps это один `devops_request` (`clone_repo`,
`deploy`, `new_feature_branch`, `merge_feature`, `get_logs`,
`restart_application` или `restart_engee`), а не цепочка
clone/checkout/add/commit/push/restart handoff. Первые четыре запускают полный
conditional pipeline; `get_logs` — только production diagnostics; два restart
request — отдельное runtime recovery без Git stages. Для `clone_repo`
передавай только URL без credentials и идентификатор protected PAT source;
секрет в handoff запрещён.

Для `restart_application` и `restart_engee` обязательно передавай
`restart_reason`, `expected_revision`, `app_path`, `log_file` и
`requested_skills: [devops/engee-runtime-restart]`. Первый request не
останавливает здоровый pod; второй явно разрешает DevOps вызвать production
pod stop/start и затем восстановить приложение. DevOps сам получает
`mcp_devops_genie_is_bysy` lock, ждёт по 20 секунд и освобождает его в
`finally` конкретной task немедленно после её последней operational command и
до формирования report; Orchestrator не управляет lock отдельным handoff.

Перед сохранением проверь уникальность ID, допустимый type, существование
`task_section`, принадлежность каждого requested skill адресату и отсутствие
секретов. Для design message дополнительно проверь ref/version/status and
evidence consistency. В результате укажи путь сохранённого handoff и ожидаемый
следующий ответ либо явно отметь, что `FYI` ответа не требует.

Для E2E report, использовавшего Chrome, проверь `opened_tab_count`,
`closed_tab_count` и `tab_cleanup_status`. Cleanup считается корректным только
когда закрыты все созданные run вкладки, а pre-existing user tabs не затронуты.
