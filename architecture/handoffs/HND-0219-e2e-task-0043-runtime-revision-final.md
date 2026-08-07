---
id: HND-0219
type: task
from: orchestrator
to: e2e
title: Validate browser-visible immutable runtime revision in production
task_section: ../tasks/TASK-0043-expose-runtime-revision.md#verification-and-results
description: |
  Run the one mandatory post-task E2E on exact production SHA
  38d4134ea962b264ebabe0e7e9814c48368a975c. Fetch /api/status twice with unique
  query nonces and browser cache disabled; require HTTP 200, exact lowercase
  40-hex runtime_revision equal to required SHA, unchanged ok/project/ready and
  external Cache-Control no-store or Engee-normalized no-cache with absent Age.
  Prove the value remains unchanged across a normal page reload and mutable
  /api/state revision observation. Smoke root product DOM, state and key assets;
  no mutations, repo/Git/dependency/deploy changes.
acceptance_criteria:
  - Two nonce requests and one post-reload request return the exact same target SHA.
  - Status schema and cache freshness policy are exact.
  - Mutable state_revision is clearly distinct from runtime_revision.
  - Root product DOM, state and key assets are healthy with no application errors.
  - Browser closes and production state is not mutated.
requested_skills: [e2e/e2e-workflow]
design_ref: null
design_version: null
required_viewports: [1440x900]
---
