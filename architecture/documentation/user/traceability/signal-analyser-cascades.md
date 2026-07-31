# Traceability: Signal Analyser cascades

| Requirement | Research | Decision/math | Implementation anchor | Unit/contract/E2E | Implemented | Verified | Deployed branch/SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Fixed 2×2 | MATLAB layout classified non-portable | DEC-003 | `public/index.html`, `public/css/app.css` | front static + E2E geometry | yes | local + prod v1 | `neuro_signal_analyser_cascade` / `0606d47` for v1 |
| Checkbox visibility independent of row selection | SA-UI-001; bounded cycle confirms independent states | DEC-003, SPEC-SA-UI-001 | `public/js/app.js`; `apply_signal_analyser_view!` | backend/API/front behavior; E2E prepared | yes | local | not deployed for cascade 2 |
| Atomic revision-safe visible set | MATLAB direction + product contract | SPEC-SA-UI-001 | `validate_signal_analyser_view_payload`; `apply_signal_analyser_view!` | backend full gate 289/289 assertions | yes | local | not deployed |
| Multi-trace Time/Spectrum, selected heatmaps | Time display showed three signals; multi-signal TF/Persistence disabled | DEC-003, MATH-SA-001 | `signal_analyser_multi_trace_payload`; Plotly render in `public/js/app.js` | backend/front PASS; E2E prepared | yes | local | not deployed |
| No visible placeholder after ready | prod screenshot regression | SPEC-SA-UI-001 | `public/js/app.js::clearPlotPlaceholders` | front behavior + E2E assertion prepared | yes | local | not deployed |
| Local-first Plotly delivery | CDN GET body stalled while HEAD 200; local app/API healthy | DEC-006 | `public/index.html`; `public/js/app.js::ensurePlotly`; vendored 3.1.0 artifact | Required: 4 ready plots, 0 visible placeholders, 0 CDN requests on local success | yes | pending Tester + prod E2E | not deployed |
| Spectral conventions | MathWorks docs + EngeeDSP contract | MATH-SA-001 | `signal_analyser_math.jl` | unit double + Engee contract | yes | v1 target; local cascade-2 environment failed | `0606d47` v1 |
| EngeeDSP runtime availability | prod global env/Manifest/registry/load probes | DEC-004; DEC-005 | `signal_analyser_engee_dsp_module` | local unit mock; mandatory target EngeeDSP 0.72.0 contract | existing runtime | current prod | conditional for next deploy |
