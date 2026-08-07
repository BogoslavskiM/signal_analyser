---
id: TASK-0066
kind: task
title: Расширить authoritative layout contract до 10×10
status: done
priority: P1
queue_order: 4
model: gpt-5.6-sol
reasoning: high
owner: orchestrator
assignees: [backender]
parent: TASK-0055
depends_on: []
blocks: [TASK-0058, TASK-0061]
source_handoffs: [HND-0222]
related_handoffs: [HND-0238, HND-0243, HND-0246, HND-0247, HND-0248, HND-0265, HND-0266]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_refinement
ui_impact: none
---

# Layout contract up to 10×10

## Scope

Расширить authoritative layout validation/state/session/API contract с прежнего
максимума до 10 rows и 10 columns включительно, сохранив stable pane identity,
active pane, per-pane plot type и signal bindings. Не создавать eager plot data
или calculations для inactive panes. Recommendation warning принадлежит
Designer/Frontend и не должен превращаться в backend validation error.

## Acceptance criteria

- [ ] 1×1 и 10×10 принимаются API/state/session round-trip; 0 и 11 отклоняются.
- [ ] Pane IDs, active pane, plot type and bindings сохраняются deterministically.
- [ ] 10×10 state contract не запускает eager inactive calculations/payloads.
- [ ] Existing layouts remain backward-compatible and backend checks pass.
- [ ] No local runtime or dependency-file access/change occurs.

## Queue decision

- Priority: P1, direct user scope update blocking visible implementation.
- Queue order: 4 after already-running independent evidence tasks.
- Eligibility: feature branch exists; task dispatched as HND-0238.

## Verification and results

HND-0246 accepted the backend implementation evidence: syntax 3/3, focused
TASK-0066 harness 59/59, stable 100-pane session round-trip and zero inactive
provider calls. Full backend regression is not yet accepted because two
Tester-owned files still encode the superseded 4×4/eager-all-pane contract;
TASK-0068 is the required test gate.
