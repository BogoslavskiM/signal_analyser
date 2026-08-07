---
id: HND-0421
type: task
from: orchestrator
to: backender
title: Implement authoritative explicit-Apply calculation flow
task_section: ../tasks/TASK-0081-backend-explicit-apply-calculation.md#scope
source_branch: neuro_signal_analyser_ui_refinement
description: |
  Replace the current calculation-affecting settings mutation contract with a
  typed backend draft update that performs zero provider calls and zero output
  invalidation. Add one atomic explicit Apply command over the already stored
  backend draft; the request must not accept a settings snapshot. Apply must
  logically supersede stale work before validation, validate atomically, keep
  invalid draft and existing ready outputs intact on failure, and on success
  publish one monotonic revision and invalidate only affected active contexts.
  Do not eagerly calculate in Apply: the subsequent active-output request may
  materialize only the applied revision; inactive pages remain cold.

  Preserve state-lite and typed deterministic stale/duplicate/error envelopes.
  Correct MATLAB-confirmed product-owned presentation contracts: complex Time
  exposes real and imaginary traces rather than magnitude-only; Normalize Y
  min-max maps each nonconstant trace to 0..1 without mutating raw samples used
  by statistics or spectral calculations. Apply Engee-dependent behavior only
  from accepted HND-0420: current Spectrogram/Persistence ROI and undispatched
  settings must stay explicitly unsupported unless the verified public
  pspectrum contract directly supports the exact adapter call. Never add a
  silent fallback, provider emulation or dependency-file edit.
allowed_paths:
  - app/routes.jl
  - lib/services/signal_settings_service.jl
  - lib/services/signal_analyser_service.jl
  - lib/models
acceptance_criteria:
  - Field update stores typed draft but does not invalidate/clear outputs, call EngeeDSP or start polling work.
  - Apply accepts no settings snapshot and returns promptly with typed success/state_revision or validation error.
  - Invalid Apply preserves the draft and last ready cache; successful Apply publishes exactly one revision and only active affected output becomes eligible for materialization.
  - Stale and duplicate Apply responses are deterministic and cannot overwrite a newer revision.
  - Complex Time real/imag and Normalize Y min-max contracts match HND-0415 without changing raw statistics/spectrum inputs.
  - Existing backend suite and focused new contract-compatible checks pass; product test files remain Tester-owned.
requested_skills: [backender/backender-workflow, backender/backend-design, backender/state-model, backender/api-contract-planning, backender/calculation-planning, backender/apply-calculation-flow]
evidence_refs:
  - HND-0415
  - HND-0420
---
