---
id: HND-0298
type: task
from: orchestrator
to: devops
title: Publish and deploy tested feature revision for production validation
task_section: ../tasks/TASK-0059-profile-frontend-stalls.md#verification-and-results
devops_request: deploy
description: |
  Publish one focused commit on neuro_signal_analyser_ui_refinement containing
  only tested product/runtime and regression assets required by TASK-0058,
  TASK-0062, TASK-0070 and TASK-0072. Stage explicit paths under lib/domain,
  lib/services, public, test/back, test/front and the relevant profiler/runtime
  test scripts. Exclude all user-owned agent/skill/architecture changes and
  exclude Project.toml/Manifest.toml. Run pre-commit front and full backend
  gates without dependency files, push the feature branch, then deploy that
  exact commit to production Engee with explicit auto_stop=false. Do not merge
  neuro_dev yet: performance and browser acceptance remain open. Attest one
  process, exact runtime SHA, root/status 200 and functionally ready layout.
acceptance_criteria:
  - Commit contains only explicitly reviewed product/test paths and no dependency/skill/agent files.
  - Frontend seven-file and full backend gates pass before publication.
  - Exact feature SHA is pushed and production reports the same SHA.
  - auto_stop=false, sole process, root/status 200 and ready active layout are attested.
requested_skills: [devops/devops-workflow, devops/engee-deployment-diagnostics]
---
