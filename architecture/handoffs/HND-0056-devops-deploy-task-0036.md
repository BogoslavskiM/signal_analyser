---
id: HND-0056
type: task
from: orchestrator
to: devops
title: Опубликовать и развернуть TASK-0036 UI patterns
task_section: ../tasks/TASK-0036-apply-frontend-design-patterns.md#verification-and-results
devops_request: deploy
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
paths:
  - architecture/handoffs/HND-0032-matlab-critical-scenario-inventory-report.md
  - architecture/handoffs/HND-0037-tester-task-0033-failure.md
  - architecture/handoffs/HND-0043-e2e-task-0035-blocker-report.md
  - architecture/handoffs/HND-0047-devops-confirm-ui-pattern-push.md
  - architecture/handoffs/HND-0048-devops-ui-pattern-branch-published-report.md
  - architecture/handoffs/HND-0051-orchestrator-cycle-audit-report.md
  - architecture/handoffs/HND-0052-frontend-task-0036-ui-patterns.md
  - architecture/handoffs/HND-0053-frontend-task-0036-report.md
  - architecture/handoffs/HND-0054-tester-task-0036-ui-patterns.md
  - architecture/handoffs/HND-0055-tester-task-0036-report.md
  - architecture/handoffs/HND-0056-devops-deploy-task-0036.md
  - architecture/tasks/TASK-0034-remove-obsolete-workspace-dom.md
  - architecture/tasks/TASK-0036-apply-frontend-design-patterns.md
  - public/index.html
  - public/css/theme.css
  - public/css/app.css
  - test/front/public/js/app.static.test.js
description: >
  Выполни полный deploy pipeline для feature branch: stage только перечисленные
  files, commit, push, обнови production Engee checkout до exact pushed SHA и
  реши restart по workflow. Не merge в neuro_dev. Верни exact result SHA,
  production URL/status, Engee checkout SHA и logs для последующего visual E2E.
acceptance_criteria:
  - Local, remote и deployed revision однозначно указаны.
  - Production target доступен либо возвращён точный blocker без fallback.
  - Все pipeline stages имеют performed/not_needed/blocked/not_run.
requested_skills: []
---
