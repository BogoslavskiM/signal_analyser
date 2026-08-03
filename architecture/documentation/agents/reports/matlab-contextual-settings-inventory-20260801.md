# MATLAB Signal Analyzer contextual settings inventory

Date: 2026-08-01  
Owner: MATLAB Researcher; persisted by Architect  
Scenario: `SA-UI-011-contextual-settings-inventory`  
Status: live research complete; server scenario saved

## Goal and guardrails

Inventory the exact visible Signal Analyzer R2024b Time, Spectrum,
Spectrogram and Persistence Spectrum settings surfaces. The researcher reused
one existing window and a deterministic 15-sample, 1 Hz real timetable signal.
All GUI actions used the existing `matlab_clicker` server with exclusive mouse
and restoration. MATLAB Help, Documentation, Learn and Add-On Explorer were
not opened; official documentation came from ordinary public web requests.

No Command Window text was typed. The mandatory future command cycle remains:
focus, pre-input Enter, inspect/force/reconfirm English/ASCII, type, visually
verify exact text, execution Enter.

## Exact live inventory

### Time

- Options: Normalize Y Axis and Show Markers; both off in the observed state.
- Time limits: Units, Min, Max. Unit order is `ps`, `ns`, `μs`, `ms`, `s`,
  `minutes`, `hours`, `days`, `years`.
- Y-axis Min/Max exists. Fixture scientific values were clipped and are not
  treated as defaults.

### Spectrum

- Frequency Units order: `cycles/year`, `cycles/day`, `cycles/hour`,
  `cycles/minute`, `mHz`, `Hz`, `kHz`, `MHz`, `GHz`, `THz`.
- Frequency limits and Y-axis limits both exist.
- Scale contains Frequency Scale and `Spectrum in dB`.
- Resolution Type: Leakage, RBW (Hz), Window Length.
- RBW mode exposes Bandwidth Auto/Specify, Window Options and derived
  Frequency Resolution. Observed current Window Options were Hamming,
  Sidelobe Attenuation 60 dB disabled for Hamming, and Overlap 50%.
- Official Window enum: Blackman-Harris, Chebyshev, Flat-top, Hamming, Hann,
  Kaiser, Rectangular. Chebyshev attenuation is at least 45 dB; Kaiser at least
  21 dB; overlap is below 100%.
- Leakage is a Min-to-Max slider without numeric readout; the product canonical
  normalized value must not be inferred from slider pixels.

### Spectrogram

- Groups: Time Limits, Frequency Limits, Power Limits, Scale, Leakage, Time
  Resolution, Frequency Resolution, Options.
- Scale contains Frequency Scale and `Spectrum in dB`.
- Time Resolution contains Auto/Specify, requested Resolution with unit, and
  active Overlap. The fixture showed derived 8 s and 50.00% overlap.
- Frequency Resolution is read-only `Actual RBW`; fixture value 320.8432 mHz.
- Options contains only Reassign, off in the observed state.

### Persistence Spectrum

- Creation requires selecting `Persistence Spectrum — View persistence
  spectrum of a signal` from the Spectrum split menu. Open-and-select had to be
  atomic in one clicker run because the popup does not survive requests.
- Groups: Frequency Limits, Power Limits, Density Limits, Scale, Leakage, Time
  Resolution, Power Bins, Frequency Resolution.
- Scale showed Linear and `Spectrum in dB` on the real fixture.
- Time Resolution contains Auto/Specify, requested Resolution with unit and
  Overlap; fixture derived 8 s and 50.00%.
- Power Bins is Auto/Specify with a bounded Min-to-Max slider. It exposes no
  numeric count readout. Official `pspectrum` defines `NumPowerBins` default
  256 and allowed integer range 20..1024; those numbers are documentation
  evidence, not a live GUI readout.
- Frequency Resolution is read-only `RBW`; fixture value 320.8432 mHz.
- Reassign, Minimum Threshold and Fit Colormap were absent from this contextual
  tab and must not be claimed as current menu parity.

## Product consequences

- Model requested values per analysis view with typed Auto/Specify dependency.
- Keep requested settings distinct from read-only derived RBW.
- Treat clipped auto-derived limits as unknown/null, not copied defaults.
- Preserve normalized Leakage as a dimensionless product setting.
- New requested values stay storage-only until a separate application ADR.
- Existing accepted setting effects remain effective; this inventory does not
  require disabling them.
- Use stable accessible selectors and inline status/error descriptions.

These consequences are frozen in
[DEC-040](../../user/decisions/DEC-20260801-040-complete-settings-storage.md).

## Evidence and verification

Raw clicker responses and screenshots are under
`/private/tmp/signal-analyser-matlab-bootstrap-20260801-1935/` and
`/private/tmp/matlab-settings-*` for the active session. Every meaningful state
was visually inspected. Persistence Power Bins was restored to Auto after its
dependency check. One accessibility request showed that the CEF tree did not
expose internal clipped field values and was not repeated.

The researcher completed the required direct in-memory POST
`/research/scenarios` without a repository or temporary request-body file:

- created: `true`;
- local path:
  `/Users/makar/work/matlab_clicker/research_output/signal-analyzer-reference-scenarios/scenarios/SA-UI-011-contextual-settings-inventory.md`;
- bytes: `17379`;
- SHA-256:
  `bed9c49661b259b94c7f8c009fef22032af8d223b4bd0c6a70c45bd89dbfb259`;
- available in bootstrap: `true`.

The path is reserved for the feature-level E2E handoff after Backend,
Frontend, ordinary regression and interaction design review are complete.

## Official sources

- https://www.mathworks.com/help/signal/ug/customize-signal-analyzer.html
- https://www.mathworks.com/help/signal/ug/spectrum-computation-in-signal-analyzer.html
- https://www.mathworks.com/help/signal/ug/spectrogram-computation-in-signal-analyzer.html
- https://www.mathworks.com/help/signal/ug/persistence-spectrum-in-signal-analyzer.html
- https://www.mathworks.com/help/signal/ref/pspectrum.html
