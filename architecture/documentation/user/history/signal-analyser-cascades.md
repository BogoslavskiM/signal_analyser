# Timeline Signal Analyser

## 2026-07-31 — состояние первой версии

- `deployed`: prod SHA `0606d47`, backend 108/108, frontend 2/2,
  EngeeDSP evidence, E2E 6/6.
- Исправлены base-path, `[hidden]` и E2E matcher defects.
- Post-prod review нашёл оставшийся Plotly placeholder.

## 2026-07-31 — второй каскад

- `implemented`: revision-safe visibility, multi-trace Time/Spectrum,
  selected heatmaps, checkbox/row independence, placeholder cleanup, fixed 2×2.
- `verified`: backend 262 assertions, frontend 2/2, E2E support/static contracts.
- `not deployed`: runtime visibility E2E ожидает target с текущими изменениями.

### 2026-07-31 — verification update

- После Tester additions полный backend gate: 289/289 assertions PASS.
- Frontend остаётся 2/2 PASS; runtime E2E второго каскада pending.
- Второй каскад не deployed.

## 2026-07-31 — MATLAB bounded research cycle

- `observed`: созданы пять базовых variables и три timetable; Time display
  показал три signals; selection/membership/active display независимы.
- `observed`: multi-signal Time-Frequency/Persistence disabled; duplicate import
  asks overwrite.
- `evidence limitation`: ранние команды подтверждены итоговым состоянием без
  полного screenshot каждой команды; полный per-command guard evidence есть
  только у финальной команды.
- Researcher продолжил следующий bounded cycle.

## 2026-07-31 — documentation migration

- Документация физически разделена на `user/` и `agents/`.
- Добавлены ADR, math spec, traceability и Engee bug registry.

## 2026-07-31 — EngeeDSP runtime contract

- `observed`: clean local project не находит EngeeDSP; current prod runtime
  успешно использует preloaded module с ожидаемым UUID.
- `decision`: dependency не добавляется без registry/version evidence;
  deployment использует target preload/import/contract preflight.
- `deployment impact`: conditional gate, но не blocker второго deploy на том же
  target при повторном PASS.
- `correction`: prod evidence установил version `0.72.0`, internal `[sources]`
  и отсутствие UUID в General. Candidate закрыт как non-defect
  dependency/portability limitation; `Project.toml` ownership закреплён за
  Backend без изменения dependency в v2.

## 2026-07-31 — local-first Plotly delivery

- `implemented`: official npm `plotly.js-cartesian-dist-min@3.1.0` vendored with
  MIT license; local URL precedes CDN fallback and UMD export is normalized.
- Root-cause evidence: CDN GET body stalled despite HEAD 200 while local app/API
  remained healthy; this is not classified as an Engee bug.
- `not verified`: Tester regression pending.
- `not deployed`: prod E2E pending; required outcome is 4 ready plots, zero
  visible placeholders and zero CDN request when local artifact succeeds.

## 2026-07-31 — Display pages и local-only correction

- Пользовательское ТЗ и текущая реализация заменили фиксированную 2×2-сетку
  страницами Display с одним графиком; multi-layout editor остаётся вне scope.
- `DEC-20260731-009` supersedes старый geometry contract DEC-003.
- Канонический `graph-output-zone` запретил runtime CDN dependency;
  `DEC-20260731-010` supersedes DEC-006, а stale fallback tests направлены на
  коррекцию.
- Статус: implemented locally; повторные Tester и runtime E2E проверки идут,
  deployment не выполнялся.
- Локальный product/test checkpoint создан как `651943d`; GitHub push не
  выполнен, поскольку внешняя передача ждёт отдельного явного approval.

## 2026-07-31 — MATLAB deterministic statistics evidence

- SA-UI-005 создан с полным Command Window guard для `sa5_*` variables.
- `observed`: начальные Signal Statistics — Minimum/Maximum/Mean; для тестового
  ряда minimum `-2` в `12 s`, maximum `3` в `5 s`; formula oracle mean `1/3`.
- Peaks menu подтвердил зависимость от time-domain state. Median и Peaks
  settings не подтверждены после bounded attempts и исключены из claims.
- Это evidence поддерживает существующий P0, но не расширяет product scope на
  Median, peak-to-peak, RMS или Peaks.

## 2026-07-31 — MATLAB active-display portability evidence

- SA-UI-006 подтвердил page-scoped checkbox membership и measurement context:
  при смене active display они remap/restore, а неактивные plots сохраняются.
- Row selection остаётся независимым и может указывать на unchecked сигнал
  активного display.
- MATLAB grid/docking остаётся layout-specific; product lifecycle Display pages
  определяется DEC-009 и reference images.

## 2026-07-31 — Cascade 4 P0 Peaks

- Official Engee reference и prod MIND подтвердили
  `EngeeDSP.Functions.findpeaks(...; out=:data)` и result Ypk/Xpk/Wpk/Ppk.
- `implemented`: lazy per-Display Time-only capability через существующий
  `/api/view`, typed OOP provider, atomic rollback, zero-based items, локальная
  Peaks table и backend-driven Plotly markers; endpoint/fallback отсутствуют.
- `verified locally`: backend 553/553, frontend 2/2, Engee matrix 16/16,
  Playwright syntax/support PASS; compiled prod lazy-load pattern PASS.
- Local product/test checkpoint: `d9fbcd9`; accessibility/evidence checkpoint:
  `ab87889`. Push/deploy не выполнялись, runtime E2E auth-blocked.
- Engee reference keyword mismatch `Npeaks`/`NPeaks` зарегистрирован как
  confirmed documentation bug `ENGEE-20260731-002`.

## 2026-07-31 — MATLAB Clear Display delta

- SA-UI-007 observed an active-only Clear Display transition: membership and
  statistics were removed only from the active display, while inactive plot and
  global signal inventory survived.
- MATLAB re-add remained unconfirmed after bounded attempts.
- Этот delta был принят как основание отдельного state-model Cascade 5; MATLAB
  re-add не выдаётся за observed behavior.

## 2026-07-31 — Cascade 5 state separation и Clear Display

- `implemented`: global row selection, ordered page membership с допустимым
  `[]`, nullable page analysis source и legacy nullable selected alias.
- `implemented`: доступный overflow/Clear, независимые row/member attributes,
  явные empty states и очистка внутреннего Plotly state без замены graph host.
- `verified locally`: backend 649/649, frontend 2/2, Playwright
  syntax/support/runner-help PASS; skills 40/schema 2, vanilla assets и docs
  structure validators PASS.
- Local EngeeDSP package gate остаётся environment failure; независимая prod
  findpeaks matrix 16/16 сохраняет статус PASS.
- `not deployed`: runtime scenario ждёт authenticated target и отдельное
  разрешение на внешний push/deploy.

## 2026-07-31 — Cascade 6 Time presentation

- `implemented`: frontend-local per-Display Normalize Y и Show Markers только
  для непустого Time; каждый trace нормализуется независимо, constant — zero.
- Peaks marker использует тот же source-affine transform без clipping; invalid
  Time data имеет стабильный error state и не попадает в Plotly.
- `verified locally`: frontend 2/2, backend regression 649/649, Playwright
  syntax/support/runner-help и architecture validators PASS.
- Product/test checkpoint `f546195`; push/deploy/runtime E2E не выполнялись.

## 2026-07-31 — MATLAB Time Limits evidence

- SA-UI-008 подтвердил page-local Time ROI и пересчёт Statistics: 3..9 и 4..6
  дали ожидаемые разные extrema; допустимы полные границы 0..14.
- Invalid ordered limits без dialog восстановили last-valid state. Пустой
  linked Display не получил диапазон; populated Link Time остаётся unknown.
- Evidence принят для отдельного Cascade 7, а не смешан с локальными C6
  presentation controls.

## 2026-07-31 — Cascade 7 authoritative Time Limits/ROI

- `implemented`: typed page-local seconds limits в root/display snapshot и
  существующем revision-safe `/api/view`; отдельный endpoint не создан.
- Statistics вычисляются по inclusive raw ROI с абсолютными indices/time;
  Peaks использует exact subset и sample offset, а valid 1–2 sample ROI не
  вызывает provider.
- Source preserve/reset, Clear/null, first re-add/full, new/inactive Display,
  +1/no-op и atomic 422/provider paths закрыты локальными tests.
- Frontend добавляет draft-only Min/Max, один commit request, exact inline 422
  rollback и Plotly range без slicing исходных traces.
- `verified locally`: backend 719/719, frontend 2/2, Playwright static/support,
  architecture skill/vanilla validators и diff/parse PASS.
- Visual-spec PNG перенесены в versioned client assets с SHA-256.
- Product/test checkpoint `1b7864b`; runtime E2E, push и deployment не
  выполнялись.

## 2026-07-31 — MATLAB Normalize/Markers delta

- SA-UI-009 подтвердил Normalize rendering 0..1 с raw Statistics и markers на
  каждом из 15 samples; Time-only controls восстанавливаются при re-add view.
- Normalize наблюдался display-local. Show Markers в MATLAB R2024b проявился
  cross-display и мог переключаться из empty display.
- Продукт сохраняет page-local Show Markers как явное portable decision; этот
  delta не переписывает уже проверенный Cascade 6 задним числом.

## 2026-07-31 — Cascade 8 selectable Statistics

- SA-UI-010 подтвердил точный порядок Minimum, Maximum, Mean, Median, Peak to
  peak, RMS, defaults из первых трёх и независимость выбора между Display.
- `implemented`: typed ordered `measurement_kinds` в root/display snapshot и
  существующем `/api/view`; пустой subset, canonical ordering, per-Display
  Clear/re-add/new/inactive lifecycle и строгий atomic field-level 422.
- Median, Peak-to-Peak и scale-normalized RMS вычисляются по одному inclusive
  raw ROI. Только extrema сохраняют абсолютную sample/time position; пустой
  выбор не материализует ROI и не вызывает DSP/provider.
- Frontend получил функциональные Display/Time/Measurements settings tabs и
  native checkboxes; `Signal statistics` открывает settings и нижний output.
- `verified locally`: backend 789/789, frontend 2/2, Playwright
  syntax/support/runner-help, skills catalog и vanilla validators PASS.
- Product/test checkpoint `0fc70fd`; upstream divergence после commit —
  `0 behind / 18 ahead`.
- Runtime DevHub E2E, push и deployment не выполнялись. Локальное отсутствие
  EngeeDSP остаётся известным preflight limitation для специализированных
  путей и не влияет на Base/Statistics C8.

## 2026-08-01 — Cascade 9 Spectrum settings и authoritative ROI

- SA-GRAPH-001/002/003 и prod EngeeDSP `0.72.0` probe разделили наблюдаемые
  MATLAB defaults/dB/Log rendering и проверяемый provider contract.
- `implemented`: каждый Display хранит строгий `spectrum_settings` с defaults
  dB/Linear/0.5; `/api/view` сохраняет revision/no-op/422/409 atomicity, а
  Clear/new/A-B lifecycle не смешивает страницы.
- Spectrum вычисляется EngeeDSP `pspectrum` по inclusive raw Time ROI каждого
  видимого сигнала. Real использует one-sided, complex centered two-sided;
  Leakage входит в raw cache key, presentation scales — нет. Fallback и
  dependency edit не добавлялись.
- Frontend получил условную Spectrum-секцию внутри Display, три native control,
  запрет Log при complex, полный serialized request, rollback и Plotly
  frequency-axis mode без клиентского DSP.
- `verified locally`: backend 867/867 (C9 service 52/52, API 28/28), frontend
  2/2, Julia parse, Playwright syntax/support/runner-help, skill/vanilla/docs
  validators PASS. Local Engee contract сохраняет честный environment failure
  после findpeaks 16/16 из-за отсутствующего пакета; prod provider evidence
  подтверждено отдельно.
- Product/test checkpoint: `b53d79622dbe926316915d7c55668432434bcc07`.
  Push, runtime E2E, deployment и merge не выполнялись.

## 2026-08-01 — Cascade 10 Frequency Limits

- `implemented`: strict four-key Spectrum settings хранит Auto/null либо exact
  requested Hz interval; source preserve/reset, A/B, Clear/re-add, no-op/+1 и
  atomic 422/409 lifecycle закрыты.
- Provider получает explicit `FrequencyLimits`; effective interval secondary
  trace является topology intersection. No-overlap/0/1 ROI не вызывает
  provider, а FFT/crop/padding/resampling/fallback отсутствуют.
- Frontend получил F min/F max в существующей Display Spectrum section,
  backend-effective Auto values, draft/commit/rollback/409 queue и Auto reset
  очисткой обоих полей. Три tabs и отсутствие Log-floor сохранены.
- `verified locally`: backend 944/944 (C10 37/37 + API 40/40), frontend 2/2,
  Julia parse, Playwright syntax/support/help и architecture/docs/vanilla
  validators PASS.
- Product/test checkpoint:
  `9c7cd70ddc10c323f6897afe65cdac2e1a960715`; contract docs `df5451d`.
  Push, runtime E2E, deployment и merge не выполнялись.
- Local Engee gate сохраняет честный import failure после findpeaks 16/16;
  prod EngeeDSP `0.72.0` FrequencyLimits probe остаётся capability evidence.

## 2026-08-01 — Cascade 11 typed Spectrogram foundation

- `implemented`: legacy direct Spectrogram helper заменён typed query/data,
  abstract provider, Engee adapter, service и full-resolution raw cache.
- Real input делегируется как one-sided, complex как centered two-sided;
  provider result обязан иметь exact frequency × segment-time orientation,
  sorted finite axes, valid topology/domain и nonnegative finite real power.
- `N<2` возвращает typed empty без provider. Provider failure и invalid axes не
  публикуют частичный cache/state; analysis source остаётся единственным
  heatmap source Display.
- Presentation применяет exact `10log10(P)`, сохраняет zero как `-Inf` до
  общего JSON `null` и ограничивает только wire до 160×160. Raw cache не
  уменьшается; epsilon floor, FFT/STFT fallback и dependency edit отсутствуют.
- Frontend/wire/settings/routes не расширены: один host и ровно три settings
  tabs. Добавлен статический typed Spectrogram E2E contract.
- `verified locally`: backend 980/980, C11 36/36, frontend 2/2, Julia parse,
  Playwright syntax/support/help, skills/vanilla/adapters и diff PASS.
- Product/test checkpoint `d47e51e61a346803902ce1f5b179ed8fb9f02c14`;
  push, runtime E2E, deployment и merge не выполнялись.
- Short-input prod evidence уточнило terminal center: provider может вернуть
  половину sample после последнего timestamp. Hotfix `6801696` меняет только
  верхнюю validation bound; итоговый backend 982/982, C11 38/38.

## 2026-08-01 — Cascade 12 Spectrogram OverlapPercent

- `implemented`: один Display-local `spectrogram_settings.overlap_percent`,
  explicit default 50 и строгий finite non-Bool product range 0..75.
- Query/raw cache/provider включают exact overlap; A/B, Clear/re-add, empty,
  source change, no-op/+1 и atomic 422/409 lifecycle закрыты.
- Frontend добавил только `Overlap (%)` в существующую Display tab. 422
  откатывает к last accepted server value; 409 повторяет ровно один последний
  full desired target. Один host, три tabs и отсутствие client DSP сохранены.
- `verified locally`: backend 1110/1110 (C12 typed 13/13,
  lifecycle/cache 56/56, API 59/59), frontend 2/2, Julia parse, Playwright
  syntax/support/help, skills/vanilla/docs и diff PASS.
- Product/test checkpoint `f1dac5819ed49438fb249561102f7b2651c4150d`;
  push, runtime E2E, deployment и merge не выполнялись.
- Prod probe подтвердил explicit 0/50/75, Auto=75 и high-overlap resource
  hazard. Product cap 75 — документированная safety delta, не MATLAB parity.

## 2026-08-01 — Cascade 13 Spectrogram Leakage

- `implemented`: independent Display-local normalized Leakage 0..1, default
  0.5, exact two-key Spectrogram settings and canonical signed zero.
- Query/raw cache/provider включают Leakage перед OverlapPercent/TwoSided;
  raw power меняется при invariant frequency/time grid. Spectrum state/cache/
  provider не связан с Spectrogram Leakage.
- Frontend добавил range/value/error в существующую Display tab; 422 использует
  accepted baseline, 409 имеет максимум один replay и bounded second-stale
  rollback. Один host, три tabs, no client DSP сохранены.
- Audit исправил cold-cache Spectrum dispatch, canonical no-op provider work,
  cache-key hash для signed zero и недостижимые E2E branches.
- `verified locally`: backend 1229/1229, frontend 2/2, Playwright static,
  Julia parse, skills/vanilla/docs/diff PASS.
- Product/test checkpoint `aebd6f96158caa1917de334c1d61abe6ca8ca950`;
  push, runtime E2E, deployment и merge не выполнялись.

## 2026-08-01 — Cascade 14 Reassign NO-GO

- Official docs подтвердили logical Reassign, API default false, app checkbox и
  energy-center relocation; точный app default остался inference.
- Prod omitted/false bitwise equivalent и deterministic. Все 28/28 valid true
  calls на real/complex, one-/two-sided, Leakage 0/.5/1 и N=2..4096 упали с
  undefined `fetchTimeReassignment`.
- Дефект изолирован и зарегистрирован как `ENGEE-20260801-004`.
- DEC-020 запрещает payload/state/UI/control, silent downgrade, fallback и
  custom DSP до upstream fix и повторного public-provider matrix.
- Product/test files не менялись; цикл переключён на C15 Frequency Limits.

## 2026-08-01 — Cascade 15 Spectrogram Frequency Limits

- `implemented`: independent Display-local Auto/Explicit Hz limits в exact
  трёхключевом Spectrogram settings object. Interval строго целиком лежит в
  topology единственного analysis source; provider clipping не экспонируется.
- Auto и explicit полный domain имеют разные query/cache identities. Provider
  order: Leakage, OverlapPercent, TwoSided, FrequencyLimits. Metadata
  `mode/requested/effective` определена и для `N<2` typed-empty.
- Frontend получил атомарную пару F min/F max. Переход фокуса между полями не
  отправляет смешанный request; Enter или выход из группы создаёт один полный
  запрос. 422 и оба уровня bounded 409 возвращают accepted state.
- Три последовательных cross-role audit pass исправили natural-focus blind
  spot, старые E2E object shapes и точное восстановление Spectrum settings.
- `verified locally`: backend 1263/1263, C15 34/34, frontend 2/2, Julia parse,
  Playwright syntax/support/help, skills/vanilla/docs/diff PASS.
- Product/test checkpoint `5602ccb20c773c00bac29bb66d8e602a866114c9`.
  Runtime E2E, push, deployment и merge не выполнялись. Local Engee gate
  проходит findpeaks 16/16 и затем падает только из-за отсутствующего EngeeDSP;
  prod provider probe остаётся runtime capability evidence.

## 2026-08-01 — Cascade 16 Spectrogram Frequency Scale

- `implemented`: exact четырёхключевой Spectrogram settings object получил
  Display-local requested `frequency_scale` (`linear|log`, default `linear`).
- Backend публикует authoritative requested/effective/available metadata:
  no-source `null/[]`, real requested + Linear/Log, complex locked Linear.
  Requested Log переживает real→complex→real и Clear без client writeback.
- Scale-only mutation даёт одну revision, но не входит в typed query/cache/
  provider и не меняет backend `x/y/z`; cold mutation не прогревает оба
  spectral provider.
- Frontend использует effective scale и transient clone частотной оси. Zero bin
  заменяется ровно на `minPositive/2`; authoritative `y/z` не мутируют, а
  непустая ось без положительных bins показывает стабильную ошибку.
- Tester replacement `/root/tester_c16_replacement` завершил exact migration
  после повторных незавершённых turn исходного `/root/tester_c15_limits_matrix`.
  Три audit pass закрыли no-positive/no-source, stale three-key E2E, bounded
  409, точные UI recovery и cleanup gaps; итоговый verdict `CLEAN`.
- `verified locally`: backend full PASS, C16 47/47 + API 16/16, frontend 2/2,
  Julia parse, Playwright syntax/support/help и diff PASS.
- Product/test checkpoint `83308222896379eb72f1923006de39ce07265d8d`.
  Runtime E2E, push, deployment и merge не выполнялись. Local EngeeDSP
  отсутствует, Devhub MCP unavailable/404; Engee defect не заявлен.

## 2026-08-01 — Cascade 17 Spectrogram Power Limits

- `implemented`: exact пятиключевой Spectrogram settings object получил
  Display-local Auto/null либо strict explicit `{min_db,max_db,units:"dB"}`.
- Auto effective вычисляется по всей raw power matrix до 160×160 bounding;
  нули не искажают extrema, mixed/constant/empty случаи имеют точную metadata.
- Power-only mutation presentation-only: не меняет query/cache/provider,
  backend `x/y/z` и на холодном состоянии не вызывает spectral provider.
- Vanilla frontend получил атомарную пару P min/P max, Auto clear, effective
  readout, accepted rollback и bounded 409 replay. Plotly получает только
  `zauto/zmin/zmax`; для `{v,v}` применяется renderer-local ±1 dB fallback.
- E2E-сценарий прошёл повторную реализацию после двух незавершённых попыток;
  финальный независимый audit verdict — `CLEAN`.
- `verified locally`: backend 1397/1397, C17 49/49 + API 22/22, frontend 2/2,
  Julia parse, Playwright syntax/support/help, documentation/diff gates PASS.
- Product/test checkpoint `290c057a05c7ebeab68a69632fcec462bd893339`.
  Runtime E2E, push, deployment и merge не выполнялись; Engee provider не
  затронут, поэтому новый Engee contract test не требуется.

## 2026-08-01 — Cascade 18 typed Persistence foundation

- `implemented`: legacy Persistence заменён отдельными immutable query/data/
  cache-key, injectable provider/service и raw cache без изменения wire/UI.
- Real теперь one-sided, complex centered two-sided; provider явно получает
  `NumPowerBins=256`. Matrix принимается только как power × frequency,
  positive power переводится точным `10log10(P)` до heatmap bounding.
- Persistence вычисляется только для analysis source; secondary visible
  signals не создают provider calls. `N<2` возвращает typed empty.
- Финальный аудит обнаружил и закрыл частичную cache publication при failed
  cold GET: ordinary snapshot теперь готовит весь payload и четыре cache maps,
  затем публикует их одной фазой только после полного success.
- `verified locally`: backend 1449/1449, C18 49/49, frontend 2/2, Julia parse,
  Playwright syntax/support/help и diff PASS; final verdict `CLEAN`.
- Product/test checkpoint `3b16cd96e64fab9654811baa69d83f59d2eac295`.
  Test hardening checkpoint `27fcdef177061fed3a69f42899e680ba04ba1a87`.
  Runtime E2E, push, deployment и merge не выполнялись. Local Engee gate
  проходит findpeaks 16/16 и затем честно падает из-за отсутствующего EngeeDSP;
  новый Engee defect не заявлен.

## 2026-08-01 — Cascade 19 Persistence Leakage contract freeze

- `researched`: prod EngeeDSP `0.72.0` подтвердил bit-exact omitted=`0.5`,
  endpoints, determinism, strict real/complex topology и option-order
  invariance. Leakage меняет raw power axis и occurrence, frequency axis нет.
- `decided`: exact per-Display `persistence_settings={leakage:0.5}`, finite
  non-Bool `[0,1]`, signed-zero canonicalization; Leakage входит в typed query/
  cache key и передаётся перед fixed NumPowerBins/TwoSided.
- Normalized range frontend объявлен продуктовой политикой, не наблюдением
  MATLAB GUI. Spectrum и Spectrogram остаются полностью независимыми.
- `not yet implemented`: product/test/runtime evidence, commit SHA, deploy и
  merge появятся только после реализации и отдельного audit.

## 2026-08-01 — Cascade 19 Persistence Leakage implementation

- `implemented`: immutable `SignalPersistenceSettings`, exact root/display/API
  object, Leakage-aware query/cache key и provider order перед fixed bins/
  topology. Spectrum и Spectrogram остаются изолированными.
- Vanilla UI получил условную Persistence section, normalized range, per-
  Display draft/accepted state, 422 rollback и bounded 409 retry. Client DSP и
  новый route/tab не добавлены.
- Durable matrix закрывает default/validation, Leakage cache identity, A/B,
  Clear/re-add/source warm reuse, combined provider calls и exact rollback всех
  четырёх caches. E2E scenario имеет event-based waits/timing/exact cleanup.
- `verified locally`: backend 1497/1497, C19 48/48, frontend 2/2, Julia parse,
  Playwright static/support/help, docs/skills/vanilla/adapter/diff PASS; audits
  CLEAN. Product/test checkpoint `2f99ff875141a70888195c5718f437765b7ef591`.
- Runtime E2E, push, deployment и merge не выполнялись. Local Engee gate
  проходит findpeaks 16/16 и затем падает только из-за отсутствующего EngeeDSP;
  prod provider probe PASS, новый Engee defect не заявлен.

## 2026-08-01 — Cascade 19 snapshot contract hardening

- Frontend теперь отличает полностью отсутствующий legacy
  `persistence_settings` от present malformed exact object. Первый получает
  compatibility `0.5`; второй quarantined, показывает inline error, отключает
  control и не может попасть в unrelated `/api/view`.
- API malformed matrix расширена null/string/nonfinite/negative и stale-after-
  accepted cases; frontend покрывает non-object, exact keys, Bool, nonfinite и
  range corruption, A/B restoration и zero-request quarantine.
- `verified locally`: backend 1511/1511, C19 API 35/35, frontend 2/2, syntax,
  support contract, diff-check и независимый Persistence audit CLEAN.
- Hardening checkpoint `fec3dbf5634c2de337d87f453d81b5757bc66584`;
  push/deployment/merge не выполнялись.

## 2026-08-01 — Cascade 20 Persistence OverlapPercent NO-GO

- Official docs подтвердили window/Leakage/ENBW-зависимый omitted overlap;
  output equality с explicit percentage не является доказательством literal
  default.
- Prod EngeeDSP подтвердил deterministic `0/25`, topology и material
  occurrence delta, но resource guard сработал: 50% — 543–627 MiB, 75% —
  1.02–1.18 GiB, omitted — до 1.75 GiB. Поздний 0% тоже пересёк 512 MiB.
- `99/99.9` и оставшаяся interaction/order matrix безопасно не запускались;
  pod очищен, остановлен и подтверждён `stopped`.
- DEC-026 запрещает product exposure и выбирает Persistence Frequency Limits
  как fallback. Engee bug не заявлен.

## 2026-08-01 — Cascade 21 Persistence Frequency Limits capability

- Official web research подтвердил provider/UI direction и RBW/grid влияние;
  prod probe на N=64 с explicit overlap zero подтвердил exact real/complex
  endpoints, new dense grid, PWR/occurrence deltas, validation и Leakage
  independence.
- Partial external ranges provider-clips bit-exact к canonical boundary; product
  direction — reject before dispatch. Bool и matrix shape provider принимает,
  поэтому required exact flat finite non-Bool pair.
- 28 accepted observations прошли guard, максимум 382.46 MiB; cleanup и stopped
  pod подтверждены.
- DEC-027 сохраняет capability evidence, но блокирует product implementation:
  current adapter omits overlap, а fixed zero является отдельной breaking
  numerical/cache/deployment migration. Следующий cascade — fixed-segmentation
  foundation discovery, не Frequency Limits code.

## 2026-08-01 — strict frontend snapshot boundary hardening

- Spectrum snapshot теперь различает absent legacy settings и present malformed
  exact DEC-016 object. Corruption quarantined, controls disabled, contract
  error visible, desired/replay requests не получают fabricated defaults.
- Spectrogram получил тот же boundary для exact five-key settings без потери
  Auto effective limits, requested/effective scale, power metadata, drafts и
  422/409 behavior. Quarantine немедленно очищает desired/queued/pending intents.
- Tester добавил Spectrum corruption matrix и 24-case Spectrogram outer/nested
  matrix, malformed 409 replay, queued intent и successful-200 immediate purge.
- `verified locally`: frontend 2/2, syntax, Playwright support, diff-check и
  независимый repeated frontend audit CLEAN.
- Local commits: Spectrum `01f96d9f9bc83b687e92846995ab4833a8c431cc`,
  Spectrogram `0fc78161430cf41e5d2fdc301d712686a46686c4`. Push, deployment
  и merge не выполнялись.
- Time Limits затем получил тот же exact boundary с отдельным precedence:
  absent Display field может использовать legacy root, explicit `null`
  допустим только для empty Display, а nonempty/malformed значение блокирует
  controls и очередь. Frontend 2/2 и независимый audit CLEAN; local commit
  `f24e60caf0be6f31b78b0ef0178954862222448d`.

## 2026-08-01 — Cascade 22 fixed Persistence segmentation NO-GO

- Official web research отклонил MATLAB parity claim для fixed zero: fresh
  Persistence default не опубликован, а explicit-zero generated example не
  является default/resource recommendation.
- Matched real N64 probe: explicit zero 369.33 MiB/1.53 s, current omitted
  1231.86 MiB/6.14 s; F unchanged, PWR/occurrence materially different.
- Hard guard остановил complex/Leakage/repeat/order/size matrix. DEC-028 не
  принимает breaking foundation на partial evidence; DEC-027 остаётся blocked.
- Current omitted cost записан как operational resource risk. Pod cleaned/
  stopped, Engee bug не заявлен; следующий candidate — semantic-preserving
  lazy materialization.

## 2026-08-01 — Cascade 23 lazy Persistence contract

- Service trace подтвердил eager cache miss на initial GET и Display lifecycle
  независимо от active plot; four-cache aggregate этого не требует.
- DEC-029 принимает active-Persistence-only materialization. Inactive wire
  детерминированно typed empty, source metadata сохраняется, raw cache retained
  и warm-reuses при возврате.
- Provider options/math/API settings не меняются. Cold active transition должен
  подготовить prospective aggregate до state/revision/cache publication.
- Контракт уменьшает accidental startup/inactive risk, но не объявляет active
  omitted Persistence безопасным. Implementation evidence пока не заявляется.
- Реализация затем принята в `84b21f3`: C23 104/104, full backend PASS и
  repeated independent audit CLEAN после закрытия cold/rollback/N<2/lifecycle/
  exact-wire false-positive seams. Gated E2E static — `6d57949`; не deployed.

## 2026-08-01 — Cascade 24 latest Plotly render contract

- Read-only trace подтвердил общий async race единственного Plotly host: stale
  success/rejection/in-flight mutation может заменить newest graph или
  synchronous placeholder.
- DEC-030 принимает frontend-only generation-aware serialized coordinator.
  Every draw invalidates older work; stale settlement не публикует readiness/
  error и boundedly reasserts newest frame после unavoidable DOM mutation.
- API/backend/wire/Plotly artifact/math не меняются. Deterministic controlled-
  promise matrix обязательна; implementation evidence пока не заявляется.
- Coordinator и six-case controlled-promise matrix затем приняты в `102aa07`:
  frontend 2/2, syntax/diff и independent final audit CLEAN. Runtime/deployment
  не заявляются.

## 2026-08-01 — Cascade 25 measurement snapshot contract

- Backend trace подтвердил canonical unique string subset, valid empty и root
  как projection active Display, а не отдельный fallback source.
- DEC-031 разделяет absent legacy default и present corruption для
  `measurement_kinds`. Malformed snapshot quarantines Display, disables
  Statistics и очищает desired/queued/pending/replay intents.
- Backend/API/math не меняются; C24 Plotly coordination не смешивается с этим
  frontend boundary. Implementation evidence пока не заявляется.
- Boundary затем реализован в `0d7bd7e`: frontend 2/2, initial/root precedence,
  valid empty/unordered, malformed classes, 200/409 queue purge, exact body и
  A/B isolation; independent final audit CLEAN. Не deployed.

## 2026-08-01 — Cascade 26 global snapshot envelope contract

- Frontend/Tester trace подтвердил crash/fabrication risk до normalize: null
  Display, `"undefined"` IDs и silent first-Display fallback.
- DEC-032 отделяет P0-A topology от C27 selection. Signals/Displays/active ID
  валидируются глобально; corruption очищает state/host/queues и оставляет
  existing accessible Retry без replay.
- Backend/API/HTML/math не меняются; implementation evidence пока не заявляется.
- Boundary затем реализован в `f5820bd`: frontend 2/2, exact initial/200/409,
  Peaks/second-stale, fatal controls, Retry A/B и deferred Plotly settlement;
  independent final audit CLEAN. Gated E2E static — `33df821`; runtime и
  deployment не заявляются.

## 2026-08-01 — Cascade 27 selection snapshot contract

- DEC-033 разделяет selection corruption после глобальной envelope: malformed
  membership/source quarantines только конкретный Display, а unknown global row
  и противоречивые projections valid active Display переводят приложение в
  global fatal state.
- Invalid active Display проверяется раньше root projections; его projections
  игнорируются, иначе локальная quarantine ошибочно стала бы глобальной.
- Response обязан содержать canonical membership и оба равных selection alias;
  request-side legacy compatibility не меняется. Пустой inventory становится
  global fatal через обязательный known row.
- Plot payloads, settings, Measurements, Peaks и DSP/math не входят в C27.
  Implementation evidence пока не заявляется.
- Boundary затем реализован в `f334e7f`: frontend 2/2, strict classes,
  local/global precedence, 200/409 queues, topology recovery, A/B isolation и
  stale Plotly protection; independent final audit CLEAN. Backend 1582 PASS без
  product delta. Gated E2E static — `a4edbc9`; runtime/deployment не заявляются.
