# Ночная multi-agent разработка Signal Analyser

> Внутренняя active-task запись. Клиентский статус опубликован в
> [`../../user/reports/`](../../user/reports/README.md).

Status: active-cascade-3-p0-autonomous-cycle-2
Owner: Architect  
Branch: `neuro_signal_analyser_cascade`  
Architecture checkpoint: pending autonomous-cycle-2 documentation checkpoint

## Goal

Стабилизировать первую prod-версию, довести Display pages с одним графиком,
MATLAB-подобную видимость сигналов и минимальный третий каскад raw statistics
без multi-layout editor.

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
- Русские loading/error/visibility labels. Display pages с одним графиком,
  без multi-layout editor.

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

## Autonomous cycle restart — 2026-07-31

Пользователь явно запустил новый непрерывный multi-agent цикл до команды
«стоп» и сообщил, что MATLAB clicker server запущен. Предыдущие persistent
threads были остановлены пользователем и недоступны; созданы ровно по одному
replacement-thread на каноническую роль.

| Canonical role | Replacement session | Current task | Next queued task | Blocker | Last handoff/status |
| --- | --- | --- | --- | --- | --- |
| Backend | `/root/backend_cycle` | completed standby | evidence-backed Cascade 4 contract sidecar | public `findpeaks` contract absent | typed OOP/atomicity handoff; backend 504/504 |
| Frontend | `/root/frontend_cycle` | completed standby | consume runtime/Backend peaks contract | Backend peaks contract absent | P0 product + read-only peaks UI handoff complete |
| Tester | `/root/tester_cycle` | completed standby | rerun after new product/research handoff | no new eligible contract | backend 504/504; frontend 2/2 |
| E2E Tester | `/root/e2e_cycle` | completed standby | runtime P0 on authenticated target | canonical URL redirects to account login; retained PTY required | CDP classification complete; no product spec run |
| DevOps | `/root/devops_cycle` | completed standby | push `651943d` after explicit GitHub approval | external transmission approval | local checkpoint + fresh-profile CDP recovery complete; no deploy/merge |
| MATLAB Researcher | `/root/matlab_cycle` | SA-UI-006 selection/membership portability research | next bounded observed delta | none | SA-UI-005 deterministic statistics/Peaks scenario saved; full Command Window guard confirmed |

DevOps gate evidence: branch `neuro_signal_analyser_cascade`, product/test HEAD
`651943d`, no product/test changes remain outside the checkpoint, no conflicts,
upstream divergence `0 behind / 6 ahead`. Architecture documentation remains a
separate pending checkpoint. Unpushed commits do not block implementation;
future checkpoints stage only explicit completed handoff files. No merge into
`dev` is authorized without a new explicit user acceptance handoff.

## Verification

- Julia parse changed backend: PASS.
- Backend: current full gate 504/504 assertions PASS, including typed OOP
  measurements and atomic invalid-raw selection regression.
- Frontend static/behavior: 2/2 files PASS.
- E2E support contract and syntax checks: PASS.
- Runtime E2E: fresh-profile CDP attachment PASS, but canonical target redirects
  to `account/login`; product specs require an authenticated retained PTY/tab.
- Local EngeeDSP contract: FAIL because `EngeeDSP` is absent in the local
  environment; required environment rerun remains open.
- Prod Engee MIND `EngeeDSP` contract: PASS for version `0.72.0`, expected UUID,
  `pspectrum` power/spectrogram/persistence finite, shape and range probes.

## Acceptance status

Cascade 2 is deployed and runtime-verified at product SHA `2eba776`; test-only
HEAD was `f9ff77e`. Cascade 3 P0, Display pages and local-only Plotly are locally
committed as `651943d` and verified by backend/frontend/static E2E gates, but
are not pushed or deployed. Runtime product E2E remains authentication-blocked.

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
Time-Frequency/Persistence and duplicate import overwrite prompt. SA-UI-005
adds a fully guarded deterministic 15-sample signal: Signal Statistics opens
with Minimum/Maximum/Mean, minimum is `-2` at `12 s`, maximum is `3` at `5 s`;
the exact mean oracle is `1/3`. Peaks is time-domain dependent: `Find Peaks`
and `Settings` were enabled while `Label Peaks` was disabled in the observed
state. Median/settings mutations did not visually confirm within the bounded
attempt budget and are not claimed. SA-UI-006 is active.

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
