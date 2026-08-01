# Persistence OverlapPercent EngeeDSP contract probe — 2026-08-01

Status: verified prod capability evidence; product NO-GO

## Environment and boundary

- Engee prod MIND, Julia `1.12.4`.
- EngeeDSP `0.72.0`, UUID `f9bbbd0e-0dd6-4072-898a-88f8f1250a99`,
  tree `4941c08f227519cbc82caab7bc519851f44b0586`, source slug `XobDm`.
- Public `EngeeDSP.Functions.pspectrum` over deterministic in-memory arrays.
- No repository, model, files, dependencies, deploy, MATLAB or browser state
  was changed. The temporary pod was stopped and confirmed `stopped`.

## Fixtures and accepted output

The bounded matrix used real and complex `N=256`, `Fs=100 Hz` C19 fixtures
plus deterministic 36-sample transient components. Omitted and explicit
`0/25/50/75` at Leakage `0.5`, and transient `0/25`, returned three
`Matrix{Float64}` outputs:

- occurrence `256×1024`, frequency `1024×1`, power `256×1`;
- real frequency `0..50.00000000000001 Hz`, complex centered
  `-50.00000000000001..50.00000000000001 Hz`;
- finite strictly increasing axes, positive power, finite occurrence in
  `[0,100]`, column sums equal to `100` within `1.42e-14`.

Overlap materially changed occurrence, but not frequency. For transient
`25` versus `0`, max occurrence deltas were `44.31818181818181` real and
`100` complex. Power-axis max delta was `0` real and
`1.3543172357663025` complex. Exact repeats at `0` and `25` were bit-equal.

At Leakage `0.5`, omitted output was bit-equal to explicit `75` on both base
fixtures. This is output equivalence for the probed segmentation, not proof of
a literal provider default: documented ENBW/window derivation and percentage-
to-sample flooring can alias values.

## Resource cutoff

Warmed `@allocated` evidence, MiB (`bytes / 2^20`):

| Input | 0% | 25% | 50% | 75% | omitted |
| --- | ---: | ---: | ---: | ---: | ---: |
| real base | 371.97 | 473.18 | **626.99** | **1183.66** | **1746.17** |
| complex base | 294.84 | 403.90 | **543.23** | **1021.84** | **1021.84** |
| real transient max | 357.71 | 490.22 | — | — | — |
| complex transient max | 309.12 | 431.16 | — | — | — |

Explicit `50` crossed the 512 MiB guard in both topologies. `99/99.9` were
therefore not called. Later real option-order calls at nominally safe `0`
allocated 634.13 and 574.07 MiB; their outputs were equal, but the loop stopped
immediately. Allocation is a volatile runtime signal rather than pod RSS, yet
the repeated threshold crossings invalidate a safe product cap. `25` is only
the largest direct value observed below the guard, not a supported maximum.

## Validation and incomplete gates

- `-1`, `-0.01`, `100`, `100.1`, `101`, non-finite values and string `"50"`
  were rejected consistently for real and complex input.
- Bool `false/true` was accepted; `false` was bit-equal to explicit `0`.
- Bounded Leakage interaction at overlap `0`, Leakage `0/0.5/1`, preserved
  topology and changed occurrence/power as expected.
- Only two of 24 planned option permutations completed before resource cutoff.
  Full order invariance and the full Leakage×Overlap matrix remain deliberately
  unproven.

The incomplete gates are the result of the safety guard and are themselves a
NO-GO condition. No provider bug is claimed.

## Decision consequence and cleanup

Do not add Persistence OverlapPercent state, API or UI and do not expose the
provider `[0,100)` interval. No default or cap is frozen. The next candidate is
Persistence Frequency Limits.

Retained outputs were cleared; `Base.gc_live_bytes()` fell from `312,504,360`
to `82,740,464`; eval health passed. Pod stop returned 204, and follow-up status
confirmed `stopped` at `2026-08-01T07:32:44.835206`.

## Sources

- Engee `pspectrum`:
  https://engee.com/helpcenter/stable/en/func-dsp-transforms-correlation-and-modeling/func-pspectrum.html
- MathWorks `pspectrum`:
  https://www.mathworks.com/help/signal/ref/pspectrum.html
- MathWorks Spectrogram Computation:
  https://www.mathworks.com/help/signal/ug/spectrogram-computation-with-signal-processing-toolbox.html
- MathWorks Persistence Spectrum:
  https://www.mathworks.com/help/signal/ug/persistence-spectrum-in-signal-analyzer.html
