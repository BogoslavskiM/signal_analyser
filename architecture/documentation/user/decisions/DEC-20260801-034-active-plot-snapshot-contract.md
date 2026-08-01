# DEC-20260801-034: строгий snapshot `active_plot`

ID: `DEC-20260801-034`
Дата: `2026-08-01`
Статус: accepted
Supersedes: none
Extends: [DEC-009 Display pages](DEC-20260731-009-display-pages.md),
[DEC-030 latest plot render wins](DEC-20260801-030-latest-plot-render-wins.md),
[DEC-032 global snapshot envelope](DEC-20260801-032-global-snapshot-envelope.md),
[DEC-033 display selection snapshot](DEC-20260801-033-display-selection-snapshot-contract.md)
Implementation: planned in Cascade 28; not deployed

## Контекст

Каждая Display хранит собственный тип единственного графика, а root snapshot
повторяет тип active Display. Backend выражает значение закрытым enum и всегда
публикует одну из строк `time`, `spectrum`, `spectrogram`, `persistence` в обоих
местах.

Frontend до этой границы permissive подменяет missing, неверный type и
неизвестный per-Display `active_plot` значением `time`. Такая подмена может
показать график и затем сформировать полный `/api/view` body с типом, которого
backend не публиковал. Root `active_plot` при этом не проверяется на совпадение
с active Display.

## Альтернативы

- Сохранять fallback `time`: отклонено как fabricated server state.
- Считать любую ошибку типа графика глобальной: отклонено, потому что
  повреждение неактивной Display можно изолировать по уже проверенному ID.
- Строго проверять каждую Display и отдельно проверять root-проекцию valid
  active Display: принято.

## Решение

Проверка выполняется после envelope DEC-032 и до `normalize()`.

### `active_plot` каждой Display

Каждая Display обязана иметь собственное поле `active_plot`. Значение обязано
быть primitive string, точно равной одной из:

- `time`;
- `spectrum`;
- `spectrogram`;
- `persistence`.

Missing, `null`, пустая или нестроковая величина, иной регистр, внешние пробелы
и неизвестная строка являются contract corruption. Frontend не приводит
регистр, не обрезает пробелы и не подставляет `time`, root или ранее принятый
тип.

Нарушение quarantines только соответствующую Display. Сохраняются проверенные
page topology, global inventory/row и valid другие страницы, но для повреждённой
страницы не материализуются graph, panel fields, Measurements или Peaks и не
строится View body. Active quarantined Display показывает стабильную доступную
local contract error; её `/api/view` controls отключены либо гарантируют zero
POST. Операции topology `select/create/close` могут оставаться доступными:
они используют проверенные DEC-032 IDs и каждый ответ проверяется заново.

Desired/queued/pending/stale-replay View intents очищаются только для
quarantined Display. Независимые intents valid Displays сохраняются. При входе
в active quarantine frontend увеличивает generation единственного Plotly host,
очищает его и не позволяет позднему settlement прежнего `Plotly.react()`
заменить local error либо readiness.

### Root projection и precedence

Если собственный `active_plot` active Display valid, root snapshot обязан иметь
собственный primitive-string `active_plot` из того же закрытого множества и
точно совпадать со значением active Display. Missing, неверный type, unknown или
даже другое известное значение означает противоречивый global snapshot и
использует полный fatal reset/Retry из DEC-032.

Сначала проверяется per-Display значение. Если `active_plot` active Display
malformed, root `active_plot` не проверяется и не используется: страница
остаётся local quarantined. Это field-specific precedence; независимые проверки
selection из DEC-033 продолжают действовать по собственным правилам.

Строгость response не меняет request compatibility. `/api/view` по-прежнему
может не содержать `active_plot`, что означает сохранение текущего server state;
эта request-side optionality не разрешает отсутствие поля в snapshot.

## Lifecycle

- Malformed initial Display сохраняет topology/inventory/valid row и quarantines
  только её; invalid inactive A не влияет на valid active B.
- Malformed initial root при valid active Display использует global fatal reset
  DEC-032 и допускает только Retry GET.
- Malformed successful `200` очищает View intents только затронутой Display,
  не replay её и позволяет очереди valid другой Display продолжиться с принятой
  revision. Root corruption вместо этого очищает всё глобально.
- Malformed `409 current` никогда не stale-replay quarantined target; valid
  независимая работа может продолжиться. Root corruption остаётся global
  fatal/no replay.
- Следующий authoritative valid snapshot снимает только соответствующий local
  quarantine без resurrection старых intents. Global fatal восстанавливается
  только новым Retry GET.

## Вне scope

C28 не валидирует `panel.active_plot`, `panel.title`, panel fields, keyset/type
объектов `plots`, `plot_payload`, traces, heatmap x/y/z, selection metadata
payload, Time/Spectrum/Spectrogram/Persistence settings, Measurements, Peaks,
DSP или математику. `state_revision` сохраняет существующий mutation-контракт,
но не становится частью C28 validation.

## Проверка

Initial/200/409/recovery matrix включает все четыре valid значения; missing,
`null`, empty, non-string, wrong-case, padded и unknown per-Display значения;
тот же malformed root matrix и mismatch другим известным значением; invalid
active precedence; active/inactive A-B isolation; стабильную local error и zero
View POST; exact per-ID queue purge; global fatal/no replay; valid recovery без
resurrection. Управляемый deferred Plotly case доказывает, что поздний старый
settlement не меняет local quarantine host и не запускает unbounded reassertion.

## Связи и evidence

- [DEC-009 Display pages](DEC-20260731-009-display-pages.md)
- [DEC-030 latest plot render wins](DEC-20260801-030-latest-plot-render-wins.md)
- [DEC-032 global snapshot envelope](DEC-20260801-032-global-snapshot-envelope.md)
- [DEC-033 display selection snapshot](DEC-20260801-033-display-selection-snapshot-contract.md)
- [Boundary assessment](../../agents/reports/active-plot-snapshot-assessment-20260801.md)
- `lib/domain/signal_analyser_state.jl`
- `lib/services/signal_analyser_service.jl`
- `public/js/app.js`

## Примечание о реализации — 2026-08-01

Исходная запись `Implementation: planned in Cascade 28; not deployed` выше
сохраняется как состояние решения на момент его принятия. После отдельного
контрактного checkpoint граница реализована и локально проверена в
`08af1e73b2852063a76cc9900ca39b17036bc54b`.

Frontend теперь проверяет per-Display и root `active_plot` до `normalize()`, не
подставляет `time`, хранит отдельную local contract error по Display ID и
использует существующий global fatal reset для противоречивой root-проекции.
Матрица Frontend/Tester покрывает все четыре значения enum, malformed initial,
успешный `200`, `409 current`, A/B isolation, точную очистку View intents,
topology recovery и позднее завершение Plotly; frontend suite прошёл `2/2`, а
два независимых аудита дали `CLEAN`.

Отключённый по умолчанию browser contract сохранён отдельно в
`a09141049e3b4df7ddad3e57b427f6d1d65c2872`: syntax, support, feature gate,
значение default-false и shell syntax проверены, независимый аудит — `CLEAN`.
Runtime E2E не выполнялся и не заявляется.

Backend не менялся: полный suite и отдельные route-reachable GET/`200`/`409`
пробы всех четырёх enum прошли. Обычный локальный state route без тестовой
изоляции возвращает `500` из-за уже известного отсутствующего prerequisite
EngeeDSP; это не новый дефект Engee и не свидетельство C28 regression. Push,
deployment и merge не выполнялись.
