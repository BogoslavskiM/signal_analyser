# Time-frequency EngeeDSP contract probe — 2026-08-01

Status: verified prod capability evidence; C11 contract not frozen

## Environment and boundary

- Engee prod MIND, Julia `1.12.4`.
- `EngeeDSP` UUID `f9bbbd0e-0dd6-4072-898a-88f8f1250a99`; platform Manifest
  evidence version `0.72.0`; `Base.pkgversion` returned `nothing` in the session.
- Module source:
  `/usr/local/ijulia-core/packages/EngeeDSP/XobDm/src/EngeeDSP.jl`.
- Pure in-memory arrays through public `EngeeDSP.Functions.pspectrum`; no model,
  files, application state, dependencies or repository product code changed.
- Pod was left running for normal idle auto-stop.

## Baseline topology and outputs

For `f_s=100 Hz`, deterministic real/complex 10 Hz inputs:

| Representation/input | Default result |
| --- | --- |
| real spectrogram | power `1024×29`, frequency `0..50 Hz`, segment centers sorted |
| complex spectrogram | power `1024×29`, frequency `-50..50 Hz`, centered |
| real persistence | occurrence `256×1024`, frequency `0..50 Hz`, 256 power levels |
| complex persistence | occurrence `256×1024`, frequency `-50..50 Hz`, centered |

Spectrogram power was real, finite and nonnegative. Persistence occurrence was
finite in `0..100`; every frequency column summed exactly to `100` in the
deterministic probe. Its third axis was positive, sorted linear power, not dB.

Default topology equals explicit `TwoSided=false` for real and `true` for
complex. The provider also accepts complex `TwoSided=false` and returns
one-sided output; product topology therefore must remain stricter than raw
provider permissiveness.

## FrequencyLimits

Both `spectrogram` and `persistence`:

- accepted real `[5,20]` with exact endpoints;
- clipped partial real `[-5,15]` to `0..15`;
- rejected fully outside real `[60,80]` with Nyquist-range `ArgumentError`;
- accepted complex cross-zero `[-20,20]` with exact endpoints.

Frequency axis length remained 1024 while the matrix coupled to the new axis.
This is provider-grid configuration, not post-hoc filtering.

## Segment grid and short inputs

For 256 samples at 100 Hz, auto spectrogram segment centers were
`0.16,0.24,...,2.40 s`. Explicit `OverlapPercent=0,50,75` produced respectively
8, 15 and 29 segments; Auto equalled 75% overlap in this provider/runtime, not
the MATLAB app's documented 50% default. Adding 10 seconds to input time shifted
all returned centers by exactly 10 seconds.

Both representations reject `N=1` and accept `N>=2`. Spectrogram shapes varied
with short-input segmentation; Persistence retained `256×1024` output.

## Persistence NumPowerBins

- `20`, `19` and `256` produced exactly that many occurrence rows/power levels.
- noninteger `20.5` threw `InexactError`.
- Bool `true` was accepted as one bin; product JSON validation must reject Bool.
- `NumPowerBins` on spectrogram was rejected as invalid for that representation.

Bounds beyond these cases remain an open probe item; no product range is frozen.

## Confirmed provider defect

Public `TimeResolution` is broken in this runtime: the minimal spectrogram call
throws `UndefVarError: validateTimeResolution not defined in EngeeDSP.Functions`
from `parseNVPairInputs.jl:172`. It reproduced with and without
`OverlapPercent`; `isdefined(EngeeDSP.Functions,:validateTimeResolution)` is
false. Positive controls `FrequencyResolution` and `OverlapPercent` succeed on
the same function/input/session. See
[`ENGEE-20260801-003`](../../user/engee_bugs/ENGEE-20260801-003-pspectrum-time-resolution-undefined.md).

## C11 consequences

- Do not promote current full-signal heatmap placeholders into a contract.
- First implementation candidate remains typed Spectrogram with no editable
  settings, only after an ADR decides source eligibility, ROI/segment semantics
  and eager versus lazy calculation.
- A TimeResolution control is blocked by the confirmed provider defect; no
  hand-rolled STFT workaround is authorized.
- Persistence remains deferred until its power-axis/density contract and ROI
  segment selection are frozen.

## Official documentation map

- Engee `pspectrum`:
  https://engee.com/helpcenter/stable/en/func-dsp-transforms-correlation-and-modeling/func-pspectrum.html
- MathWorks `pspectrum`:
  https://www.mathworks.com/help/signal/ref/pspectrum.html
- MathWorks Spectrogram Computation:
  https://www.mathworks.com/help/signal/ug/spectrogram-computation-in-signal-analyzer.html
- MathWorks Persistence Spectrum:
  https://www.mathworks.com/help/signal/ug/persistence-spectrum-in-signal-analyzer.html

## Remaining probe matrix

Exact FrequencyResolution/grid relation, subset ROI alignment, persistence
partial-segment behavior, Leakage default/effects, option-order invariance,
NumPowerBins bounds and MinThreshold/Reassign remain unresolved. These do not
block C10 and must not be inferred.
