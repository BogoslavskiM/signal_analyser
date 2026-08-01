# Active plot structural shape assessment

Date: 2026-08-01

Role: Architect

Status: contract assessment complete; implementation and deployment not claimed

## Scope

Cascade 30 freezes only the required fields, wire discriminant and coordinate
geometry of the branch already selected by DEC-035. Numeric values, labels,
metadata, inactive branches, DSP and visual parity are excluded.

## Backend evidence

The authoritative serializers publish:

- Time/Spectrum traces with owned `type="line"`, `x` and `y`; the axes have
  equal lengths. A Spectrum trace may be typed-empty for short or disjoint ROI.
- Spectrogram/Persistence with owned `type="heatmap"`, `x`, `y`, `z`; `z[y][x]`
  is rectangular. Canonical empty heatmaps use three empty arrays.
- Nonfinite presentation values are recursively serialized as JSON `null`.
  Valid Spectrum `y` and Spectrogram `z` can therefore contain `null`.
- Persistence is active-view-lazy and inactive branches may deliberately carry
  typed-empty internals. Only the active branch may be validated.

Evidence locations:

- `lib/services/signal_analyser_math.jl:88-151,165-191,242-255`
- `lib/domain/signal_analyser_state.jl:598-638,897-942`
- `lib/services/signal_analyser_service.jl:622-764,945-989,3080-3108`
- `app/api.jl:3-15`

The lower-level Spectrogram domain constructor can still represent asymmetric
empty axes although successful service routes do not publish them. C30 rejects
that shape at the client boundary; domain hardening is a separate Backend task.

## Frozen validation order

1. DEC-032 global envelope.
2. DEC-033 selection.
3. DEC-034 active plot.
4. DEC-035 payload routing.
5. C30 active-branch shape only.
6. Existing plot-specific numeric/metadata/render checks.

An earlier C27/C28/C29 quarantine skips all C30 inspection. C30 never reads
inactive branch internals and never uses `type` to choose the route.

## Frozen matrix

| Route | Accepted structural form | Rejected structural form |
| --- | --- | --- |
| Time/Spectrum | own `type:"line"`; own array `x/y`; equal length; `[]/[]` allowed | missing/wrong type, missing/non-array axis, unequal lengths |
| Spectrogram/Persistence | own `type:"heatmap"`; own array `x/y/z`; either all empty or nonempty axes with `z.length===y.length` and every row array of `x.length` | missing/wrong type, non-array axis/matrix/row, partial empty, wrong row count, ragged/wrong-width row |

Array leaves are opaque, including `null`. Different line traces may have
different lengths. Additive inner metadata is accepted; labels and metadata are
not even conditionally validated by C30.

## Failure and lifecycle

Malformed active shape creates a per-ID quarantine with selector
`display-active-plot-shape-contract-error-state`, `role="alert"`, exact text
`Некорректная структура данных активного графика в ответе сервера.` It purges
same-ID View work, invalidates and clears the shared graph host, executes no
Plotly render or View replay, and remains authoritative over deferred render
settlement. Other valid Displays and topology remain independent. A later
authoritative valid snapshot recovers without resurrecting discarded work.

No fallback is allowed from `plots`, another branch, prior payload or fabricated
empty geometry/presentation defaults.

## MathWorks direction versus Genie inference

Official MathWorks documentation defines conceptual geometry: Spectrogram
output is `Nf × Nt` with frequency rows and time columns; Persistence is
`Npwr × Nf` with power rows and frequency columns. It does not define Genie's
JSON fields, row-major serialization, empty/null form or numeric policy.

Sources:

- https://www.mathworks.com/help/signal/ref/pspectrum.html
- https://www.mathworks.com/help/signal/ref/spectrogram.html
- https://www.mathworks.com/help/signal/ug/spectrogram-computation-in-signal-analyzer.html
- https://www.mathworks.com/help/signal/ug/persistence-spectrum-in-signal-analyzer.html

The C30 JSON matrix is therefore an explicit Genie contract supported by the
Backend wire, not a claim about MATLAB internal serialization.

## Planned verification

Behavior tests will mutate only active `plot_payload` and keep `plots`
independent so fallback cannot hide corruption. The matrix includes all four
routes; selected-second traces; typed-empty with null and non-null source;
opaque null leaves; partial/ragged matrices; malformed inactive branches;
C27/C28/C29 precedence; successful `200`, `409 current`, recovery, A/B queue
isolation and controlled deferred Plotly settlement.

Gated E2E will prove the same-document user-visible quarantine/recovery path
without enabling a prerequisite cascade by default. Backend regression tests
may separately harden asymmetric empty domain construction.

## Outcome

This assessment authorizes future Frontend and test implementation only. It
does not claim product changes, runtime verification, Backend mutation,
deployment, MATLAB GUI evidence, Engee defect evidence or numeric parity.
