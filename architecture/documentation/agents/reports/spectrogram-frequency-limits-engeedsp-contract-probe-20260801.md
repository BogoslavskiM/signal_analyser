# Spectrogram Frequency Limits EngeeDSP contract probe — 2026-08-01

Status: completed-prod-read-only-evidence

## Environment and call

Engee prod, Julia `1.12.4`, EngeeDSP UUID
`f9bbbd0e-0dd6-4072-898a-88f8f1250a99`, source tree `XobDm`; application SHA
`0361fddb0c628497eef104bb40d35579d339c931`. No files, models, GUI,
Reassign=true or TimeResolution were used.

```julia
pspectrum(
    x, t, "spectrogram",
    "Leakage", 0.5,
    "OverlapPercent", 50,
    "TwoSided", twosided,
    "FrequencyLimits", limits,
)
```

## Valid topology and grids

For `Fs=100 Hz`, `N=256`, all typical valid cases returned power 1024×15,
frequency 1024×1 and 15 unchanged time centers. Axes were sorted, power finite
and nonnegative, and orientation stayed frequency × time.

| Topology/request | Returned endpoints, Hz |
| --- | --- |
| real Auto | 0 .. 50.00000000000001 |
| real [0,50] | 0 .. 50 |
| real [5,20] | 5 .. 20 |
| real [-5,15] | clipped to 0 .. 15 |
| real [40,60] | clipped to 40 .. 50.00000000000001 |
| complex Auto | -50.00000000000001 .. 50.00000000000001 |
| complex [-50,50] | -50 .. 50 |
| complex [-30,-5] | -30 .. -5 |
| complex [-5,15] | -5 .. 15 |
| complex [40,60] | clipped to 40 .. 50.00000000000001 |

Fully external bands rejected. Narrow valid bands still returned 1024 distinct
points with exact requested endpoints, proving a new provider grid rather than
post-hoc cropping. `N=2` used the same endpoint policy and returned 1024×2 with
two centers. Repeats and three option orders were bitwise identical.

Different limits changed frequency and power but not time centers. Auto and
explicit full domain were numerically close but not bitwise identical and must
not share cache identity.

## Validation evidence

- reversed/equal: must be increasing;
- NaN/Inf: must be finite;
- scalar or wrong length: must be length two;
- complex endpoints: must be real;
- string/nothing leak internal MethodErrors;
- provider accepts tuples, matrices and Bool-containing arrays.

Product must validate strict exact finite non-Bool JSON numbers before dispatch.
Auto omits the option.

## Degenerate Nyquist-touch candidate

Real `[50,60]` and complex `[-60,-50]`/`[50,60]` were accepted 3/3 for N=256
because inferred provider Fs was `100.00000000000001`. The 1024-row frequency
axis contained only two unique values and 1022 zero-width steps. N=2/N=16 with
exact inferred 100 rejected the same edge.

This is recorded as suspected intake, not a confirmed provider defect, because
the nominal boundary-intersection expectation needs upstream clarification.
Product workaround is unambiguous: validate the whole request inside
authoritative `sample_rate_hz/2` and never delegate partial/boundary-only bands.

## Contract consequence

- independent Spectrogram Auto/Explicit Hz state;
- explicit requests wholly inside analysis-source topology only;
- no provider clipping exposed;
- exact limits in query/raw cache identity;
- canonical options Leakage, OverlapPercent, TwoSided, FrequencyLimits;
- explicit output endpoints validated with sample-rate-scaled tolerance;
- N<2 remains typed empty; N=2 provider-supported.

## Official documentation correspondence

Signal Analyzer exposes Spectrogram Frequency Limits and passes them to
`pspectrum`; they are computational, not chart-only zoom. Power Limits are
colormap bounds and `MinThreshold` is a different computation option.

- https://www.mathworks.com/help/signal/ug/customize-signal-analyzer.html
- https://www.mathworks.com/help/signal/ref/pspectrum.html
- https://www.mathworks.com/help/signal/ug/spectrogram-computation-in-signal-analyzer.html
