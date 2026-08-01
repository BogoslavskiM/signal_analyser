# Spectrogram Reassign EngeeDSP contract probe — 2026-08-01

Status: completed-prod-read-only-no-go

## Environment and public surface

- Engee prod `26.7.2`, Julia `1.12.4`.
- EngeeDSP UUID `f9bbbd0e-0dd6-4072-898a-88f8f1250a99`, source tree `XobDm`;
  package version unavailable through `Base.pkgversion`.
- Application SHA at probe: `aebd6f96158caa1917de334c1d61abe6ca8ca950`.
- Only public `EngeeDSP.Functions.pspectrum(...,"spectrogram",...)` used.

No files, models, MATLAB GUI, lower-level spectrogram calls or dependencies
were changed.

## Baseline false contract

Omitted Reassign was bitwise equal to explicit `Reassign=false` for real and
complex inputs with one-/two-sided topology. Repeated false calls were bitwise
deterministic and option-order invariant.

For the primary 512-sample 1 kHz fixture, returned power was 1024×15,
frequency 1024×1 and 15 time centers. Real one-sided frequency was 0..500 Hz;
two-sided and complex centered axes were -500..500 Hz. Leakage 0/.5/1 and short
inputs `N>=2` worked with false; `N=1` cleanly rejected.

Strict input evidence:

- numeric values including 0/1, floats, NaN/Inf rejected as non-logical;
- strings rejected as invalid option strings;
- missing/nothing produced method/bounds failures;
- provider unexpectedly accepted Symbol `:false` and routed `:true` into the
  broken true path, so product-side JSON Bool validation remains mandatory.

## Reassign true defect

Every valid `Reassign=true` invocation failed before output:

```text
UndefVarError: fetchTimeReassignment not defined in EngeeDSP.Functions
```

Primary source anchor: `computeSpectrogramCore` in
`signal/computeSpectrogram.jl:375`, called through public `pspectrum.jl:50`.
Failure reproduced 28/28 times across real/complex, one-/two-sided, option
orders, Leakage endpoints/default and `N=2..4096`.

Minimal reproduction:

```julia
using EngeeDSP
t = collect(0:511) ./ 1000.0
x = sin.(2pi .* 73 .* t)
EngeeDSP.Functions.pspectrum(
    x, t, "spectrogram",
    "Reassign", true,
    "Leakage", 0.5,
    "OverlapPercent", 50,
    "TwoSided", false,
)
```

Expected: public three-value reassigned Spectrogram tuple. Actual: undefined
internal function. The result is independent of Genie, frontend, test harness,
network, input topology and tested option combinations.

## Decision consequence

Current prod is NO-GO for operational Reassign. Safe behavior is to omit the
option or pass explicit false; product must not expose a toggle that can select
true, silently downgrade true, or implement a hand-rolled substitute.

After an upstream fix, rerun true success/determinism/axes/shape/power/resource
matrix before adding typed Bool state/query/cache/provider/UI. Valid true cost
and output invariants are currently unknown.

## Official documentation direction

MathWorks documents `Reassign` as a logical `pspectrum` option defaulting false
that relocates estimates to energy centers. The Signal Analyzer app exposes a
Spectrogram checkbox and a two-display example with different runtime states.
This direction does not override the failed Engee capability gate.

- https://www.mathworks.com/help/signal/ref/pspectrum.html
- https://www.mathworks.com/help/signal/ug/explore-signals.html
- https://www.mathworks.com/help/signal/ug/find-and-track-ridges-using-reassigned-spectrogram.html
