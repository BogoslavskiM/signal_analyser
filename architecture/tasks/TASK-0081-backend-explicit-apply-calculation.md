---
id: TASK-0081
kind: task
title: Перевести backend математику на явный Apply
status: done
priority: P0
queue_order: 1
model: gpt-5.6-sol
reasoning: xhigh
owner: orchestrator
assignees: [backender]
parent: TASK-0077
depends_on: [TASK-0079]
blocks: [TASK-0082, TASK-0083]
source_handoffs: [HND-0421]
related_handoffs: [HND-0415, HND-0420, HND-0421, HND-0423, HND-0432]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_refinement
ui_impact: none
---

# Scope

Implement typed field-update draft storage plus an atomic explicit-Apply
command/API for calculation-affecting settings. Field update and passive
state/view/session operations must not alter outputs or execute DSP. Apply acts
on the stored backend draft and accepts no repeated settings snapshot. Preserve
state-lite, monotonic revisions, active-only background materialization and
typed error envelopes; no silent fallback or dependency-file changes.
Correct the two MATLAB-confirmed non-Engee presentation contracts in the same
authoritative flow: complex Time exposes real and imaginary components rather
than magnitude-only, and Normalize Y maps each nonconstant trace by min-max to
0..1 while raw statistics and spectral calculations remain unchanged. Engee-
dependent ROI/settings behavior changes only when TASK-0079 provides an
executed public-function contract; unsupported settings stay explicit and do
not gain a hand-written implementation.

## Acceptance criteria

- [x] Draft field updates and passive mutations perform zero mathematical
  provider calls and do not clear/invalidate outputs.
- [x] Apply accepts no settings snapshot, validates the stored draft atomically
  and publishes one revision.
- [x] Only the affected active context is invalidated/materialized.
- [x] Stale/duplicate Apply is deterministic and typed.
- [x] Complex Time and Normalize Y match the accepted MATLAB reference without
  changing raw samples used by statistics/spectrum.
- [x] Spectrogram/Persistence ROI and stored settings are either backed by the
  accepted Engee contract or remain explicitly unsupported; no silent fallback.

## Result

Accepted HND-0423 and regression repair HND-0432. Explicit Apply, passive
snapshot, active-output and MATLAB Time focused contracts pass. Passive state
and view snapshots no longer materialize Spectrum/Spectrogram/Persistence.
TASK-0083 owns deterministic synchronization of the remaining legacy test and
the final complete regression gate.
