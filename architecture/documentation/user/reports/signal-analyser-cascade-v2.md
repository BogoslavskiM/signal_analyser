# Signal Analyser: второй каскад видимости

Status: integration-review

## Summary

Backend и frontend реализовали revision-safe visibility state. Time/spectrum
используют отдельные traces всех visible signals; heatmaps остаются selected.
Checkbox отделён от row selection, а fixed 2×2 сохранён. Plotly placeholder
удаляется непосредственно перед `Plotly.react` без purge/replacement host.

## Changed product and test paths

- `lib/services/signal_analyser_service.jl`
- `public/css/app.css`
- `public/index.html`
- `public/js/app.js`
- `test/back/app/signal_analyser_api_test.jl`
- `test/back/lib/signal_analyser_service_test.jl`
- `test/front/public/js/app.behavior.test.js`
- `test/front/public/js/app.static.test.js`
- `test/playwright/REFERENCE_SCENARIO_COVERAGE.md`
- `test/playwright/e2e.config.js`
- `test/playwright/specs/signal_analyser/visibility_cascade.test.js`
- `test/playwright/support/signal_analyser_page.contract.test.js`
- `test/playwright/support/signal_analyser_page.js`

## Verification

| Check | Result |
| --- | --- |
| Julia parse changed backend | PASS |
| Backend suite | PASS, 262 assertions |
| Frontend static/behavior | PASS, 2/2 files |
| E2E support contract | PASS |
| Playwright JS/shell static checks | PASS in E2E handoff |
| Local EngeeDSP contract | FAIL: package missing in local environment |
| Runtime visibility E2E | Pending: no deployed/current second-cascade target |

Backend assertion groups: `3 + 99 + 41 + 29 + 11 + 7 + 16 + 14 + 42`.

## Датированное обновление проверки 2026-07-31

После Tester additions полный backend gate составляет 289/289 assertions PASS.
Предыдущие 262 assertions выше сохранены как промежуточный integration result.
Frontend 2/2 PASS. Runtime E2E и deployment второго каскада не выполнены.

## Integration decisions

- `/api/view` remains the single revision-safe mutation route and returns a
  compatible superset including `visible_signals` and `plot_payload`.
- Canonical visibility order follows signal table/state order rather than
  arbitrary request order.
- Frontend queue carries latest intended active/selected/visible state across a
  stale response and retries from canonical server revision.
- `portable_behavior`: checkbox visibility, independent selection, visible
  line traces, selected heatmaps, minimum one visible.
- `matlab_layout_specific`: MATLAB docking/multi-layout. It is recorded for
  research context and explicitly excluded from product scope.

## Remaining risks

- Runtime behavior is not yet observed on a target containing these changes.
- The required EngeeDSP-enabled environment check is still red locally.
- Product/test changes are intentionally uncommitted and undeployed in this
  flow.

## Датированное delivery update 2026-07-31

Frontend реализовал local-first vendored Plotly 3.1.0 с MIT license, UMD
normalization и CDN fallback. Artifact SHA-256:
`c462b40a1a542e16c3533f97d39fbbb91af4f5267f3cbf23bd70d785efc44c38`.
Это `implemented`, но не `verified` и не `deployed`: ожидаются Tester и prod
E2E с четырьмя ready plots, нулём placeholders и нулём CDN requests при
успешном local load.
