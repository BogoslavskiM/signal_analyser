# Active plot snapshot boundary assessment

Date: 2026-08-01

Role: Architect (`/root/architect_c28_plot_snapshot`)

## Authoritative contract trace

[DEC-009](../../user/decisions/DEC-20260731-009-display-pages.md) assigns every
Display its own `active_plot`. The domain closes that state over four enum
members and stores it as a typed field of `SignalAnalyserDisplayState`. The
serializer always emits its exact lowercase wire name for every Display and
repeats the active Display value at snapshot root. Active-Display synchronization
copies the typed page value into `state.view.active_plot` before root
serialization.

The request validator is intentionally different: absent request-side
`active_plot` preserves the current page value, while a present value must be
one of the same four strings. This optional mutation field is not evidence for
response-side absence compatibility. Backend snapshot tests include root
`active_plot` in the exact keyset and assert the initial `time` projection.

## Frontend gap

The frontend already declares the four wire values, but `normalize()` maps any
per-Display value outside that array to `time`. The fabricated value reaches
titles, plot selection, payload choice and the complete `viewTarget()` request.
Root `active_plot` is not retained or compared with the active Display.

The current frontend test helper also omits root `active_plot`, unlike the
backend snapshot contract. That is a mock gap to correct when implementing the
boundary, not a reason to retain response fallback.

## Frozen boundary

After DEC-032 envelope validation and before normalize:

1. Require each Display to own a primitive-string `active_plot` exactly equal to
   `time`, `spectrum`, `spectrogram` or `persistence`. No default, trimming,
   case conversion, previous-value or root fallback is allowed.
2. Record malformed Display values as per-ID plot quarantine. Preserve topology,
   inventory, row and valid other Displays, but never serialize a View target or
   render graph/panel/Measurements/Peaks from the quarantined page.
3. If the active Display plot is valid, require an owned primitive-string root
   `active_plot` that exactly equals it. Missing/type/unknown/mismatch is global
   fatal through DEC-032.
4. If the active Display plot is malformed, ignore root `active_plot`; retain
   local quarantine. The precedence is specific to this projection and does not
   suppress independent DEC-033 selection validation.
5. Entering active plot quarantine invalidates the DEC-030 host generation,
   clears the shared Plotly host and keeps the stable local error authoritative
   after any already-started render settles.

Topology operations may continue because they serialize validated Display IDs,
not the invalid View block. Request-side omission remains unchanged.

## Frozen lifecycle matrix

- Initial per-Display corruption: local quarantine, exact visible error, zero
  View POST; inactive A does not affect valid active B.
- Initial valid-active root corruption: full DEC-032 reset, zero POST and Retry
  GET only. Invalid active Display suppresses only root plot validation.
- Successful `200`: purge desired/queued/pending/replay View work only for each
  invalid Display and continue independent valid-display work from the accepted
  revision. Root corruption purges all.
- `409 current`: never replay an invalid target; independent valid-display work
  may continue. Root corruption is global fatal/no replay.
- Later valid authoritative state clears only the corresponding local quarantine
  and never resurrects discarded work. Global recovery remains Retry-only.
- A controlled deferred-Plotly settlement must leave the local error/readiness
  unchanged and bounded, extending the DEC-030 matrix.

## Deliberate exclusions

C28 validates only per-Display and root state projections of `active_plot`. It
does not validate `panel.active_plot`, panel title/fields, `plots`,
`plot_payload`, trace/heatmap topology or data, settings, selection metadata in
payloads, Measurements, Peaks, DSP or mathematics. This avoids coupling a state
enum boundary to lazy Persistence materialization or future typed payload
contracts.

## Contradictions and implementation risks

- The frontend mock snapshot lacks root `active_plot`, while the backend exact
  snapshot keyset requires it. The helper must emit the valid active projection
  before targeted root-corruption tests mutate it.
- Existing C27 fixture healing of missing selection fields can mask missing-wire
  cases. C28 fixtures must never auto-heal the field being tested.
- The in-progress local selection quarantine clears the host without advancing
  `plotRenderGeneration`. Reusing that path unchanged would allow a late Plotly
  settlement to overwrite C28 local error/readiness, contrary to DEC-030.
- An assertion on `plotReady=false` alone can pass for an empty host. The matrix
  must assert the exact local error content/test seam and the absence of stale
  Plotly data or reassertion.

## Source evidence

- `architecture/documentation/user/decisions/DEC-20260731-009-display-pages.md:20-34`
- `architecture/documentation/user/decisions/DEC-20260801-030-latest-plot-render-wins.md:27-52`
- `architecture/documentation/user/decisions/DEC-20260801-032-global-snapshot-envelope.md:28-57`
- `architecture/documentation/user/decisions/DEC-20260801-033-display-selection-snapshot-contract.md:78-113`
- `lib/domain/signal_analyser_state.jl:1-14`
- `lib/domain/signal_analyser_state.jl:1511-1522`
- `lib/domain/signal_analyser_state.jl:1915-1920`
- `lib/services/signal_analyser_service.jl:900-915`
- `lib/services/signal_analyser_service.jl:929-942`
- `lib/services/signal_analyser_service.jl:2083-2144`
- `lib/services/signal_analyser_service.jl:2740-2766`
- `test/back/lib/signal_analyser_service_test.jl:512-540`
- `test/back/lib/signal_analyser_service_test.jl:785-803`
- `public/js/app.js:4-5`
- `public/js/app.js:27-36`
- `public/js/app.js:63-80`
- `public/js/app.js:92-97`
- `test/front/public/js/app.behavior.test.js:22-48`

This assessment authorizes a future frontend/test implementation only. No
product, test, backend, API, runtime, deployment or mathematics change is
claimed.
