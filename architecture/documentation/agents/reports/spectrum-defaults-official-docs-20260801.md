# SA-GRAPH-001: Spectrum defaults from official MathWorks documentation

Date: 2026-08-01
Role: MATLAB Researcher (`/root/matlab_c23_spectrum_defaults`)
Method: direct official web documentation only; MATLAB GUI, Command Window,
Add-On Explorer, clicker and server were not touched.

## Confirmed contract

- Signal Analyzer displays a power spectrum in dB by default; conversion is
  `10*log10(power)`. Linear mode exposes power, not amplitude or PSD.
- Frequency is expressed in Hz when time/sample-rate metadata exists and in
  normalized rad/sample otherwise. The initial engineering prefix is not
  documented.
- Linear and Log frequency scales exist. Complex signals use a centered
  two-sided spectrum and do not support Log. The fresh-app Linear/Log default
  is not explicitly documented.
- `pspectrum` Leakage is dimensionless, accepts `[0,1]` and defaults to `0.5`.
  Official app prose is ambiguous about the displayed UI scale: one tutorial
  uses a value of `32`, so no 0..100 mapping or percent label is claimed.
- Resolution bandwidth is data-dependent, not a fixed product constant:
  `max(ENBW / record_length, frequency_span / 4095)` for the documented
  Leakage-controlled computation. Tutorial values near 1.28 Hz are
  fixture-specific.
- Default frequency domains are `[0, Fs/2]` for real input and centered
  `[-Fs/2, Fs/2]` for complex input; normalized forms are `[0, pi]` and
  `[-pi, pi]` rad/sample.

## Product direction

Keep dB as a power-spectrum representation and never label it PSD or calibrated
SPL/dBV/dBFS without a separate contract. Keep provider Leakage canonical on
`[0,1]`. Compute RBW from actual signal/window/span inputs. Treat fresh
Linear/Log selection, prefix formatting, app Leakage readout mapping, initial
resolution mode and invalid frequency-field behavior as unresolved rather than
copying an example screenshot.

## Version and evidence limits

The full Leakage/RBW/Window Length control model requires R2023b or later.
Current 2026 Help was used; settings without an individual `Since` annotation
are not assigned an unverified earliest release. No live application behavior
was observed, so documentation examples are not recorded as GUI evidence.

## Official sources

- [Explore Signals in Signal Analyzer](https://www.mathworks.com/help/signal/ug/explore-signals.html)
- [Spectrum Computation in Signal Analyzer](https://www.mathworks.com/help/signal/ug/spectrum-computation-in-signal-analyzer.html)
- [`pspectrum`](https://www.mathworks.com/help/signal/ref/pspectrum.html)
- [Customize Signal Analyzer](https://www.mathworks.com/help/signal/ug/customize-signal-analyzer.html)
- [Resolve Tones by Varying Window Leakage](https://www.mathworks.com/help/signal/ug/resolve-tones-by-varying-window-leakage.html)
- [Compute Signal Spectrum Using Different Windows](https://www.mathworks.com/help/signal/ug/compute-signal-spectrum-using-different-windows.html)

## Follow-up

Only after the unsafe prior Command Window state is explicitly cleared: one
bounded fresh-session observation may resolve initial frequency scale/prefix,
Leakage UI mapping, resolution mode and invalid-limit behavior. Until then no
MATLAB/clicker action is authorized or needed.
