---
id: HND-0042
type: task
from: orchestrator
to: devops
title: Открыть feature branch для UI design-pattern cycle
task_section: ../tasks/TASK-0036-apply-frontend-design-patterns.md#stage-matrix
devops_request: new_feature_branch
feature_slug: signal_analyser_ui_patterns
paths:
  - architecture/tasks/
  - architecture/handoffs/
description: >
  Создай или однозначно переиспользуй `neuro_signal_analyser_ui_patterns` от
  актуальной `neuro_dev`. Текущие изменения в указанных paths относятся к
  запуску этого цикла: закрытие TASK-0035, подготовка TASK-0036, handoff records
  и исправление duplicate handoff IDs. Не включай product/test paths.
acceptance_criteria:
  - Возвращены base SHA, feature branch, result SHA и upstream/push status.
  - Все pipeline stages имеют performed/not_needed/blocked/not_run.
  - Engee update/restart для branch-only request отмечены not_needed.
requested_skills: []
---
