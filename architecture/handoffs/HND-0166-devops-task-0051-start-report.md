---
id: HND-0166
type: report
from: devops
to: orchestrator
title: Exact runtime started and passed three complete rounds
task_section: ../tasks/TASK-0051-stabilize-production-runtime.md#verification-and-results
devops_request: deploy
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
applied_skills: [devops/devops-workflow]
description: |
  Managed app/process/listener were absent before action. One cold managed start
  completed in 32.522s and restored exact local/private/production SHA
  8c0d37e525268b2acf4781a4cb61e823a50639f8 with RUNNING Julia listener. Three
  complete sequential rounds over root, four assets, status, state, session and
  layouts passed 27/27 HTTP 200 without redirects; rounds lasted 87.382s,
  84.714s and 66.720s. No source/Git/dependency/credential mutation.
---
