---
id: HND-0080
type: task
from: orchestrator
to: backender
title: Добавить verified EngeeDSP dependency contract в Project.toml
task_section: ../tasks/TASK-0038-restore-engeedsp-project-contract.md#scope
description: |
  На основании terminal Engee report HND-0079 измени только Backender-owned
  Project.toml: добавь exact dep UUID
  f9bbbd0e-0dd6-4072-898a-88f8f1250a99, compat 0.74.0 и production-system
  source URL
  https://gitlab.kpm-ritm.ru/engee/backend/kernels/engeelibraries/EngeeDSP.jl.git
  с rev master. Не меняй Manifest.toml, lib/app API/math, tests или architecture;
  не добавляй public registry assumption, alternate package или fallback.
  Проверь TOML/project contract и доступные focused bootstrap/unit probes без
  изменения production. Верни Tester FYI с точным dependency contract и
  Orchestrator report; отдельно укажи downstream Pkg resolution expectation.
acceptance_criteria:
  - Project.toml contains exact verified deps, compat and sources entries.
  - Existing Genie/Test dependency semantics are preserved.
  - No Manifest, product logic, API/math or test changes.
  - TOML parse and available focused backend/bootstrap checks pass or return exact environment blocker.
requested_skills: []
---
