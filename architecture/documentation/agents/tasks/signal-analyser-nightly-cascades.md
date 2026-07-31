# Ночная multi-agent разработка Signal Analyser

> Внутренняя active-task запись. Клиентский статус опубликован в
> [`../../user/reports/`](../../user/reports/README.md).

Status: active-cascade-3-p0
Owner: Architect  
Branch: `neuro_signal_analyser_cascade`  
Architecture checkpoint: `98d6cd8`

## Goal

Стабилизировать первую prod-версию, довести второй каскад MATLAB-подобной
видимости сигналов и реализовать минимальный третий каскад raw statistics без
изменения фиксированной сетки 2×2.

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

## Contract третьего каскада P0 — 2026-07-31

- Никакого нового endpoint: `measurements` является additive частью каждого
  authoritative state snapshot и относится к текущему selected visible signal.
- Exact shape: `state_revision`, `signal_name`, `ordinate`, `units`, `items`.
  `items` — ordered array `minimum`, `maximum`, `mean`; mean имеет
  `time_s=null`, `sample_index=null`.
- Источник — полный raw signal до plot downsampling. Real ordinate использует
  real component, complex — magnitude. Extrema выбирают первый tie; API index
  zero-based, `time_s=sample_index/sample_rate_hz`.
- Base/Statistics допустимы. Peaks, `findpeaks`, settings и per-display
  membership исключены из P0; peaks переходят в Cascade 4 с обязательной
  публичной EngeeDSP/domain функцией.
- В нижней зоне frontend добавляет локальные вкладки `Сигналы`/`Измерения`;
  settings sidebar остаётся settings, switch вкладки не меняет revision.
- E2E обязан обеспечить достаточное timing logging и по логам анализировать
  performance, hangs, retries и уместность timeout. Реализацию, размещение и
  формат логов выбирает E2E Tester; material issue даёт evidence-backed handoff.

## Persistent role heartbeat — 2026-07-31

| Canonical role | Persistent agent ID | Current task | Next queued task | Blocker | Last handoff/status |
| --- | --- | --- | --- | --- | --- |
| Backend | `019fb7f1-3d91-7a42-bc79-43d4b26bf570` | Cascade 4 read-only `findpeaks` contract sidecar | integrate Tester findings | none | Cascade 3 exact snapshot implementation complete; parse/probes PASS |
| Frontend | `019fb7f1-4164-7003-a5c0-5e109ee82074` | correct P0 `items` array consumption | Cascade 4 peaks UI contract | exact-array correction active | first P0 handoff rejected for object/array mismatch |
| Tester | `019fb7f1-26cf-75c0-9b01-69e5e2f5cc4d` | replace stale provisional tests with exact P0 array contract | Cascade 4 Engee `findpeaks` contract matrix | exact-shape correction active | interrupted draft rejected for canceled nested shape |
| E2E Tester | `019fb7f1-4bbf-75d2-9279-d8dedede56c5` | snapshot-only P0 scenario plus timing logging | Cascade 4 scenario design | runtime waits for deployed P0 later | implementation active |
| DevOps | `019fb7f1-486d-7041-ba96-8ed0119fc97f` | completed standby | authorized devhub startup reproduction | explicit authorization/deployed SHA required | suspected startup triage handoff complete |
| MATLAB Researcher | `019fb7d3-32b4-77a0-bfa2-14f4d72dd983` | Cycle 4 | next bounded observed delta | none reported | Cycles 2/3 handed off |

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

Cascade 2 is deployed and runtime-verified at product SHA `2eba776`; test-only
HEAD was `f9ff77e`. Cascade 3 P0 is uncommitted, not verified and not deployed.

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

## Dated runtime correction 2026-07-31 — Cascade 2 complete

Prod at `2eba776` remained healthy with `devel=false`; full E2E 7/7 passed.
Local Plotly returned 200, completed in 8232 ms with 469541 encoded bytes,
issued no CDN request, produced four ready hosts and left zero visible
placeholders. SA-VIS-07 passed and final UI state was restored. This supersedes
the earlier pending-runtime wording in this mutable active task.

## Durable handoffs

- [Backend](../handoff/backend-cascades.md)
- [Frontend](../handoff/frontend-cascades.md)
- [Tester](../handoff/tester-cascades.md)
- [E2E Tester](../handoff/e2e-cascades.md)
- [DevOps](../handoff/devops-cascades.md)
- [MATLAB Researcher](../handoff/matlab-researcher-cascades.md)
