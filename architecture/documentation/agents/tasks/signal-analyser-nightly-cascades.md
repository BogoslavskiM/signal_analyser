# Ночная multi-agent разработка Signal Analyser

> Внутренняя active-task запись. Клиентский статус опубликован в
> [`../../user/reports/`](../../user/reports/README.md).

Status: integration-review  
Owner: Architect  
Branch: `neuro_signal_analyser_cascade`  
Architecture checkpoint: `98d6cd8`

## Goal

Стабилизировать первую prod-версию и реализовать второй каскад MATLAB-подобной
видимости сигналов без изменения фиксированной сетки 2×2.

## Contract второго каскада

- `/api/view` принимает expected `state_revision` и полный ordered
  `visible_signals`.
- Visibility validation строгая: массив строк, непустой, уникальный, только
  существующие сигналы. Stale revision не изменяет state.
- Selected всегда visible; при его скрытии backend выбирает первый visible в
  каноническом порядке таблицы.
- Time и spectrum строят отдельные named/colored traces всех visible signals с
  legend. Spectrogram и persistence используют selected visible signal.
- Checkbox не запускает row selection; frontend сериализует mutations и
  канонизирует state по backend response.
- Перед реальным `Plotly.react` удаляется только `.plot-placeholder`; host и
  существующий Plotly graph не уничтожаются. После ready видимого placeholder
  нет.
- Русские loading/error/visibility labels. Fixed 2×2, без layouts.

## Roles and resume identities

| Canonical role | Historical session | Persistent session | Status |
| --- | --- | --- | --- |
| Backend | `019fb7cf-6c54-7f01-9bff-4000bcc360cb` | `019fb7f1-3d91-7a42-bc79-43d4b26bf570` | implementation complete, persistent audit active |
| Frontend | `019fb7cf-7581-7230-9c9f-7a88483b80af` | `019fb7f1-4164-7003-a5c0-5e109ee82074` | implementation complete, 2/2 PASS, persistent audit active |
| Tester | `019fb7d7-3fc2-7be3-ae12-77594d92f0b6` | `019fb7f1-26cf-75c0-9b01-69e5e2f5cc4d` | tests complete, persistent audit active |
| E2E Tester | `019fb7d6-ce10-7cc2-aafe-616426ac3595` | `019fb7f1-4bbf-75d2-9279-d8dedede56c5` | scaffold/support complete, persistent audit active |
| DevOps | `019fb7cd-4958-79c0-86b9-b3d76fb80e04` | `019fb7f1-486d-7041-ba96-8ed0119fc97f` | gate/checklist complete, persistent audit active |
| MATLAB Researcher | `019fb7d3-32b4-77a0-bfa2-14f4d72dd983` | same permanent thread | research continues separately |

## Verification

- Julia parse changed backend: PASS.
- Backend: current full gate 289/289 assertions PASS after Tester additions;
  earlier implementation gate was 262/262.
- Frontend static/behavior: 2/2 files PASS.
- E2E support contract and syntax checks: PASS.
- Runtime E2E: pending current target or deployment of product changes.
- Local EngeeDSP contract: FAIL because `EngeeDSP` is absent in the local
  environment; required environment rerun remains open.
- Current prod runtime preload/import probe: PASS for expected EngeeDSP UUID;
  app project discovery remains absent.

## Acceptance status

Implementation and local product contracts are complete. Final acceptance still
requires a target containing the second cascade, runtime visibility E2E, and an
EngeeDSP-enabled contract run. Commit, push and deployment of product/test
changes are intentionally outside this agent flow.

EngeeDSP ambiguity is not an unconditional second-deploy blocker: on the same
target, deployment may proceed only after the UUID/preload/import and target
contract preflight passes. A failed preflight blocks deployment. No blind
`Project.toml` edit is authorized.

## Documentation Definition of Done

- Client current specification and math include only implemented behavior with
  code/test anchors.
- ADR, traceability and append-only dated history are updated.
- Internal task/backlog/handoff and persistent registry are current.
- Engee candidates are triaged into internal intake and client bug IDs without
  promoting unresolved isolation beyond `suspected`.
- `implemented`, `verified` and `deployed` remain separate.
- Client-relevant evidence is stored as relative links to versioned repo files
  or promoted into `user/assets/`; no temporary/absolute client links and no
  docs site/PDF pipeline.

## Research update 2026-07-31

SA-UI-001 confirms real workspace variables/timetables, three-signal Time plot,
independent selection/display membership/active display, disabled multi-signal
Time-Frequency/Persistence and duplicate import overwrite prompt. Only the
final guard command has complete per-command screenshot evidence; next bounded
cycle is active.

## Durable handoffs

- [Backend](../handoff/backend-cascades.md)
- [Frontend](../handoff/frontend-cascades.md)
- [Tester](../handoff/tester-cascades.md)
- [E2E Tester](../handoff/e2e-cascades.md)
- [DevOps](../handoff/devops-cascades.md)
- [MATLAB Researcher](../handoff/matlab-researcher-cascades.md)
