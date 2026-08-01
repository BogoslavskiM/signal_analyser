# Spectrogram Leakage EngeeDSP contract probe — 2026-08-01

Status: completed-prod-read-only-evidence

## Environment and surface

- Engee prod `26.7.2`, Julia `1.12.4`.
- EngeeDSP UUID `f9bbbd0e-0dd6-4072-898a-88f8f1250a99`, source tree `XobDm`.
- Public product surface:
  `EngeeDSP.Functions.pspectrum(x,t,"spectrogram",...)`.
- `EngeeDSP.Functions.spectrogram` is a lower-level window/noverlap API and is
  not a replacement for the Leakage/OverlapPercent name-value contract.

No repository, model, dependency, MATLAB GUI or Command Window was modified.

## Fixture and call

Deterministic real and complex `N=256`, `f_s=100 Hz` signals were called twice
for every case:

```julia
pspectrum(x, t, "spectrogram",
    "Leakage", leakage,
    "OverlapPercent", 50,
    "TwoSided", twosided)
```

Default-equivalence calls omitted only the Leakage pair. Result type was
`Tuple{Matrix{Float64},Matrix{Float64},Vector{Float64}}`: power 1024×15,
frequency 1024×1 and 15 segment centers. Real one-sided frequency was
`0..50 Hz`; complex centered two-sided was `-50..50 Hz`; centers were
`0.16:0.16:2.40 s`.

## Accepted and default behavior

`Leakage=0`, `0.5` and `1` all succeeded for real and complex inputs. Shapes,
frequency axes and segment centers were bitwise identical across Leakage
values. Power stayed finite, real and nonnegative, but differed between every
distinct Leakage value. Repeated calls were bitwise deterministic.

Omitting Leakage was bitwise equal to explicit `0.5` for both topologies.
Therefore Leakage changes raw power and belongs to query/cache identity; it is
not presentation-only.

Combined option order was bitwise invariant across:

1. Leakage, OverlapPercent, TwoSided;
2. OverlapPercent, Leakage, TwoSided;
3. OverlapPercent, TwoSided, Leakage.

Product code selects the first as a canonical readable order.

## Validation delta

For both topologies:

- `-0.01`, `1.01` rejected: Leakage must be between 0 and 1;
- `NaN`, `Inf`, `-Inf` rejected: Leakage must be finite;
- string `"0.5"` rejected;
- Bool `false` was accepted and equal to `0`;
- Bool `true` was accepted and equal to `1`.

Bool permissiveness is an adapter-boundary delta, not classified as an Engee
bug. Product validation must reject Bool before provider dispatch.

## Contract consequences

- Explicit product default: `0.5`.
- Product domain: finite JSON Number, not Bool, inclusive `[0,1]`.
- Signed zero canonicalizes to positive `0.0` for stable state/cache identity.
- Spectrogram Leakage is independent from Spectrum Leakage.
- Canonical options: Leakage, OverlapPercent, TwoSided.
- No narrower resource cap is supported by this probe: all tested values kept
  the same 1024×15 geometry. This was not a performance benchmark.

## Official documentation correspondence

MathWorks documents `pspectrum` Leakage default `0.5`, range `[0,1]`, Kaiser
relation `beta=40(1-leakage)`, and the resolution-versus-sidelobe tradeoff.
Signal Analyzer documentation explicitly states that Spectrum Leakage and the
Leakage used to window Spectrogram segments are independent.

- https://www.mathworks.com/help/signal/ref/pspectrum.html
- https://www.mathworks.com/help/signal/ug/spectrogram-computation-in-signal-analyzer.html

The default is claimed from the documented `pspectrum` surface plus exact prod
provider equivalence, not from an unobserved MATLAB GUI slider state.
