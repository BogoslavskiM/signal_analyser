# DEC-20260801-015: Spectrum по Time ROI и настройки Display

ID: `DEC-20260801-015`
Дата: 2026-08-01
Статус: accepted
Supersedes: none
Implementation: planned in Cascade 9; not deployed

## Контекст

В MATLAB Signal Analyzer R2024b сценарий
`SA-GRAPH-001-deterministic-spectrum-defaults-roi-rbw` подтвердил для
детерминированного вещественного сигнала с `Fs=1 Hz`, `N=15`:

- единицы частоты Hz, диапазон `0..0.5 Hz`, линейную ось частоты;
- включённое представление в dB и среднее положение Leakage;
- Spectrum, пересчитанный для inclusive Time ROI `4..6 s`, с плоским уровнем
  около `3.0102995 dB` и отображаемым actual RBW `855.5818 mHz`;
- для ROI `0..14 s` пик около `0.2 Hz` и actual RBW `171.1164 mHz`;
- независимость Spectrum от состояния Normalize Y Axis.

Числовое значение среднего положения Leakage `0.5` следует из документации,
а не из визуального считывания MATLAB. Локальность Spectrum-настроек между
страницами в этом сценарии не подтверждена.

Prod-probe `EngeeDSP.Functions.pspectrum` отдельно подтвердил one-sided
вещественный и centered two-sided комплексный режимы, `Leakage` в `[0,1]`,
обработку `FrequencyLimits` и минимальные длины входа. Третий результат power
режима был пустым `Any[]`, поэтому actual RBW из него не получается.

## Решение

Spectrum-настройки являются typed состоянием каждого Display. Это локальность
продукта, согласованная с существующей архитектурой страниц, а не наблюдение
MATLAB. Новый Display получает defaults `db`, `linear`, `0.5`; Clear Display
сохраняет настройки, а Display A и B меняются независимо.

Полный wire-объект имеет точную форму:

```json
{
  "scale": "db|linear",
  "frequency_scale": "linear|log",
  "leakage": 0.5
}
```

Root snapshot зеркалит настройки active Display, а каждый элемент `displays[]`
содержит собственный объект. `/api/view` принимает additive полный объект
`spectrum_settings`; отсутствие сохраняет текущее значение. Объект должен иметь
ровно все три ключа и корректные типы; `leakage` — конечный `Float64` в
интервале `[0,1]`. Вложенная ошибка возвращается как field-level `422` и не
меняет state. Реальное изменение даёт одну ревизию `+1`, равное значение —
no-op.

Backend использует OOP-границу:

- `SignalSpectrumSettings` — настройки Display;
- `SignalTimeSampleRange` — inclusive ROI с исходными, в том числе
  комплексными, samples;
- `SignalSpectrumQuery` и `SignalSpectrumData` — typed запрос и результат;
- abstract provider, EngeeDSP provider и service — граница внешнего DSP;
- typed cache key включает identity сигнала, inclusive ROI, Leakage и
  спектральную topology.

Провайдер вызывает только `EngeeDSP.Functions.pspectrum` в режиме power,
передаёт `Leakage` и не навязывает фиксированный `FrequencyResolution`.
`TwoSided=false` используется для вещественного сигнала, `true` — для
комплексного. Математического fallback и изменения dependency-файлов нет.
Linear выдача хранит raw power; dB вычисляется как `10*log10(power)`.
`frequency_scale` является только presentation metadata и не меняет массивы
спектра.

Spectrum всегда пересчитывается по исходным samples единого Time ROI и не
зависит от Normalize. Вещественная ось односторонняя `0..Nyquist`, комплексная
— centered two-sided. Запрос `log` запрещён атомарно, если в Display есть хотя
бы один видимый комплексный сигнал; добавление complex signal в уже log Display
тоже запрещено атомарно. Пустой Display/источник возвращает typed empty
Spectrum. Inclusive ROI из одного raw sample возвращает typed empty и не
вызывает provider; два samples поддерживаются.

Существующие keysets plot/trace сохраняются, кроме строго необходимой additive
metadata. Frontend DSP не выполняет. В существующей вкладке Display появляется
условный раздел Spectrum с native controls:

- `spectrum-settings`;
- `spectrum-scale-select` (`db`/`linear`);
- `spectrum-frequency-scale-select` (`linear`/`log`);
- `spectrum-leakage-input`, отправляющий mutation на `change`, но не на каждый
  `input`;
- `spectrum-settings-error`.

Раздел физически остаётся внутри Display panel; четвёртая settings-вкладка не
создаётся. Controls активны только при Spectrum plot и непустом source, но
authoritative checked/value state сохраняется и в остальных состояниях. Одно
фактическое изменение создаёт один полный `/api/view` request с rollback и
существующей stale queue. Plotly получает `xaxis.type=linear|log` из backend
state без изменения raw arrays.

## Вне Cascade 9

- редактируемые frequency limits;
- режимы RBW/window length и actual RBW в product metadata/UI;
- ручной выбор frequency units;
- refactor Spectrogram/Persistence;
- новая mixed-sample-rate policy вне возвращаемых provider axes;
- live deployment.

Существующие поля панели могут оставаться, но наблюдённый actual RBW нельзя
называть реализованным.

## Evidence

- MATLAB R2024b scenario
  `SA-GRAPH-001-deterministic-spectrum-defaults-roi-rbw`, SHA-256
  `c22e0074fc3e8f17ca797052490583dcb0d1f8a552fdd5825023e14026d6d278`.
- [MathWorks Explore Signals](https://www.mathworks.com/help/signal/ug/explore-signals.html).
- [MathWorks Spectrum Computation in Signal Analyzer](https://www.mathworks.com/help/signal/ug/spectrum-computation-in-signal-analyzer.html).
- [MathWorks pspectrum](https://www.mathworks.com/help/signal/ref/pspectrum.html).
- [Engee pspectrum](https://engee.com/helpcenter/stable/en/func-dsp-transforms-correlation-and-modeling/func-pspectrum.html).
- [Engee enbw](https://engee.com/helpcenter/stable/en/func-dsp-measurements-and-feature-extraction/func-enbw.html).
- Internal prod-probe record:
  [`../../agents/reports/spectrum-engeedsp-contract-probe-20260801.md`](../../agents/reports/spectrum-engeedsp-contract-probe-20260801.md).
