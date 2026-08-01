# SPEC-SA-UI-001: видимость, выбор и графики сигналов

Статус: `implemented`, локально `verified`, текущие каскады не `deployed`
Дата актуальности: 2026-08-01

## Интерфейс

- Таблица содержит русские checkbox управления membership активного Display.
- Click по строке всегда меняет global row selection; если строка входит в
  активный Display, она также становится analysis source. Click по checkbox не
  запускает выбор строки.
- Membership активного Display может быть пустым. Clear Display не удаляет
  global inventory, row selection или состояние неактивных страниц.
- Time и Spectrum отображают отдельный цветной trace каждого видимого сигнала
  и легенду.
- Spectrogram и Persistence относятся к page-local analysis source.
- Можно добавлять, выбирать и закрывать Display pages; на активной странице
  расположен один график. MATLAB docking/multi-layout пока не переносится.
- Тип графика, nullable analysis source и checkbox membership принадлежат
  активной Display page и восстанавливаются при возврате на неё. Row selection
  глобален и от страницы не зависит.
- После готовности Plotly не виден текст `Подготовка графика…`.
- Plotly `3.1.0` загружается только из vendored cartesian dist; runtime CDN
  fallback запрещён. При local failure показывается стабильное error state.
  Эта поставка `implemented`, но пока не проверена runtime E2E и не deployed.
- `Find peaks` доступен только для Time и переключает per-Display capability.
  При успехе открывается локальная вкладка Peaks с backend-provided table и
  marker trace. Переход на другой тип графика выключает Peaks; thresholds,
  sorting, settings и Label Peaks в текущий срез не входят.
- `Normalize Y axis` и `Show markers` — локальные per-Display presentation
  controls только для непустого Time. Они не вызывают API и не меняют revision;
  preference восстанавливается при возврате на страницу. Каждый обычный trace
  нормализуется отдельно, а markers показывают bounded sample points.
- Непустой Display хранит authoritative Time Limits в секундах. Поля Min/Max
  коммитятся через `/api/view`, задают `Plotly.xaxis.range`, а Statistics и
  Peaks пересчитываются по тому же inclusive raw ROI. Пустой Display имеет
  `time_limits=null`; invalid edit показывает inline 422 и восстанавливает
  последнее authoritative значение.
- Вкладки настроек Display/Time/Measurements являются функциональной локальной
  навигацией. Measurements содержит checkbox в каноническом порядке Minimum,
  Maximum, Mean, Median, Peak to peak, RMS. Выбор принадлежит Display,
  восстанавливается при смене страниц и допускает отключение всех строк.
  `Signal statistics` одновременно открывает Measurements settings и нижнюю
  панель результатов. На пустом Display controls disabled без потери checked
  preference; на непустом non-Time Display они доступны, потому что
  authoritative Time ROI сохраняется. Frontend не вычисляет показатели.
- Внутри вкладки Display для непустого Spectrum находится отдельная секция
  Spectrum, не создающая четвёртую вкладку. Каждый Display независимо хранит
  Scale (`dB`/`Linear`), Frequency scale (`Linear`/`Log`) и Leakage `[0,1]`;
  defaults равны `dB`, `Linear`, `0.5`. Изменение отправляется только по
  `change`, целиком и через существующую revision queue. Log недоступен, пока
  в membership есть комплексный сигнал. Normalize Y остаётся локальным
  presentation control и не меняет Spectrum payload/revision.
- Внутри той же Display tab для Spectrogram показываются `Overlap (%)`,
  normalized `Leakage`, пара `F min`/`F max` в фиксированных Hz и Frequency
  Scale (`Linear`/`Log`) с read-only effective state. Overlap принадлежит
  Display, default 50, product range 0..75; Leakage
  независима от Spectrum Leakage, default 0.5, range 0..1. Auto-границы
  показывают backend-effective topology. Frequency draft коммитится атомарно
  только по Enter либо после выхода фокуса из всей пары; переход между полями
  запроса не создаёт. Очистка обоих полей возвращает Auto.
  Frequency Scale default равен Linear; requested Log сохраняется при пустом
  или complex source, но control disabled, а effective равен соответственно
  пустому значению или Linear. Empty/non-Spectrogram скрывает секцию без потери
  preferences. Frontend не
  рассчитывает hop, segment count, Kaiser window, RBW или matrix.
- Overflow menu активного Display содержит доступное действие Clear Display.
  Пустая страница показывает явные empty states графика, Measurements и Peaks;
  тот же graph host сохраняется, а stale Plotly traces очищаются.

## Revision-safe API

`POST /api/view` принимает целый `state_revision` и атомарное полное ordered
множество `visible_signals`, включая `[]`; дополнительно допустимы
`row_selected_signal`, nullable `analysis_signal`, legacy nullable
`selected_signal` и `active_plot`. Canonical row/analysis fields независимы;
одновременные analysis/legacy aliases обязаны совпадать. У непустого Display
analysis source входит в membership; после его удаления backend выбирает
первый remaining member в каноническом порядке. Первый re-add в пустой Display
становится source. Additive object `time_limits={min_s,max_s,units:"s"}`
управляет page-local ROI, а boolean `peaks_enabled` — time-domain Peaks; Clear
передаёт null и всегда выключает Peaks. При смене source прежний range
сохраняется, если допустим для нового сигнала, иначе сбрасывается на полный.
Новый endpoint не создаётся. Stale revision, validation или provider failure
не меняют state.

Additive `measurement_kinds` — полный массив выбранных wire ID из
`minimum`, `maximum`, `mean`, `median`, `peak_to_peak`, `rms`. Отсутствующее
поле сохраняет выбор активной страницы; входной порядок канонизируется. Новый
Display получает первые три ID, а пустой массив допустим. Не-массив, нестроковый
элемент, неизвестный или повторяющийся ID возвращает field-level 422 и не
меняет state/cache/revision. Фактически изменившийся набор даёт ровно одну
revision, равный набор является no-op. Clear Display сохраняет preference,
первый re-add пересчитывает сохранённый набор, неактивные страницы не меняются.

Additive `spectrum_settings` — строгий полный объект
`{scale:"db|linear",frequency_scale:"linear|log",leakage:number,frequency_limits}`.
`frequency_limits` равен `null` для Auto либо точному объекту
`{min_hz:number,max_hz:number,units:"Hz"}`. Отсутствие всего объекта сохраняет
preference; missing/extra keys, неверные enum/type, Bool/non-finite,
неупорядоченные границы, иные units, Leakage вне `[0,1]` или явный диапазон вне
topology analysis source дают field-level 422 без частичной mutation.
Фактическое изменение даёт одну revision, равное значение является no-op.
Clear сохраняет настройки, новый Display получает Auto defaults, а страницы
A/B независимы. При смене analysis source допустимый explicit interval
сохраняется, недопустимый сбрасывается только в Auto в той же atomic mutation.
Запрос Log и добавление комплексного member в уже Log-настроенный Display
отвергаются атомарно.

Additive `spectrogram_settings` — строгий полный объект
`{overlap_percent:number,leakage:number,frequency_limits:null|object,frequency_scale:"linear|log"}`.
Overlap/Leakage обязаны быть конечными JSON Number, но не Bool; диапазоны
`[0,75]` и `[0,1]`, defaults нового Display `50` и `0.5`. Frequency Limits
равны Auto `null` либо exact `{min_hz,max_hz,units:"Hz"}` с конечными non-Bool
границами, `min_hz < max_hz` и всем interval внутри topology analysis source:
real `[0,Fs/2]`, complex `[-Fs/2,Fs/2]`. Signed zero канонизируется.
`frequency_scale` — lowercase requested enum с default `linear`. Missing/extra
key, неверный type/units/enum, non-finite, диапазон или внешний
interval дают field-level 422 без mutation/cache publication. Equal canonical
input — cold no-op, изменение — одна revision, stale — 409 с максимум одним
replay. A/B независимы, Clear сохраняет preference и не вызывает provider,
первый re-add пересчитывает Spectrogram. Source change сохраняет только
полностью допустимый explicit interval, иначе атомарно возвращает Auto;
requested scale сохраняется всегда. Для отсутствующего source scale metadata
равна `{requested,effective:null,available:[]}`, для real —
`{requested,effective:requested,available:["linear","log"]}`, для complex —
`{requested,effective:"linear",available:["linear"]}`.

Snapshot добавляет non-null `row_selected_signal`, nullable root
`analysis_signal` и `displays[].analysis_signal`; root/display
`selected_signal` остаётся совместимым alias. Пустой Display возвращает пустые
typed plots/panel и Measurements/Peaks с прежними keys/units, null source и
`items=[]`, не вызывая `pspectrum`/`findpeaks`.

Authoritative snapshot всегда содержит `peaks` с полями `enabled`,
`state_revision`, `display_id`, `signal_name`, `ordinate`, `units`, `items`.
Disabled state имеет пустой `items` и не загружает EngeeDSP. Peak item содержит
stable `id`, zero-based `sample_index`, `time_s`, `value`, `width_samples` и
`prominence`.

Root и каждый Display snapshot содержат `time_limits`. Measurements используют
все raw samples с `min_s <= k/f_s <= max_s` до plot bounding и сохраняют
абсолютные zero-based позиции. Enabled Peaks для ROI из 1–2 отсчётов возвращает
typed empty result без вызова provider; для более длинного ROI provider получает
точный subset и absolute starting offset.

Root и каждый Display snapshot также содержат ordered `measurement_kinds`.
Форма `measurements` и её item keyset не меняются, но `items` содержит только
выбранные показатели в каноническом порядке. Позиция заполнена только у Minimum
и Maximum; Mean, Median, Peak-to-Peak и RMS имеют null sample/time. Пустой выбор
на непустой странице сохраняет signal/ordinate/units и возвращает `items=[]`,
не материализуя ROI. Пустой Display сохраняет null signal/ordinate и не теряет
сам preference.

Root и каждый Display snapshot содержат canonical `spectrum_settings`.
Spectrum вычисляется заново по inclusive raw Time ROI каждого видимого сигнала:
короткий сигнал пересекается со своим временным доменом без padding/resampling.
Ноль пересекающихся отсчётов даёт пустой trace, один — typed empty без provider,
два и более передаются EngeeDSP. Вещественный результат one-sided
`0..Nyquist`, комплексный — centered two-sided. Frequency scale меняет только
Plotly `xaxis.type`, raw frequency/power arrays остаются backend-owned.
`plots.spectrum.frequency_limits` содержит `mode`, сохранённый `requested` и
фактический `effective` interval. В Auto effective берётся только из provider
output analysis source. Explicit interval входит в typed query/cache и
передаётся EngeeDSP как `FrequencyLimits`; secondary signal получает
пересечение с собственным topology domain, а отсутствие пересечения даёт typed
empty без provider. Frontend не выводит Nyquist и не обрезает arrays.

В существующей Display-вкладке Spectrum есть поля `F min`/`F max`. Auto
показывает backend effective Hz values; валидный commit создаёт explicit intent.
Очистка обоих полей возвращает Auto, одно пустое/нечисловое/неупорядоченное поле
даёт локальную ошибку и восстанавливает canonical values без запроса. Внешний
422 также откатывает exact canonical state. Отдельный Log-floor control не
существует: вещественный Min `0` сохраняется, а положительный предел выбирает
Plotly renderer без изменения state.

Root и каждый Display snapshot содержат canonical `spectrogram_settings`.
Spectrogram использует только analysis source, полный raw signal и exact
Leakage/overlap/requested Frequency Limits в typed query/cache. EngeeDSP
получает `Leakage`, `OverlapPercent`, explicit `TwoSided`, затем только для
explicit режима `FrequencyLimits`: real one-sided, complex centered two-sided.
Auto и explicit полный domain имеют разные cache identities, поскольку их
provider outputs не считаются bitwise эквивалентными. Raw power и axes
backend-owned; wire применяет exact `10log10(P)` и только presentation bounding
160×160. Source change сохраняет overlap, но меняет cache identity. `N<2` и
empty Display возвращают typed empty без provider.

Requested Frequency Scale принадлежит Display и публикуется через
`plots.spectrogram.frequency_scale`, но не входит в query/cache/provider и не
меняет backend `x/y/z`. Scale-only mutation на холодном cache возвращает
typed-empty wire с metadata и не прогревает Spectrum/Spectrogram; следующий GET
может материализовать данные. Frontend выбирает Plotly `yaxis.type` только по
effective metadata. Для Log он клонирует presentation `y` и заменяет finite
nonpositive coordinate ровно на половину минимального положительного bin, не
меняя authoritative `y`, `z`, порядок или число строк. Пустая ось остаётся
обычным empty state; непустая ось без положительной частоты даёт стабильную
ошибку `spectrogram-log-frequency-error-state`.

`plots.spectrogram.frequency_limits` всегда содержит `mode`, `requested` и
`effective`. Для Auto effective равен полному authoritative topology, для
explicit — requested interval; metadata сохраняется и для typed-empty `N<2`.
Explicit provider axis обязана иметь минимум две строго возрастающие точки,
лежать внутри interval и сохранять обе границы с tolerance
`sqrt(eps(Float64))*max(Fs,1)`. Post-hoc crop, собственная FFT/STFT и fallback
запрещены. Spectrum Frequency Limits полностью независимы.

Spectrogram-settings-only mutation не материализует missing Spectrum cache.
Canonical no-op не вызывает missing Spectrum/Spectrogram provider: response
сохраняет wire keys с typed-empty representation и переиспользует cached data.
Следующий обычный GET материализует missing data. Другие semantic changes
(membership/source/time/Spectrum/active plot) сохраняют полную atomic
preparation.

## Наблюдения MATLAB Signal Analyzer

Факты bounded cycle 2026-07-31:

- созданы `sa_fs`, `sa_t`, `sa_multitone`, `sa_complex_chirp`, `sa_noisy_tone`
  и три соответствующих `*_tt`;
- Time display фактически показал три сигнала;
- selection, membership текущего display и active display являются
  независимыми состояниями;
- checkbox membership и measurement context восстанавливаются при возврате к
  display, а графики неактивного display сохраняются;
- выбранная строка может относиться к сигналу, который не включён checkbox в
  активном display;
- multi-signal Time-Frequency и Persistence disabled;
- повторный import переменной с тем же именем запрашивает overwrite.

Сохранённый внутренний сценарий SA-UI-003 содержит точные docs sources,
фактические defaults/transitions и screenshot inventory. Ранние команды первого
цикла подтверждены итоговым состоянием, а новый Cycle 5 уже содержит полный
focus → pre-input Enter → English/ASCII → type → visual verify → execution
Enter guard для созданных `sa5_*` переменных. На детерминированном 15-sample
сигнале Signal Statistics по умолчанию показал Minimum, Maximum и Mean:
minimum `-2` в `12 s`, maximum `3` в `5 s`, расчётный oracle mean равен `1/3`.
Попытки включить Median и открыть Peaks settings не дали надёжно подтверждённой
смены состояния и потому не считаются наблюдаемым контрактом.

SA-UI-008 подтвердил page-local Time Limits, inclusive пересчёт Statistics и
last-valid rollback. SA-UI-009 подтвердил raw Statistics при нормализованном
графике, 0..1 rendering с небольшим axis padding, markers на каждом sample и
Time-only доступность controls. В MATLAB R2024b Show Markers проявился как
cross-display state; продукт сохраняет ранее принятое per-Display поведение как
явное portable product decision.

SA-UI-010 подтвердил точный порядок шести показателей, defaults из первых трёх,
page-local выбор и независимые defaults пустой новой страницы. Это наблюдение
зафиксировало portable contract выбора. Алгоритмы Median, Peak-to-Peak и RMS
приняты по официальной документации и проверяемой реализации, а не выводятся
frontend из отображаемой таблицы.

SA-GRAPH-001 подтвердил для Spectrum единицы Hz, вещественную ось `0..0.5` при
`Fs=1`, включённый dB, среднее положение Leakage и пересчёт от Time ROI;
Normalize не менял спектральный результат. SA-GRAPH-002 показал, что Log
сохраняет введённый минимум `0`, а renderer применяет собственный положительный
предел без изменения сохранённых полей. SA-GRAPH-003 подтвердил переключение
dB/Linear: peak около `-3.0103 dB` соответствует linear power `0.5`. Page-local
ownership Spectrum settings остаётся переносимым product decision, а не
неподтверждённым MATLAB claim.

SA-GRAPH-004 сохранён как partial scenario: реальный zero-bound Log повторно
подтверждён, но создание complex source не завершилось из-за усечения ввода и
AppleScript activation timeout. Поэтому centered complex limits и точное
состояние Log control не объявляются MATLAB-наблюдением; product продолжает
документированное complex/Log ограничение как явный portable contract.

## Code anchors и проверки

- `lib/services/signal_analyser_service.jl`:
  `signal_analyser_validate_visible_signals!`,
  `validate_signal_analyser_view_payload`, `apply_signal_analyser_view!`,
  `apply_signal_analyser_display!`, `signal_analyser_multi_trace_payload`,
  `signal_measurements_snapshot` и `signal_measurements_payload`.
- `lib/domain/signal_analyser_state.jl`: typed Peaks query/provider result/item,
  snapshot, per-Display invariant и injectable provider collaborator.
- `lib/services/signal_analyser_service.jl`: lazy EngeeDSP adapter, zero-based
  mapping, Peaks payload и atomic view/display preparation.
- `lib/domain/signal_analyser_state.jl`: `SignalAnalyserDisplayState` и typed
  `GlobalSignalSelection`, `SignalDisplayMembership`, explicit analysis source
  и nullable `SignalMeasurementsSnapshot`/`SignalPeaksSnapshot` invariants.
- `lib/domain/signal_analyser_state.jl`: typed
  `SignalMeasurementSelection` и расширенный measurement-kind contract.
- `lib/services/signal_analyser_service.jl`: strict selection validation,
  canonical ordering и selected-only raw ROI statistics.
- `lib/domain/signal_analyser_state.jl`: `SignalSpectrumSettings`,
  `SignalTimeSampleRange`, `SignalSpectrumQuery`, `SignalSpectrumData`, typed
  provider/service и cache key.
- `lib/services/signal_analyser_service.jl`: strict Spectrum validation,
  per-signal ROI intersection, EngeeDSP provider preparation и atomic cache
  publication; `lib/services/signal_analyser_math.jl` — presentation scale.
- `lib/domain/signal_analyser_state.jl`: `SignalSpectrogramSettings`, typed
  Spectrogram query/data/provider/service и cache key.
- `lib/services/signal_analyser_service.jl`: strict Overlap validation,
  Leakage/Overlap validation, semantic preparation plan, canonical Engee
  options и atomic raw-cache publication.
- `public/js/app.js`: Display queue/revision mutation, local bottom tabs,
  measurement rows, functional settings tabs, statistics checkbox mutation,
  Time presentation/limits controls и Plotly rendering.
- `public/js/vendor/plotly-cartesian-3.1.0.min.js`: vendored official npm
  artifact; SHA-256 `c462b40a1a542e16c3533f97d39fbbb91af4f5267f3cbf23bd70d785efc44c38`.
- `test/back/lib/signal_analyser_service_test.jl` и
  `test/back/app/signal_analyser_api_test.jl`: unit/API contract.
- `test/front/public/js/app.behavior.test.js`: Display-local state,
  measurements, local-only Plotly и failure state; front gate 2/2 PASS.
- `test/playwright/specs/signal_analyser/display_pages.test.js`,
  `measurements_statistics.test.js`, `plotly_local_delivery.test.js`: syntax и
  support PASS; `peaks_p0.test.js` добавляет revision/scope/table/marker
  contract; `clear_display.test.js` добавляет Clear/re-add/state-separation
  contract; `time_presentation.test.js` добавляет Normalize/Show Markers.
  `time_limits.test.js` добавляет ROI, 422 rollback, page lifecycle и absolute
  Peaks coordinates; `selectable_statistics.test.js` добавляет page-local
  selection, Clear/re-add, ROI и cleanup contract;
  `spectrum_settings_roi.test.js` добавляет defaults, exact mutations,
  one-sided axis, complex-safe Log, A/B, Clear/re-add и полный cleanup;
  `frequency_limits.test.js` добавляет Auto/effective, exact request/revision,
  invalid/422/409, A/B/Clear/re-add, zero-bound Log и Auto cleanup;
  `typed_spectrogram.test.js` фиксирует typed heatmap topology, а
  `spectrogram_overlap.test.js` — default/boundaries/no-op/422/409,
  A/B/Clear/re-add/source и один host/три tabs;
  `spectrogram_leakage.test.js` добавляет normalized endpoints, invariant grids,
  Spectrum independence, bounded retry, A/B/Clear/re-add/source и cleanup.
  Runtime требует authenticated target.

Связано с [DEC-20260731-009](../decisions/DEC-20260731-009-display-pages.md),
[DEC-20260731-010](../decisions/DEC-20260731-010-local-only-plotly.md) и
[DEC-20260731-011](../decisions/DEC-20260731-011-lazy-engeedsp-peaks.md),
[DEC-20260731-012](../decisions/DEC-20260731-012-display-selection-separation.md),
[DEC-20260731-013](../decisions/DEC-20260731-013-authoritative-time-roi.md),
[DEC-20260731-014](../decisions/DEC-20260731-014-selectable-statistics.md),
[DEC-20260801-015](../decisions/DEC-20260801-015-spectrum-roi-default-settings.md),
[DEC-20260801-016](../decisions/DEC-20260801-016-frequency-limits.md),
[DEC-20260801-017](../decisions/DEC-20260801-017-typed-spectrogram-foundation.md),
[DEC-20260801-018](../decisions/DEC-20260801-018-spectrogram-overlap-percent.md),
[DEC-20260801-019](../decisions/DEC-20260801-019-spectrogram-leakage.md) и
[traceability](../traceability/signal-analyser-cascades.md).
