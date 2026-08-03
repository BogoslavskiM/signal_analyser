# Handoffs

Любой запрос или результат между агентами — отдельный append-only handoff.
Имя файла: `HND-<global-number>-<short-slug>.md`.

## Минимальный формат

```yaml
---
id: HND-0001
type: task # task | report | research | FYI
from: orchestrator
to: backender
title: Короткий смысловой заголовок
task_section: ../tasks/TASK-0001-short-slug.md#backend # optional
description: ... # optional
acceptance_criteria: # optional
  - ...
---
```

Обязательны: `id`, `type`, `from`, `to`, `title`.

Опциональны: `task_section`, `description`, `acceptance_criteria`.

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
