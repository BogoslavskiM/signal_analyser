# Settings application milestone research

Date: `2026-08-01`
Role: Architect
Status: research complete; implementation contracts not yet accepted

## Goal

Map every DEC-040 requested setting to its effective presentation, provider,
query, cache and readout behavior before milestone-3 code changes.

## Evidence

- Current official MathWorks Signal Analyzer, `pspectrum`, `pwelch`, `enbw`
  and duration documentation.
- Existing R2024b scenario `SA-UI-011-contextual-settings-inventory.md`.
- Pinned production evidence: Engee `26.7.2`, Julia `1.12.4`, EngeeDSP
  `0.72.0`.
- Current typed provider/query/cache implementation and prior DEC-013,
  DEC-015..029 and DEC-040 decisions.

The MATLAB clicker server became unavailable during this research. Health and
bootstrap refused connections; restart was rejected by the platform
usage-limit authority. Documentation research continued without GUI actions or
an indirect restart.

## Accepted research conclusions

- Unit selectors are canonical input/output conversion only. Seconds and Hz
  remain backend canonical; unit changes do not alter provider queries or raw
  caches. MATLAB fixed-year conversion is `31_556_952` seconds.
- Spectrum Leakage remains the current effective `pspectrum` path. RBW and
  Window Length modes require a distinct Welch-style provider contract with
  typed active variants; they cannot be implemented by merely passing a
  `FrequencyResolution` option to the current power `pspectrum` path.
- Current official Signal Analyzer documents DFT Points/NFFT in Window Length
  mode. DEC-040 therefore includes it as a 41st typed stored-only field.
- Spectrogram `scale` is the smallest safe graph-affecting cascade: cached raw
  nonnegative power already exists, so dB/linear projection changes no Engee
  call or raw-cache identity.
- Presentation bounds/scales must use full raw data, not the bounded wire
  matrix. Power limits stay canonical dB and require explicit conversion when
  rendered on a linear scale. Density limits remain percent.
- Derived Spectrum Frequency Resolution, Spectrogram Actual RBW and
  Persistence RBW are not frequency-bin spacing. Engee power mode currently
  returns no usable RBW metadata; typed provider/enbw proof is required.
- Spectrogram Time Resolution and Reassign remain blocked by confirmed
  `ENGEE-20260801-003` and `ENGEE-20260801-004` respectively.
- Persistence segmentation remains resource-blocked. Settings GET and inactive
  changes must never materialize Persistence implicitly.
- Spectrogram overlap remains product-limited to `0..75` by DEC-018 resource
  evidence even though MATLAB and the public provider allow values below 100.
- Link Time is a cross-Display topology/transaction feature, not a scalar
  renderer flag.

## Required cascade order

1. Canonical unit projection for the six Time/Frequency unit fields.
2. Spectrogram dB/linear scale over authoritative raw power.
3. Presentation bounds: Persistence Density, then coupled Persistence
   Scale/Power Limits, then a separately defined Spectrum Y limit convention.
4. Remaining topology presentation: Persistence Frequency Scale and Time Y
   Limits after their contracts.
5. Link Time after a linked-Display transaction/topology decision.
6. Persistence Power Bins only after bounded prod equivalence/resource proof.
7. Spectrum RBW/Window Length/window/attenuation/overlap/NFFT as one typed
   resolution aggregate after a proven public Engee Welch/power route.
8. Spectrogram Time Resolution/Reassign only after an upstream fixed build.
9. Persistence segmentation/Frequency Limits/Overlap/RBW after successors to
   DEC-026..028.

Optimization such as choosing `Plotly.relayout` over conservative
`Plotly.react` remains last. Application correctness, requested/effective
metadata and rollback are frozen first.

## Test boundary

Every promoted field must prove either:

- a typed provider/query/cache change with authoritative output/readout; or
- an exact presentation transformation with zero provider/raw-cache change.

Ordinary tests precede one coherent milestone E2E. Engee contract tests are
required for any new public DSP option/provider path; missing provider behavior
must remain blocked rather than receive a hand-written numerical fallback.

## Open contracts

- Exact unit conversion/formatting behavior in controls and axis labels.
- Spectrogram scale zero handling, power-label wording and dB Power Limits
  projection.
- Spectrum and Time ordinate-limit canonical semantics.
- Persistence complex Log effective fallback and Auto Power Bins result.
- A public Engee Welch/power/enbw route and algorithm epoch for Spectrum
  resolution modes/readout.
