# MATH-SA-001: вычисления Signal Analyser

Статус: `implemented`; unit/API `verified`; Engee target contract первой версии
`verified`; второй каскад не `deployed`  
Дата актуальности: 2026-07-31

## Символы и единицы

- `N` — число отсчётов; `f_s` — частота дискретизации, Гц.
- `x[n]` — входной сигнал, вещественный либо комплексный.
- `t[n]` — время, с; частотные оси — Гц; power scale — дБ.
- Все spectral representations вызываются как two-sided (`TwoSided=true`).

## Реализованные формулы и algorithms

1. Временная ось: `t[n] = n / f_s`, `n = 0..N-1`; длительность
   `T = (N-1)/f_s`. Для complex signal на Time используется `|x[n]|`, для real
   — `Re(x[n])`. Code anchors:
   `lib/domain/signal_analyser_state.jl::signal_time_values`,
   `::signal_duration_s`;
   `lib/services/signal_analyser_math.jl::signal_analyser_time_plot`.
2. Spectrum вызывает `EngeeDSP.Functions.pspectrum` с representation `power`,
   `FrequencyResolution = 8 f_s/N`, `TwoSided=true`. Returned power переводится
   как `P_dB = 10 log10(max(|P|, eps(Float64)))`. Code anchor:
   `signal_analyser_spectrum_plot`, `signal_analyser_power_db`.
3. Spectrogram вызывает representation `spectrogram`, `TwoSided=true`,
   ориентирует matrix как frequency × time и применяет ту же шкалу
   `10 log10(max(|P|, eps))`. Code anchors:
   `signal_analyser_spectrogram_plot`, `signal_analyser_oriented_matrix`,
   `signal_analyser_power_db_matrix`.
4. Persistence вызывает representation `persistence`, `TwoSided=true`.
   Power-level axis переводится в дБ по той же формуле; occurrence обязана быть
   конечной в диапазоне 0–100 % с tolerance `1e-9`, затем clamp в `[0,100]`.
   Code anchor: `signal_analyser_persistence_plot`.
5. Линии прореживаются равномерно до 1024 точек; heatmap — до 160×160, включая
   края через rounded indices. Code anchors:
   `signal_analyser_bounded_indices`, `signal_analyser_bounded_line`,
   `signal_analyser_bounded_heatmap`.

## Defaults

Встроенный каталог: `f_s=2048 Гц`, `N=512`; harmonic
`0.82 sin(2π·180t) + 0.28 sin(2π·420t + 0.35)`; complex chirp
`exp(j2π(90t + 0.5·1100t²)) + 0.22 exp(j2π·510t)`. Code anchor:
`lib/domain/signal_analyser_state.jl::default_signal_catalog`.

## Numeric constraints и edge cases

Пустые и non-finite axes/power отвергаются. Несовместимая orientation вызывает
`DimensionMismatch`. Complex time data визуализируется по magnitude. Продукт не
объявляет one-sided mode и не выполняет собственную FFT/PSD нормализацию:
spectral estimate делегирован EngeeDSP.

## Verification evidence

- `test/back/lib/signal_analyser_service_test.jl`: orientation, dB conversion,
  finite values, persistence range, plots и multi-trace payload.
- `test/engee/engee_package_contract_tests.jl`: реальный contract
  `power`/`spectrogram`/`persistence`, two-sided axes и matrix shapes; локально
  2026-07-31 test не запущен успешно из-за отсутствия discoverable EngeeDSP.
- Первая prod-версия: EngeeDSP evidence и E2E 6/6, SHA `0606d47`.

## Источники и наблюдаемые различия

- MathWorks Signal Analyzer:
  https://www.mathworks.com/help/signal/ref/signalanalyzer-app.html
- MathWorks `pspectrum`:
  https://www.mathworks.com/help/signal/ref/pspectrum.html
- Engee runtime function: `EngeeDSP.Functions.pspectrum`, required Engee
  platform package version `0.72.0`, UUID
  `f9bbbd0e-0dd6-4072-898a-88f8f1250a99`, module path
  `/usr/local/ijulia-core/packages/EngeeDSP/XobDm/src/EngeeDSP.jl`.

MATLAB bounded cycle подтвердил три Time traces, но multi-signal
Time-Frequency/Persistence оказался disabled. Это UI reference delta, а не
изменение реализованной математики. Формулы MATLAB, не присутствующие в коде,
здесь не приводятся.

## Ограничения

EngeeDSP не объявлен в app `Project.toml` и не discoverable в clean local
project. Prod contract намеренно использует Engee platform LOAD_PATH/global
environment version `0.72.0`; registry General не содержит UUID, а package
source задаётся internal `[sources]`. Local unit использует mock, real contract
на target обязателен. Это [dependency/portability limitation](../../engee_bugs/ENGEE-20260731-001-engeedsp-project-discovery.md),
не подтверждённый дефект Engee.
