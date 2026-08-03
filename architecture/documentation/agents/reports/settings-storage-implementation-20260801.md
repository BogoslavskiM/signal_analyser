# Settings Storage implementation handoff

Date: `2026-08-01`
Role: Architect
Decision: `DEC-20260801-040`
Status: product-complete locally; production E2E prepared but deployment blocked

## Goal and scope

Deliver the complete per-Display settings inspector, validation and runtime
storage milestone without applying newly introduced values to plots or
mathematics. Preserve every previously effective backend and presentation
setting.

## Contracts

- `GET /api/settings?display_id=...` returns the exact six-key settings
  document with five groups, 29 ordered sections, 41 unique fields and three
  unavailable milestone-3 readouts.
- `POST /api/settings` accepts one exact typed field command. Canonical change
  increments the shared revision once; equal values are cold no-ops.
- Effective values use their existing typed domain authority. New values are
  stored per Display and cannot enter provider, cache or plot paths yet.
- Frontend drafts are local; invalid 422 responses do not publish state. Late
  Display responses cannot replace the active Display document.
- Presentation fields retain their existing legend/Normalize Y/markers effect.

## Changes and ownership

- Backend: immutable settings aggregate/catalog, atomic service, lifecycle
  reconciliation and GET/POST routes.
- Frontend: Vanilla JS metadata-driven groups, sections, controls, readouts,
  inline status/error handling, monotonic revision bridge and test seam.
- Tester: backend service/API contract matrices and browserless late-response
  regression.
- E2E Tester: one integrated SA-UI-011 scenario prepared; no per-control E2E
  cycles.
- Architect: DEC-040 was amended after a 12-point contradiction audit; repeat
  audit returned CLEAN.
- A newer official Signal Analyzer contract added the conditional Window
  Length `DFT Points`/NFFT control as the 41st stored-only field; Backend,
  Frontend and ordinary tests were corrected without enabling its computation.

## Verification

- Backend full regression: `1850/1850`, exit `0`.
- Settings focused: `31/31`; Settings API: `14/14`.
- Frontend ordinary suite: `4/4`; JS syntax and diff checks pass.
- Post-correction full Backend runner exits `0`; NFFT focused matrix is `30/30`
  and the DEC-022 Spectrogram requested/effective Log matrix is `14/14`.
- Integrated E2E spec syntax/support/static checks pass.
- Action-by-action interaction design review completed by Frontend for every
  control family, group/section, readout, error/status and keyboard path.

## Deployment and checkpoint risk

The accepted worktree is not deployed. The production-only DevOps call was
rejected by the platform usage-limit authority before pod start; the current
production pod remains stopped. The same authority blocks local git commits
until `2026-08-08 06:33` as reported by the tool. Nothing was staged, pushed,
uploaded or started; `stash@{0}` remains preserved. The frozen deployment
allowlist contains 14 product paths and excludes architecture, tests and the
stash.

## Follow-ups

1. When platform capacity returns, create the DEC-039 corrective checkpoint,
   then the DEC-040 milestone checkpoint; do not push without export authority.
2. Deploy only to `https://engee.com`, verify `/api/settings`, and run the
   prepared integrated Settings E2E plus the enabled full suite.
3. Milestone 3 may proceed locally because the feature is functionally
   complete and ordinary regressions pass; its new plot/math effects require a
   separate accepted contract.
