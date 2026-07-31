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
