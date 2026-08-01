# Persistence Frequency Limits EngeeDSP contract probe — 2026-08-01

Status: provider capability PASS; product blocked by segmentation prerequisite

## Environment and isolation

- Engee prod MIND, Julia `1.12.4`.
- EngeeDSP `0.72.0`, UUID `f9bbbd0e-0dd6-4072-898a-88f8f1250a99`,
  tree `4941c08f227519cbc82caab7bc519851f44b0586`.
- Deterministic real/complex `N=64`, `Fs=100 Hz`, in-memory arrays only.
- Every accepted call fixed Leakage `0.5`, **explicit OverlapPercent `0`**,
  NumPowerBins `256` and authoritative real/complex TwoSided topology.
- No repository, model, files, dependency, deploy, MATLAB or browser mutation.

Explicit zero isolated FrequencyLimits from the resource-blocked omitted
Overlap behavior. It is probe evidence only and is not the current C19 product
adapter contract.

## Output and geometry

Every accepted call returned occurrence `256×1024`, frequency `1024×1` and
power `256×1` `Matrix{Float64}` values. Axes were finite and strictly
increasing, power positive, occurrence finite in `[0,100]`, and each frequency
column summed exactly to `100` for this fixture.

- Real Auto `0..50 Hz` and explicit `[0,50]` were bit-equal.
- Complex Auto `-50..50 Hz` and explicit `[-50,50]` were bit-equal.
- Real `[5,20]`, complex `[-20,20]` and `[-40,-10]` retained exact endpoints
  on new dense 1024-point grids.
- Partial real `[-5,15]`/`[40,60]` and complex `[-60,-40]`/`[40,60]` were
  silently clipped and bit-equal to explicit canonical clipped bands.
- Fully external, equal and reversed ranges were rejected.

Auto/full equality is fixture-scoped. Official RBW behavior depends on
frequency span, so requested Auto and Explicit intent must remain distinct
unless broader evidence authorizes canonicalization.

Frequency Limits is raw provider computation, not viewport cropping. Compared
with Auto, real `[5,20]` changed frequency by up to `30 Hz`, power by
`0.6911661070720525` and occurrence by `50`; complex `[-20,20]` changed them by
`30 Hz`, `0.45363902884029716` and `100` respectively.

## Validation and interaction

- Non-finite values, scalar/length-1/length-3/nested-one-element shapes,
  scalar string, equal/reversed and fully external ranges were rejected.
- String endpoints leaked provider `MethodError`; Bool pair and a 1×2 matrix
  were permissively accepted. Product must validate an exact flat two-number
  JSON representation, reject Bool and never expose provider errors.
- Partial external bands must be rejected before dispatch rather than silently
  stored as clipped intent.
- Repeats and two noncanonical orders per topology were bit-equal (4/4).
- At fixed bands, Leakage `0/0.5/1` kept frequency exact and materially changed
  power/occurrence. Leakage and Frequency Limits are independent raw key
  dimensions.

## Resource evidence

Across 28 GC/warmed accepted observations, maximum `@allocated` was
`401,040,016` bytes (382.46 MiB) and maximum elapsed time `1.994 s`. The guard
did not trigger. This evidence is conditional on `N=64` and explicit overlap
zero; it is not evidence for the current omitted-overlap adapter or general
capacity.

## Product gate

Provider capability passes, but product implementation is blocked. Current
C19 omits OverlapPercent; C20 showed omitted/75 GiB-scale costs and explicit
zero changes existing Persistence power/occurrence. Adding zero inside a
Frequency Limits feature would hide a breaking global algorithm migration.

Before Frequency Limits ADR/implementation, a separate fixed Persistence
segmentation/resource foundation must decide and validate any explicit overlap
policy, cache algorithm identity, numerical rebaseline and cold-restart
contract. No Frequency Limits state/API/UI is frozen here.

## Cleanup and sources

Retained outputs were cleared; `Base.gc_live_bytes()` fell from `316,079,160`
to `79,022,256`. Pod stop returned 204 and follow-up confirmed `stopped` at
`2026-08-01T07:48:56.775023`.

- Engee `pspectrum`:
  https://engee.com/helpcenter/stable/en/func-dsp-transforms-correlation-and-modeling/func-pspectrum.html
- MathWorks `pspectrum`:
  https://www.mathworks.com/help/signal/ref/pspectrum.html
- MathWorks Persistence Spectrum:
  https://www.mathworks.com/help/signal/ug/persistence-spectrum-in-signal-analyzer.html
- MathWorks Find Interference:
  https://www.mathworks.com/help/signal/ug/find-interference-using-persistence-spectrum.html
