# EngeeDSP 0.72.0 `pspectrum` accepts documented-invalid option combinations

status: confirmed  
stub_authorization: false

## Environment and public contract

- Environment: production `https://engee.com`, Julia `1.12.4`.
- Public function: `EngeeDSP.Functions.pspectrum`.
- Observed public method: `pspectrum(x, varargin...; out)`; `out=:data` is the
  documented default.
- EngeeDSP identity from the production system Manifest:
  UUID `f9bbbd0e-0dd6-4072-898a-88f8f1250a99`, version `0.72.0`, revision
  `master`, tree `4941c08f227519cbc82caab7bc519851f44b0586`, source
  `https://gitlab.kpm-ritm.ru/engee/backend/kernels/engeelibraries/EngeeDSP.jl.git`.
- Contract sources:
  - Engee: <https://engee.com/helpcenter/stable/en/func-dsp-transforms-correlation-and-modeling/func-pspectrum.html>
  - MATLAB reference: <https://www.mathworks.com/help/signal/ref/pspectrum.html>

Both official contracts state that `TwoSided=false` is valid only for real
signals and that `NumPowerBins` is an integer in the inclusive range
`20:1024`.

## Affected application call sites

- `lib/services/signal_analyser_service.jl:2131` — Spectrum `power` call.
- `lib/services/signal_analyser_service.jl:2264` — Spectrogram call.
- `lib/services/signal_analyser_service.jl:2435` — Persistence call.

The current adapters do not dispatch the failing combinations: complex inputs
always use `TwoSided=true`, and Persistence fixes `NumPowerBins=256`.
Therefore this provider defect does not block the supported product slice and
does not justify a product stub.

## Minimal reproduction

Run in the project-selected production worker with EngeeDSP 0.72.0:

```julia
import EngeeDSP
pspectrum = EngeeDSP.Functions.pspectrum

fs = 256.0
t = collect(0:255) ./ fs
complex_signal = cis.(2pi .* 32.0 .* t)
real_signal = real.(complex_signal)

pspectrum(complex_signal, t, "power", "TwoSided", false)
pspectrum(real_signal, t, "persistence", "NumPowerBins", 19, "TwoSided", false)
pspectrum(real_signal, t, "persistence", "NumPowerBins", 1025, "TwoSided", false)
```

Expected: each call rejects its documented-invalid input.  
Actual: no exception is thrown. The first call returns power/frequency arrays;
the Persistence calls return occurrence matrices with respectively 19 and
1025 rows.

## Persistent evidence and localization

- Regression: `test/engee/engee_package_contract_tests.jl`, testset
  `HND-0413 documented validation regressions`.
- Production result: the three assertions fail with `Expected: Exception; No
  exception thrown`. All 343 supported `pspectrum` assertions pass.
- Repeatability: each case was reproduced by a direct production probe and by
  the uploaded byte-identical persistent suite.
- Isolation: input option validation. Supported numerical algorithms, result
  conversion and output orientation pass independently.
- Side effects/cleanup: none; calls are pure data calculations.

## Impact and workaround

Future callers can unknowingly request an unsupported complex one-sided
estimate or an out-of-contract persistence-bin count. Validate the
real/complex topology and `20 <= NumPowerBins <= 1024` before dispatch. The
current application already does so by construction.

No product fallback, unavailable stub, commented Engee call or recovery edit
is authorized.

## Recovery trigger

After an EngeeDSP fix, rerun the unchanged
`HND-0413 documented validation regressions` testset. Recovery is established
only when all three calls throw without changing the expected contract. There
is no adjacent product stub to remove or Engee call to uncomment.

## Unresolved

- Reverify against a separately project-locked EngeeDSP `0.74.0` environment
  if production restores that version; this report is scoped to observed
  production version `0.72.0`.
