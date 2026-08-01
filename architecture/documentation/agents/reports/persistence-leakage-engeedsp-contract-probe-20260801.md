# Persistence Leakage EngeeDSP contract probe — 2026-08-01

Status: completed-prod-read-only-evidence

## Environment and safety boundary

- Engee prod runtime, Julia `1.12.4`.
- EngeeDSP `0.72.0`, UUID
  `f9bbbd0e-0dd6-4072-898a-88f8f1250a99`, git-tree-sha1
  `4941c08f227519cbc82caab7bc519851f44b0586`, source tree `XobDm`.
- Public surface: `EngeeDSP.Functions.pspectrum(x,t,"persistence",...)`.
- Repository branch/SHA at probe:
  `neuro_signal_analyser_cascade` / `13247f073ce30ee49111e0312d0f375ffc9940c6`.

Only deterministic in-memory arrays were used. No model, file, dependency,
repository, deploy, browser, MATLAB GUI or Command Window was changed. The
temporary prod pod was stopped after the probe; status confirmed `stopped` at
`2026-08-01T06:40:46.931366`.

## Fixture and calls

`N=256`, `f_s=100 Hz`, `t=(0:255)/100 s`:

- real: `sin(2pi*10.3t)+0.35cos(2pi*23.7t+0.2)`;
- complex: `cis(2pi*10.3t)+0.35cis(-2pi*18.7t+0.2)`.

The omitted call used:

```text
pspectrum(x,t,"persistence","NumPowerBins",256,"TwoSided",topology)
```

Explicit calls added `"Leakage",value` for `0.5`, `0.0` and `1.0`. Every
baseline variant was called twice. All six permutations of `Leakage`,
`NumPowerBins` and `TwoSided` were also checked.

## Accepted/default behavior

Every accepted call returned three `Matrix{Float64}` objects:

- occurrence `256x1024`;
- frequency `1024x1`;
- power levels `256x1`.

Real frequency was `0.0..50.00000000000001 Hz`; complex was centered
`-50.00000000000001..50.00000000000001 Hz`. Both axes were finite and strictly
increasing; every power level was strictly positive. Occurrence was finite in
`[0,100]`, and each frequency-column sum equalled 100 within floating error.

Omitted Leakage was bit-for-bit equal to explicit `0.5` for all three outputs
in both topologies. Every repeated omitted/0/0.5/1 call was bit-for-bit
deterministic. All six option orders were bit-for-bit equal.

Leakage changed the power axis and occurrence materially, but never the
frequency axis. Maximum absolute occurrence delta versus `0.5` was 100 for
both endpoints and both topologies. Maximum power-axis deltas were:

| Topology | `0` vs `0.5` | `1` vs `0.5` |
| --- | ---: | ---: |
| real one-sided | 2.067692053996758 | 3.587871615772461 |
| complex centered | 2.8514146970578356 | 9.018369486565849 |

Therefore Leakage belongs to typed query/cache identity and is not a
presentation-only control.

## Validation delta

Real and complex calls produced the same boundary behavior:

- `-0.01`, `1.01`: rejected because Leakage must be between 0 and 1;
- `NaN`, `Inf`, `-Inf`: rejected because Leakage must be finite;
- string `"0.5"`: rejected as an invalid option string;
- Bool `false`/`true`: accepted and bit-for-bit equal to `0.0`/`1.0`.

Bool permissiveness is an adapter-boundary delta, not an Engee defect. Product
validation must reject Bool before provider dispatch.

## Contract consequences

- Product default: explicit `0.5`.
- Product domain: finite JSON Number, not Bool, inclusive `[0,1]`.
- Signed zero canonicalizes to positive `0.0` for state/cache identity.
- Canonical provider order: Leakage, NumPowerBins, TwoSided.
- Fixed `NumPowerBins=256` and real/complex topology remain unchanged.
- Power axis and occurrence must be recalculated; frequency topology remains
  stable for the probed fixture.
- No Engee bug candidate was found.

## Official documentation correspondence

MathWorks and Engee document Leakage default `0.5`, inclusive `[0,1]`, the
Kaiser-window resolution/leakage tradeoff and Persistence power-frequency
percentage output. MathWorks gives `beta=40(1-leakage)`.

- https://www.mathworks.com/help/signal/ref/pspectrum.html
- https://www.mathworks.com/help/signal/ug/persistence-spectrum-in-signal-analyzer.html
- https://engee.com/helpcenter/stable/en/func-dsp-transforms-correlation-and-modeling/func-pspectrum.html

The product default is supported by both documentation and exact prod provider
equivalence. No unobserved MATLAB GUI value or slider scale is claimed.
