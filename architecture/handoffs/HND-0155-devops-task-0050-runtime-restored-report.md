---
id: HND-0155
type: report
from: devops
to: orchestrator
title: Exact post-deploy production runtime restored
task_section: ../tasks/TASK-0050-restore-post-deploy-runtime.md#verification-and-results
devops_request: deploy
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
applied_skills: [devops/devops-workflow]
description: |
  Existing clean production checkout, private remote and local branch all equal
  exact SHA 8c0d37e525268b2acf4781a4cb61e823a50639f8. Managed application/process were
  absent and log reported Application not found, so the existing checkout was
  started once without source update. Runtime is RUNNING with a Julia-owned
  listener. Three repeated rounds of root, /api/status, /api/state and
  /api/layouts passed 12/12 HTTP 200 without redirects; product DOM and API
  contract are valid. No source/Git/dependency/credential mutation, merge,
  devhub or fallback.
---
