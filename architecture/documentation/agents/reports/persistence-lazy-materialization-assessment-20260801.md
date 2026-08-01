# Persistence lazy materialization assessment — 2026-08-01

Status: read-only architecture evidence; consumed by DEC-029

## Current graph

The C18/C19 service materializes missing Persistence data on direct snapshot
even when Time, Spectrum or Spectrogram is active. Display create/select/close
and source/Leakage planner paths also prepare Persistence independently of the
prospective active plot. Repeated responses reuse cache, but initial GET can
pay the C22 omitted-overlap cost.

Only one analysis source is computed. The four-cache prepared aggregate already
accepts an empty Persistence map; eagerness is planner/default policy rather
than an OOP requirement.

## Accepted containment direction

Persistence is required only when the prospective Display has active plot
Persistence, a non-null analysis source and at least two samples. Inactive
responses always return typed-empty Persistence arrays, even if raw data is
warm. Raw cache is retained and reused on return.

The exact wire is preserved. `plots.persistence` keeps
`type,x,y,z,x_label,y_label,color_label`; `plot_payload.persistence` keeps the
same plus `signal,name,color`. Inactive nonempty Display retains source
provenance and labels with `x=[]`, `y=[]`, `z=[]`. No deferred/status/overlap
field is added.

Cold active transition prepares and validates the full prospective display
aggregate before plot/revision/four-cache publication. Switch away produces
empty presentation without eviction; return warm-reuses. Inactive source or
Leakage changes save intent/revision without provider; active changes retain
atomic preparation. Clear and N<2 remain no-provider.

## Boundary

This contains accidental inactive/startup work but does not make active
Persistence safe. No cancellation, eviction, custom DSP, provider option,
query math, Frequency Limits or Overlap change is authorized. Expected runtime
ownership is `lib/services/signal_analyser_service.jl`; API/routes/domain and
frontend schemas stay unchanged.
