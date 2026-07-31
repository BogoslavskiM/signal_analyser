# Ночная multi-agent разработка Signal Analyser

> Внутренняя active-task запись. Клиентский статус опубликован в
> [`../../user/reports/`](../../user/reports/README.md).

Status: active-cascade-5-p0-autonomous-cycle-2
Owner: Architect  
Branch: `neuro_signal_analyser_cascade`  
Architecture checkpoint: local Cascade 4 documentation checkpoint (see git history)

## Goal

Стабилизировать первую prod-версию, довести Display pages с одним графиком,
MATLAB-подобную видимость/статистики и evidence-backed time-domain Peaks без
multi-layout editor.

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

## Contract четвёртого каскада P0 Peaks — 2026-07-31

- Prod Engee MIND и официальный Engee reference подтвердили
  `EngeeDSP.Functions.findpeaks(ordinate; out=:data)` и typed result
  `NamedTuple(Ypk, Xpk, Wpk, Ppk)`. Математический fallback запрещён.
- Peaks — time-domain, per-Display capability. В `SignalAnalyserDisplayState`
  добавляется `peaks_enabled`; новый Display начинает с `false`.
- Новый endpoint не создаётся. `/api/view` принимает additive boolean
  `peaks_enabled` вместе с expected `state_revision`. Включение допустимо только
  для Time plot; переход на другой plot атомарно выключает Peaks.
- Authoritative snapshot всегда содержит `peaks`: `enabled`, `state_revision`,
  `display_id`, `signal_name`, `ordinate`, `units`, `items`. При `enabled=false`
  `items=[]`, Engee provider не загружается и не вызывается.
- При `enabled=true` provider работает по полному raw ordinate: real component
  для real signal, magnitude для complex. Package `Xpk` переводится из Julia
  1-based в product `sample_index` zero-based; `time_s=sample_index/fs`.
  `width_samples` и `prominence` берутся из `Wpk`/`Ppk`; default occurrence
  order сохраняется. Item имеет stable `id=peak-<sample_index>`.
- Peaks snapshot принадлежит active Display и selected visible signal; revision
  равна корневой. View/display mutation сначала полностью готовит typed peaks
  будущей revision и только затем публикует state/cache mutation. Provider error
  не меняет revision, Display, selection, membership или cache.
- OOP boundary: immutable query/result/item/snapshot, `AbstractPeaksProvider`,
  `EngeeDSPPeaksProvider`, `SignalPeaksService{P}`. `Dict` допустим только в API
  mapper. Runtime adapter загружает EngeeDSP лениво; отсутствие пакета даёт
  стабильную capability error только при попытке включить Peaks.
- Frontend `Find peaks` переключает authoritative capability. При active Time
  он показывает local Peaks tab/table и backend-provided markers; frontend не
  вычисляет пики. Bottom-tab navigation остаётся local/revision-neutral.
- Не входят в P0: thresholds, sorting, NPeaks, x/Fs modes, width reference,
  persistent settings, Label Peaks toggle и MATLAB grid/docking.

## Contract пятого каскада P0 state separation/Clear Display — 2026-07-31

- Evidence SA-UI-006/007 разделяет global row selection, membership активного
  Display и page analysis source. MATLAB re-add не подтверждён; его поведение
  ниже является явным детерминированным product decision.
- Typed model: non-null global `row_selected_signal`; ordered per-Display
  membership, допускающий `[]`; nullable per-Display `analysis_signal`, который
  отсутствует только у пустого Display и иначе обязан входить в membership.
- Backward compatibility: root/displays `selected_signal` сохраняется как
  nullable legacy alias `analysis_signal`. Snapshot добавляет root
  `row_selected_signal`, root `analysis_signal` и
  `displays[].analysis_signal`. `signals` остаётся global inventory; его
  `visible` — projection membership активной страницы.
- `/api/view` остаётся единственным view mutation endpoint и принимает additive
  `row_selected_signal` и nullable `analysis_signal`; legacy `selected_signal`
  принимается как alias. Одновременные aliases обязаны совпадать.
  `visible_signals=[]` является Clear Display; новый endpoint не создаётся.
- Row click всегда меняет global row selection; если row является member
  активного Display, тот же request также делает его analysis source. Click
  nonmember row не меняет plot/measurements/peaks source.
- Удаление текущего source при оставшихся members выбирает первый member в
  global canonical order. Clear устанавливает source null и выключает Peaks.
  Добавление первого signal в пустой Display делает его source и оставляет
  Peaks выключенным. Новый Display по-прежнему создаётся со всеми signals и
  первым canonical source.
- Empty Display не вызывает `pspectrum`/`findpeaks`: time/spectrum traces пусты,
  heatmaps/panel имеют typed empty state; measurements/peaks сохраняют keys и
  units, но `signal_name=null`, `ordinate=null`, `items=[]`, Peaks disabled.
  Global inventory, row selection и inactive Displays не меняются.
- Frontend добавляет accessible overflow menu `clear-display-action`, один
  existing graph host с page-scoped empty state и раздельные selected/membership
  accessibility attributes. Clear обратим через checkbox и не требует modal.
- Каждая фактическая row/membership/source/plot/Peaks mutation увеличивает общую
  revision один раз; no-op Clear не увеличивает. Все outputs будущего state
  готовятся до atomic publication; stale/provider/DSP error ничего не меняет.
- Не входят: MATLAB grid/docking, rename/reorder pages и интерпретация
  unconfirmed MATLAB re-add как observed behavior.

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
| Backend | `/root/backend_cycle` | completed standby | audit next frozen domain/API delta | none | C5 typed selection/membership/source and empty payloads; backend 649/649 |
| Frontend | `/root/frontend_cycle` | completed standby | runtime Clear corrections if evidence fails | authenticated deployed target | accessible Clear, state separation and no-stale empty host; front 2/2 |
| Tester | `/root/tester_cycle` | completed standby | rerun after next product/research handoff | local EngeeDSP unavailable | backend 649/649; front 2/2; Engee matrix 16/16 |
| E2E Tester | `/root/e2e_cycle` | completed standby | run Clear/Peaks scenarios on authenticated deployed target | canonical URL redirects to login; retained PTY required | Clear syntax/support contract complete; no runtime product spec run |
| DevOps | `/root/devops_cycle` | completed standby | documentation checkpoint; later authorized push | external transmission approval | product C5 checkpoint `8d480ac`; no push/deploy/merge |
| MATLAB Researcher | `/root/matlab_cycle` | SA-UI-008 Time Limits locality/linkage | next bounded observed delta | none | SA-UI-007 partial saved; active-only clear/preservation confirmed, re-add unconfirmed |

DevOps gate evidence: branch `neuro_signal_analyser_cascade`, product/test HEAD
`8d480ac`, no product/test changes remain outside the checkpoint, no conflicts,
upstream divergence `0 behind / 12 ahead`. Architecture documentation remains
a separate pending checkpoint. Unpushed commits do not block implementation;
future checkpoints stage only explicit completed handoff files. No merge into
`dev` is authorized without a new explicit user acceptance handoff.

## Verification

- Julia parse changed backend: PASS.
- Backend: current full gate 649/649 assertions PASS, including typed OOP
  measurements/Peaks, provider rollback, state separation, empty Display,
  recovery, inactive preservation and atomic invalid-raw selection.
- Frontend static/behavior: 2/2 files PASS.
- E2E support contract and syntax checks: PASS.
- Cascade 5 Clear Display E2E syntax/support/runner-help: PASS; runtime pending.
- Runtime E2E: fresh-profile CDP attachment PASS, but canonical target redirects
  to `account/login`; product specs require an authenticated retained PTY/tab.
- Local EngeeDSP contract: FAIL because `EngeeDSP` is absent in the local
  environment; required environment rerun remains open.
- Prod Engee MIND `EngeeDSP` contract: PASS for version `0.72.0`, expected UUID,
  `pspectrum` power/spectrogram/persistence finite, shape and range probes.
- Prod `findpeaks` evidence matrix 16/16 PASS; compiled lazy
  `Base.require`/`Base.invokelatest` adapter pattern PASS without world-age.

## Acceptance status

Cascade 2 is deployed and runtime-verified at product SHA `2eba776`; test-only
HEAD was `f9ff77e`. Cascade 3 P0, Display pages and local-only Plotly are locally
committed as `651943d` and verified by backend/frontend/static E2E gates, but
are not pushed or deployed. Runtime product E2E remains authentication-blocked.

Cascade 4 Peaks is locally committed as `d9fbcd9` and locally verified by
backend 553/553, frontend 2/2, Engee matrix 16/16 and Playwright static gates.
Accessibility/evidence checkpoint is `ab87889`. Neither commit is pushed or
deployed; runtime Peaks E2E remains authentication/deployment-blocked.

Cascade 5 state separation/Clear Display is locally committed as `8d480ac` and
verified by backend 649/649, frontend 2/2, Playwright static gates and catalog/
vanilla/documentation validators. It is not pushed or deployed; runtime Clear
E2E remains authentication/deployment-blocked.

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
attempt budget and are not claimed. SA-UI-006 additionally confirms that
checkbox membership and measurements remap with active display while row
selection remains independent and inactive-display plots persist. Product
Display add/close/fallback still follows project contracts, not MATLAB grid.
SA-UI-007 is saved; SA-UI-008 is active.

SA-UI-007 then confirmed that Clear Display can leave the active MATLAB display
with zero memberships while preserving inactive plots and global signal
inventory; active statistics disappear. Re-add was not confirmed after bounded
attempts. Cascade 5 now implements the accepted product-model response under
DEC-012; deterministic first re-add remains a product decision rather than a
MATLAB-observed claim. SA-UI-008 is active.

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
