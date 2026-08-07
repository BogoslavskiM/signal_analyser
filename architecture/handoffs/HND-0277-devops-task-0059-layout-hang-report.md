---
id: HND-0277
type: report
from: devops
to: orchestrator
title: Production layout hang bounded; baseline runtime currently ready
task_section: ../tasks/TASK-0059-profile-frontend-stalls.md#verification-and-results
devops_request: get_logs
expected_revision: cac83c5f445352a50f04aeeeb269b47007766d79
description: |
  Production retained one process on the exact clean baseline revision; root
  and /api/status returned 200 with ready=true and ok=true, so no restart was
  performed. The 16.3-second settings outlier was predominantly upstream or
  connection wait: the request reached the application near 16.143 seconds
  and received 200 near 16.276 seconds, not a 16-second handler stall. The app
  log shows one bootstrap and no SIGTERM, exception, OOM, kill or rebootstrap.
  It contains stale layout 409s followed by successful 200s, but lacks request
  timestamps/IDs and cannot correlate the later 60-second Loading layout state
  to a particular server request. Ownership therefore remains undetermined;
  the currently healthy runtime is suitable for a fresh E2E rerun. No local or
  remote files were changed and local design v2 was not deployed.
evidence:
  - remote:/user/apps/signal_analyser/app_log.log
  - /private/tmp/HND-0235-e2e-profile-2026-08-05T14-25-58-552Z/report.json
  - /private/tmp/HND-0235-state-recovery-2026-08-05T14-33-07-804Z/report.json
applied_skills: [devops/devops-workflow, devops/engee-deployment-diagnostics]
skipped_requested_skills: []
---
