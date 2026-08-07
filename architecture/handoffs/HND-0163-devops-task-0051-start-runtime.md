---
id: HND-0163
type: task
from: orchestrator
to: devops
title: Start and attest exact runtime before coordinated monitoring
task_section: ../tasks/TASK-0051-stabilize-production-runtime.md#scope
devops_request: deploy
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
paths: []
description: |
  Restore exact production SHA 8c0d37e525268b2acf4781a4cb61e823a50639f8
  without source/Git changes. Capture current managed app/process/listener/log
  state before action, start once if absent, and return immediately after three
  consecutive root/assets/status/state/session/layouts product HTTP 200 rounds.
  Include cold/warm timing and exact lifecycle evidence. A separate monitor
  handoff will follow while E2E runs. Never inspect/use/modify Project.toml or
  Manifest.toml; production only, no devhub/fallback.
acceptance_criteria:
  - Exact local/private/production SHA equality and clean checkout.
  - Managed runtime RUNNING with attributable listener/process.
  - Three complete product/API rounds pass without redirects.
  - No source/Git/dependency/credential mutation.
requested_skills: []
---
