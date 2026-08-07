---
id: TASK-0084
kind: task
title: Диагностировать production HTTP 404 перед exact-revision E2E
status: in_progress
priority: P0
queue_order: 1
model: gpt-5.6-terra
reasoning: medium
owner: orchestrator
assignees: [devops]
parent: TASK-0077
depends_on: []
blocks: []
source_handoffs: [HND-0417]
related_handoffs: [HND-0417, HND-0418, HND-0419]
blocked_by: [production_devops_task_lock_busy]
blocker_reason: Production pod is running/ready, but mcp_devops_genie_is_bysy remained busy for 3139 atomic attempts over 61740 seconds; policy forbids clearing or bypassing a possibly foreign lock, so exact revision, log and HTTP diagnostics have not run. DevOps continues waiting as explicitly requested by the user.
development_branch: neuro_signal_analyser_ui_refinement
ui_impact: none
---

# Scope

Run production-only `get_logs` diagnostics for the current target HTTP 404.
Correlate exact checkout revision, pod status/readiness, application log and
target HTTP response. Do not start the application, modify source or perform
Git stages in this diagnostic request; mandatory production checkout cleanup
and task lock remain required by DevOps workflow.

## Acceptance criteria

- [ ] Production lock lifecycle and pod/worktree preflight are reported.
- [ ] Exact checkout SHA, target HTTP status and bounded sanitized logs are captured.
- [ ] Failure owner is evidence-based and routed without calling it an Engee bug.
- [ ] Diagnosis and log refs are persisted under architecture/logs.
