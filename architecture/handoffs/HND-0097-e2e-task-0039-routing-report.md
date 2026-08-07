---
id: HND-0097
type: report
from: e2e
to: orchestrator
title: Production Genie runtime routing operational with findings
task_section: ../tasks/TASK-0039-expose-production-genie-runtime.md#verification-and-results
applied_skills: [e2e/e2e-workflow]
description: |
  e2e_mode: quick_regression
  target: https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/
  requested_revision: 18cfe33b4cf170547adba23c76c744c9e79b42ed
  availability: passed
  planned: 9
  passed: 8
  failed: 1
  not_run: 0
  success_rate: 88.89%
  operational_result: operational_with_findings

  Root and /api/status returned HTTP 200; title, app shell, toolbar, Display,
  Settings and two-row Signals table were visible at 1440x900. /api/state
  returned HTTP 200 at revision 0. Browser-observable headers/DOM/status did
  not expose the exact SHA. A visible load-error and blank plot remained even
  though /api/state and /api/settings were observed as HTTP 200.

  Evidence screenshot:
  /private/tmp/e2e-hnd-0093-20260804-evidence/HND-0093-quick-1440x900.png
  SHA256: 8bd9864a4b91410de77727e5d0d2fe69af0716fc6563a34c28b62ec1ac818c91
  Browser was independently launched/closed; MATLAB, dependency files, Git,
  deployment and devhub/fallback were untouched.
---
