---
id: HND-0099
type: task
from: orchestrator
to: devops
title: Restore exact production Signal Analyzer after maintenance 404
task_section: ../tasks/TASK-0041-restore-production-after-maintenance.md#scope
devops_request: deploy
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
paths: []
description: |
  Restore/verify the existing production checkout and Genie application at
  exact SHA 18cfe33b4cf170547adba23c76c744c9e79b42ed after E2E observed HTTP 404
  platform maintenance. Inspect status/listener/logs, update only if needed,
  restart when required, and verify external product DOM plus /api/status.
  Do not stage or commit any local work. Project.toml and Manifest.toml are
  forbidden and must not be inspected, used or changed. Production engee.com
  only; no devhub/fallback.
acceptance_criteria:
  - Production checkout and running application report exact branch/SHA.
  - External root serves Signal Analyzer product DOM and /api/status HTTP 200.
  - Every pipeline stage is performed, not_needed, blocked or not_run.
  - No source, tests, architecture, dependency files or credentials are changed/persisted/reported.
requested_skills: []
---
