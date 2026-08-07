---
id: HND-0412
type: research
from: orchestrator
to: matlab_researcher
title: Audit MATLAB reference mathematics for explicit Apply modernization
task_section: ../tasks/TASK-0078-matlab-reference-math-audit.md#scope
background_research: true
description: |
  Build the critical MATLAB reference matrix for every currently supported
  time, spectrum, spectrogram and persistence path. Source saved scenarios from
  matlab_clicker, inventory requirements independently, verify factual gaps in
  MATLAB, and separate formulas/documented behavior from observations. Explicit
  Apply is a product trigger rule, not a reason to alter MATLAB mathematics.
acceptance_criteria:
  - Return catalog provenance, critical inventory and scenario evidence matrix.
  - Record defaults, units, scales, real/complex and edge behavior per calculation.
  - Map math/compatibility cases to Engee User and visible cases to E2E.
  - Use the scoped all_critical_scenarios_covered verdict correctly.
requested_skills: [matlab-researcher/matlab-researcher-workflow, matlab-researcher/critical-scenario-coverage, matlab-researcher/matlab-clicker-research-loop]
---
