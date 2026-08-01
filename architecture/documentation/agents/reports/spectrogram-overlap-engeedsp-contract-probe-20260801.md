# Spectrogram OverlapPercent EngeeDSP contract probe — 2026-08-01

Status: verified prod capability evidence; consumed by DEC-018

## Environment and boundary

- Engee prod MIND, Julia `1.12.4`.
- EngeeDSP UUID `f9bbbd0e-0dd6-4072-898a-88f8f1250a99`;
  `Base.pkgversion` returned `nothing`; source tree `XobDm`.
- Public `EngeeDSP.Functions.pspectrum` over deterministic in-memory arrays.
- No model, files, repository, dependencies or pod lifecycle changed. Pod was
  left for normal idle auto-stop.

## Deterministic overlap grid

For real `sin(2π10t)` and complex `exp(i2π10t)`, `N=256`, `f_s=100 Hz`,
inferred segment length was 32 samples:

| Overlap | Hop | Shape | Segment centers |
| --- | ---: | --- | --- |
| 0% | 32 | `1024×8` | `0.16:0.32:2.40 s` |
| 50% | 16 | `1024×15` | `0.16:0.16:2.40 s` |
| 75% | 8 | `1024×29` | `0.16:0.08:2.40 s` |
| 99% | 1 | `1024×225` | `0.16:0.01:2.40 s` |
| 99.9% | 1 | `1024×225` | exactly equal to 99% |

Auto was tuple-identical to explicit 75%, and unequal to explicit 50%, for
both inputs. Real axes were one-sided `0..50 Hz`; complex axes centered
`-50..50 Hz`. Power was `Float64`, finite and nonnegative. Repeats and option
ordering (`OverlapPercent` before/after `TwoSided`) were identical. Power
columns at shared centers were bitwise equal across 0/50/75.

## Validation delta

- `-1` and `100` throw provider `ArgumentError` for the open upper interval.
- `NaN`, `Inf` and `-Inf` throw finite-value `ArgumentError`.
- string `"50"` is rejected as an invalid option string.
- Bool `true` is permissively accepted and produced the 8-segment result.

The product must reject Bool before provider dispatch. MATLAB application
default 50 must be passed explicitly; provider Auto is not app parity.

## Short inputs and terminal center

`N=2` accepts explicit 0/50/75 and Auto for real/complex, returning
`1024×2` with centers `[0.005,0.015] s` at `f_s=100 Hz`. The last center is
half a sample beyond the final raw timestamp. Across `N=2..16`, real/complex
and explicit50/Auto, maximum center overrun was
`0.5000000000000004` samples. Offsetting input time by 10 seconds shifted the
centers correspondingly and preserved power.

The evidence-backed product upper bound is therefore:

```text
last_raw_timestamp + 0.5 / sample_rate + numeric_tolerance
```

It avoids inferring the provider window while accepting observed terminal
zero-padding coordinates. The C11 hotfix implements this correction.

## Resource evidence

For the bounded `N=256` fixture, 99/99.9 produced 15× more segments, 14.11×
more retained result bytes and about 14× allocations than 50%. The warmed call
allocated about 649 MB and retained 1,853,352 bytes. These are measurements,
not stable performance guarantees.

DEC-018 therefore caps the initial product control at 75% inclusive. This is a
documented safety delta from provider/MATLAB validity `<100`, chosen so the new
setting cannot request more overlap than the already observed C11 Auto path.
Widening the range requires a separate performance/resource decision.

## Sources

- Engee `pspectrum`:
  https://engee.com/helpcenter/stable/en/func-dsp-transforms-correlation-and-modeling/func-pspectrum.html
- MathWorks `pspectrum`:
  https://www.mathworks.com/help/signal/ref/pspectrum.html
- MathWorks Spectrogram Computation:
  https://www.mathworks.com/help/signal/ug/spectrogram-computation-in-signal-analyzer.html
