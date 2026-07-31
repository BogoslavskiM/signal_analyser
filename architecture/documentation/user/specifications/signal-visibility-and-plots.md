# SPEC-SA-UI-001: видимость, выбор и графики сигналов

Статус: `implemented`, локально `verified`, текущие каскады не `deployed`
Дата актуальности: 2026-07-31

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
- `public/js/app.js`: Display queue/revision mutation, local bottom tabs,
  measurement rows, Time presentation/limits controls и Plotly rendering.
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
  Peaks coordinates.
  Runtime требует authenticated target.

Связано с [DEC-20260731-009](../decisions/DEC-20260731-009-display-pages.md),
[DEC-20260731-010](../decisions/DEC-20260731-010-local-only-plotly.md) и
[DEC-20260731-011](../decisions/DEC-20260731-011-lazy-engeedsp-peaks.md),
[DEC-20260731-012](../decisions/DEC-20260731-012-display-selection-separation.md),
[DEC-20260731-013](../decisions/DEC-20260731-013-authoritative-time-roi.md) и
[traceability](../traceability/signal-analyser-cascades.md).
