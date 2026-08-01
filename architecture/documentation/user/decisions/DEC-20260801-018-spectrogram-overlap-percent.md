# DEC-20260801-018: Display-local Spectrogram OverlapPercent

ID: `DEC-20260801-018`
Дата: `2026-08-01`
Статус: accepted
Implementation: planned in Cascade 12; not deployed

## Контекст

Cascade 11 создал typed full-raw Spectrogram provider/cache без editable
settings. MathWorks Signal Analyzer документирует Auto segment length и
default overlap 50%. Standalone `pspectrum` использует иной Auto default; prod
EngeeDSP probe дал exact Auto=75% для фиксированного real/complex input.

Provider принимает диапазон `[0,100)`, но Bool также ошибочно принимает как
число. При 99/99.9% bounded `N=256` probe уже выделял около 649 MB и создавал
в 15 раз больше сегментов, чем 50%. Поэтому прямое копирование provider range
без resource policy небезопасно.

## Решение

Cascade 12 добавляет ровно один строгий per-Display object:

```json
{
  "spectrogram_settings": {
    "overlap_percent": 50.0
  }
}
```

`overlap_percent` — конечное JSON Number, но не Bool, в product-safe диапазоне
`0 <= value <= 75`. Default всегда explicit `50.0`; provider Auto не
используется. Значения выше 75 отклоняются как documented product safety delta,
хотя MATLAB/provider допускают `<100`. Расширение требует отдельного решения с
resource evidence.

Настройка хранится в каждом `SignalAnalyserDisplayState`, зеркалируется в root
snapshot для active Display и передаётся полным exact-key object через
существующий `/api/view`. Новый Display получает 50. Clear сохраняет setting;
first re-add recomputes. A/B независимы. Source change сохраняет setting и
использует новый source-specific cache key. Empty Display хранит preference,
но provider не вызывается. Equal canonical update — no-op; valid change — одна
revision; malformed/extra/missing/nonfinite/Bool/outside-safe-range — atomic
422; stale revision — существующий 409 contract.

Typed `SignalSpectrogramQuery` и `SignalSpectrogramCacheKey` включают exact
overlap. Adapter всегда передаёт public provider options
`"OverlapPercent", value, "TwoSided", flag`; порядок не семантичен, но код
использует один canonical order. Raw cache остаётся full-resolution; wire
bounding 160×160 — presentation-only. `N<2` остаётся typed empty. Terminal
segment center допускается до `last_timestamp + 0.5/f_s + tolerance` согласно
prod short-input evidence.

Frontend добавляет одну секцию внутри существующей Display tab:

- видна только для nonempty active Spectrogram;
- label `Overlap (%)`;
- `data-testid="spectrogram-overlap-percent-input"`;
- inline `data-testid="spectrogram-overlap-percent-error"`, `role="alert"`;
- input draft локален Display; input не вызывает API; change/blur/Enter делает
  один commit; local invalid/422 восстанавливают canonical value; 409 refresh
  повторяет последний полный desired target.

Frontend не вычисляет segment count, hop, time grid, matrices или DSP. Graph
host остаётся один, settings tabs — ровно три. Новых routes нет. E2E проверяет
provider-derived изменение `plots.spectrogram.x/z` на deterministic fixture,
но не внутренний cache и не абсолютный count для произвольного сигнала.

## Вне scope

TimeResolution, FrequencyResolution, Leakage, Reassign, Time ROI/grid
selection, Frequency/Power Limits, dB/linear, Log, colormap и Persistence.
`TimeResolution` остаётся заблокирован ENGEE-20260801-003. Собственная STFT,
post-hoc overlap, fallback и dependency edit запрещены.

## Последствия

- Default впервые совпадает с документированным MATLAB app 50%, а не с
  provider Auto 75%.
- Изменение overlap инвалидирует только соответствующий typed raw cache
  identity и меняет provider segment centers/columns.
- Product range 0..75 намеренно уже MATLAB/provider range; UI обязан показывать
  эту границу в validation message, а документация — не называть её MATLAB
  parity.
- Runtime E2E/deployment остаются отдельными gates.

## Источники

- [C12 prod provider probe](../../agents/reports/spectrogram-overlap-engeedsp-contract-probe-20260801.md)
- [DEC-017 typed foundation](DEC-20260801-017-typed-spectrogram-foundation.md)
- MathWorks Spectrogram Computation:
  https://www.mathworks.com/help/signal/ug/spectrogram-computation-in-signal-analyzer.html
- MathWorks `pspectrum`:
  https://www.mathworks.com/help/signal/ref/pspectrum.html
