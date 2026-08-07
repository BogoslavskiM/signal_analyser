---
id: HND-0415
type: report
from: matlab_researcher
to: orchestrator
title: MATLAB reference mathematics audit report
task_section: ../tasks/TASK-0078-matlab-reference-math-audit.md#scope
applied_skills: [matlab-researcher/critical-scenario-coverage, matlab-researcher/matlab-researcher-workflow, matlab-researcher/matlab-clicker-research-loop]
skipped_requested_skills: []
evidence_status: collected_with_catalog_gaps
description: |
  The stable canonical catalog contains 16 artifacts, 157524 bytes, fingerprint
  sha256:9b12cef46d6e4cfc286539ee514e857fbf98ae55691c25af5bc2d57dc58a9fd0.
  Bootstrap verified the same paths/bytes/hashes, but all 155 referenced
  screenshots are ephemeral and currently unavailable; no fresh MATLAB GUI
  execution/pass is claimed. The strict scoped result is 0/17 critical rows:
  every row is stale, conflicting/invalid or missing.

  Confirmed MATLAB reference facts: Time normalization maps each signal min/max
  to 0..1 without changing raw statistics/spectrum; complex Time keeps real and
  imaginary components observable. Spectrum uses true-average power, linear
  cosine peak 0.5 and dB 10log10(P)=-3.0102999566, real one-sided and complex
  centered two-sided topology, Leakage default 0.5 with beta=40(1-l).
  Spectrogram is magnitude-squared STFT with default overlap 50%, Leakage 0.5,
  real/complex one-/two-sided topology and dB presentation. Persistence is a
  normalized frequency/log-power histogram with percent occurrence and default
  NumPowerBins=256.

  Current source mismatches/gaps: complex Time uses abs(values); Normalize Y
  divides by maximum(abs(values)) instead of min-max 0..1; Spectrogram and
  Persistence ignore Time ROI; Persistence does not dispatch stored time
  resolution, overlap, frequency limits or power-bin selection; Spectrum
  RBW/window modes remain stored/blocked. The catalog also conflicts on
  “Leakage 20”; official/documented default is 0.5 and visible 20 belongs to
  disabled Window Length.

  Engee User must localize provider support and edge behavior before Backend
  changes Engee-dependent math. E2E must later verify MATLAB-visible topology,
  normalization, scales/axes/ROI and the orthogonal explicit-Apply trigger.
verdict_scope: matlab_reference_scenario_catalog
coverage_scope_id: TASK-0078-HND-0412-MATLAB-MATH-v1
critical_scenarios_total: 17
critical_scenarios_covered: 0
all_critical_scenarios_covered: false
all_critical_scenarios_executed: false
all_critical_scenarios_passing: false
result: accepted_with_critical_gaps
---
