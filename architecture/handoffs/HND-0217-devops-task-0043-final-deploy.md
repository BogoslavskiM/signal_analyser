---
id: HND-0217
type: task
from: orchestrator
to: devops
title: Leave exact runtime revision target deployed under proxy cache policy
task_section: ../tasks/TASK-0043-expose-runtime-revision.md#verification-and-results
devops_request: deploy
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
paths: []
description: |
  Update recovered production to exact published SHA
  38d4134ea962b264ebabe0e7e9814c48368a975c and normal managed-start it. The
  application source/test contract remains Cache-Control no-store; accept Engee's
  external normalization to `no-cache` as platform policy if two unique
  cache-busting /api/status query requests both return HTTP 200 and exact target
  runtime_revision, with no conflicting Age/stale value. Require root/state/assets
  200 and leave the target RUNNING. Roll back to a232065 only for startup, exact
  SHA, nonce consistency or health failure. No source/Git/dependency changes.
acceptance_criteria:
  - Production checkout and runtime_revision equal exact target SHA.
  - Two unique status nonce requests independently return the exact target SHA.
  - External Cache-Control is no-store or platform-normalized no-cache.
  - Root/state/app.js/app.css are HTTP 200 and target remains RUNNING.
requested_skills: [devops/devops-workflow]
design_ref: null
design_version: null
design_status: n/a
---
