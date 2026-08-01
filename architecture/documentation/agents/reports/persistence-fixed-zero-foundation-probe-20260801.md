# Persistence fixed-zero segmentation foundation probe — 2026-08-01

Status: resource guard triggered; foundation NO-GO

## Boundary

- Prod Engee MIND, Julia `1.12.4`, EngeeDSP `0.72.0`, UUID
  `f9bbbd0e-0dd6-4072-898a-88f8f1250a99`, tree
  `4941c08f227519cbc82caab7bc519851f44b0586`.
- Deterministic real `N=64`, `Fs=100 Hz` transient fixture, Leakage `0.5`,
  NumPowerBins `256`, real one-sided topology.
- Pure in-memory public `pspectrum`; no repository, model, files, dependency,
  deploy, MATLAB or browser mutation.

The safety ladder was required to stop at the first >512 MiB observation. It
therefore did not reach complex input, Leakage endpoints, repeats, N128/N256,
option orders, Frequency Limits composition or short boundaries.

## Matched result

| Policy | Allocated | Elapsed | Output |
| --- | ---: | ---: | --- |
| future explicit `OverlapPercent=0` | 369.33 MiB | 1.530 s | 256×1024 occurrence |
| current omitted OverlapPercent | **1231.86 MiB** | **6.137 s** | 256×1024 occurrence |

Both paths preserved finite strict real frequency `0..50 Hz`, positive power,
finite occurrence and percentage column normalization. They were not
numerically equivalent:

- max frequency delta `0`;
- max power delta `1.2797984377582248`;
- max occurrence delta `50`.

On this single pair explicit zero allocated about 3.34× less and completed
about 4.01× faster, but it is a breaking numerical policy, not transparent
optimization.

## Decision consequence

The first omitted call crossed the guard by 2.41×. The incomplete real/complex,
Leakage, repeat, order and size evidence cannot support a fixed-zero foundation
ADR. A bare provider literal would also let old omitted cache entries alias new
zero semantics.

Any future exceptional reconsideration requires an explicit algorithm-policy
epoch in query/cache identity, exact adapter-order evidence, numerical
rebaseline of C18/C19, cold backend restart and disclosed non-parity product
policy. No overlap API/UI field is authorized.

Current omitted Persistence also has an operational resource risk even at
N=64. The next safe investigation is semantic-preserving lazy/materialization
containment, not a hidden algorithm change or larger omitted-overlap probe.

## Cleanup and sources

Retained arrays were cleared; post-cleanup live bytes `71,548,920`. Pod stop
returned 204 and follow-up confirmed `stopped` at
`2026-08-01T08:10:00.996821`. No Engee bug is claimed.

- MathWorks `pspectrum`:
  https://www.mathworks.com/help/signal/ref/pspectrum.html
- MathWorks Persistence Spectrum:
  https://www.mathworks.com/help/signal/ug/persistence-spectrum-in-signal-analyzer.html
- Engee `pspectrum`:
  https://engee.com/helpcenter/stable/en/func-dsp-transforms-correlation-and-modeling/func-pspectrum.html
