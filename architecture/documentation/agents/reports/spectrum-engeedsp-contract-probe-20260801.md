# Spectrum EngeeDSP contract probe — 2026-08-01

Status: verified prod capability evidence; Cascade 9 implementation not started
Owner: Architect
Environment: Engee MIND prod, `EngeeDSP` `0.72.0`

Correction 2026-08-01: Cascade 9 subsequently implemented and locally frozen
at `b53d79622dbe926316915d7c55668432434bcc07`. The original status line is the
report-time state; this append-only correction does not claim deployment or
runtime E2E.

## Задача

Проверить минимальный публичный контракт `EngeeDSP.Functions.pspectrum`, который
нужен Spectrum Cascade 9: real/complex topology, Leakage, FrequencyLimits,
короткий input и доступность actual RBW. Probe не менял приложение, зависимости
или конфигурацию.

## Разделение evidence

### Документировано официальными источниками

- Signal Analyzer по умолчанию показывает Spectrum в dB; перевод power в dB
  определяется как `10*log10(power)`. Linear/Log выбирает представление оси,
  а Time ROI меняет область сигнала для расчёта Spectrum.
- Для complex signal Signal Analyzer показывает centered two-sided Spectrum и
  не поддерживает Log frequency scale.
- `pspectrum` возвращает power и frequency axis; `TwoSided=false` задаёт
  one-sided Nyquist range для real, `TwoSided=true` — centered two-sided range.
- Engee `Leakage` имеет default `0.5` и допустимый интервал `[0,1]`.
  `FrequencyLimits` обрезает частично пересекающий Nyquist диапазон и отвергает
  полностью внешний диапазон.
- `enbw` вычисляет equivalent noise bandwidth для заданного window, но не
  превращает пустой третий результат power-вызова в готовый actual RBW.

Источники:

- [MathWorks Explore Signals](https://www.mathworks.com/help/signal/ug/explore-signals.html)
- [MathWorks Spectrum Computation in Signal Analyzer](https://www.mathworks.com/help/signal/ug/spectrum-computation-in-signal-analyzer.html)
- [MathWorks pspectrum](https://www.mathworks.com/help/signal/ref/pspectrum.html)
- [Engee pspectrum](https://engee.com/helpcenter/stable/en/func-dsp-transforms-correlation-and-modeling/func-pspectrum.html)
- [Engee enbw](https://engee.com/helpcenter/stable/en/func-dsp-measurements-and-feature-extraction/func-enbw.html)

### Наблюдалось в MATLAB R2024b

External scenario ID:
`SA-GRAPH-001-deterministic-spectrum-defaults-roi-rbw`
SHA-256:
`c22e0074fc3e8f17ca797052490583dcb0d1f8a552fdd5825023e14026d6d278`

Для real `Fs=1 Hz`, `N=15` UI показал Hz, диапазон `0..0.5 Hz`, Linear
frequency scale, включённый dB и Leakage в среднем положении. ROI `4..6 s`
дал плоский Spectrum около `3.0102995 dB` и actual RBW `855.5818 mHz`; ROI
`0..14 s` — пик около `0.2 Hz` и actual RBW `171.1164 mHz`. Normalize Y Axis
не менял Spectrum. Число Leakage `0.5` является docs-derived, а не визуально
считанным значением. Page locality не подтверждена.

### Наблюдалось в prod EngeeDSP probe

| Probe | Результат |
| --- | --- |
| Real, default options | one-sided, `n=4096`, frequency axis `0..50 Hz`, peak raw power `0.5` |
| Real, explicit `Leakage=0.5` | тот же one-sided contract, `n=4096`, `0..50 Hz`, peak raw power `0.5` |
| Complex, `TwoSided=true` | centered two-sided axis `-50..50 Hz`, peak raw power `1` |
| Частично пересекающий `FrequencyLimits` | result clipped to supported range |
| Полностью внешний `FrequencyLimits` | provider rejects the request |
| `Leakage=0` и `Leakage=1` | оба endpoint значения приняты |
| Leakage вне `[0,1]` | provider rejects the request |
| Один input sample | `ArgumentError` |
| Два input samples | supported |
| Третий output power-вызова | `Any[]`; actual RBW не предоставлен |

Probe подтверждает capability, но не вводит новую mixed-sample-rate policy и не
проверяет браузерный UI.

### Product decisions

- Spectrum settings принадлежат Display, хотя page locality не наблюдалась в
  SA-GRAPH-001.
- Provider использует default Leakage mode с явным `Leakage`, без forced fixed
  `FrequencyResolution`; actual RBW пока не является product metadata.
- Один raw sample short-circuit возвращает typed empty до provider; два samples
  передаются provider.
- Frequency scale — presentation metadata, raw power/frequency arrays от неё не
  меняются.
- Математический DSP fallback и dependency edit запрещены.

## Вывод

Prod capability достаточен для frozen P0 Cascade 9 при условии typed
provider/service boundary, lazy EngeeDSP invocation и atomic validation.
Нельзя заявлять actual RBW реализованным: подтверждённый третий output пуст.
Полный продуктовый контракт принят в
[`../../user/decisions/DEC-20260801-015-spectrum-roi-default-settings.md`](../../user/decisions/DEC-20260801-015-spectrum-roi-default-settings.md).
