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
