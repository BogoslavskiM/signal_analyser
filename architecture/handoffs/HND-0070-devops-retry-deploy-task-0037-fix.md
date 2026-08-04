---
id: HND-0070
type: task
from: orchestrator
to: devops
title: Повторить deploy P0 TASK-0037 после cleanup coverage artifacts
task_section: ../tasks/TASK-0037-fix-multilayout-bootstrap-constructor.md#verification-and-results
devops_request: deploy
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
paths:
  - architecture/tasks/TASK-0036-apply-frontend-design-patterns.md
  - architecture/tasks/TASK-0037-fix-multilayout-bootstrap-constructor.md
  - architecture/handoffs/HND-0057-devops-task-0036-restart-blocker-report.md
  - architecture/handoffs/HND-0058-devops-restart-task-0036.md
  - architecture/handoffs/HND-0059-devops-task-0036-precompile-report.md
  - architecture/handoffs/HND-0060-devops-monitor-task-0036-runtime.md
  - architecture/handoffs/HND-0061-devops-task-0036-terminal-readiness-report.md
  - architecture/handoffs/HND-0062-devops-replace-hung-task-0036-runtime.md
  - architecture/handoffs/HND-0063-devops-task-0036-routes-blocker-report.md
  - architecture/handoffs/HND-0064-backender-task-0037-bootstrap-fix.md
  - architecture/handoffs/HND-0065-backender-task-0037-report.md
  - architecture/handoffs/HND-0066-tester-task-0037-bootstrap-regression.md
  - architecture/handoffs/HND-0067-tester-task-0037-report.md
  - architecture/handoffs/HND-0068-devops-deploy-task-0037-fix.md
  - architecture/handoffs/HND-0069-devops-task-0037-coverage-blocker-report.md
  - architecture/handoffs/HND-0070-devops-retry-deploy-task-0037-fix.md
  - lib/domain/signal_analyser_state.jl
  - lib/services/signal_analyser_service.jl
  - lib/services/signal_inventory_service.jl
  - lib/services/signal_session_service.jl
  - test/back/app/signal_analyser_api_test.jl
  - test/back/lib/multilayout_bootstrap_test.jl
description: >
  retry_of: HND-0068. Точные untracked generated *.cov artifacts удалены;
  product/test source сохранён. Выполни полный deploy pipeline по перечисленным
  paths, update production exact SHA, controlled restart с production host/port
  и проверь `/`, `/api/status`, `/api/state`. Не merge/fallback.
acceptance_criteria:
  - Local/remote/production SHA совпадают и worktree clean.
  - Required routes отвечают не 404 на production URL.
  - Stage statuses и startup logs возвращены.
requested_skills: []
---
