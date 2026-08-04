---
id: HND-0063
type: report
from: devops
to: orchestrator
title: Hung Genie process replaced, runtime routes unavailable
task_section: ../tasks/TASK-0036-apply-frontend-design-patterns.md#verification-and-results
applied_skills: [devops/devops-workflow]
description: |
  devops_request: deploy
  expected_sha: d170f878ef292a1822e35290be4c0e193d5141a9
  old_pid: 416 terminated after guard verification
  replacement_pid: 1815
  listener: 0.0.0.0:8080 active
  root_http_status: 404
  api_status_http_status: 404
  restart: blocked

  Replacement used explicit production host/port and kept exact checkout
  clean. Exact-revision probe identified app bootstrap constructor failure and
  zero registered routes; tracked as TASK-0037.
---
