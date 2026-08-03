# Signal Analyser feature milestones after user review

Date: 2026-08-01
Owner: Architect
Branch: `neuro_signal_analyser_cascade`
Status: DEC-041/042 complete locally; DEC-043 Persistence Density Limits implementation active

## Required sequence

1. Complete Signals inspector Add/Copy/Delete.
2. Complete every graph settings menu plus authoritative setting, validation
   and persistence logic; do not apply settings to plots/math yet.
3. Apply stored settings to plots and mathematics.
4. Add Jet color profile to every applicable plot.
5. Run optimization/performance-only implementation after functional work.

No later milestone may begin before the current user-prioritized feature is
functionally complete and ordinary tests pass.

The phrase "persistence logic" in milestone 2 means authoritative per-Display
runtime state that survives Display switching, plot switching, Clear and
unrelated mutations. It does not enable file/session import-export or durable
disk persistence. Settings mutate immediately after a valid control commit;
there is no invented Apply button in this milestone.

Existing settings that already affect plots, EngeeDSP, measurements or
frontend presentation retain their accepted behavior. The milestone-2
storage-only boundary applies to newly introduced controls. Previously blocked
or NO-GO provider options may be represented by typed UI/state only when the
successor settings ADR names them explicitly; they remain unapplied and must
not be sent to EngeeDSP until milestone 3 resolves their capability and
resource gates.

## Signals capability map

```text
product_capability: signals.inventory-actions
skill_ids:
  - backend/state-model (state.inspector semantics, bounded existing identity)
  - backend/api-contract-planning (api.inspector command transport)
  - frontend/inspector-ui (core list/selection semantics only)
  - frontend/dialog-system (dialog.form, dialog.error, confirmation form)
  - frontend/ui-contract-change
  - frontend/style-system (style.tooltip, style.icons, style.busy)
owner: Backend + Frontend; Tester after contract; E2E only after milestone gate
contracts: DEC-20260801-037
tests: backend domain/API plus frontend static/behavior, then one integrated E2E
```

`frontend/file-browser-dialog` is deliberately not enabled: Engee workspace
import is variable transfer through `engee.genie.recv`, not filesystem import.
Optional `inspector.crud` is deliberately not enabled because its generic
row-action/no-confirmation defaults conflict with DEC-037. Signals uses a
project-specific toolbar-only Copy/Delete contract with confirmed Delete.

## Current role queue

| Role | Current | Next | Blocker/dependency |
| --- | --- | --- | --- |
| Architect | DEC-041/042 local gates accepted; DEC-043 active/lazy/effect contradictions corrected and audit CLEAN | accept DEC-043 Backend-first implementation | production deploy and git checkpoints blocked by platform usage limit |
| Backend | DEC-042 complete; full backend exit 0 | DEC-043 typed Persistence density presentation under DEC-029 | none |
| Frontend | unit projection and strict Spectrogram scale integration complete; frontend 4/4 | DEC-043 authoritative rendered-density integration after Backend handoff | Backend-first gate |
| Tester | DEC-041 46/46; DEC-042 26/26; full backend exit 0; frontend 4/4 | DEC-043 backend/frontend ordinary matrix after product symbols | Backend/Frontend handoffs |
| E2E Tester | integrated SA-UI-011 Settings scenario static/support PASS | production scenario plus enabled full suite | new runtime not deployed; prod pod stopped |
| DevOps | 14-path production allowlist frozen; no staging/upload/start | checkpoint, deploy, health/API handoff | platform usage-limit authority until reported 2026-08-08 06:33 |
| MATLAB Researcher | SA-UI-011 complete; application semantics research active | requested/effective/provider evidence matrix | preserve healthy clicker server; documentation through web only |

## Evidence

- Backend and Frontend read-only gap assessments.
- Tester read-only coverage inventory.
- Official MathWorks Signals lifecycle research.
- Official Engee Genie recv documentation.
- Live MATLAB R2024b contextual inventory completed and saved as SA-UI-011;
  DEC-040 repeat audit is CLEAN against the report and prior ADR boundaries.

C30 product/test WIP remains separately recoverable in `stash@{0}` and is not
part of this feature.
