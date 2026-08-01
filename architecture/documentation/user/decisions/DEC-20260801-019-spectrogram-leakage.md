# DEC-20260801-019: independent Display-local Spectrogram Leakage

ID: `DEC-20260801-019`
Дата: `2026-08-01`
Статус: accepted
Implementation: planned in Cascade 13; not deployed

## Контекст

Cascade 12 реализовал один typed Spectrogram setting — OverlapPercent. В
продукте уже существует Spectrum `spectrum_settings.leakage`, но MathWorks
прямо определяет Spectrum Leakage и Leakage окна Spectrogram segments как
независимые настройки. Их нельзя связывать одним state field или mutation.

Official `pspectrum` contract задаёт Leakage default `0.5`, inclusive range
`[0,1]` и Kaiser relation `beta=40(1-leakage)`. Большая Leakage сужает mainlobe
и лучше разделяет близкие тоны, но увеличивает sidelobes и может маскировать
слабый соседний тон; меньшая делает обратный компромисс.

Prod EngeeDSP probe подтвердил real/complex explicit 0/0.5/1, exact
default=0.5, deterministic power, неизменные axes/shape, изменение raw power и
option-order invariance. Provider permissively принимает Bool как endpoints;
product обязан отвергать Bool до dispatch.

## Решение

Cascade 13 атомарно расширяет существующий exact object:

```json
{
  "spectrogram_settings": {
    "overlap_percent": 50.0,
    "leakage": 0.5
  }
}
```

Оба ключа обязательны при наличии объекта; partial/extra object отклоняется.
Отсутствие всего `spectrogram_settings` сохраняет preference. `leakage` —
конечное JSON Number, но не Bool, в inclusive `[0,1]`; default explicit `0.5`.
`-0.0` канонизируется в `0.0`. Provider Auto не используется.

`SignalSpectrogramSettings`, `SignalSpectrogramQuery` и raw cache key включают
exact Leakage. Adapter передаёт canonical options:

```text
Leakage, leakage, OverlapPercent, overlap_percent, TwoSided, topology
```

Изменение Leakage пересчитывает raw power. Spectrum settings/cache/provider не
меняются и не вызываются. Existing OverlapPercent сохраняется при Leakage-only
mutation. Real остаётся one-sided, complex — centered two-sided; N<2 и empty
Display provider не вызывают. Raw cache остаётся full-resolution, 160×160 —
только wire presentation.

Root зеркалирует active Display. A/B независимы; новый Display получает
`{50,0.5}`; Clear сохраняет оба значения без provider; first re-add recomputes;
source change сохраняет settings и меняет source-specific identity. Equal
canonical object — no-op; valid change — одна revision; malformed/type/range/
Bool/nonfinite — atomic 422; stale revision — 409; provider failure не
публикует state/cache.

Frontend добавляет в существующую условную Spectrogram section native Leakage
control с `data-testid="spectrogram-leakage-input"` и inline
`data-testid="spectrogram-leakage-error"`. Он использует normalized range 0..1
с шагом 0.01 и доступное текстовое value. Это product/API представление, не
неподтверждённая копия numeric scale MATLAB slider. `input` меняет только
Display-local draft, `change` делает один full-view commit. 422 откатывает last
accepted server snapshot, 409 повторяет ровно один latest desired target. Один
graph host, ровно три settings tabs, существующий `/api/view` и отсутствие
client DSP сохраняются.

## Вне scope

TimeResolution, FrequencyResolution, Reassign, Frequency/Power Limits,
Spectrogram Time ROI/grid selection, dB/linear, Log, colormap и Persistence.
Spectrum Leakage UI/state не меняется. Hand-rolled STFT/window/fallback и
dependency edit запрещены. `TimeResolution` остаётся заблокирован
ENGEE-20260801-003.

## Проверка

Обязательны typed/parser boundary tests, exact two-key API bodies, no-op/+1/
422/409, A/B/Clear/re-add/source, cache separation/reuse, failure atomicity,
real/complex combined Engee options, independence from Spectrum Leakage и
frontend queue regressions. E2E проверяет default, endpoints, one request,
provider-derived `z` change, independence, lifecycle и cleanup; runtime требует
точного deployed SHA.

## Источники

- [Prod Engee Leakage probe](../../agents/reports/spectrogram-leakage-engeedsp-contract-probe-20260801.md)
- [DEC-018 OverlapPercent](DEC-20260801-018-spectrogram-overlap-percent.md)
- MathWorks `pspectrum`:
  https://www.mathworks.com/help/signal/ref/pspectrum.html
- MathWorks Spectrogram Computation in Signal Analyzer:
  https://www.mathworks.com/help/signal/ug/spectrogram-computation-in-signal-analyzer.html
- MathWorks generated Spectrogram script example:
  https://www.mathworks.com/help/signal/ug/find-and-track-ridges-using-reassigned-spectrogram.html
