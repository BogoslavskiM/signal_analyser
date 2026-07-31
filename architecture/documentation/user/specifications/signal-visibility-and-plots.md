# SPEC-SA-UI-001: видимость, выбор и графики сигналов

Статус: `implemented`, локально `verified`, второй каскад не `deployed`  
Дата актуальности: 2026-07-31

## Интерфейс

- Таблица содержит русские checkbox управления видимостью.
- Click по строке выбирает сигнал; click по checkbox не запускает выбор строки.
- Видимым остаётся минимум один сигнал.
- Time и Spectrum отображают отдельный цветной trace каждого видимого сигнала
  и легенду.
- Spectrogram и Persistence относятся к выбранному видимому сигналу.
- Сетка всегда 2×2; MATLAB docking/multi-layout не переносится.
- После готовности Plotly не виден текст `Подготовка графика…`.
- Plotly `3.1.0` загружается local-first из vendored cartesian dist; CDN
  используется только как fallback. Эта поставка `implemented`, но пока не
  `verified` Tester и не `deployed`.

## Revision-safe API

`POST /api/view` принимает целый `state_revision` и атомарное полное множество
`visible_signals`; дополнительно допустимы `selected_signal` и `active_plot`.
Массив видимости непустой, состоит из уникальных известных строк. При попытке
скрыть selected backend детерминированно выбирает первый видимый сигнал в
каноническом порядке таблицы. Stale revision не меняет state.

## Наблюдения MATLAB Signal Analyzer

Факты bounded cycle 2026-07-31:

- созданы `sa_fs`, `sa_t`, `sa_multitone`, `sa_complex_chirp`, `sa_noisy_tone`
  и три соответствующих `*_tt`;
- Time display фактически показал три сигнала;
- selection, membership текущего display и active display являются
  независимыми состояниями;
- multi-signal Time-Frequency и Persistence disabled;
- повторный import переменной с тем же именем запрашивает overwrite.

Неопределённости: точные evidence paths доступны во внутреннем research
handoff, но не были переданы в текст этого документа; ранние команды создания
подтверждены итоговым состоянием, а полный screenshot каждого per-command
guard отсутствует. Полный guard evidence имеется только для финальной команды.

## Code anchors и проверки

- `lib/services/signal_analyser_service.jl`:
  `signal_analyser_validate_visible_signals!`,
  `validate_signal_analyser_view_payload`, `apply_signal_analyser_view!`,
  `signal_analyser_multi_trace_payload`.
- `public/js/app.js`: queue/revision mutation и Plotly rendering.
- `public/js/vendor/plotly-cartesian-3.1.0.min.js`: vendored official npm
  artifact; SHA-256 `c462b40a1a542e16c3533f97d39fbbb91af4f5267f3cbf23bd70d785efc44c38`.
- `test/back/lib/signal_analyser_service_test.jl` и
  `test/back/app/signal_analyser_api_test.jl`: unit/API contract.
- `test/front/public/js/app.behavior.test.js`: multi-trace и placeholder ready.
- `test/playwright/specs/signal_analyser/visibility_cascade.test.js`: runtime
  E2E подготовлен, но ещё не выполнен на target второго каскада.

Связано с [DEC-20260731-003](../decisions/DEC-20260731-003-fixed-grid-visibility.md),
[DEC-20260731-006](../decisions/DEC-20260731-006-local-first-plotly.md) и
[traceability](../traceability/signal-analyser-cascades.md).
