# Ночная multi-agent разработка Signal Analyser

> Внутренняя active-task запись. Клиентский статус опубликован в
> [`../../user/reports/`](../../user/reports/README.md).

Status: cascade-7-verified-cascade-8-research-active
Owner: Architect  
Branch: `neuro_signal_analyser_cascade`  
Architecture checkpoint: C7 product/test `1b7864b`; C7 documentation pending local checkpoint

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

## Contract шестого каскада P0 Time presentation controls — 2026-07-31

- Official MathWorks `Customize Signal Analyzer` defines `Normalize Y Axis` as
  independent normalization of each Time signal to `[0,1]` and `Show Markers`
  as sample-point markers on a Time plot. These are presentation controls, not
  backend signal transformations.
- Both controls are frontend-local, per-Display and revision-neutral: they make
  no API request, do not mutate snapshot arrays/cache and restore when the user
  returns to a Display. New Display defaults remain off.
- Controls are enabled only for a nonempty Time Display. Non-Time and empty
  states disable them without losing the stored per-Display preference.
- Normalize maps each ordinary signal trace independently as
  `(y-min(y))/(max(y)-min(y))`; a finite constant trace maps to zeros. It clones
  trace arrays and never mutates backend payload. Peak marker y-coordinates are
  mapped with the same extrema as their analysis-source trace so annotations
  remain aligned.
- Show Markers changes ordinary Time traces to `lines+markers` at the provided
  bounded sample points. It does not create frontend peak detection and does
  not alter the dedicated Peaks marker trace.
- Repeated toggles preserve the single Plotly host and use `Plotly.react`.
  Empty/non-finite trace data yields a stable UI error/empty state rather than
  publishing corrupted values.
- P0 excludes persistence to backend/save-import, arbitrary axis limits,
  cursors, marker styling and normalization of Spectrum/heatmaps.
- Required local gates: frontend behavior/static, no-request/revision E2E
  contract, host identity, exact `[0,1]`/constant/Peak alignment and all
  previous backend 649/649 regressions.

## Contract седьмого каскада P0 Time Limits/ROI — 2026-07-31

- Official MathWorks measurement docs state that Statistics and Peaks use
  current Time Limits. SA-UI-008 observed inclusive 3..9 and 4..6 ROI
  recomputation, valid 0..14 boundaries, invalid ordered limits rollback and
  page locality. Link Time between populated pages remains out of scope.
- Typed per-Display nullable `time_limits` has finite `min_s < max_s`. It is
  null only for an empty Display; a nonempty page defaults to the complete
  analysis-source range. Root and `displays[]` expose exact
  `{min_s,max_s,units:"s"}`; `/api/view` accepts the same canonical object.
- Explicit limits must lie within the prospective analysis-source duration and
  include at least one raw sample. Invalid type/order/bounds/empty ROI returns
  field-level 422 and preserves revision, Display, cache, measurements, Peaks
  and plot state. The product uses visible inline validation rather than
  MATLAB's silent rollback.
- Source/membership lifecycle: unchanged source preserves limits; changing
  source preserves them when valid for the new source, otherwise resets to that
  source's full range. Clear sets limits null; first re-add/new Display uses
  full range. Inactive Display limits are preserved.
- Measurements use the inclusive full-raw ROI before plot bounding. Extrema
  retain absolute zero-based sample indices and absolute `time_s`; mean uses
  only ROI samples. Snapshot shape/units/order stay unchanged.
- Enabled Peaks with at least three ROI samples calls EngeeDSP only on the
  inclusive full-raw ROI. Typed query carries the absolute starting sample
  offset; returned locations map back to absolute sample index/time. A valid
  one/two-sample ROI returns typed enabled empty Peaks without a provider call
  because the proven Engee function rejects inputs shorter than three; this is
  a capability guard, not a fallback. Disabled/empty paths remain lazy.
  Provider error aborts the limit mutation atomically.
- Frontend adds editable `time-min-input`/`time-max-input` in seconds for
  nonempty Time Display, exact authoritative values and accessible inline
  `time-limits-error`. A committed change sends one serialized `/api/view`;
  local typing alone does not. Plotly Time layout uses `xaxis.range` without
  slicing/mutating backend trace arrays; Statistics/Peaks consume returned ROI.
- Each actual limits change increments revision once; equal values are no-op.
  Stale retry follows the existing queue. Switching Display restores its limits.
- Excluded: Link Time groups, unit conversion, cursor-defined ROI, zoom/pan
  event synchronization, Spectrum recomputation and arbitrary Y limits.

## Contract восьмого каскада P0 selectable Statistics — 2026-07-31

- SA-UI-010 observed exact order `Minimum`, `Maximum`, `Mean`, `Median`,
  `Peak to peak`, `RMS`; defaults are the first three. Selection belongs to a
  Display, survives page switching and is independent from another Display.
  Official MathWorks docs define all six as time-domain ROI statistics.
- Typed per-Display `measurement_kinds` is an ordered canonical subset of
  exact wire IDs `minimum`, `maximum`, `mean`, `median`, `peak_to_peak`, `rms`.
  Root and every `displays[]` expose the array. New Display defaults to the
  first three. Empty selection is valid; request order is canonicalized and an
  equal set is a no-op. Unknown/duplicate/non-string/non-array input is
  field-level 422 and atomic.
- `/api/view` accepts additive `measurement_kinds`; absence preserves the
  current page selection. Actual selection change is one +1 revision. Clear
  preserves the preference while Measurements becomes typed empty; first
  re-add recomputes the preserved selection. Inactive pages are unchanged.
- Existing `measurements` keyset and item keyset remain unchanged. Items follow
  the canonical selected order. Minimum/Maximum keep absolute first-occurrence
  sample/time positions; Mean/Median/Peak-to-Peak/RMS have null position.
  Empty selection on a nonempty source keeps signal/ordinate/units with
  `items=[]`; empty Display keeps null signal/ordinate.
- All metrics use one inclusive raw `SignalOrdinateRoi`, never bounded plot
  arrays. `median` uses the standard odd/even median; `peak_to_peak=max-min`;
  RMS uses a scale-normalized finite algorithm
  `scale*sqrt(mean((y/scale)^2))`, with exact zero for `scale=0`, to avoid
  overflow on finite Float64 inputs. Complex signals retain magnitude ordinate.
- Empty selection does not materialize ROI or invoke DSP/provider. Other
  selections compute only requested metrics. Statistics never load EngeeDSP;
  existing enabled Peaks preparation during the same view mutation remains
  outside C8 and can still fail atomically.
- Frontend makes Display/Time/Measurements settings tabs functional local
  navigation. Measurements shows native checkbox controls in canonical order;
  a checkbox change sends one serialized full `/api/view`. `Signal statistics`
  opens both the Measurements settings tab and bottom output panel. Empty
  Display disables controls without losing checked state; nonempty non-Time
  pages retain access because the authoritative Time ROI remains defined.
- Stable selectors: `statistics-settings-tab`, `statistics-controls`,
  `statistics-option-<id>`, `statistics-selection-error` and existing
  `measurement-row-<id>`. Frontend performs no statistic calculation.
- Excluded: variance/std/mean-square, custom ordering, localization redesign,
  cursor ROI, export, saved-session persistence and Peaks settings.

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
| Backend | `/root/backend_cycle` | completed standby | next frozen C9 backend slice | none | C8 selectable Statistics complete; integrated backend 789/789 |
| Frontend | `/root/frontend_cycle` | completed standby | next frozen C9 UI slice | none | C8 settings/Statistics UI complete; front 2/2 |
| Tester | `/root/tester_c7_matrix` | completed standby | next frozen C9 test matrix | local EngeeDSP unavailable | C8 backend 789/789; front 2/2 |
| E2E Tester | `/root/e2e_cycle` | completed standby | next research-confirmed scenario | runtime auth/deployment | C8 selectable Statistics static scenario complete |
| DevOps | `/root/devops_cycle` | completed standby | C8 documentation checkpoint; later authorized push | external transmission approval | C8 product/test checkpoint `0fc70fd6`; no push/deploy/merge |
| MATLAB Researcher | `/root/matlab_cycle` | SA-GRAPH-001 Spectrum defaults/units | SA-UI-011 settings persistence | none | SA-UI-010 saved; exact six metrics/defaults/page scope confirmed |

DevOps gate evidence: branch `neuro_signal_analyser_cascade`, product/test HEAD
`0fc70fd6`, no product/test changes remain outside the checkpoint, no conflicts,
upstream divergence `0 behind / 18 ahead`. Architecture documentation remains
a separate pending checkpoint. Unpushed commits do not block implementation;
future checkpoints stage only explicit completed handoff files. No merge into
`dev` is authorized without a new explicit user acceptance handoff.

## Verification

- Julia parse changed backend: PASS.
- Backend: current full gate 789/789 assertions PASS, including typed OOP
  measurements/Peaks, inclusive Time ROI, selectable Statistics, stable RMS,
  canonical ordering, preserve/reset, empty Display and atomic failure paths.
- Frontend static/behavior: 2/2 files PASS.
- E2E support contract and syntax checks: PASS.
- Cascade 5 Clear Display E2E syntax/support/runner-help: PASS; runtime pending.
- Cascade 7 Time Limits E2E syntax/support/runner-help: PASS; runtime pending.
- Cascade 8 selectable Statistics E2E syntax/support/runner-help: PASS; runtime
  pending. Cleanup restores page, metric selection, membership, analysis source
  and ROI.
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

Cascade 6 Time presentation is locally committed as `f546195`: frontend 2/2,
unchanged backend 649/649 and Playwright syntax/support/runner-help PASS. It is
not pushed/deployed; runtime Time presentation E2E remains blocked on the same
authenticated target prerequisite.

Cascade 7 Time Limits/ROI is locally committed as `1b7864b`: backend 719/719,
frontend 2/2, Playwright syntax/support/runner-help and architecture validators
PASS. It is not pushed/deployed; real EngeeDSP and runtime interaction remain
target gates.

Cascade 8 selectable per-Display Statistics is locally committed as
`0fc70fd6`: backend 789/789, frontend 2/2, Playwright syntax/support/
runner-help, skill and vanilla validators PASS. It is not pushed or deployed;
live authenticated runtime E2E remains a target gate.

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
SA-UI-008, SA-UI-009 and SA-UI-010 are saved. SA-UI-010 confirms the exact six
Statistics choices, first-three defaults, page-local selection and inclusive
raw ROI behavior. SA-GRAPH-001 Spectrum defaults/units is active.

SA-UI-007 then confirmed that Clear Display can leave the active MATLAB display
with zero memberships while preserving inactive plots and global signal
inventory; active statistics disappear. Re-add was not confirmed after bounded
attempts. Cascade 5 now implements the accepted product-model response under
DEC-012; deterministic first re-add remains a product decision rather than a
MATLAB-observed claim. SA-UI-008 established Time ROI evidence. SA-UI-009 then
confirmed 0..1 normalization with raw Statistics and sample markers; its
cross-display marker scope remains a MATLAB R2024b delta. SA-UI-010 established
the selectable Statistics evidence consumed by Cascade 8; SA-GRAPH-001 is next.

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

## Cascade 9 P0 Spectrum baseline contract frozen — 2026-08-01

Status: `contract-frozen-implementation-next`. Authoritative product decision:
[DEC-20260801-015](../../user/decisions/DEC-20260801-015-spectrum-roi-default-settings.md).
Research and provider evidence are separated in
[the EngeeDSP probe report](../reports/spectrum-engeedsp-contract-probe-20260801.md).

### Frozen implementation contract

- `SignalSpectrumSettings` belongs to each Display and is mirrored at root for
  the active Display. Exact full wire object is
  `{scale:"db|linear",frequency_scale:"linear|log",leakage:Float64}` with
  defaults `db`, `linear`, `0.5`.
- `/api/view` accepts the additive full object; absence preserves. Only exact
  nested keys/types are accepted and Leakage must be finite in `[0,1]`.
  Nested field-level `422` is atomic. Actual change is one revision `+1`; equal
  value is no-op. New Display gets defaults, Clear preserves, A/B are
  independent.
- Backend uses typed `SignalTimeSampleRange` retaining raw real/complex samples,
  `SignalSpectrumQuery`, `SignalSpectrumData`, an abstract provider plus
  EngeeDSP provider/service, and a typed cache key containing signal identity,
  inclusive ROI, Leakage and topology. No Dict-domain state.
- The provider calls public EngeeDSP `pspectrum` only, in default Leakage mode:
  pass `Leakage`, remove forced fixed `FrequencyResolution`, use
  `TwoSided=false` for real and `true` for complex. dB is
  `10*log10(raw power)`; linear is raw power. Frequency scale is presentation
  metadata and never changes spectral computation. No fallback or dependency
  edit is allowed.
- Spectrum recomputes from authoritative raw Time ROI and is independent from
  Normalize. Real axes are one-sided `0..Nyquist`; complex axes are centered
  two-sided. Any visible complex signal makes requested Log invalid; adding a
  complex signal to an existing Log Display is also rejected atomically.
- Empty Display/source returns typed empty. Inclusive ROI with one raw sample
  returns typed empty without provider; two samples are supported. Existing
  plot/trace keysets remain unless minimal additive metadata is required.
- Frontend keeps exactly three Display/Time/Measurements setting panels. A
  conditional Spectrum subsection is physically inside Display, never a fourth
  tab. Stable IDs are `spectrum-settings`, `spectrum-scale-select`,
  `spectrum-frequency-scale-select`, `spectrum-leakage-input`, and
  `spectrum-settings-error`.
- Scale and frequency-scale use native selects. Leakage range commits on
  `change`, not every `input`. Controls are enabled only for an active Spectrum
  plot with nonempty source, while values remain preserved otherwise. Each
  actual change sends one full serialized view request with rollback/stale
  queue. Plotly `xaxis.type` follows authoritative state and raw arrays remain
  untouched. Frontend performs no DSP.

### Evidence and boundary

SA-GRAPH-001 (`c22e0074fc3e8f17ca797052490583dcb0d1f8a552fdd5825023e14026d6d278`)
observed MATLAB R2024b real `Fs=1`, `N=15`: Hz, `0..0.5`, Linear, dB checked,
Leakage midpoint, ROI `4..6` flat near `3.0102995 dB` with actual RBW
`855.5818 mHz`, and ROI `0..14` peak near `0.2` with actual RBW
`171.1164 mHz`; Normalize was independent. Leakage `0.5` is docs-derived.
Page locality remains unconfirmed; per-Display ownership is a product decision.

Prod EngeeDSP probe verified real one-sided and complex centered two-sided
power, Leakage endpoints/validation, FrequencyLimits clip/reject behavior, a
one-sample `ArgumentError`, two-sample support and an empty `Any[]` third power
output. Therefore editable frequency limits, RBW/window modes, actual RBW
metadata, manual frequency units, Spectrogram/Persistence refactor,
mixed-sample-rate policy beyond provider axes and live deployment are outside
C9. Existing panel placeholders may remain, but must not claim actual RBW.

### Persistent role heartbeat — Cascade 9 contract freeze

| Canonical role | Persistent session | Current task | Next queued task | Blocker | Last handoff/status |
| --- | --- | --- | --- | --- | --- |
| Backend | `/root/backend_cycle` | completed standby after C9 inventory | implement frozen typed Spectrum provider/service/state | none | read-only gap inventory delivered |
| Frontend | `/root/frontend_cycle` | completed standby | implement frozen Display-panel Spectrum controls | none | C8 frontend gate complete |
| Tester | `/root/tester_c7_matrix` | completed standby after C9 matrix | implement backend/frontend C9 contract tests | local EngeeDSP unavailable; provider doubles required | read-only red-matrix delivered |
| E2E Tester | `/root/e2e_cycle` | completed standby after C9 plan | implement static/runtime-safe C9 scenario | live target auth/deployment remains external | read-only scenario and cleanup plan delivered |
| DevOps | `/root/devops_cycle` | completed standby | product/test checkpoint after verified handoffs | external approval still required for push/deploy/merge | C8 docs checkpoint `89c46d9`; tree was clean |
| MATLAB Researcher | `/root/matlab_cycle` | next bounded Spectrum research active | settings persistence and complex/log delta | none reported | SA-GRAPH-001 saved and consumed |

Implementation is the next critical-path slice. This freeze does not claim
implemented, runtime-verified, deployed or accepted-by-user C9 behavior.

## Cascade 9 implementation and local freeze — 2026-08-01

Status: `implemented-and-locally-verified`; product/test checkpoint
`b53d79622dbe926316915d7c55668432434bcc07`; not pushed, not deployed, runtime
E2E not run.

The frozen DEC-015 contract is implemented across Backend, Frontend, Tester and
E2E ownership. Integration gates: backend 867/867 (C9 52/52 + API 28/28),
frontend 2/2, Julia parse, Playwright syntax/support/runner-help, skills 40,
vanilla assets and documentation structure PASS. Local EngeeDSP contract fails
at package load after findpeaks 16/16; the independent prod EngeeDSP `0.72.0`
probe remains the provider capability evidence. No fallback/dependency edit was
introduced.

### Persistent role heartbeat after C9 freeze

| Canonical role | Session | Current task/status | Next queued task | Blocker/dependency | Last handoff |
| --- | --- | --- | --- | --- | --- |
| Backend | `/root/backend_cycle` | completed standby | C10 backend after contract freeze | SA-GRAPH-004 and Architect decision | C9 OOP Spectrum, backend 867/867 |
| Frontend | `/root/frontend_c9_replacement` | completed standby; replaces exhausted `/root/frontend_cycle` | C10 UI after exact contract | Backend/API contract not frozen | C9 Spectrum controls, front 2/2 |
| Tester | `/root/tester_cycle` | completed standby; `/root/tester_c7_matrix` superseded after partial matrix | C10 red matrix | C10 contract not frozen | C9 service/API/front matrix complete |
| E2E Tester | `/root/e2e_c9_replacement` | completed standby; replaces incomplete `/root/e2e_cycle` | runtime C9, then C10 scenario | exact deployed SHA/authenticated target | C9 static scenario and safe cleanup complete |
| DevOps | `/root/devops_c9_freeze` | completed standby | documentation checkpoint; later authorized target preflight | Architect docs validation / external authority | local C9 commit `b53d796`; no push/deploy |
| MATLAB Researcher | prior `/root/matlab_cycle` evidence consumed; no live writer in this restart | SA-GRAPH-004 next | bounded complex/Log reference | resume/replacement needed; MATLAB server is available | SA-GRAPH-001/002/003 saved |

Replacement rationale and exact handoffs are persisted in the role-specific
handoff files. No idle role has an unexplained eligible task: product roles are
blocked on the next frozen contract, E2E on runtime authorization, DevOps on the
separate documentation freeze, and MATLAB Researcher is the next active lane.

### Next cascade candidate

Run SA-GRAPH-004 for complex-signal/Log behavior, then a bounded Frequency
Limits lifecycle scenario, and freeze one coherent C10 slice. Preferred
candidate is editable Frequency Limits only; existing implicit Plotly Log
rendering remains unchanged. RBW/window, actual RBW, manual units and
Spectrogram/Persistence remain outside scope until separately researched and
accepted.

## Cascade 10 discovery started — 2026-08-01

Status: `research-and-read-only-gap-analysis`; no C10 product/test changes.

- MATLAB Researcher `/root/matlab_c10_complex_log` replaces the unavailable
  prior `/root/matlab_cycle` and owns bounded SA-GRAPH-004 complex/Log research.
  Official docs are external-only; Help/Add-On are forbidden; the full
  per-command Enter/layout/visual guard is required.
- Backend `/root/backend_cycle` inventories a minimal typed Frequency Limits
  contract and unresolved provider/cache/topology decisions, read-only.
- Frontend `/root/frontend_c9_replacement` inventories the smallest three-tab
  vanilla UI surface and exact Backend dependencies, read-only.
- Tester `/root/tester_cycle` builds a classified red matrix, read-only.
- E2E Tester `/root/e2e_c9_replacement` waits for the direct saved MATLAB
  scenario handoff; no C10 spec is implemented before contract freeze.
- DevOps `/root/devops_c9_freeze` is completed standby; next eligible work is a
  future explicit C10 checkpoint. Push/deploy/merge remain unauthorized.

Exit of discovery is not implementation: Architect must reconcile observed
MATLAB behavior, official docs, Engee provider evidence and product portability
into a new ADR before role-owned code changes begin.

### C10 Engee provider evidence

Prod probe record:
[`frequency-limits-engeedsp-contract-probe-20260801.md`](../reports/frequency-limits-engeedsp-contract-probe-20260801.md).
`FrequencyLimits` changes the 4096-point provider grid to exact requested
endpoints; partial external ranges clip to topology bounds, fully external
ranges reject, and real/complex/narrow/two-sample cases are now isolated. This
resolves cache inclusion and eliminates post-hoc cropping as an equivalent
implementation. Requested-vs-effective persistence and heterogeneous Display
policy remain Architect decisions after MATLAB evidence.

## Cascade 10 contract freeze — 2026-08-01

Status: `contract-frozen`; implementation not started at this checkpoint.

[DEC-20260801-016](../../user/decisions/DEC-20260801-016-frequency-limits.md)
freezes one narrow slice: Auto/explicit Frequency Limits in the existing
per-Display Spectrum settings. The full strict object now has four keys;
explicit limits are validated inside the analysis-source topology, preserved
as requested intent, included in provider query/cache identity and intersected
per secondary trace. Backend publishes requested/effective metadata; frontend
adds only F min/F max fields and no Log-floor control.

MATLAB SA-GRAPH-002/003 durable evidence was consumed. SA-GRAPH-004 remains a
bounded partial attempt because clicker focus/typing failed before a complex
signal was created; no complex UI observation is claimed. Official MathWorks
direction and the already implemented product complex/Log rule remain the
contract basis. Prod EngeeDSP evidence resolves provider semantics.

### Frozen role handoffs

- Backend `/root/backend_cycle`: implement typed limits, lifecycle,
  source/secondary topology policy, query/cache/provider wiring and exact
  payload metadata using Backend OOP/domain/service boundaries.
- Frontend `/root/frontend_c9_replacement`: implement two native fields,
  draft/commit/no-op/rollback/409 behavior and metadata-driven Auto values in
  the existing Display Spectrum section.
- Tester `/root/tester_cycle`: implement the frozen unit/API/frontend matrix,
  including strict shape, validation, lifecycle, provider calls and no frontend
  DSP.
- E2E Tester `/root/e2e_c9_replacement`: implement a static Playwright user
  scenario with stable IDs, exact request/revision evidence, A/B/Clear/re-add,
  real zero-bound Log and exact cleanup. Runtime remains separately gated.
- DevOps `/root/devops_c9_freeze`: standby until explicit completed file lists
  and verification are available for a local C10 checkpoint; no push/deploy.
- MATLAB Researcher `/root/matlab_c10_complex_log`: interrupted standby after
  bounded blocker; next work requires recovered clicker health.

## Cascade 10 implementation and local freeze — 2026-08-01

Status: `implemented-and-locally-verified`; product/test checkpoint
`9c7cd70ddc10c323f6897afe65cdac2e1a960715`; contract checkpoint `df5451d`;
not pushed, not deployed, runtime E2E not run.

DEC-016 is implemented across Backend, Frontend, Tester and E2E ownership.
Integration gates: Julia parse and backend 944/944 (C10 37/37 + API 40/40),
frontend 2/2, Playwright syntax/support/runner-help, skills 40, vanilla assets
and documentation PASS. Local Engee gate remains an honest required import
failure after findpeaks 16/16 because the package is absent; prod 0.72.0
FrequencyLimits evidence is preserved. No fallback or dependency edit exists.

### Persistent role heartbeat after C10 freeze

| Canonical role | Session | Current task/status | Next queued task | Blocker/dependency | Last handoff |
| --- | --- | --- | --- | --- | --- |
| Backend | `/root/backend_cycle` | read-only C11 heatmap/provider gap analysis | prod Engee probe matrix | new contract not frozen | C10 OOP limits, backend 944/944 |
| Frontend | `/root/frontend_c9_replacement` | read-only heatmap UI inventory complete | metadata UI after contract | Backend typed settings absent | C10 F min/F max, front 2/2 |
| Tester | `/root/tester_cycle` | completed standby | C11 red matrix after contract | provider contract absent | C10 unit/API/front matrix complete |
| E2E Tester | `/root/e2e_c9_replacement` | completed standby | runtime C9/C10 | authorized exact target | C10 static scenario complete |
| DevOps | `/root/devops_c10_freeze` | completed standby; replaces unavailable C9 thread | target preflight only after authority | no push/deploy authority | local C10 commit `9c7cd70` |
| MATLAB Researcher | `/root/matlab_c10_complex_log` | completed standby after docs-only heatmap map | GUI SA-GRAPH-004A/005 after recovery | incomplete unexecuted line and activation timeout | durable SA-GRAPH-004 partial + docs map |

No role has unexplained eligible idle work: Tester depends on the next frozen
contract; E2E and DevOps depend on target authority; MATLAB GUI work is safely
blocked; Backend/Frontend performed independent next-contract discovery.

## Cascade 11 discovery started — 2026-08-01

Status: `probe-planning-only`; no C11 product/test changes.

MATLAB Researcher docs and Backend/Frontend read-only inventories agree that
current Spectrogram/Persistence heatmaps are placeholders rather than a frozen
ROI/settings contract. The next eligible action is a read-only prod EngeeDSP
probe for representation outputs, topology, segment grid, ROI subset behavior,
FrequencyLimits and Persistence bins. No settings, route, cache or UI mutation
is authorized before this evidence and a successor ADR.

Preferred narrow candidate after the gate is Spectrogram only, no editable
controls, using a typed provider/service/cache while retaining the existing
single graph host and heatmap response keys. One-signal eligibility, segment
ROI semantics and eager-versus-lazy execution remain Architect decisions.

### C11 initial prod provider evidence

Prod EngeeDSP `0.72.0`/Julia `1.12.4` probe confirmed real one-sided and complex
centered defaults, nonnegative Spectrogram power, Persistence columns summing
to 100%, exact/clipped/error FrequencyLimits behavior, absolute time centers,
representation-specific N=1 rejection/N=2 support and configurable
NumPowerBins. Provider Auto uses 75% overlap for the probed input, which differs
from MATLAB app docs and prevents inferred default parity.

`TimeResolution` is independently broken by an undefined internal validator;
positive controls FrequencyResolution/OverlapPercent work. Confirmed record:
[`ENGEE-20260801-003`](../../user/engee_bugs/ENGEE-20260801-003-pspectrum-time-resolution-undefined.md).
This blocks a TimeResolution control but not probe-only discovery or a future
default Spectrogram seam. Remaining ROI/grid/default decisions are still open.

## Cascade 11 contract freeze — 2026-08-01

Status: `contract-frozen`; implementation not started at this checkpoint.

[DEC-20260801-017](../../user/decisions/DEC-20260801-017-typed-spectrogram-foundation.md)
freezes only the typed default Spectrogram foundation. Backend replaces the
full-signal placeholder with typed query/data/provider/service/raw-cache,
strict frequency×time output validation, real one-sided/complex centered
topology, N<2 bypass and exact dB presentation without finite floor. Existing
heatmap wire, analysis-source selection and frontend remain unchanged.

Time ROI/segment selection, every editable setting, new API routes, Persistence
and TimeResolution are explicitly outside scope. The confirmed provider defect
ENGEE-20260801-003 forbids exposing TimeResolution or adding a hand-rolled STFT
workaround.

## Cascade 11 implementation and local freeze — 2026-08-01

Status: `implemented-and-locally-verified`; product/test checkpoint
`d47e51e61a346803902ce1f5b179ed8fb9f02c14`; contract checkpoint `7d357dd`;
not pushed, not deployed, runtime E2E not run.

DEC-017 is implemented within the frozen boundary: typed full-raw Spectrogram
query/data/provider/service/cache, real one-sided/complex centered topology,
strict axes/shape/power validation, N<2 bypass, atomic preparation/publication,
exact dB and presentation-only 160×160 bounding. Wire/UI/routes/settings remain
unchanged. Integration gates: backend 980/980 (C11 36/36), frontend 2/2, Julia
parse, Playwright syntax/support/help, skills/vanilla/adapters and diff PASS.
Local Engee gate remains an honest absent-package failure after findpeaks 16/16;
prod provider evidence is preserved. No push/deploy/merge occurred.

## Cascade 12 discovery started — 2026-08-01

Status: `provider-probe-gated`; no C12 product/test changes.

Official MathWorks docs identify an OverlapPercent-only slice as the smallest
next parity step: Signal Analyzer documents 50%, `[0,100)` and floor-to-samples,
while standalone `pspectrum` Auto depends on ENBW. C12 may freeze only after a
prod Engee probe verifies explicit 0/50/75, invalid boundaries/types, segment
counts/centers, option order and resource behavior. Time Resolution stays Auto;
Leakage, Reassign, ROI, limits, scale and colormap remain separate.

## Cascade 12 contract freeze — 2026-08-01

Status: `contract-frozen`; implementation starts only after the C11
short-input hotfix checkpoint.

[DEC-20260801-018](../../user/decisions/DEC-20260801-018-spectrogram-overlap-percent.md)
freezes one Display-local `spectrogram_settings.overlap_percent`: explicit
default 50, finite non-Bool and product-safe inclusive range 0..75. The 75 cap
is an explicit resource delta from MATLAB/provider `<100`: prod N=256 at
99/99.9 allocated about 649 MB and produced 15× the 50%-segment count. Query,
raw cache and provider call include exact overlap; root/Display lifecycle uses
the existing revision-safe `/api/view` contract.

Frontend may add only one native input/error inside the existing Display tab.
One host, three tabs, no new route and no client DSP remain strict. Every other
Spectrogram/Persistence setting remains outside C12.

### Persistent role heartbeat after C11 freeze

| Canonical role | Session | Current task/status | Next queued task | Blocker/dependency | Last handoff |
| --- | --- | --- | --- | --- | --- |
| Backend | `/root/backend_cycle` | completed C11 | C12 only after ADR | Engee overlap probe | typed Spectrogram, backend 980/980 |
| Frontend | `/root/frontend_c9_replacement` | C11 no-change inventory complete | Overlap control after API contract | C12 not frozen | one host/three tabs guards |
| Tester | `/root/tester_cycle` | completed C11 matrix | C12 red matrix after ADR | provider contract absent | C11 36/36 |
| E2E Tester | `/root/e2e_c9_replacement` | C11 static scenario complete | runtime C11 after deployment | no target authority | typed Spectrogram scenario |
| DevOps | `/root/devops_c10_freeze` | local C11 freeze complete | next local checkpoint after acceptance | no push/deploy authority | commit `d47e51e` |
| MATLAB Researcher | `/root/matlab_c11_docs` | docs-only C12 recommendation complete | bounded GUI only after recovery | unsafe incomplete Command Window line | OverlapPercent evidence |

## Cascade 12 implementation and local freeze — 2026-08-01

Status: `implemented-and-locally-verified`; product/test checkpoint
`f1dac5819ed49438fb249561102f7b2651c4150d`; contract/probe checkpoint
`981cba563dff07b99e0997bb986805692f3880ef`; not pushed, not deployed,
runtime E2E not run.

DEC-018 is implemented across Backend, Frontend, Tester and E2E ownership.
Exact Display-local default 50/range 0..75 participates in typed state, query,
raw cache and provider call. A/B/Clear/re-add/source and revision-safe
no-op/422/409 lifecycle are covered. Integration gates: backend 1110/1110
(typed 13/13, lifecycle/cache 56/56, API 59/59), frontend 2/2, Julia parse,
Playwright syntax/support/help, skills/vanilla/docs and diff PASS. Queue review
corrected canonical rollback after consecutive 422 and deduplicated 409 replay;
E2E uses Display analysis source rather than row selection.

Local Engee gate still records the missing package failure after findpeaks
16/16; prod explicit overlap evidence is preserved. No push/deploy/merge
occurred.

## Cascade 13 discovery started — 2026-08-01

Status: `docs-and-provider-probe-only`; no C13 product/test changes.

The next candidate is Spectrogram Leakage only. It must be independent of the
existing Spectrum `spectrum_settings.leakage` and must not be inferred from it.
MATLAB Researcher is restricted to official web documentation; Backend probes
explicit/default/boundary/type behavior for real and complex EngeeDSP with
OverlapPercent=50. Tester prepared a range-neutral matrix. No implementation is
eligible until an ADR freezes exact nesting, default, range, combined provider
option order and resource policy. MATLAB GUI/Command Window remains untouched.

### Persistent role heartbeat after C12 freeze

| Canonical role | Session | Current task/status | Next queued task | Blocker/dependency | Last handoff |
| --- | --- | --- | --- | --- | --- |
| Backend | `/root/backend_c13_leakage_probe` | prod read-only C13 probe | OOP implementation after ADR | evidence/ADR pending | C12 backend 1110/1110 |
| Frontend | `/root/frontend_c9_replacement` | completed C12 | C13 control after ADR/backend | typed contract absent | C12 queue correction, front 2/2 |
| Tester | `/root/tester_c13_matrix` | C13 range-neutral matrix complete | implement after ADR | default/range/order pending | C12 matrix complete |
| E2E Tester | `/root/e2e_c9_replacement` | completed C12 static scenario | C13 after implementation | contract absent | source-safe C12 scenario |
| DevOps | `/root/devops_c12_commit` | C12 local freeze complete | docs or C13 checkpoint on handoff | no external authority | commit `f1dac58` |
| MATLAB Researcher | `/root/matlab_c13_leakage` | official-docs-only C13 research | return evidence | no GUI; docs only | C12 docs consumed |

## Cascade 13 contract freeze — 2026-08-01

Status: `contract-frozen`; implementation may start after the documentation
checkpoint.

[DEC-20260801-019](../../user/decisions/DEC-20260801-019-spectrogram-leakage.md)
freezes one independent normalized Spectrogram Leakage inside the existing
two-key `spectrogram_settings`: explicit default 0.5, finite non-Bool inclusive
range 0..1 and signed-zero canonicalization. Query/raw cache/provider include
exact Leakage; canonical Engee options are Leakage, OverlapPercent, TwoSided.

Official docs prove provider semantics and independence from Spectrum Leakage;
prod Engee real/complex probes prove default equivalence, endpoints,
determinism, invariant time grid and raw-power changes. The MATLAB app slider's
display scale remains deliberately unfrozen and is not an implementation gate:
product UI exposes normalized 0..1 without claiming GUI-scale parity. No other
Spectrogram/Persistence control enters C13.

## Cascade 13 implementation and local freeze — 2026-08-01

Status: `implemented-and-locally-verified`; product/test checkpoint
`aebd6f96158caa1917de334c1d61abe6ca8ca950`; contract checkpoint
`5ef6ce7167039753711badfe68802f94bb8a2849`; not pushed, not deployed,
runtime E2E not run.

DEC-019 is implemented across Backend, Frontend, Tester and E2E ownership.
Normalized independent Leakage participates in exact Display state, query, raw
cache and canonical Engee options. Integration gates: backend 1229/1229
(typed 21, cold isolation 6, cold no-op 27, lifecycle 76, independence 23,
API 94), frontend 2/2, Julia parse, Playwright syntax/support/help,
skills/vanilla/docs and diff PASS.

Cross-role audit found and closed cold-cache Spectrum coupling, no-op provider
materialization, signed-zero hash inconsistency, unbounded repeated 409 and
three E2E reachability/cleanup gaps. Final read-only review signed off clean.
Local Engee gate remains an honest absent-package failure after findpeaks
16/16; prod real/complex evidence is preserved. No external action occurred.

## Cascade 14 discovery started — 2026-08-01

Status: `docs-and-provider-probe-only`; no C14 product/test changes.

Candidate is Spectrogram `Reassign` as a Display-local boolean. Official docs
identify `pspectrum(...,"spectrogram",Reassign=flag)`, default false at the API
surface, energy-center relocation and an app checkbox; exact app default remains
inference until GUI evidence. Backend is probing public Engee real/complex
false/true/default/order/type behavior. No payload/UI is frozen until prod
evidence plus DEC-020.

### Persistent role heartbeat after C13 freeze

| Canonical role | Session | Current task/status | Next queued task | Blocker/dependency | Last handoff |
| --- | --- | --- | --- | --- | --- |
| Backend | `/root/backend_c14_reassign_probe` | prod Reassign probe | implementation after ADR | provider evidence pending | C13 1229/1229 |
| Frontend | `/root/frontend_c13_impl` | C13 complete | C14 checkbox after ADR | typed contract absent | bounded stale replay |
| Tester | `/root/tester_c14_reassign_matrix` | read-only C14 matrix | tests after ADR | provider/default evidence | C13 audit regressions |
| E2E Tester | `/root/e2e_c13_impl` | C13 static complete | C14 after implementation | contract absent | source-safe C13 scenario |
| DevOps | `/root/devops_c12_commit` | C13 local freeze complete | docs/C14 checkpoint on handoff | no external authority | commit `aebd6f9` |
| MATLAB Researcher | `/root/matlab_c14_reassign_docs` | docs-only C14 complete | optional GUI default later | unsafe GUI state | official Reassign map |

## Cascade 14 capability decision — 2026-08-01

Status: `accepted-no-go`; no product/test implementation.

[DEC-20260801-020](../../user/decisions/DEC-20260801-020-spectrogram-reassign-no-go.md)
blocks Reassign on current prod. Omitted/false is bitwise stable, but true fails
28/28 across real/complex, topology, Leakage and input lengths with undefined
`fetchTimeReassignment`. The isolated runtime defect is recorded as
[ENGEE-20260801-004](../../user/engee_bugs/ENGEE-20260801-004-pspectrum-reassign-undefined.md).

No payload/state/cache/UI/test surface is added. Silent downgrade, disabled
decorative control, hand-rolled algorithm and dependency edit are forbidden.
An upstream-fixed exact build plus a new prod matrix and successor ADR are
required to reopen C14.

## Cascade 15 discovery started — 2026-08-01

Status: `provider-and-docs-evidence-complete`; contract freeze pending.

Candidate is independent Display-local Spectrogram Frequency Limits. Official
docs prove the app control and computational `pspectrum` mapping. Prod probe
confirms real/complex exact in-domain grids, clipping/outside behavior,
determinism, option-order invariance and N=2 support. Architect must freeze a
strict product policy rather than copy C10 Spectrum semantics or expose a
provider Nyquist-touch degenerate grid.

## Cascade 15 contract freeze — 2026-08-01

Status: `contract-frozen`; implementation eligible after docs checkpoint.

[DEC-20260801-021](../../user/decisions/DEC-20260801-021-spectrogram-frequency-limits.md)
freezes an independent nullable Auto/strict Explicit Hz value inside the exact
three-key Spectrogram settings object. Product requires the whole interval
inside authoritative real/complex topology and rejects provider clipping.
Auto/explicit full have different raw-cache identities; requested/effective
metadata is always defined, including N<2 typed empty.

Source change preserves only a fully valid interval, otherwise resets Auto.
Changed limits calculate only Spectrogram; equal cold object calculates neither
spectral provider. Frontend gets two fields in the existing section, fixed Hz,
one full request and existing accepted rollback/bounded replay. Spectrum state
remains independent as an explicit product delta from MATLAB shared-view bands.

The suspected floating Nyquist-touch degenerate grid is recorded internally as
ENGEE-20260801-005; strict product validation avoids it without claiming an
upstream-confirmed defect.

## Cascade 15 implementation audit — 2026-08-01

Status: `fixes-in-progress`; product/test commit is blocked until repeat audit.

The first integrated implementation passed backend 1259/1259, C15 30/30,
frontend 2/2, Julia parse, Playwright syntax/support/help and diff checks. The
formal local Engee gate again passed findpeaks 16/16 and then failed because the
local environment does not contain EngeeDSP.

A separate read-only integration audit found three cross-role regressions not
caught by the first matrix: per-input blur could dispatch a mixed frequency
pair, legacy Overlap/Leakage E2E specs still asserted pre-C15 Spectrogram object
shapes, and the new scenario did not restore modified Spectrum limits. Frontend,
Tester and E2E Tester are correcting these in their own ownership zones. Backend
semantics matched DEC-021; it remains standby pending regression findings.

## Cascade 16 discovery started — 2026-08-01

Status: `research-recommendation-only`; no C16 contract or product changes.

MATLAB Researcher recommends Spectrogram Frequency Scale as the only next slice:
presentation-only Linear/Log for real one-sided data and effective locked Linear
for complex two-sided data. Power Limits are deferred to C17 because exact
defaults, paired validation, dB/linear behavior and Fit Colormap lifecycle are
not yet evidenced. New GUI mutation was safely blocked by an incomplete
unexecuted Command Window line; no scenario was saved or transferred.

### Persistent role heartbeat during C15 audit fixes

| Canonical role | Session | Current task/status | Next queued task | Blocker/dependency | Last handoff |
| --- | --- | --- | --- | --- | --- |
| Backend | `/root/backend_c15_spectrogram_limits_probe` | C16 state/API inventory | C16 contract input | read-only until Architect decision | C15 implementation 1259/1259 |
| Frontend | `/root/frontend_c13_impl` | atomic C15 pair fix | integration rerun | Tester natural-focus regression | initial C15 2/2 |
| Tester | `/root/tester_c15_limits_matrix` | C15 audit regression expansion | full gates | concurrent Frontend behavior | initial C15 matrix complete |
| E2E Tester | `/root/e2e_c13_impl` | legacy migration and cleanup fix | static rerun | no runtime target | initial C15 scenario complete |
| DevOps | `/root/devops_c12_commit` | completed standby | exact C15 commit after sign-off | audit fixes not accepted | contract commit `034ccec` |
| MATLAB Researcher | `/root/matlab_c16_next_slice` | completed standby | safe GUI scenarios later | incomplete Command Window line | C16 docs/passive handoff |

## Cascade 15 local freeze — 2026-08-01

Status: `implemented-and-locally-verified`; product/test checkpoint
`5602ccb20c773c00bac29bb66d8e602a866114c9`; not pushed, not deployed, runtime
E2E not run.

DEC-021 is implemented across Backend, Frontend, Tester and E2E ownership.
Final gates are backend 1263/1263 with C15 34/34, frontend 2/2, Julia parse,
Playwright syntax/support/help, skills/vanilla/docs and diff PASS. Three audit
passes closed cold/natural-focus/request-shape/cleanup gaps; final read-only
verdict is CLEAN. Local Engee remains an honest absent-package failure after
findpeaks 16/16; prod provider evidence is authoritative.

C16 discovery is active but no product contract is implemented. The selected
candidate is presentation-only Spectrogram Frequency Scale. Contract freeze
must add backend-authoritative requested/effective/available metadata and must
exclude scale from raw query/cache/provider identity.

## Cascade 16 contract freeze — 2026-08-01

Status: `contract-frozen`; implementation eligible after documentation
checkpoint.

[DEC-20260801-022](../../user/decisions/DEC-20260801-022-spectrogram-frequency-scale.md)
freezes a fourth exact `frequency_scale` key, requested/effective/available
metadata and reversible real↔complex lifecycle. Scale is backend-authoritative
Display state but presentation-only: query/cache/provider/x/y/z remain
unchanged and scale-only mutation performs zero provider calls. Frontend uses
effective metadata and a transient zero-bin coordinate floor without mutating
the authoritative payload. Power Limits move to C17.

### Persistent role queue for C16

| Canonical role | Session | Current task/status | Next queued task | Blocker/dependency | Last handoff |
| --- | --- | --- | --- | --- | --- |
| Backend | `/root/backend_c15_spectrogram_limits_probe` | implementation after docs commit | final verification | docs checkpoint | typed state/API inventory complete |
| Frontend | `/root/frontend_c13_impl` | implementation after docs commit | integrated front gate | backend metadata contract | render feasibility complete |
| Tester | `/root/tester_c15_limits_matrix` | exact matrix after docs commit | full backend/front gates | product diff | C15 audit regressions complete |
| E2E Tester | `/root/e2e_c13_impl` | static scenario after docs commit | runtime after deployment | product selectors/metadata | C15 cleanup complete |
| DevOps | `/root/devops_c12_commit` | contract commit after handoff | product freeze | Architect docs paths | C15 docs `3259119` |
| MATLAB Researcher | `/root/matlab_c16_next_slice` | completed standby | safe GUI scenario later | incomplete Command Window line | docs/passive evidence complete |

## Cascade 16 local freeze — 2026-08-01

Status: `implemented-and-locally-verified`; product/test checkpoint
`83308222896379eb72f1923006de39ce07265d8d`; not pushed or deployed.

DEC-022 is implemented across Backend, Frontend, Tester and E2E ownership.
Backend full, C16 47/47 + API 16/16, frontend 2/2, syntax/static/diff gates and
three-pass integration audit are green. Tester `/root/tester_c16_replacement`
replaced `/root/tester_c15_limits_matrix` after repeated incomplete migration
turns. EngeeDSP remains absent locally and Devhub MCP returned unavailable/404;
this is not isolated as an Engee defect.

### Persistent role queue after C16

| Canonical role | Session | Current task/status | Next queued task | Blocker/dependency | Last handoff |
| --- | --- | --- | --- | --- | --- |
| Backend | `/root/backend_c15_spectrogram_limits_probe` | C16 complete | C17 inventory after ADR | C17 evidence/decision | C16 full PASS |
| Frontend | `/root/frontend_c13_impl` | C16 complete | C17 feasibility after ADR | C17 evidence/decision | front 2/2 |
| Tester | `/root/tester_c16_replacement` | C16 complete | C17 matrix after ADR | C17 evidence/decision | 47/47 + 16/16 |
| E2E Tester | `/root/e2e_c13_impl` | C16 static complete | C17 after implementation | no runtime target | final audit CLEAN |
| DevOps | `/root/devops_c16_commit` | C16 product commit complete | docs commit | Architect docs validation | `8330822` |
| MATLAB Researcher | `/root/matlab_c17_power_limits` | C17 docs-only research active | exact recommendation | unsafe MATLAB Command Window | C16 docs evidence |

## Cascade 17 contract freeze — 2026-08-01

Status: `contract-frozen`; implementation eligible after documentation
checkpoint.

[DEC-20260801-023](../../user/decisions/DEC-20260801-023-spectrogram-power-limits.md)
freezes the fifth exact `power_limits` key, product Auto/null and strict explicit
dB pair. Auto effective extrema come from full raw finite power before 160×160
wire bounding. Power Limits remain presentation-only and never enter query,
cache or provider identity. Constant finite Auto metadata remains exact `{v,v}`;
only Plotly rendering uses deterministic `[v-1,v+1]`. Fit Colormap и любые
изменения/shared Power Limits существующего Spectrum dB/linear отложены.

### Persistent role queue for C17

| Canonical role | Session | Current task/status | Next queued task | Blocker/dependency | Last handoff |
| --- | --- | --- | --- | --- | --- |
| Backend | `/root/backend_c17_power_inventory` | OOP inventory complete | implementation after docs commit | docs checkpoint | typed projection plan |
| Frontend | `/root/frontend_c17_power_inventory` | feasibility complete | implementation after docs commit | backend metadata | selector/state proposal |
| Tester | `/root/tester_c17_power_matrix` | matrix complete | tests after docs commit | product diff | 139–183 assertion estimate |
| E2E Tester | `/root/e2e_c13_impl` | C16 complete | five-key migration/scenario | product selectors | C16 CLEAN |
| DevOps | `/root/devops_c16_commit` | C16 docs complete | C17 contract checkpoint | Architect validation | `0324849` |
| MATLAB Researcher | `/root/matlab_c17_power_limits` | docs-only complete | later safe Fit probe | unsafe Command Window | direct-doc handoff |

## Cascade 17 implementation close — 2026-08-01

Status: `implemented-and-locally-verified`; product/test checkpoint
`290c057a05c7ebeab68a69632fcec462bd893339`; not pushed or deployed.

DEC-023 is implemented across Backend, Frontend, Tester and E2E ownership.
Backend 1397/1397, C17 49/49 + API 22/22, frontend 2/2, parse/static/support/
help/diff gates and final integration audit are green. E2E Tester
`/root/e2e_c17_replacement` replaced `/root/e2e_c13_impl` after two incomplete
turns. Runtime E2E remains blocked only by absent CDP/application target.

### Persistent role queue after C17

| Canonical role | Session | Current task/status | Next queued task | Blocker/dependency | Last handoff |
| --- | --- | --- | --- | --- | --- |
| Backend | `/root/backend_c17_power_inventory` | C17 implementation complete | C18 inventory after ADR | C18 decision | full backend PASS |
| Frontend | `/root/frontend_c17_power_inventory` | C17 UI complete | C18 feasibility after ADR | C18 decision | front 2/2 |
| Tester | `/root/tester_c17_power_matrix` | C17 matrix complete | C18 matrix after ADR | C18 decision | 49/49 + 22/22 |
| E2E Tester | `/root/e2e_c17_replacement` | C17 static complete | runtime C17 / C18 after ADR | no runtime target | static PASS |
| DevOps | `/root/devops_c17_commit` | product commit complete | docs checkpoint | Architect validation | `290c057` |
| MATLAB Researcher | `/root/matlab_c18_docs_discovery` | C18 docs-only discovery active | recommendation | no MATLAB GUI use | C17 docs evidence |

## Cascade 18 contract freeze — 2026-08-01

Status: `contract-frozen`; implementation eligible after documentation
checkpoint.

[DEC-20260801-024](../../user/decisions/DEC-20260801-024-typed-persistence-foundation.md)
freezes a typed/default Persistence foundation without UI or wire expansion.
Dedicated immutable query/data/cache/provider/service replaces the eager
untyped helper. Fixed 256 power bins, real one-sided/complex centered topology,
strict power×frequency orientation, positive linear power, occurrence 0..100,
exact dB conversion and post-conversion bounding are authoritative. Only the
Display analysis source is computed; secondary visible signals are excluded.

### Persistent role queue for C18

| Canonical role | Session | Current task/status | Next queued task | Blocker/dependency | Last handoff |
| --- | --- | --- | --- | --- | --- |
| Backend | `/root/backend_c18_inventory_replacement` | OOP inventory complete | implementation after docs commit | docs checkpoint | DEC-024 CLEAN |
| Frontend | `/root/frontend_c18_persistence_inventory` | zero-migration inventory complete | focused regression tests | backend stable wire | existing generic heatmap |
| Tester | `/root/tester_c18_persistence_matrix` | matrix complete | tests after product diff | backend types | exact lifecycle matrix |
| E2E Tester | `/root/e2e_c18_persistence_inventory` | static inventory complete | typed Persistence scenario | backend product diff | selectors available |
| DevOps | `/root/devops_c17_commit` | C17 docs complete | C18 contract checkpoint | Architect validation | `7af17ec` |
| MATLAB Researcher | `/root/matlab_c18_docs_discovery` | docs-only complete | no runtime follow-up | MATLAB GUI remains untouched | DEC-024 evidence |

## Cascade 18 implementation close — 2026-08-01

Status: `implemented-and-locally-verified`; product/test checkpoint
`3b16cd96e64fab9654811baa69d83f59d2eac295`; test hardening
`27fcdef177061fed3a69f42899e680ba04ba1a87`; not pushed or deployed.

DEC-024 is implemented across Backend, Tester and E2E ownership; Frontend wire
required no product migration. Backend 1449/1449, C18 49/49, frontend 2/2,
parse/static/support/help/diff gates and final audit are green. Backend
`/root/backend_c18_atomic_replacement` replaced a stalled P1-fix turn and
closed atomic publication of all four caches. Runtime E2E remains unavailable;
local EngeeDSP import remains the only required target-gate limitation.

### Persistent role queue after C18

| Canonical role | Session | Current task/status | Next queued task | Blocker/dependency | Last handoff |
| --- | --- | --- | --- | --- | --- |
| Backend | `/root/backend_c18_atomic_replacement` | C18 complete | C19 inventory after evidence | C19 decision | 49/49 + full PASS |
| Frontend | `/root/frontend_c18_persistence_inventory` | zero product migration; tests complete | C19 feasibility | C19 decision | front 2/2 |
| Tester | `/root/tester_c18_persistence_matrix` | C18 complete | C19 matrix after ADR | C19 decision | 49/49 |
| E2E Tester | `/root/e2e_c18_persistence_inventory` | C18 static complete | runtime C18 / C19 after ADR | no runtime target | static PASS |
| DevOps | `/root/devops_c17_commit` | product + test hardening complete | C18 docs checkpoint | Architect validation | `27fcdef` |
| MATLAB Researcher | `/root/matlab_c18_docs_discovery` | C18 docs complete | C19 docs-only discovery | no MATLAB GUI use | DEC-024 consumed |

## Cascade 19 discovery gate — 2026-08-01

Status: `provider-probe-complete`; superseded below by the accepted contract.

Direct official web research selects independent Display-local Persistence
Leakage as the narrow candidate. Product implementation requires a successful
prod EngeeDSP probe over real/complex omitted/default/endpoints/repeats,
invalid values, option order and exact output invariants. Normalized UI is a
product decision rather than an unobserved MATLAB GUI-parity claim.

### Persistent role queue for C19 discovery

| Canonical role | Session | Current task/status | Next queued task | Blocker/dependency | Last handoff |
| --- | --- | --- | --- | --- | --- |
| Backend | `/root/backend_c19_persistence_leakage_probe` | prod read-only probe active | OOP implementation or NO-GO handoff | exact provider results | public EngeeDSP surface found |
| Frontend | `/root/frontend_c18_persistence_inventory` | read-only feasibility complete | exact state/UI implementation | probe PASS + ADR | selector/lifecycle proposal |
| Tester | `/root/tester_c18_persistence_matrix` | read-only matrix complete | concurrent contract tests | probe PASS + ADR | cross-layer assertion estimate |
| E2E Tester | `/root/e2e_c18_persistence_inventory` | read-only inventory complete | focused static scenario | probe PASS + selectors | no-sleep lifecycle plan |
| DevOps | `/root/devops_c17_commit` | clean-worktree gate complete | contract-doc checkpoint | Architect validation | clean, ahead 49 |
| MATLAB Researcher | `/root/matlab_c18_docs_discovery` | docs-only discovery complete | later separate setting research | prod probe active | Leakage recommendation |

## Cascade 19 contract freeze — 2026-08-01

Status: `contract-frozen`; implementation eligible after documentation
checkpoint.

[DEC-20260801-025](../../user/decisions/DEC-20260801-025-persistence-leakage.md)
freezes exact one-key Display-local Persistence settings. Default is explicit
`0.5`; accepted product range is finite non-Bool `[0,1]`; signed zero is
canonical. Leakage participates in immutable query/cache identity and provider
order before fixed NumPowerBins/TwoSided. The existing heatmap wire and C18
atomic four-cache publication remain authoritative. Normalized frontend range
is a product/API representation, not an unobserved MATLAB GUI fact.

### Persistent role queue after C19 contract freeze

| Canonical role | Session | Current task/status | Next queued task | Blocker/dependency | Last handoff |
| --- | --- | --- | --- | --- | --- |
| Backend | `/root/backend_c19_persistence_leakage_probe` | prod probe PASS/cleanup complete | OOP implementation | docs commit | exact provider handoff |
| Frontend | `/root/frontend_c18_persistence_inventory` | feasibility complete | vanilla state/UI implementation | docs commit | selector/lifecycle proposal |
| Tester | `/root/tester_c18_persistence_matrix` | matrix complete | unit/API/front/Engee tests | product types + docs commit | exact coverage estimate |
| E2E Tester | `/root/e2e_c18_persistence_inventory` | inventory complete | focused static scenario | selectors + docs commit | event-driven plan |
| DevOps | `/root/devops_c17_commit` | clean gate complete | contract docs commit | Architect validation | clean/ahead 49 |
| MATLAB Researcher | `/root/matlab_c18_docs_discovery` | docs-only complete standby | next independent research | no safe GUI need | official Leakage map |

## Cascade 20 research candidate — 2026-08-01

Status: `docs-discovery-complete`; prod probe queued after C19 integration.

Persistence OverlapPercent is the next narrow candidate only for a bounded
capability/resource probe. Documentation gives provider `[0,100)` but no fixed
omitted default: it is window/Leakage-dependent. High overlap is guarded by a
512 MiB/eight-times-nominal/timeout stop. A successor ADR requires deterministic
real/complex transient effects, stable topology, option-order invariance and an
evidence-backed product cap. No MATLAB GUI or clicker action is required.

## Cascade 19 implementation close — 2026-08-01

Status: `implemented-and-locally-verified`; product/test checkpoint
`2f99ff875141a70888195c5718f437765b7ef591`; not pushed or deployed.

DEC-025 is implemented across Backend, Frontend, Tester and E2E ownership.
Backend 1497/1497 and C19 48/48, frontend 2/2, Julia parse, Playwright static,
documentation/skills/vanilla/adapter/diff and final independent audits are
green. Runtime E2E is blocked only by absent CDP/application target. Local
Engee gate passes findpeaks 16/16 then fails the known absent EngeeDSP import;
prod provider evidence and cleanup are complete.

### Persistent role queue after C19

| Canonical role | Session | Current task/status | Next queued task | Blocker/dependency | Last handoff |
| --- | --- | --- | --- | --- | --- |
| Backend | `/root/backend_c19_persistence_leakage_probe` | C19 complete/audited | C20 bounded prod probe | final docs commit | 1497/1497 CLEAN |
| Frontend | `/root/frontend_c18_persistence_inventory` | C19 UI/audit complete | C20 feasibility after ADR | C20 probe/decision | front 2/2 CLEAN |
| Tester | `/root/tester_c18_persistence_matrix` | C19 matrix complete | C20 matrix after ADR | C20 probe/decision | C19 48/48 |
| E2E Tester | `/root/e2e_c18_persistence_inventory` | C19 static/audit complete | runtime C19 / C20 after ADR | no runtime target | static CLEAN |
| DevOps | `/root/devops_c17_commit` | C19 product checkpoint complete | final docs checkpoint | Architect validation | `2f99ff8` |
| MATLAB Researcher | `/root/matlab_c20_persistence_overlap` | C20 docs discovery complete | bounded provider probe | C19 docs close | probe plan ready |

## Cascade 20 close — 2026-08-01

Status: `accepted-no-go`; DEC-026; no product implementation.

Persistence Overlap materially works but fails the bounded resource/complete-
contract gate. The 512 MiB cutoff triggered at 50 for both topologies and later
at 0 during option-order work; 75/omitted reached GiB scale. The remaining
matrix and 99/99.9 were stopped, pod cleanup/status completed, and no cap or
default was frozen. Persistence Frequency Limits is the active successor.

### Persistent role queue after C20

| Canonical role | Session | Current task/status | Next queued task | Blocker/dependency | Last handoff |
| --- | --- | --- | --- | --- | --- |
| Backend | `/root/backend_c19_persistence_leakage_probe` | C20 NO-GO/cleanup complete | Frequency Limits bounded probe | docs checkpoint | stopped pod |
| Frontend | `/root/frontend_c18_persistence_inventory` | fallback inventory complete | exact UI inventory after probe | successor ADR | no copied defaults |
| Tester | `/root/tester_c18_persistence_matrix` | fallback matrix complete | contract tests after ADR | provider semantics | bounded prerequisites |
| E2E Tester | `/root/e2e_c18_persistence_inventory` | fallback inventory complete | event scenario after ADR | provider output oracle | no fixed waits |
| DevOps | `/root/devops_c17_commit` | C19 hardening commit complete | C20 docs checkpoint | Architect validation | `fec3dbf` |
| MATLAB Researcher | `/root/matlab_c20_persistence_overlap` | official formula complete | Frequency Limits docs-only delta | direct web only | no GUI/clicker |

## Cascade 21 close — 2026-08-01

Status: `provider-capability-pass-product-blocked`; DEC-027.

Frequency Limits exact geometry/validation/raw-output capability is confirmed
under a resource-bounded explicit-zero-overlap probe. It cannot be implemented
against current C19 omitted-overlap semantics or smuggle fixed zero as an
implementation detail. The next task is a separate fixed Persistence
segmentation/resource foundation with numerical/cache/deployment migration.

### Persistent role queue after C21

| Canonical role | Session | Current task/status | Next queued task | Blocker/dependency | Last handoff |
| --- | --- | --- | --- | --- | --- |
| Backend | `/root/backend_c19_persistence_leakage_probe` | C21 PASS/cleanup complete | fixed-segmentation assessment | actual-scale evidence | DEC-027 blocked |
| Frontend | `/root/frontend_c18_persistence_inventory` | Frequency Limits inventory complete | no product work | foundation + successor ADR | exact UI unknowns |
| Tester | `/root/tester_c18_persistence_matrix` | Frequency Limits matrix complete | foundation matrix | new algorithm contract | no copied semantics |
| E2E Tester | `/root/e2e_c18_persistence_inventory` | Frequency Limits inventory complete | rebaseline then limits scenario | foundation | event-driven plan |
| DevOps | `/root/devops_c17_commit` | C20 docs committed | C21 docs checkpoint | Architect validation | `c6b8dd9` |
| MATLAB Researcher | `/root/matlab_c20_persistence_overlap` | C21 docs research complete | fixed policy docs risk | direct web only | no GUI/clicker |

## Cross-cutting snapshot boundary close — 2026-08-01

Status: `implemented-and-verified`; local commits `01f96d9`, `0fc7816`,
`f24e60c`.

Spectrum and Spectrogram now enforce the same absent-versus-present snapshot
boundary already added for Persistence. Exact corruption cannot be normalized
into a later full view request; queue, stale replay and successful malformed
response paths are quarantined. Front 2/2 and independent final audit CLEAN.
Time Limits now follows the same present-corruption boundary while preserving
DEC-013's legacy root fallback and empty-Display-only nullable form. The
interrupted `measurement_kinds` partial was removed for a separate cascade.

## Cascade 22 close — 2026-08-01

Status: `accepted-no-go`; DEC-028; no product implementation.

Fixed zero is a measured lower-resource but breaking Persistence algorithm.
The current omitted call crossed 512 MiB at the first N64 pair, so required
foundation evidence could not be completed safely. C21 remains blocked. Queue
the semantic-preserving lazy materialization assessment before any new
Persistence feature or provider probe.

### Persistent role queue after C22

| Canonical role | Session | Current task/status | Next queued task | Blocker/dependency | Last handoff |
| --- | --- | --- | --- | --- | --- |
| Backend | `/root/backend_c19_persistence_leakage_probe` | C22 NO-GO/cleanup complete | lazy materialization audit | current service graph | 1.23 GiB risk |
| Frontend | `/root/frontend_spectrogram_rescue` | no C22 UI delta | lazy wire inventory | backend policy | one-key Leakage stays |
| Tester | `/root/tester_c18_persistence_matrix` | foundation matrix inventory complete | lazy/cold tests | next ADR | no overlap field |
| E2E Tester | `/root/e2e_c18_persistence_inventory` | rebaseline inventory complete | lazy render scenario | foundation NO-GO | event-only oracle |
| DevOps | `/root/devops_c17_commit` | snapshot docs committed | C22 docs checkpoint | Architect validation | `5f31a4a` |
| MATLAB Researcher | `/root/matlab_c20_persistence_overlap` | parity claim rejected | standby | no safe GUI action | official web only |

## Cascade 23 contract freeze — 2026-08-01

Status: `contract-frozen-implementation-next`; DEC-029.

Persistence becomes active-view-only at the service materialization boundary.
Inactive Persistence payloads preserve the current exact wire schema and
source metadata with typed-empty data, while raw provider results remain
cacheable and reusable. A cold transition into active Persistence prepares the
full prospective four-cache aggregate before any Display/revision/cache
publication. No provider option, spectral math, API settings, frontend schema,
cache eviction or cancellation policy changes in this cascade. Active
Persistence retains the C22 operational resource risk.

### Persistent role queue after C23 contract freeze

| Canonical role | Session | Current task/status | Next queued task | Blocker/dependency | Last handoff |
| --- | --- | --- | --- | --- | --- |
| Backend | `/root/backend_c19_persistence_leakage_probe` | lazy trace complete | service-only OOP implementation | docs checkpoint | DEC-029 GO |
| Frontend | `/root/frontend_time_snapshot` | Time boundary hardening active | C23 no-runtime-delta audit | backend wire behavior | exact schema unchanged |
| Tester | `/root/tester_c18_persistence_matrix` | Time matrix correction active | C23 lifecycle/rollback matrix | backend implementation | typed-empty oracle |
| E2E Tester | `/root/e2e_c18_persistence_inventory` | C19 static complete | C23 event-driven lifecycle scenario | backend implementation | no fixed waits |
| DevOps | `/root/devops_c17_commit` | C22 docs committed | C23 contract checkpoint | Architect validation | `11a77c9` |
| MATLAB Researcher | `/root/matlab_c20_persistence_overlap` | standby | no C23 GUI research | none required | official web only |

## Cascade 24 contract freeze — 2026-08-01

Status: `contract-frozen-implementation-next`; DEC-030.

The shared Plotly host adopts latest-render-wins through a frontend-only
monotonic generation and serialized render tail. Every draw invalidates older
work, including synchronous placeholders. Stale queued jobs do not call
Plotly; stale success/rejection cannot publish host state; unavoidable stale
in-flight DOM mutation causes one bounded newest-frame reassertion. No API,
backend, payload, Plotly artifact or DSP change is permitted.

### Persistent role queue after C24 contract freeze

| Canonical role | Session | Current task/status | Next queued task | Blocker/dependency | Last handoff |
| --- | --- | --- | --- | --- | --- |
| Backend | `/root/backend_c19_persistence_leakage_probe` | C23 implemented | no C24 delta | C23 commit | full backend green |
| Frontend | `/root/frontend_c23_contract_audit` | C24 discovery complete | generation coordinator | docs checkpoint | exact race matrix |
| Tester | `/root/tester_c18_persistence_matrix` | measurement discovery complete | deferred Plotly tests | frontend implementation | controlled promises |
| E2E Tester | `/root/e2e_c23_final_audit` | C23 static CLEAN | optional fast-switch scenario | frontend implementation | no fixed sleeps |
| DevOps | `/root/devops_c17_commit` | checkpoints current | C24 docs/product commits | role validation | no push/deploy |
| MATLAB Researcher | `/root/matlab_c23_spectrum_defaults` | docs research complete | standby | unsafe GUI state | official web only |

## Cascade 25 contract freeze — 2026-08-01

Status: `contract-frozen-implementation-next`; DEC-031.

`measurement_kinds` follows absent-versus-present snapshot semantics. Absent
uses canonical first-three defaults. Present accepts a unique known string
subset, including empty, and canonicalizes UI order. Present corruption
quarantines the Display with accessible error, disabled Statistics controls,
queue/pending/desired purge and zero malformed 200/409 replay or server POST.
No backend/API/math/root-fallback or C24 render change belongs to this cascade.

### Persistent role queue after C25 contract freeze

| Canonical role | Session | Current task/status | Next queued task | Blocker/dependency | Last handoff |
| --- | --- | --- | --- | --- | --- |
| Backend | `/root/backend_c19_persistence_leakage_probe` | no C25 delta | read-only schema confirmation only | none | serializer canonical |
| Frontend | `/root/frontend_time_snapshot` | Time boundary complete | C25 exact validator/quarantine | C24 app.js commit | partial work removed |
| Tester | `/root/tester_c18_persistence_matrix` | C25 discovery complete | corruption/replay matrix | frontend implementation | exact cases frozen |
| E2E Tester | `/root/e2e_c23_final_audit` | standby | optional snapshot recovery static gate | frontend implementation | no backend oracle |
| DevOps | `/root/devops_c17_commit` | C24 docs current | C25 docs/product commits | role validation | no push/deploy |
| MATLAB Researcher | `/root/matlab_c23_spectrum_defaults` | standby | none | no GUI need | direct web only |

## Cascades 23 and 24 implementation close — 2026-08-01

Status: `implemented-and-locally-verified`; not deployed.

C23 product/test `84b21f3` passes full backend with 104 focused assertions and
repeated independent audit CLEAN. Gated C23 E2E static contract is `6d57949`;
runtime remains unavailable. C24 product/test `102aa07` passes frontend 2/2 and
a six-case controlled-promise matrix; independent audit CLEAN after three
pre-settlement oracle fixes. Push, deployment and merge were not performed.

## Cascade 25 implementation close — 2026-08-01

Status: `implemented-and-locally-verified`; not deployed.

C25 frontend/test `0d7bd7e` passes frontend 2/2. Exact absent/root precedence,
valid empty/unordered canonical selection, malformed shape/member matrix,
visible disabled quarantine, successful 200/409 queued-intent purge, exact
valid request and A/B isolation are covered. Independent final audit CLEAN.
Backend/API/math/C24 coordinator were unchanged; push/deployment/merge absent.

## Cascade 26 contract freeze — 2026-08-01

Status: `contract-frozen-implementation-next`; DEC-032.

Validate global snapshot topology before normalize: object snapshot, named
unique signal objects, nonempty unique-ID Display objects and matching active
ID. Any corruption is app-fatal/reset through existing alert/Retry; clear state,
host/tabs/rows, all View/Display desired/queued/pending intents and C24 render
generation. Initial/200/409 never replay. Membership/source/row/root validation
is C27 and must not broaden this patch.

### Persistent role queue after C26 contract freeze

| Canonical role | Session | Current task/status | Next queued task | Blocker/dependency | Last handoff |
| --- | --- | --- | --- | --- | --- |
| Backend | `/root/backend_c19_persistence_leakage_probe` | no C26 delta | serializer confirmation only | none | topology always emitted |
| Frontend | `/root/frontend_c24_final_audit` | envelope discovery complete | global validator/fatal reset | docs checkpoint | P0-A isolated |
| Tester | `/root/tester_c18_persistence_matrix` | envelope matrix complete | initial/200/409/retry tests | frontend implementation | fatal vs quarantine split |
| E2E Tester | `/root/e2e_c23_final_audit` | standby | optional fatal/retry static scenario | frontend implementation | existing app-error selector |
| DevOps | `/root/devops_c17_commit` | C25 product current | C26 docs/product commits | role validation | no push/deploy |
| MATLAB Researcher | `/root/matlab_c23_spectrum_defaults` | standby | none | no GUI need | direct web only |

## Cascade 26 implementation close — 2026-08-01

Status: `implemented-and-locally-verified`; not deployed.

C26 frontend/test `f5820bd` passes frontend 2/2. The deterministic matrix covers
outer-envelope classes, initial/200/409 queue purge, Peaks success, bounded
second stale replay, fatal controls, Retry A/B recovery and deferred C24
Plotly settlement after fatal reset. Independent final Frontend audit CLEAN.
Gated E2E contract `33df821` passed static/support checks and independent audit;
runtime remains unclaimed. Backend/API/HTML/schema/math were unchanged. Push,
deployment and merge were not performed.

### Persistent role queue after C26 implementation close

| Canonical role | Session | Current task/status | Next queued task | Blocker/dependency | Last handoff |
| --- | --- | --- | --- | --- | --- |
| Backend | `/root/backend_c19_persistence_leakage_probe` | no C26 delta | C27 read-only serializer support | DEC-033 checkpoint | backend unchanged |
| Frontend | `/root/frontend_c26_bind_fix` | C26 CLEAN/committed | implement C27 selection boundary | DEC-033 checkpoint | `f5820bd` |
| Tester | `/root/tester_c7_matrix` | C26 matrix CLEAN/committed | C27 lifecycle matrix | DEC-033 checkpoint | controlled promises |
| E2E Tester | `/root/e2e_c26_audit` | C26 static audit CLEAN | optional C27 gated scenario | compatible target absent | `33df821` |
| DevOps | `/root/devops_c17_commit` | C26 commits complete | C26 trace/C27 docs commits | exact path acceptance | no push/deploy |
| MATLAB Researcher | `/root/matlab_c23_spectrum_defaults` | standby | none | no GUI need | official web only |

## Cascade 27 contract freeze — 2026-08-01

Status: `contract-frozen-implementation-next`; DEC-033.

After the DEC-032 envelope, require owned known `row_selected_signal`, strict
canonical per-Display membership and two owned equal selection aliases. Invalid
Display selection quarantines only that ID; if the active Display is invalid,
its root projections are ignored so quarantine does not escalate. With a valid
active Display, mismatched root aliases/membership or `signals[].visible` are
global fatal. Empty inventory is now global fatal through the row gate. C27
does not validate plot payloads, settings, measurements, peaks or math.

### Persistent role queue after C27 contract freeze

| Canonical role | Session | Current task/status | Next queued task | Blocker/dependency | Last handoff |
| --- | --- | --- | --- | --- | --- |
| Backend | `/root/backend_c19_persistence_leakage_probe` | no C27 delta | read-only serializer support | none | canonical response confirmed |
| Frontend | `/root/frontend_c26_bind_fix` | C26 current | C27 validator/quarantine | docs checkpoint | DEC-033 exact precedence |
| Tester | `/root/tester_c7_matrix` | C26 current | C27 corruption/lifecycle matrix | frontend implementation | controlled queue seams |
| E2E Tester | `/root/e2e_c26_audit` | C26 gated CLEAN | optional C27 static gate | frontend implementation | no runtime target |
| DevOps | `/root/devops_c17_commit` | C26 current | C27 docs/product commits | role acceptance | no push/deploy |
| MATLAB Researcher | `/root/matlab_c23_spectrum_defaults` | standby | none | no GUI need | official web only |

## Cascade 27 implementation close — 2026-08-01

Status: `implemented-and-locally-verified`; not deployed.

C27 frontend/test `f334e7f` passes frontend 2/2 and independent final audit.
The matrix covers exact row/root/alias/membership classes, valid empty state,
active/inactive A-B isolation, local/global precedence, successful 200 and 409
queue behavior, topology recovery/no resurrection and deferred Plotly. Backend
remained unchanged and passed 1582 assertions plus route-reachable projection
probe. Gated E2E `a4edbc9` passed static/support and independent audit; runtime
is unclaimed. Push, deployment and merge were not performed.

### Persistent role queue after C27 implementation close

| Canonical role | Session | Current task/status | Next queued task | Blocker/dependency | Last handoff |
| --- | --- | --- | --- | --- | --- |
| Backend | `/root/backend_c27_serializer_audit` | C27 conformance PASS | future import hardening only | new ADR required | no C27 delta |
| Frontend | `/root/frontend_c26_bind_fix` | C27 CLEAN/committed | C28 active-plot boundary | DEC-034 checkpoint | `f334e7f` |
| Tester | `/root/tester_c7_matrix` | C27 matrix CLEAN/committed | C28 lifecycle matrix | DEC-034 checkpoint | controlled 200/409 |
| E2E Tester | `/root/e2e_c27_audit` | C27 static audit CLEAN | optional C28 static gate | compatible target absent | `a4edbc9` |
| DevOps | `/root/devops_c17_commit` | C27 commits complete | C27 trace/C28 docs | exact path acceptance | no push/deploy |
| MATLAB Researcher | `/root/matlab_c23_spectrum_defaults` | standby | none | no GUI need | official web only |

## Cascade 28 contract freeze — 2026-08-01

Status: `contract-frozen-implementation-next`; DEC-034.

Documentation checkpoint committed: the three-file contract snapshot is
`9190bb9`; the shared task/handoff/history/traceability checkpoint is
`76f5413`. Product implementation and its verification remain planned.

Every Display response must own exact `active_plot` in the closed four-value
enum. Invalid Display plot quarantines only that validated ID and never defaults
to Time. If active Display plot is valid, root `active_plot` must own and equal
it or the snapshot is global fatal; invalid active Display suppresses root plot
validation by precedence. Request omission stays compatible. Panel/plots/
payload/settings/Measurements/Peaks/DSP/math remain outside C28.

### Persistent role queue after C28 contract freeze

| Canonical role | Session | Current task/status | Next queued task | Blocker/dependency | Last handoff |
| --- | --- | --- | --- | --- | --- |
| Backend | `/root/backend_c27_serializer_audit` | no C28 delta | read-only enum support | none | typed plot serialized |
| Frontend | `/root/frontend_c26_bind_fix` | C28 implementation planned | C28 plot validator/quarantine | none; docs checkpoints committed | DEC-034 precedence; `9190bb9`, `76f5413` |
| Tester | `/root/tester_c7_matrix` | C27 matrix CLEAN/committed | C28 enum/lifecycle matrix | frontend implementation | controlled 200/409 |
| E2E Tester | `/root/e2e_c27_audit` | C27 gated CLEAN | optional C28 static gate | frontend implementation | no runtime target |
| DevOps | `/root/devops_c17_commit` | C28 docs checkpoints committed | C28 product commits | role acceptance | `9190bb9`, `76f5413` |
| MATLAB Researcher | `/root/matlab_c23_spectrum_defaults` | standby | none | no GUI need | official web only |

## Cascade 28 implementation close — 2026-08-01

Status: `implemented-and-locally-verified`; runtime unclaimed; not deployed.

Frontend/Tester checkpoint `08af1e7` enforces DEC-034 before normalization and
passes frontend 2/2 plus independent Frontend/Tester audits CLEAN. Gated E2E
checkpoint `a091410` passes Node syntax, support, gated/default-false, bash
syntax and independent E2E audit CLEAN; it was not run in a browser. Backend
has no C28 delta: full suite and route-reachable GET/200/409 probes for all four
enum values PASS. The ordinary local state path returns known prerequisite
`500` because EngeeDSP is absent; this is not a new Engee candidate. MATLAB was
untouched. Push, deployment and merge were not performed.

### Persistent role queue after C28 implementation close

| Canonical role | Session | Current task/status | Next queued task | Blocker/dependency | Last handoff |
| --- | --- | --- | --- | --- | --- |
| Backend | `/root/backend_c27_serializer_audit` | C28 conformance PASS; completed standby | future aggregate/import hardening only | new ADR required; no eligible C28 delta | full suite + four-enum GET/200/409 probes |
| Frontend | `/root/frontend_c26_bind_fix` | C28 CLEAN/committed; completed standby | next snapshot slice after contract freeze | no next contract accepted | `08af1e7` |
| Tester | `/root/tester_c7_matrix` | C28 matrix CLEAN/committed; completed standby | matrix for next accepted snapshot slice | no next contract accepted | `08af1e7` |
| E2E Tester | `/root/e2e_c27_audit` | C28 gated static CLEAN/committed | focused C28 runtime | compatible C28 target absent; feature default false | `a091410` |
| DevOps | `/root/devops_c17_commit` | C28 local commits complete; completed standby | validated C28 architecture-doc checkpoint | exact Architect file handoff required; no push/deploy/merge authority | `a091410`, `08af1e7` |
| MATLAB Researcher | `/root/matlab_c23_spectrum_defaults` | completed standby; no C28 action | none | no GUI/reference question for C28 | untouched |
