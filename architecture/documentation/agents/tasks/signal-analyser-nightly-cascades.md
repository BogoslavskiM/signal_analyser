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
