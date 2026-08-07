# TASK-0056 settings page ownership

Authoritative UI projection: exactly three top-level pages — `Display`, `Time`
and `Measurements`. Backend `/api/settings.groups` remains a functional catalog,
not the UI page list. Existing typed state, field IDs, API/session schemas,
defaults, calculations and Engee behavior do not change.

## API ownership

- All Display, Time and plot-type fields: `GET /api/settings?display_id=...`
  and field-level `POST /api/settings`.
- `measurement_kinds` and `peaks_enabled`: `GET /api/state` and revision-aware
  `POST /api/view`.
- Re-saving an identical typed value is a no-op and does not increment
  `state_revision`.

## Display page

Type-specific controls remain inside Display; Spectrum, Spectrogram and
Persistence are dynamic groups, not top-level pages.

| Field | Default/type | Visibility/state owner |
|---|---|---|
| `display.show_legend` | boolean `true` | all plot types; `stored_settings.display` |
| `spectrum.frequency_units` | FUnit `hertz` | Spectrum; `stored_settings.spectrum` |
| `spectrum.frequency_limits` | optional range `null` | Spectrum/source; `spectrum_settings` |
| `spectrum.y_limits` | optional range `null` | Spectrum stored-only |
| `spectrum.frequency_scale` | `linear` | Spectrum; log disabled for complex member |
| `spectrum.scale` | `db` | Spectrum |
| `spectrum.resolution_type` | `leakage` | Spectrum stored-only |
| `spectrum.leakage` | number `0.5` | Spectrum |
| `spectrum.rbw` | auto/specified Hz | Spectrum + RBW; blocked contract preserved |
| `spectrum.window_length` | auto/specified samples | Spectrum + window length; blocked contract |
| `spectrum.window` | `hamming` | Spectrum + RBW/window length |
| `spectrum.sidelobe_attenuation_db` | number `60` | Chebyshev/Kaiser only |
| `spectrum.overlap_percent` | number `50` | windowed Spectrum |
| `spectrum.nfft` | auto/integer >=2 | window length; blocked contract |
| `spectrogram.time_units` | TUnit `seconds` | Spectrogram type-specific presentation |
| `spectrogram.frequency_units` | FUnit `hertz` | Spectrogram |
| `spectrogram.frequency_limits` | optional range `null` | Spectrogram/source |
| `spectrogram.power_limits` | optional dB range `null` | Spectrogram |
| `spectrogram.frequency_scale` | `linear` | log disabled for complex analysis source |
| `spectrogram.scale` | `db` | Spectrogram |
| `spectrogram.leakage` | number `0.5` | Spectrogram |
| `spectrogram.time_resolution` | auto/specified seconds | source required; provider blocker preserved |
| `spectrogram.overlap_percent` | number `50`, max 75 | Spectrogram |
| `spectrogram.reassign` | boolean `false` | provider blocker preserved |
| `persistence.frequency_units` | FUnit `hertz` | Persistence |
| `persistence.frequency_limits` | optional range `null` | source required; blocked prerequisite |
| `persistence.power_limits` | optional dB range `null` | stored-only |
| `persistence.density_limits` | optional 0–100% range `null` | Persistence |
| `persistence.frequency_scale` | `linear` | stored-only |
| `persistence.scale` | `db` | stored-only |
| `persistence.leakage` | number `0.5` | Persistence |
| `persistence.time_units` | TUnit `seconds` | type-specific presentation |
| `persistence.time_resolution` | auto/specified seconds | source required; blocked contract |
| `persistence.overlap_percent` | number `50` | blocked resource preserved |
| `persistence.power_bins` | auto/integer 20–1024 | stored-only |

Read-only unavailable/milestone-3 values remain visible only as defined by the
design: `spectrum.frequency_resolution`, `spectrogram.actual_rbw`, and
`persistence.rbw`.

TUnit: picoseconds, nanoseconds, microseconds, milliseconds, seconds, minutes,
hours, days, years. FUnit: cycles/year, cycles/day, cycles/hour, cycles/minute,
mHz, Hz, kHz, MHz, GHz, THz. Windows: Blackman-Harris, Chebyshev, Flat-top,
Hamming, Hann, Kaiser, Rectangular.

## Time page

The whole user-shown `Options / Time units / X limits / Y limits` block belongs
to Time. Spectrogram/Persistence time units remain type-specific Display fields.

| Field | Default/type | Visibility/state owner |
|---|---|---|
| `time.normalize_y` | boolean `false` | Time; `stored_settings.time` |
| `time.show_markers` | boolean `false` | Time |
| `time.units` | TUnit `seconds` | Time |
| `time.x_limits` | optional seconds range `null` | Time or Spectrogram/source; `time_limits` |
| `time.y_limits` | optional range `null` | Time; blocked contract preserved |
| `time.link_time` | boolean `false` | Time + at least two Displays; blocked contract |

## Measurements page

| Field | Default/type | Visibility/state owner |
|---|---|---|
| `measurement_kinds` | `minimum, maximum, mean` | all plots; `measurement_selection` |
| `peaks_enabled` | boolean `false` | Time/source; `peaks_enabled` |

Measurement checkboxes are `minimum`, `maximum`, `mean`, `median`,
`peak_to_peak`, `rms`; the backend canonicalizes order and rejects duplicate or
unknown IDs.

## Migration and verification

No persistence or session migration is needed. `/api/view` remains the
compatibility transport for the two Measurements fields; all other settings use
`/api/settings`. `plot_cache`, active-page calculation, DSP and Plotly payloads
are out of TASK-0056 and belong to TASK-0065.

Backender verification: `julia --startup-file=no test/back/runtests.jl` PASS;
backend-owned diff empty; local runtime not started; dependency files untouched.
