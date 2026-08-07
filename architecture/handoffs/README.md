# Handoffs

Любой запрос или результат между агентами — отдельный append-only handoff.
Имя файла: `HND-<global-number>-<short-slug>.md`.

## Минимальный формат

```yaml
---
id: HND-0001
type: task # task | report | research | FYI | design_task | design_report | design_revision | design_revision_report
from: orchestrator
to: backender
title: Короткий смысловой заголовок
task_section: ../tasks/TASK-0001-short-slug.md#backend # optional
description: ... # optional
acceptance_criteria: # optional
  - ...
requested_skills: # optional; canonical ids <role>/<skill>
  - backender/api-contract-planning
applied_skills: # optional; normally returned by report
  - backender/api-contract-planning
skipped_requested_skills: # optional; skill id plus reason
  - <role/skill>: <reason>
# Design-only fields when applicable:
design_mode: autonomous # autonomous | review
design_ref: ../design/TASK-0001-short-slug/DESIGN.md
design_version: 1
design_status: ready # ready | partial | user_decision_required
required_states: [default, loading, empty, error]
required_viewports: [1280x720]
design_evidence: []
---
```

Обязательны: `id`, `type`, `from`, `to`, `title`.

Опциональны: `task_section`, `description`, `acceptance_criteria`,
`requested_skills`, `applied_skills`, `skipped_requested_skills` and
design-specific fields.

## Design handoffs

- `design_task`: Orchestrator → Designer with mode, scope, states/viewports.
- `design_report`: Designer → Orchestrator with ready package ref/version.
- `design_revision`: Frontend → Designer with current ref/version, affected
  screen/state/viewport, technical constraint and evidence.
- `design_revision_report`: Designer → Frontend with bumped version and delta;
  Orchestrator receives FYI and pins the new version.

Designer package живёт в `architecture/design/**`; handoff не копирует
prototype/screenshots. Frontend реализует только pinned version.

## Вызов subskills

- Получатель всегда начинает с обязательного workflow skill своей роли.
- `requested_skills` позволяет отправителю явно запросить узкие subskills.
  Идентификатор задаётся полным путём `<role>/<skill>`.
- Workflow дополнительно выбирает subskills по фактическим trigger-условиям
  задачи. Нерелевантные skills не загружаются «на всякий случай».
- Явно запрошенный применимый skill обязателен. Если он противоречит scope,
  ownership или доступным инструментам, агент не имитирует его применение, а
  возвращает причину в `skipped_requested_skills`.
- Report перечисляет реально использованные skills в `applied_skills`.
- Ни один skill не расширяет ownership роли и не разрешает неявный Git,
  deployment или изменение внешней среды.

## DevOps intake

DevOps принимает только полный pipeline request:

```yaml
devops_request: deploy | new_feature_branch | merge_feature
feature_slug: <для крупной feature>
source_branch: <optional>
target_branch: <optional; merge_feature всегда neuro_dev>
paths: <optional exact add scope>
accepted_by_user: true # обязательно для merge_feature
```

Перед стартом крупного feature-cycle Orchestrator отправляет
`new_feature_branch`; после явного принятия feature — `merge_feature` в
`neuro_dev`. `deploy` используется для публикации current branch в Engee.
DevOps сам оценивает checkout, add, commit, push, Engee update и restart; эти
этапы не оформляются отдельными handoff.

`task_section` указывает на конкретный раздел task, если handoff связан с
задачей. Handoff может существовать без task — например, прямой research
вопрос между Backender и Engee User. В таком случае scope и контекст пишутся
кратко в `description`.

Один handoff имеет одного адресата. Для нескольких агентов создаются отдельные
handoff с отдельными ожидаемыми результатами.

`report` используется также для blocker, ошибки, follow-up и результата теста.

`FYI` сообщает о завершённом действии или изменении и не требует ответа.
Получатель самостоятельно решает, нужен ли новый task, research или report
handoff. `FYI` само по себе не изменяет status связанной task.
