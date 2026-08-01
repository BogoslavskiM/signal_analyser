# Intake: Spectrogram Nyquist-touch can return a degenerate frequency grid

Status: suspected; not promoted

surface: `EngeeDSP.Functions.pspectrum`, Spectrogram `FrequencyLimits`.
environment: Engee prod, Julia 1.12.4, EngeeDSP UUID
`f9bbbd0e-0dd6-4072-898a-88f8f1250a99`, source tree `XobDm`.
minimal_reproduction: Fs=100, N=256 real input and `FrequencyLimits=[50,60]`
with Leakage .5, Overlap 50, TwoSided false.
expected_ambiguity: reject a boundary-only intersection or return a strictly
increasing usable axis; upstream contract at floating Nyquist touch is unclear.
actual: 1024×15 accepted output; frequency has two unique values and 1022
zero-width steps from 50 to 50.00000000000001.
frequency: 3/3; analogous complex upper/lower cases reproduce.
isolation: N=2/N=16 infer exact Fs and reject; N=256 inferred Fs has epsilon
excess. No app/test/network layer involved.
impact: unusable heatmap axis if product delegates partial/boundary validation.
workaround: product requires the full interval inside authoritative topology.
promotion_gate: clarify expected boundary semantics and reproduce on a pinned
fixed/current Engee build before classifying as confirmed.
