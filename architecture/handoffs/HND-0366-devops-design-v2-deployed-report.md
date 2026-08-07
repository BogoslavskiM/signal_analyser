---
id: HND-0366
type: report
from: devops
to: orchestrator
title: Design v2 and active-output revision deployed to production
task_section: ../tasks/TASK-0074-restore-production-design-v2.md#acceptance-criteria
description: |
  DevOps committed and pushed exactly the 19 allowlisted paths as
  eb4f81eb695ddafef032646aff6245f4f380c4f8, fast-forwarded the clean
  production checkout to the same SHA and started the absolute app path through
  engee.genie.start. The initial external gateway probe briefly returned the
  generic maintenance 404 despite internal Ready!/HEAD 200; the same production
  URL subsequently returned HTTP 200 and /api/status returned ready=true,
  ok=true with the exact runtime revision. No dependency file was read, changed,
  staged, synchronized or instantiated.
acceptance_criteria:
  - Exact 19-path commit and origin push: passed.
  - Exact production runtime revision: eb4f81eb695ddafef032646aff6245f4f380c4f8.
  - Root HTTP 200 and /api/status ready=true, ok=true: passed after gateway propagation.
  - Protected dependency files and unrelated worktree content: untouched.
applied_skills: [devops/devops-workflow, devops/engee-deployment-diagnostics, devops/technical-maintenance-screen-diagnostics]
---
