---
id: HND-0060
type: task
from: orchestrator
to: devops
title: Дождаться HTTP readiness текущего TASK-0036 runtime
task_section: ../tasks/TASK-0036-apply-frontend-design-patterns.md#verification-and-results
devops_request: deploy
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
description: >
  retry_of: HND-0058. Expected SHA d170f878ef292a1822e35290be4c0e193d5141a9.
  Не запускай второй процесс и не убивай текущие PID 416/precompile worker, пока
  они живы. Bounded-monitor текущий startup до HTTP readiness либо process exit;
  проверь порт, URL, process и logs. Если precompile завершился, но Genie не
  поднялся, действуй по devops-workflow без source/config/revision changes.
  Не fallback и не E2E.
acceptance_criteria:
  - Возвращены exact SHA, process state, HTTP status и runnable URL либо точный terminal blocker.
  - Duplicate Genie process не создан.
requested_skills: []
---
