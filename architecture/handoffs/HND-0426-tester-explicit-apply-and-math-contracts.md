---
id: HND-0426
type: task
from: orchestrator
to: tester
title: Verify explicit Apply, MATLAB parity and frontend lifecycle
task_section: ../tasks/TASK-0083-test-explicit-apply-and-math-contracts.md#scope
source_branch: neuro_signal_analyser_ui_refinement
description: |
  Update Tester-owned backend/API/frontend expectations to the accepted
  HND-0415/HND-0420/HND-0423/HND-0425 contracts and add deterministic positive,
  negative, race and lifecycle coverage. Do not preserve obsolete reactive math
  or single-complex-Time assumptions. Prove draft field updates make zero
  provider calls/output invalidations; Apply is exact snapshot-free, atomic,
  lazy and active-pane-only; invalid/stale/duplicate behavior preserves draft
  and cache. Cover all provider-free presentation controls, explicit unsupported
  ROI, complex real/imag ordering, min-max including constant traces and raw
  stats/Spectrum invariants.

  For frontend, prove one local Vue root, exact 150 ms coalescing and ordered
  flush, no output/Apply call on input, local-invalid versus backend-semantic
  behavior, applying/pending/ready/error/stale/retry, active-only request,
  latest revision rejection, no autoretry, last-good Plotly, stable selectors,
  accessibility and static design contracts. Investigate and correctly resolve
  the pre-existing 188 px responsive select assertion: update product via a
  Frontend handoff if implementation is wrong; update the test only if accepted
  design v1 definitively supersedes the old expectation. Never weaken a
  behavioral contract merely to get green.

  Run complete backend and frontend suites without starting the application
  locally. Engee persistent tests are accepted from HND-0420; do not edit
  test/engee. Report exact counts, coverage/gaps and product-owner failures.
allowed_paths:
  - test/back/**
  - test/front/**
acceptance_criteria:
  - Backend/API tests fail on passive math, snapshot-bearing Apply, eager/inactive calculation or raw-data mutation.
  - Frontend tests cover exact request counts/order, every visible Apply state, stale/race recovery and active-only output lifecycle.
  - Complex real/imag and MATLAB min-max/raw invariants replace obsolete single-magnitude expectations.
  - Complete backend and frontend suites run with exact results; any product defect is routed rather than hidden.
requested_skills: [tester/tester-workflow, tester/backend-unit-testing, tester/backend-api-testing, tester/frontend-static-behavior-testing]
evidence_refs: [HND-0415, HND-0420, HND-0422, HND-0423, HND-0425]
---
