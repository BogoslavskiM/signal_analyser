# Intake: pspectrum TimeResolution calls undefined validator

Status: isolated and promoted to confirmed client record
Canonical record:
[`ENGEE-20260801-003`](../../user/engee_bugs/ENGEE-20260801-003-pspectrum-time-resolution-undefined.md)

surface: `EngeeDSP.Functions.pspectrum`, `TimeResolution` name-value option.
environment: Engee prod MIND, Julia 1.12.4, EngeeDSP platform Manifest 0.72.0,
UUID `f9bbbd0e-0dd6-4072-898a-88f8f1250a99`, source tree `XobDm`.
minimal_reproduction: Real finite 256-sample 100 Hz cosine and matching time
vector; call `pspectrum(x,t,"spectrogram","TimeResolution",0.64)`.
expected: Documented explicit time resolution is validated and applied.
actual: `UndefVarError: validateTimeResolution not defined in
EngeeDSP.Functions`, `parseNVPairInputs.jl:172`.
frequency: Repeated with TimeResolution alone and with OverlapPercent.
isolation: `isdefined(...,:validateTimeResolution)==false`; same-session
FrequencyResolution and OverlapPercent controls succeed; no Genie/app/test/
network layer participates.
severity: Medium for future configurable Spectrogram/Persistence; no impact on
current C10 Spectrum Frequency Limits.
workaround: Do not expose TimeResolution. No hand-rolled DSP fallback.
regression: Add a target contract only after upstream fix/version evidence.
