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
6. Raw statistics вычисляются до любого plot-прореживания. Для вещественного
   сигнала `y[k]=Re(x[k])`, для комплексного `y[k]=|x[k]|`. Минимум и максимум
   используют первый индекс совпадения; API index нулевой, `t_k=k/f_s`.
   Среднее `mean(y)=N⁻¹Σy[k]` не имеет sample/time position. Единицы значения
   безразмерные (`1`), времени — секунды. Typed invariants находятся в
   `SignalMeasurementPosition`, `SignalMeasurementItem` и
   `SignalMeasurementsSnapshot`; расчёт — `signal_measurements_snapshot`,
   API mapping — `signal_measurements_payload`.
7. Peaks P0 использует тот же полный raw ordinate и делегирует поиск
   `EngeeDSP.Functions.findpeaks(y; out=:data)`. Package result
   `(Ypk,Xpk,Wpk,Ppk)` переводится в product item:
   `sample_index=Xpk-1`, `time_s=sample_index/f_s`, `value=Ypk`,
   `width_samples=Wpk`, `prominence=Ppk`. Default occurrence order и first
   sample flat plateau сохраняются. Peak ID равен `peak-<sample_index>`.
   Вычисление выполняется только при `peaks_enabled=true`; fallback отсутствует.
8. Time presentation normalization выполняется только над копией каждого
   bounded trace: `y_norm=(y-min(y))/(max(y)-min(y))`; finite constant trace
   отображается нулями. Backend samples/snapshot не меняются. Peak value
   преобразуется тем же affine scale analysis-source trace без clipping; raw
   peak может оказаться вне `[0,1]`, если его sample отсутствует в bounded
   trace. Peak `time_s` остаётся абсолютным backend coordinate.
9. Для Time Limits `L=(t_min,t_max)` определяется inclusive raw ROI
   `I={k | t_min <= k/f_s <= t_max}`. Он обязан содержать хотя бы один sample.
   Statistics вычисляются только по `I`, но extrema возвращают абсолютные
   `sample_index=k` и `time_s=k/f_s`; mean равен `|I|⁻¹ Σ[k∈I] y[k]`.
   Для Peaks query хранит `sample_offset=min(I)`: локальный Engee `Xpk`
   переводится как `sample_index=sample_offset+Xpk-1`. ROI из одного или двух
   samples имеет typed enabled empty Peaks и не вызывает provider.

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

Для raw statistics пустые/non-finite samples и неположительная либо
неконечная `f_s` отвергаются до публикации view/display mutation. Позиции
экстремума обязательны и неотрицательны; mean позиции не имеет. Snapshot
сохраняет строгий порядок minimum, maximum, mean и согласован с revision и
selected signal.

Time Limits конечны, строго упорядочены, лежат внутри `[0,(N-1)/f_s]` и
содержат raw sample. Peaks provider query требует не менее трёх конечных ROI
samples и положительную конечную `f_s`; более короткий valid ROI обрабатывается
до создания query. Provider arrays имеют одинаковую длину; locations уникальны,
находятся в ROI и следуют occurrence order; width/prominence неотрицательны и
конечны. Typed snapshot согласован с revision, active Display, selected signal
и capability flag. Любая ошибка проверяется до публикации mutation/cache.

Пустой Display является допустимым UI/domain состоянием, но не математическим
входом spectral или peak algorithms. Для него `pspectrum` и `findpeaks` не
вызываются: линии и heatmaps пусты, measurement/peak ordinate и signal name
равны null, items пусты, а units/schema сохраняются. Первый добавленный member
снова создаёт analysis source и после полной подготовки публикуется одной
revision mutation.

## Verification evidence

- `test/back/lib/signal_analyser_service_test.jl`: orientation, dB conversion,
  finite values, persistence range, plots, multi-trace payload, raw statistics
  и atomic invalid-selection/Peaks provider/Clear/Time ROI regressions; полный
  интегрированный gate 719/719 PASS.
- `test/engee/engee_package_contract_tests.jl`: реальный contract
  `power`/`spectrogram`/`persistence`, two-sided axes и matrix shapes. Локально
  пакет не discoverable; повторный read-only prod runtime contract PASS для
  версии `0.72.0`: power 129, spectrogram 1024×29, persistence 256×1024.
- Первая prod-версия: EngeeDSP evidence и E2E 6/6, SHA `0606d47`.
- `test/engee/findpeaks_contract_matrix.jl`: prod MIND подтвердил namespace,
  `out=:data`, exact result shape, 1-based/default/x/Fs coordinates, plateau,
  options и safe errors; evidence matrix 16/16 PASS.
- Compiled lazy adapter pattern `Base.require` + `Base.invokelatest` повторён на
  prod MIND и вернул expected `Ypk=[1,2,3]`, `Xpk=[2,4,8]` без world-age error.
- Cascade 7 frontend static/behavior 2/2 и Playwright syntax/support PASS;
  backend regression и additive ROI matrix — 719/719.

## Источники и наблюдаемые различия

- MathWorks Signal Analyzer:
  https://www.mathworks.com/help/signal/ref/signalanalyzer-app.html
- MathWorks `pspectrum`:
  https://www.mathworks.com/help/signal/ref/pspectrum.html
- Engee runtime function: `EngeeDSP.Functions.pspectrum`, required Engee
  platform package version `0.72.0`, UUID
  `f9bbbd0e-0dd6-4072-898a-88f8f1250a99`, module path
  `/usr/local/ijulia-core/packages/EngeeDSP/XobDm/src/EngeeDSP.jl`.
- Engee `findpeaks` reference:
  https://engee.com/helpcenter/stable/en/func-dsp-measurements-and-feature-extraction/func-findpeaks.html

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

Keyword spelling mismatch reference/runtime зарегистрирован отдельно как
[ENGEE-20260731-002](../../engee_bugs/ENGEE-20260731-002-findpeaks-npeaks-casing.md).
