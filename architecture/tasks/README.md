# Unified task registry

Все идеи, группы, текущие задачи и завершённые результаты хранятся в одной
папке `architecture/tasks/`. Их жизненный цикл определяется полем `status`, а
не расположением файла и не отдельным boolean-флагом.

## Формат файла

Имя файла: `TASK-<global-number>-<short-slug>.md`. Номер глобально уникален;
связь с крупной feature или подзадачей задаётся полем `parent`, а не вложенными
папками или составным номером.

```yaml
id: TASK-0001
kind: idea # idea | group | task
title: ...
status: backlog # backlog | queued | in_progress | done
priority: P2 # P0 | P1 | P2 | P3
queue_order: null # integer after a task enters queued
model: null # gpt-5.6-luna | gpt-5.6-terra | gpt-5.6-sol
reasoning: null # none | low | medium | high | xhigh
owner: orchestrator
assignees: []
parent: null
depends_on: []
blocks: []
source_handoffs: []
related_handoffs: []
blocked_by: []
blocker_reason: null
# only for a major feature/group lifecycle:
feature_slug: null
development_branch: null
integration_sha: null
# only for UI-affecting scope:
ui_impact: none # none | covered | new_or_changed
design_mode: null # autonomous | review
design_ref: null
design_version: null
```

`kind` определяет назначение записи:

- `idea` — кандидат из user intake, research, test, bug или handoff;
- `group` — набор связанных ideas/tasks с общей feature-целью;
- `task` — неделимая работа с конкретным результатом, которую можно выдать
  одному или нескольким агентам через handoff.

Только `kind: task` может получить статус `queued` и быть выдан агенту.

## Ветка крупной feature

Для крупной feature обычно создаётся `kind: group`. До первой
repository-changing task Orchestrator отправляет DevOps
`devops_request: new_feature_branch`, затем записывает в group стабильные
`feature_slug` и `development_branch: neuro_<feature_slug>`. Все дочерние tasks
наследуют эту branch и не создают собственные.

После явного принятия крупной feature Orchestrator отправляет
`devops_request: merge_feature` с `accepted_by_user: true`. Target всегда
`neuro_dev`. После успешного report поле `integration_sha` получает resulting
SHA `neuro_dev`. До этого feature не считается интегрированной, даже если её
subtasks имеют `status: done`.

## Модель и reasoning

Перед переводом `kind: task` в `queued` Orchestrator заполняет `model` и
`reasoning`. Для `idea` и `group` оба поля остаются `null`.

| Задача | model | reasoning |
|---|---|---|
| Форматирование, сортировка, заполнение шаблонов | `gpt-5.6-luna` | `none` или `low` |
| Обычная разработка, frontend, тесты, стандартный research | `gpt-5.6-terra` | `medium` |
| Нетривиальная реализация, сложный bug, несколько контрактов | `gpt-5.6-terra` | `high` |
| Архитектура, сложный backend, инженерная математика, критичный review | `gpt-5.6-sol` | `high` |
| Автономный application design или сложная visual composition | `gpt-5.6-sol` | `high` |
| P0, конфликтующие факты, риск потери данных, сложная декомпозиция | `gpt-5.6-sol` | `xhigh` |
| MATLAB/Engee research | `gpt-5.6-terra` | `medium`; `high` при противоречиях или сложном поведении |

`max` запрещён. При сомнении выбирать `gpt-5.6-terra` с `medium`.

## Приоритет

Priority задаётся Orchestrator и всегда сопровождается текстовым обоснованием
в разделе `Queue decision`.

| Priority | Когда использовать |
|---|---|
| `P0` | регрессия, потеря данных, security issue, блокирующая ошибка текущей пользовательской работы или явный срочный запрос пользователя |
| `P1` | следующий необходимый шаг принятой feature либо зависимость, без которой остановлен P0/P1 workflow |
| `P2` | обычная новая feature, улучшение UX, покрытие тестами или research без немедленной блокировки |
| `P3` | оптимизация, рефакторинг, исследовательская идея или отложенное улучшение без текущего влияния |

Явный пользовательский приоритет выше этой таблицы и фиксируется в `Queue
decision`.

## Правило очереди

Backlogging переводит task в `queued` только если заполнены scope, out of scope,
acceptance criteria, assignees, зависимости, `model`, `reasoning` и ожидаемый
handoff result. Задача
не попадает в выдачу при непустом `blocked_by` или пока любая запись из
`depends_on` не имеет `status: done`.

Orchestrator выбирает следующую задачу так:

1. берёт только `kind: task`, `status: queued`, без blockers и незакрытых
   dependencies;
2. выбирает меньший priority (`P0`, затем `P1`, `P2`, `P3`);
3. при равном priority выбирает меньший `queue_order`;
4. если `queue_order` равен или отсутствует, фиксирует явное решение в
   `Queue decision` до dispatch.

После выдачи `status` становится `in_progress`; завершение означает `done`.
`queue_order` не является status и меняется только через backlogging.

Для `ui_impact: new_or_changed` visible Frontend task зависит от ready Designer
task/package. Для `covered` Orchestrator pin-ит существующие `design_ref` and
`design_version`. Designer, Backend and research work не связываются
искусственной dependency, если их deliverables независимы.

## Статусы

```text
backlog → queued → in_progress → done
```

- `backlog` — идея или задача ещё анализируется, детализируется или ожидает
  подготовки;
- `queued` — задача полностью подготовлена и выбрана для выдачи;
- `in_progress` — по задаче выполняются handoff или Orchestrator проводит
  итоговую проверку;
- `done` — acceptance criteria выполнены и Orchestrator закрыл запись.

`done` — терминальный статус. Блокировка не является отдельным статусом:
используются `blocked_by` и `blocker_reason`.

## E2E после закрытия task

Каждый переход task в `done` немедленно создаёт отдельный E2E `task` handoff,
связанный с завершённой registry task. Обычная task получает
`quick_regression`; новая пользовательская функциональность получает
`new_functionality_regression`, который включает новые scenarios и quick
suite. E2E handoff не является отдельной registry task, поэтому не создаёт
рекурсивный post-task запуск.

Quick operational threshold — 75% passed от всех planned checks при
обязательной доступности приложения. E2E findings не открывают terminal
`done`: Orchestrator создаёт новые follow-up tasks.

Когда после backlogging нет открытых actionable backlog items, `queued` и
`in_progress` work, Orchestrator один раз запускает `analysis_regression`.
Следующий idle-анализ допускается после completed task, изменения backlog или
явного запроса пользователя.

## Backlogging

В свободное от распределения задач время Orchestrator запускает backlogging:

1. принимает task candidates только из существующих task records или входящих
   handoff;
2. устраняет дубли и связывает candidates с parent group;
3. уточняет ценность, scope и out of scope;
4. создаёт dispatchable role-owned `kind: task` records;
5. назначает acceptance criteria, assignees, dependencies, priority и
   `queue_order`;
6. переводит eligible tasks в `queued`;
7. фиксирует порядок следующей выдачи и причину приоритета.
