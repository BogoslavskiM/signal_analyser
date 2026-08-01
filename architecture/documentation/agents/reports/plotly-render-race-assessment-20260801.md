# Plotly asynchronous render race assessment

Date: 2026-08-01

Role: Frontend (`/root/frontend_c23_contract_audit`)

## Finding

The race is confirmed in the shared `active-plot-host`. `draw()` snapshots the
current data, then chains `ensurePlotly()` and `Plotly.react()` without a
Display/plot/revision/generation guard. Older work can start after a newer
request, settle after a newer graph, overwrite a newer placeholder, or publish
a stale error. `clearPlotHost()`/`Plotly.purge()` do not cancel an in-flight
promise.

## Minimal boundary

A single frontend file can own a monotonically increasing generation and a
serialized render tail. Every draw—including synchronous empty/error paths—
invalidates older work. Pre-start, success and failure guards suppress stale
side effects; a stale in-flight settlement must reassert the current frame
because Plotly itself may have mutated the host before its promise resolves.

No HTML, API, backend, state schema, graph payload or DSP change is required.
Tests should inject controlled deferred `Plotly.react()` promises and simulate
the host mutation at settlement; fixed sleeps cannot prove ordering.

## Required matrix

1. Old Time settles after a new Persistence request becomes authoritative;
   serialized Persistence render then produces the final frame.
2. Old Time rejects after a new Persistence request becomes authoritative;
   the stale error stays hidden and serialized Persistence becomes final.
3. Old populated graph settles after a new synchronous empty Display state.
4. Library loading resolves only after the active plot or Display changes.
5. Latest-frame reassertion is bounded and does not loop.

## Risk boundary

Serialization does not cancel Plotly computation and may add latency behind an
in-flight render. That is accepted for deterministic visual state. Provider
invocation count remains a backend test concern.
