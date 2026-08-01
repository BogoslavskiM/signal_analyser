# DEC-20260801-025: independent Display-local Persistence Leakage

ID: `DEC-20260801-025`
Дата: `2026-08-01`
Статус: accepted
Extends: [DEC-024 typed Persistence foundation](DEC-20260801-024-typed-persistence-foundation.md)
Implementation: planned in Cascade 19; not deployed

## Контекст

Cascade 18 ввёл отдельный typed Persistence provider/service/raw cache, но не
добавлял settings. Leakage уже существует независимо у Spectrum и Spectrogram;
использовать одно из этих полей для Persistence нельзя.

Официальный `pspectrum` задаёт Leakage default `0.5`, inclusive `[0,1]` и
Kaiser relation `beta=40(1-leakage)`. Prod EngeeDSP `0.72.0` probe подтвердил
для real и complex: omitted bit-for-bit равен `0.5`; `0`, `0.5`, `1`
детерминированы; power axis и occurrence меняются, frequency axis/geometry —
нет; все перестановки опций эквивалентны. Provider принимает Bool как numeric
endpoints, поэтому product обязан отвергать Bool до dispatch.

## Решение

Cascade 19 добавляет единственный exact object:

```json
{
  "persistence_settings": {
    "leakage": 0.5
  }
}
```

При наличии объекта ключ `leakage` обязателен и является единственным:
partial/extra object отклоняется. Отсутствие всего объекта сохраняет preference
активного Display. Leakage — конечное JSON Number, но не Bool, inclusive
`[0,1]`; default нового Display — explicit `0.5`; `-0.0` канонизируется в
`0.0`.

Backend вводит immutable `SignalPersistenceSettings` и добавляет exact Leakage
в `SignalPersistenceQuery` и `SignalPersistenceCacheKey`. Provider получает:

```text
Leakage, leakage, NumPowerBins, 256, TwoSided, topology
```

Изменение Leakage пересчитывает raw power axis и occurrence. Frequency axis,
fixed 256 bins, real one-sided/complex centered topology, strict
power-by-frequency orientation, dB-before-160x160 presentation и existing
heatmap wire сохраняются. Spectrum/Spectrogram settings, providers и raw cache
не меняются и не вызываются из-за Persistence-only mutation. `N<2` и empty
Display не вызывают Persistence provider.

Root snapshot зеркалирует `persistence_settings` active Display; каждый
`displays[]` содержит собственный exact object. A/B независимы; новый Display
получает `0.5`; Clear сохраняет preference без provider; first re-add
пересчитывает либо использует соответствующий raw key; source change сохраняет
Leakage, но меняет source-specific identity. Ранее вычисленные keys для другого
Leakage могут переиспользоваться.

Equal canonical object — cold no-op без provider и revision; valid change —
ровно одна revision. Malformed/type/range/Bool/nonfinite даёт field-level 422;
stale revision — 409. Provider/data/render failure не меняет Display, revision
или ни один из четырёх cache maps. Все cache entries публикуются только после
полной успешной подготовки snapshot.

Vanilla-JS frontend добавляет в существующую Display tab условную Persistence
section, не создавая новой settings tab. Stable selectors:
`persistence-settings`, `persistence-leakage-input`,
`persistence-leakage-value`, `persistence-leakage-error`. Native range
использует normalized `0..1`, step `0.01` и доступное text value. Это явная
product/API presentation, а не заявление о точной numeric scale MATLAB GUI.
`input` меняет Display-local draft, `change` отправляет один полный desired
view. Local invalid не создаёт request; 422 откатывает accepted snapshot; 409
повторяет latest desired target максимум один раз, второй 409 откатывает и
показывает ошибку. No-source control disabled, но preference сохраняется.

## Вне scope

Persistence OverlapPercent, TimeResolution, FrequencyResolution, ROI/fixed
segment grid, Frequency/Power/Density Limits, MinThreshold, Reassign,
dB/linear, Fit Colormap, editable NumPowerBins и metadata. Никакой общий
Leakage между Spectrum, Spectrogram и Persistence не вводится. Hand-written
DSP/histogram/window либо fallback запрещены.

## Проверка

Обязательны typed constructor/copy/hash и signed-zero tests; exact one-key
state/API objects; default/endpoints/no-op/+1/422/409; query/cache separation
и warm reuse; provider option order; real/complex topology/output invariants;
Spectrum/Spectrogram independence; A/B/Clear/re-add/source; `N<2`; warm/cold
provider failure с exact equality четырёх caches/revision/Display. Frontend
проверяет draft/commit/rollback/disabled state без client DSP. E2E проверяет
provider-derived изменение `y` или `z`, один source-only heatmap, независимость,
полный lifecycle, event-based waits, timing log и exact cleanup.

## Источники

- [Prod Persistence Leakage probe](../../agents/reports/persistence-leakage-engeedsp-contract-probe-20260801.md)
- [DEC-024 typed Persistence foundation](DEC-20260801-024-typed-persistence-foundation.md)
- MathWorks `pspectrum`:
  https://www.mathworks.com/help/signal/ref/pspectrum.html
- MathWorks Persistence Spectrum in Signal Analyzer:
  https://www.mathworks.com/help/signal/ug/persistence-spectrum-in-signal-analyzer.html
- Engee `pspectrum`:
  https://engee.com/helpcenter/stable/en/func-dsp-transforms-correlation-and-modeling/func-pspectrum.html
