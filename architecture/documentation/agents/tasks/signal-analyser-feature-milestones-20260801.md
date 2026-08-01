# Signal Analyser feature milestones after user review

Date: 2026-08-01
Owner: Architect
Branch: `neuro_signal_analyser_cascade`
Status: Signals contract checkpoint active

## Required sequence

1. Complete Signals inspector Add/Copy/Delete.
2. Complete every graph settings menu plus authoritative setting, validation
   and persistence logic; do not apply settings to plots/math yet.
3. Apply stored settings to plots and mathematics.
4. Add Jet color profile to every applicable plot.
5. Run optimization/performance-only implementation after functional work.

No later milestone may begin before the current user-prioritized feature is
functionally complete and ordinary tests pass.

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
| Architect | freeze DEC-037/checkpoint | integrate handoffs and design review | none |
| Backend | eligible after checkpoint | typed signal commands + workspace adapter | contract commit |
| Frontend | eligible after Backend API handoff | toolbar/menu/dialog/mutation queue | exact response/request handoff |
| Tester | eligible after checkpoint | domain/API and frontend behavior matrices | product symbols may land concurrently |
| E2E Tester | ineligible for new scenario | one Signals workflow | product complete + ordinary tests + design review |
| DevOps | contract checkpoint commit | product/test checkpoints | exact completed file handoff |
| MATLAB Researcher | completed official-doc reference | visual check only if clicker health recovers | persistent clicker unavailable |

## Evidence

- Backend and Frontend read-only gap assessments.
- Tester read-only coverage inventory.
- Official MathWorks Signals lifecycle research.
- Official Engee Genie recv documentation.
- Clicker GUI attempt stopped safely after bounded health failure; no GUI
  mutation or observed-undocumented claim.

C30 product/test WIP remains separately recoverable in `stash@{0}` and is not
part of this feature.
