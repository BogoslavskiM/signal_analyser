# Frequency Limits EngeeDSP contract probe — 2026-08-01

Status: verified prod capability evidence; C10 contract not frozen
Owner: Architect
Environment: Engee MIND prod, Julia `1.12.4`, EngeeDSP UUID
`f9bbbd0e-0dd6-4072-898a-88f8f1250a99`, module
`/usr/local/ijulia-core/packages/EngeeDSP/XobDm/src/EngeeDSP.jl`. The module
does not expose `Base.pkgversion`; the current platform Manifest evidence in
the prior probe identifies version `0.72.0`.

## Задача

Проверить public `EngeeDSP.Functions.pspectrum` с `FrequencyLimits` до
проектного решения C10. Probe использовал только небольшие in-memory Julia
arrays и representation `power`; модели, файлы, приложение и зависимости не
изменялись.

Базовый вызов:

```julia
pspectrum(x, t, "power",
  "Leakage", 0.5,
  "TwoSided", false_or_true,
  "FrequencyLimits", [minimum_hz, maximum_hz])
```

## Наблюдаемый provider contract

Для `f_s=100 Hz`, `N=4096`:

| Case | Result |
| --- | --- |
| Real Auto / explicit `[0,50]` | 4096 points, exact same frequencies and powers, `0..50 Hz` |
| Real `[5,20]` | 4096 points, exact endpoints `5..20 Hz` |
| Real `[-5,15]` | accepted and clipped to `0..15 Hz` |
| Real `[40,60]` | accepted and clipped to `40..50 Hz` |
| Real `[60,80]` or negative-only | `ArgumentError`, outside Nyquist `[0,50]` |
| Equal/reversed | `ArgumentError`, limits must be increasing |
| NaN/Inf | `ArgumentError`, limits must be finite |
| Very narrow `[10.001,10.002]` | accepted, still 4096 points at exact endpoints |
| Complex Auto / `[-50,50]` | 4096 points, exact same arrays, centered `-50..50 Hz` |
| Complex negative/cross-zero/positive | all accepted with exact requested endpoints |
| Complex `[-60,-40]` | accepted and clipped to `-50..-40 Hz` |
| Complex `[60,80]` | `ArgumentError`, outside Nyquist `[-50,50]` |

Two raw samples are supported with Auto/full, partial and very narrow limits;
each valid case returned 4096 points. One raw sample throws
`ArgumentError: Input signal must have at least two samples`. Therefore no-bin
behavior cannot be inferred from input sample count or a narrow continuous
interval: valid limits define a new dense output grid rather than merely
filtering existing bins.

Option ordering (`FrequencyLimits` before/after Leakage/TwoSided) produced
exactly equal axes and powers. Integer vectors and two-element tuples are
accepted. Provider also accepts Bool endpoints as numeric `0/1`; the product
must keep its stricter JSON numbers-not-Bool validation. Scalar and length-3
values throw `ArgumentError` requiring length 2.

## Вывод для C10

- Explicit limits affect provider output grid and must be part of typed query
  and raw cache identity; post-hoc frontend/backend cropping is not equivalent.
- Auto can omit `FrequencyLimits`; explicit full topology range is exactly
  equal in this probe.
- Partially overlapping requested limits are normalized by EngeeDSP to the
  supported topology. Fully external limits are provider errors, not empty
  arrays.
- Complex provider accepts negative-only, cross-zero and positive-only ranges;
  this does not change the separate product rule that Log is unavailable for a
  visible complex signal.
- Product policy still must decide whether authoritative state preserves the
  requested interval or canonicalizes to effective clipped endpoints, and how
  multiple traces with different sample rates/topologies interact.

## Official documentation map

- MathWorks Signal Analyzer documents dB as `10 log10(Power)`, Linear/Log
  frequency scale, Time ROI recomputation, centered two-sided complex spectra
  and the absence of Log for complex spectra:
  https://www.mathworks.com/help/signal/ug/explore-signals.html
- MathWorks `pspectrum` documents real one-sided and complex two-sided defaults
  and true-average-power scaling:
  https://www.mathworks.com/help/signal/ref/pspectrum.html
- Engee `pspectrum` documents two-element numeric `FrequencyLimits`, Hz when
  time information is present, full Nyquist default, partial clipping and an
  error for a completely external interval. It also states that the selected
  bandwidth participates in target resolution, consistent with the observed
  new 4096-point grid:
  https://engee.com/helpcenter/stable/en/func-dsp-transforms-correlation-and-modeling/func-pspectrum.html

## Verification boundary

This is capability evidence, not an implemented API/UI contract. No C10 files
or dependencies changed. The pod was left running and may stop automatically
by its normal idle timeout.
