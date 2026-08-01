# DEC-20260801-021: Display-local Spectrogram Frequency Limits

ID: `DEC-20260801-021`
Дата: `2026-08-01`
Статус: accepted
Implementation: planned in Cascade 15; not deployed

## Контекст

Signal Analyzer documents Spectrogram minimum/maximum Frequency Limits and
generated scripts pass them to `pspectrum`. They define a compute band and RBW
performance span, not merely Plotly zoom. Power Limits affect colormap and
`MinThreshold` zeroes bins; neither is part of C15.

Prod Engee supports exact new 1024-point Spectrogram grids for real/complex,
narrow bands and N=2. It clips partially external bands, rejects fully external
ones and can return a degenerate axis for a floating Nyquist-touch request.
Therefore provider clipping is not a safe product contract.

## Решение

Cascade 15 expands the exact settings object:

```json
{
  "spectrogram_settings": {
    "overlap_percent": 50.0,
    "leakage": 0.5,
    "frequency_limits": null
  }
}
```

`null` is Auto. Explicit intent is exactly:

```json
{
  "min_hz": 5.0,
  "max_hz": 20.0,
  "units": "Hz"
}
```

Both values are finite JSON Number but not Bool, canonicalize signed zero and
obey `min_hz < max_hz`. The entire requested interval must lie inside the
authoritative analysis-source topology: real `[0,Fs/2]`, complex centered
`[-Fs/2,Fs/2]`. Partial/full external and boundary-only non-increasing
intersections are product 422; provider clipping/internal MethodErrors are not
exposed. Units are fixed Hz; unit conversion is outside C15.

Spectrogram may reuse existing typed Auto/Explicit frequency-limit value
classes, but its state is independent from `spectrum_settings.frequency_limits`.
Changing one does not mutate or dispatch the other. This is an explicit product
delta from MATLAB workflows that can carry a band between spectral views.

Settings/query/raw-cache key include requested Auto-vs-Explicit identity. Auto
omits `FrequencyLimits`; explicit provider order is Leakage, OverlapPercent,
TwoSided, FrequencyLimits. Auto and explicit full domain remain different cache
keys because provider outputs are not bitwise identical. Explicit returned axis
must preserve both endpoints within
`sqrt(eps(Float64))*max(Fs,1)` and remain strictly sorted; Auto preserves C13
full-topology validation. No post-hoc crop/FFT/STFT/fallback.

Snapshot adds `frequency_limits` to settings and metadata at
`plots.spectrogram.frequency_limits={mode,requested,effective}`. Auto effective
is authoritative full topology; explicit effective equals requested. The same
metadata remains defined for typed-empty N<2 because intended domain is known.
N<2 calls no provider; N=2 delegates normally.

Root mirrors active Display. New Display defaults Auto; A/B independent; Clear
preserves intent without provider; first re-add recomputes. Source change
preserves explicit intent only when fully valid in new topology, otherwise
atomically resets Auto. Equal full object is cold-cache no-op; a changed limit
recomputes only Spectrogram and never warms Spectrum. Failure is atomic.

Frontend adds F min/F max and one inline error inside the existing Spectrogram
section. Auto displays backend effective Hz values; editing both creates
explicit intent, clearing both restores Auto, one empty/nonfinite/nonordered
field is local invalid. Change/blur/Enter deduplicates to one full request;
422 accepted rollback and bounded 409 behavior reuse C13. Exactly three tabs,
one host, existing `/api/view` and no client DSP remain.

## Вне scope

Frequency units, shared Spectrum/Spectrogram/Persistence band, Frequency Scale,
Log, Time ROI/grid selection, Power Limits, MinThreshold, Reassign,
TimeResolution and Persistence. Reassign and TimeResolution remain blocked by
ENGEE-20260801-004 and ENGEE-20260801-003.

## Проверка

Typed Auto/Explicit/parser/source-domain/cache/provider/metadata tests; strict
422 and atomicity; Auto/full identity; N<2/N2; real/complex; cold no-op and
Spectrum independence; A/B/Clear/re-add/source reset. Frontend covers drafts,
Auto values, exact full object, local/422/409 and no client cropping. E2E uses
provider-derived y/z changes, exact cleanup and no runtime claim before an exact
deployment.

## Источники

- [Prod Spectrogram Frequency Limits probe](../../agents/reports/spectrogram-frequency-limits-engeedsp-contract-probe-20260801.md)
- [DEC-019 Leakage](DEC-20260801-019-spectrogram-leakage.md)
- MathWorks Customize Signal Analyzer:
  https://www.mathworks.com/help/signal/ug/customize-signal-analyzer.html
- MathWorks `pspectrum`:
  https://www.mathworks.com/help/signal/ref/pspectrum.html
