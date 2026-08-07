---
id: HND-0218
type: report
from: devops
to: orchestrator
title: Immutable runtime revision deployed and directly attested
task_section: ../tasks/TASK-0043-expose-runtime-revision.md#verification-and-results
devops_request: deploy
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
paths: []
description: |
  Production is RUNNING at exact SHA
  38d4134ea962b264ebabe0e7e9814c48368a975c (PID 1716, listener 10000).
  Local/private/fetched/checkout/runtime_revision values are identical and the
  scoped runtime surface is clean. Two unique nonce status requests returned
  HTTP 200 with the exact SHA, external no-cache, no Age and no conflicting
  indicator. Root/state/app.js/app.css returned 200; final logs have no errors.
  No revision env, source/dependency/history mutation, credentials persistence,
  devhub or fallback was used.
applied_skills: [devops/devops-workflow]
design_ref: null
design_version: null
design_status: n/a
---
