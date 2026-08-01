# DEC-20260801-024: typed/default Persistence foundation

ID: `DEC-20260801-024`
Дата: 2026-08-01
Статус: accepted
Supersedes: current untyped Persistence placeholder implementation only
Implementation: planned in Cascade 18; not deployed

## Контекст

Текущий Persistence напрямую вызывает `pspectrum` из render helper, всегда
передаёт `TwoSided=true`, допускает transpose provider matrix и маскирует
неположительную power axis через `abs/max(eps)`. Он входит в общий untyped
`plot_cache` и поэтому eagerly вычисляется для каждого visible signal, хотя
heatmap должен принадлежать только page-local analysis source.

Официальная документация MathWorks определяет Persistence как нормализованный
процентный histogram в power-frequency space. `pspectrum` возвращает matrix
формы power bins × frequency bins; documented default `NumPowerBins=256`.
Существующий prod EngeeDSP probe подтвердил real one-sided `0..f_s/2`, complex
centered `-f_s/2..f_s/2`, exact `256×1024`, positive ordered linear-power axis
и finite occurrence `0..100`. Explicit `NumPowerBins=256` также возвращает 256
строк. Этого достаточно для default foundation без новых controls.

## Решение

Cascade 18 сохраняет существующий wire и frontend:

```json
{
  "type": "heatmap",
  "x": [],
  "y": [],
  "z": [],
  "x_label": "Частота, Гц",
  "y_label": "Мощность, дБ",
  "color_label": "Встречаемость, %"
}
```

Backend вводит отдельные immutable OOP contracts:

- `SignalPersistenceQuery`: copied raw values, sample rate, topology и fixed
  `num_power_bins=256`;
- `SignalPersistenceData`: raw frequency axis, positive linear-power axis,
  occurrence matrix с exact orientation power × frequency и topology;
- `SignalPersistenceCacheKey`: signal identity, sample rate, sample count,
  topology и `num_power_bins`; presentation не входит в key;
- `AbstractSignalPersistenceProvider`, `EngeeDSPPersistenceProvider`,
  injectable `SignalPersistenceService` и отдельный typed raw cache.

Provider получает только полный raw analysis source и canonical options
`"NumPowerBins",256,"TwoSided",flag`. Real всегда использует false, complex —
true, даже если raw provider допускает другие сочетания. `N<2` возвращает
typed empty без provider; `N=2` передаётся provider. Empty data имеет те же
wire keys и пустые `x/y/z`.

Для непустого результата frequency и power axes finite и строго возрастают;
power levels строго положительны. Frequency покрывает one-sided full domain
для real либо centered full domain для complex с floating tolerance. Matrix
обязана иметь exact `length(power) × length(frequency)`; transpose запрещён.
Occurrence finite и лежит в `[0,100]`; clamp/fallback не применяется.
Несовместимый provider result отвергается до publication.

Presentation преобразует каждый raw power level точным `10*log10(P)` и только
затем применяет существующий равномерный 160×160 heatmap bounding. Raw cache не
хранит dB либо bounded arrays. `abs`, epsilon floor, собственный histogram и
DSP fallback запрещены.

Persistence вычисляется только для analysis source активного Display. Добавление
или удаление secondary visible signal при неизменном source не вызывает
Persistence provider. A/B могут переиспользовать одинаковый raw cache key;
Clear публикует empty wire, re-add/source change выбирает соответствующий key.
Все mutation preparation и cache publication атомарны; provider/data failure
не меняет revision, Display или cache.

Новых settings, API keys, routes, tabs, metadata и frontend controls нет.
Existing vanilla renderer получает bit-identical wire. Frontend regression
только подтверждает один heatmap, linear power-dB y-axis, colorbar и empty
states; client-side DSP запрещён.

## Вне scope

Time ROI/fixed segment grid, Leakage, OverlapPercent, TimeResolution,
FrequencyResolution, Frequency/Power/Density Limits, MinThreshold, Reassign,
dB/linear toggle, Fit Colormap, editable `NumPowerBins`, Persistence metadata и
любое изменение Spectrogram settings. Начальные Leakage/Overlap свежего MATLAB
Persistence view не объявляются известными defaults.

## Проверка

Backend: typed constructor/copy/hash/invariant matrix; explicit provider options;
real/complex topology; strict orientation/axes/range; exact dB before bounding;
`N<2`; selected-only call/cache; A/B/Clear/re-add/source; repeated GET; atomic
provider/data failures. API wire остаётся exact и не получает новых fields.
Frontend: positive/empty generic heatmap regression без новых controls. E2E:
real one-sided, conditional complex centered, multi-visible analysis-source-only,
A/B/Clear/re-add/source и exact cleanup. `N<2` остаётся unit/provider coverage,
пока UI не имеет deterministic import fixture.

## Источники

- [EngeeDSP time-frequency probe](../../agents/reports/time-frequency-engeedsp-contract-probe-20260801.md)
- MathWorks Persistence Spectrum:
  https://www.mathworks.com/help/signal/ug/persistence-spectrum-in-signal-analyzer.html
- MathWorks `pspectrum`:
  https://www.mathworks.com/help/signal/ref/pspectrum.html
- MathWorks Explore Signals:
  https://www.mathworks.com/help/signal/ug/explore-signals.html
- Engee `pspectrum`:
  https://engee.com/helpcenter/stable/en/func-dsp-transforms-correlation-and-modeling/func-pspectrum.html
