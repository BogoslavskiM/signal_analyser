---
id: HND-0091
type: task
from: orchestrator
to: devops
title: Publish checkpoint and expose exact production Genie runtime
task_section: ../tasks/TASK-0039-expose-production-genie-runtime.md#scope
devops_request: deploy
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
paths:
  - .codex/agents/devops.toml
  - .codex/agents/orchestrator.toml
  - architecture/agents/manifest.toml
  - architecture/agents/roles/devops.toml
  - architecture/agents/roles/orchestrator.toml
  - architecture/skills/devops/README.md
  - architecture/skills/devops/devops-workflow/SKILL.md
  - architecture/skills/devops/devops-workflow/manifest.yaml
  - architecture/skills/orchestrator/handoff-management/SKILL.md
  - architecture/skills/orchestrator/orchestrator-workflow/SKILL.md
  - architecture/skills/orchestrator/orchestrator-workflow/manifest.yaml
  - architecture/tasks/TASK-0036-apply-frontend-design-patterns.md
  - architecture/tasks/TASK-0037-fix-multilayout-bootstrap-constructor.md
  - architecture/tasks/TASK-0038-restore-engeedsp-project-contract.md
  - architecture/tasks/TASK-0039-expose-production-genie-runtime.md
  - architecture/handoffs/HND-0073-devops-task-0037-runtime-ready-api-blocker-report.md
  - architecture/handoffs/HND-0074-devops-engeedsp-availability-diagnostic-report.md
  - architecture/handoffs/HND-0075-engee-user-task-0038-package-identity.md
  - architecture/handoffs/HND-0076-engee-user-task-0038-paused-checkpoint-report.md
  - architecture/handoffs/HND-0077-engee-user-resume-task-0038-contract-verdict.md
  - architecture/handoffs/HND-0078-devops-verify-private-production-checkout.md
  - architecture/handoffs/HND-0079-engee-user-task-0038-final-contract-report.md
  - architecture/handoffs/HND-0080-backender-task-0038-project-contract.md
  - architecture/handoffs/HND-0081-devops-private-checkout-verified-report.md
  - architecture/handoffs/HND-0082-backender-task-0038-project-report.md
  - architecture/handoffs/HND-0083-backender-task-0038-resolve-manifest.md
  - architecture/handoffs/HND-0084-backender-task-0038-local-resolution-blocker-report.md
  - architecture/handoffs/HND-0085-engee-user-task-0038-generate-manifest-evidence.md
  - architecture/handoffs/HND-0086-engee-user-task-0038-resolver-timeout-report.md
  - architecture/handoffs/HND-0087-e2e-task-0037-constructor-regression.md
  - architecture/handoffs/HND-0088-e2e-task-0036-ui-pattern-visual-regression.md
  - architecture/handoffs/HND-0089-e2e-task-0037-blocked-report.md
  - architecture/handoffs/HND-0090-e2e-task-0036-visual-blocked-report.md
  - architecture/handoffs/HND-0091-devops-task-0039-runtime-routing.md
description: |
  Stage/commit/push only the listed architecture/skill checkpoint; explicitly
  do not stage, modify, inspect for resolution or otherwise use Project.toml or
  Manifest.toml. Update the verified private production checkout to exact
  pushed SHA. Diagnose current Genie PID/listener/logs and Engee external
  routing/proxy. Controlled restart with existing run.jl host/port contract is
  authorized if needed. Return an externally reachable URL that visibly serves
  product DOM and runtime `/api/status`, or a precise terminal platform routing
  blocker. `/api/state` dependency behavior is deferred TASK-0038 and must not
  trigger dependency-file work. No merge/devhub/fallback.
acceptance_criteria:
  - Exact local/remote/production SHA and staged paths are reported.
  - Product external URL and status probe are verified or exact routing blocker returned.
  - Project.toml and Manifest.toml are untouched and absent from staged diff.
  - No credentials, fallback or unrelated changes.
requested_skills: []
---
