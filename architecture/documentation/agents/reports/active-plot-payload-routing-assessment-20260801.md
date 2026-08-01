# Active plot payload routing assessment

Date: 2026-08-01

Role: Architect

Status: contract assessment complete; implementation and deployment not claimed

## Scope

This assessment freezes only the active `plot_payload` routing envelope for
Cascade 29. It deliberately excludes numeric payload validity, Plotly geometry,
axes, labels, colors, math, `plots`, `panel`, settings, Measurements, Peaks and
inactive-branch internals.

## Authoritative backend facts

The active Display serializer publishes `prepared_display_plots.plot_payload`
at snapshot root. Both nonempty and empty preparation paths construct a
`Dict{String,Any}` with exactly six keys:

```text
selected_signal
visible_signals
time_traces
spectrum_traces
spectrogram
persistence
```

For a nonempty Display, `selected_signal` is the canonical analysis source and
`visible_signals` is the ordered membership. Time and Spectrum traces are
appended in global inventory order after filtering by membership. Each trace,
Spectrogram payload and Persistence payload receives an owned `signal` field
from `signal_analyser_plot_for_payload`.

For an empty Display, the serializer emits `selected_signal=nothing`, an empty
membership and empty Time/Spectrum arrays. Spectrogram and Persistence remain
objects and receive `signal=nothing`. Existing backend tests assert the exact
outer keyset, selection projections, ordered traces and heatmap sources.

Evidence:

- `lib/services/signal_analyser_service.jl:622-730`
- `lib/services/signal_analyser_service.jl:733-772`
- `lib/services/signal_analyser_service.jl:945-989`
- `lib/services/signal_analyser_service.jl:1019-1045`
- `lib/services/signal_analyser_service.jl:2083-2144`
- `test/back/lib/signal_analyser_service_test.jl:448-465`
- `test/back/lib/signal_analyser_service_test.jl:512-570`
- `test/back/lib/signal_analyser_service_test.jl:1087-1106`
- `test/back/lib/signal_analyser_service_test.jl:1830-1843`

## Current frontend gap

Facts from the current frontend:

1. Snapshot acceptance validates the global envelope, Display selection and
   `active_plot`, but has no `plot_payload` boundary.
2. `normalize()` accepts any truthy object-like value, including arrays, and
   fabricates `{}` for missing/malformed `plots` or `plot_payload`.
3. `currentPayload()` routes Time/Spectrum through trace arrays only when they
   happen to be arrays, otherwise falling back to `plots[active_plot]`.
4. Spectrogram/Persistence merge the corresponding `plots` object with the
   direct branch and therefore also accept the base plot as fallback.
5. `traceName()` permits `name` to substitute for `signal`.
6. Existing C27/C28 local quarantine already provides per-ID queue purge and a
   generation-aware shared-host boundary, but no C29 error class exists.

The ordinary frontend fixture publishes only `time_traces` in `plot_payload`,
so it does not represent the exact backend envelope. The empty fixture also
contains an additional `analysis_signal` key. These are test-fixture gaps to be
corrected during implementation, not response compatibility evidence.

Evidence:

- `public/js/app.js:11-25`
- `public/js/app.js:28-37`
- `public/js/app.js:52`
- `public/js/app.js:64-77`
- `public/js/app.js:81`
- `public/js/app.js:95-100`
- `test/front/public/js/app.behavior.test.js:22-79`
- `test/front/public/js/app.behavior.test.js:675-829`

## Frozen validation order

1. Apply DEC-032 global envelope validation.
2. Apply DEC-033 selection validation. A real root/active Display selection
   projection mismatch is global fatal here.
3. Apply DEC-034 `active_plot` validation.
4. If the active Display is already C27- or C28-quarantined, skip every C29
   field check. Preserve the earlier local error and precedence.
5. Otherwise require `plot_payload` to be a non-null, non-array plain object
   with the exact six-key set.
6. Require `plot_payload.selected_signal` and ordered
   `plot_payload.visible_signals` to equal the already-valid active/root
   selection projections. A mismatch here is a local C29 payload quarantine;
   it is not a second global selection class.
7. Validate only the branch selected by the already-valid `active_plot`.

This distinction resolves the apparent projection ambiguity: DEC-033 owns
root-versus-Display consistency and remains global. C29 owns
payload-versus-already-valid-projection consistency and is local to the active
Display.

## Frozen active routing matrix

| Active plot | Active wire | Required routing evidence |
| --- | --- | --- |
| `time` | `time_traces` | array; length equals ordered visible membership; each entry is a plain object with owned `signal` equal to the corresponding membership name |
| `spectrum` | `spectrum_traces` | same cardinality, order and owned-source rule |
| `spectrogram` | `spectrogram` | plain object with owned `signal` equal to the canonical selected source |
| `persistence` | `persistence` | plain object with owned `signal` equal to the canonical selected source |

No `name` alias is accepted. Inactive branch values are ignored after their
keys satisfy the exact outer envelope. Their type, metadata and content are not
validated in C29.

Routing-canonical empty state is explicit: null selected source plus empty
ordered membership; empty array for active Time/Spectrum, or an active
Spectrogram/Persistence object with owned `signal=null`. No x/y/z statement is
made by this routing-level empty contract.

## Frozen failure and lifecycle behavior

An exact-envelope, payload-projection or active-branch failure quarantines only
the active Display ID. It must:

- purge desired/queued/pending/stale-replay View work for that ID;
- issue zero new View POST/replay from the quarantined state;
- invalidate the shared Plotly generation, purge the host and prevent late
  settlement from changing the local error/readiness;
- render exactly
  `data-testid="display-active-plot-payload-contract-error-state"`,
  `role="alert"`, text
  `Некорректные данные активного графика в ответе сервера.`;
- never route through `plots`, another branch, a previous payload, `name`, or a
  fabricated empty value.

Topology actions may continue on validated IDs. A malformed authoritative
`200` or `409 current` discards the target Display's View work without replay
while independent valid-Display work may continue. A later authoritative valid
snapshot clears only that Display's C29 quarantine and never resurrects its
discarded intent. Prior DEC-033 global root corruption keeps the full DEC-032
reset/Retry lifecycle.

`panel`, settings, Measurements and Peaks are not validation inputs to C29.
Existing independent contracts and presentation behavior are not redefined by
this assessment.

## No-fallback implementation contract

The future router must select the active branch directly and fail closed. It
must not merge it with `state.plots[plot]`, search inactive branches, retain a
previous payload or fabricate `{}`/`[]`. `plots` remains on the wire but is not
an active graph routing source under C29.

## Planned deterministic matrix

- exact six-key outer shape: missing, extra, null, array and primitive cases;
- active/root-valid payload projection equality and every mismatch/type class;
- all four active routes, branch container type, cardinality, source order,
  missing owned `signal` and wrong `signal`;
- `name` present with missing/wrong `signal` still fails;
- canonical empty route for each of four plots;
- malformed inactive branches are accepted and never inspected;
- valid `plots` plus malformed active payload proves there is no fallback;
- C27/C28 active precedence skips C29 field validation and preserves the
  earlier selector/error;
- initial, successful `200`, `409 current`, A/B isolation and authoritative
  recovery with exact per-ID queue behavior;
- controlled deferred Plotly settlement leaves the C29 local alert and
  readiness authoritative without unbounded reassertion.

The ordinary fixture must publish the exact six-key shape before mutations.
Targeted tests must not auto-heal the field under test.

## MATLAB documented direction and Genie inference

Official MathWorks documentation states that Signal Analyzer can visualize
multiple waveform, spectrum, persistence and spectrogram representations
simultaneously. Its workflow uses a Display Grid and different displays to
place Time beside Spectrum/Persistence/Spectrogram; Spectrogram and Persistence
are documented as one-signal-per-display views.

Sources:

- https://www.mathworks.com/help/signal/ref/signalanalyzer-app.html
- https://www.mathworks.com/help/signal/ug/explore-signals.html

Inference, not a MathWorks fact: Genie's current `active_plot` enum and one
shared Plotly host define a one-active-plot-per-Display abstraction. Therefore
C29 should select exactly one payload route instead of trying to validate or
render a MATLAB-style simultaneous multi-view set. This inference does not
claim behavioral, numeric or layout parity with MATLAB.

## Deliberate exclusions and risks

C29 does not validate x/y/z, finiteness, shape, heatmap matrix geometry, plot
types, axes, scales, math, normalization, metadata keysets, names/labels,
colors, `plots`, `panel`, settings, Measurements, Peaks or inactive-branch
internals. Accepting inactive malformed internals is intentional and must not be
misread as a future compatibility promise.

The principal implementation risk is accidentally reusing permissive
`currentPayload()` or `traceName()` and retaining a fallback. A second risk is
running C29 before C27/C28 and changing the established local/global error
precedence. Both require explicit negative tests.

## Outcome

This assessment authorizes a future frontend/test implementation only. It does
not claim product or test changes, runtime verification, backend/API changes,
deployment, MATLAB GUI evidence, Engee defect evidence or mathematics changes.
