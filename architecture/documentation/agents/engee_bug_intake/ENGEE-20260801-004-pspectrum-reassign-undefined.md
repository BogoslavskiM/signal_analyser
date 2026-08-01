# Intake: pspectrum Reassign calls undefined relocation helper

Status: isolated and promoted to confirmed client record
Canonical record:
[`ENGEE-20260801-004`](../../user/engee_bugs/ENGEE-20260801-004-pspectrum-reassign-undefined.md)

surface: `EngeeDSP.Functions.pspectrum`, Spectrogram `Reassign=true`.
environment: Engee prod 26.7.2, Julia 1.12.4, EngeeDSP UUID
`f9bbbd0e-0dd6-4072-898a-88f8f1250a99`, source tree `XobDm`.
minimal_reproduction: 512-sample finite real 73 Hz sine at 1 kHz; public
`pspectrum(x,t,"spectrogram","Reassign",true,"Leakage",0.5,
"OverlapPercent",50,"TwoSided",false)`.
expected: Documented reassigned Spectrogram tuple.
actual: `UndefVarError: fetchTimeReassignment not defined in
EngeeDSP.Functions`, `computeSpectrogram.jl:375` via `pspectrum.jl:50`.
frequency: 28/28 valid true calls failed.
isolation: real/complex, one-/two-sided, option order, Leakage 0/.5/1 and
N=2..4096 all fail identically; omitted/false succeeds deterministically.
severity: High for any Reassign feature; current product does not expose it.
workaround: Omit Reassign or pass false. No silent downgrade or custom DSP.
regression: After upstream fix, require true output/axes/power/determinism tests.
