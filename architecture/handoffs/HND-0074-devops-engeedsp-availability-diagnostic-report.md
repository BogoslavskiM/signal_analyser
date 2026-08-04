---
id: HND-0074
type: report
from: devops
to: orchestrator
title: EngeeDSP requires Backender-owned project contract work
task_section: ../tasks/TASK-0038-restore-engeedsp-project-contract.md#source-evidence
applied_skills: [devops/devops-workflow]
description: |
  On production SHA 3c06387ea5f4c6617b67a8081922fe52be22f381 the active
  project is /user/apps/signal_analyser/Project.toml; LOAD_PATH and DEPOT_PATH
  were inspected read-only. `Base.find_package("EngeeDSP")` returned nothing;
  Project/Pkg.status contain only Genie and Test, and no EngeeDSP package is
  installed in listed environments/depots. This is not an environment-only
  operation: Backender-owned Project.toml contract work is required. PID 2073
  was preserved; nothing was installed, changed or restarted.
---
