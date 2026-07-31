# DEC-20260731-006: local-first bundled Plotly с CDN fallback

ID: `DEC-20260731-006`  
Дата: 2026-07-31  
Статус: superseded
Supersedes: none

Superseded by: [DEC-20260731-010](DEC-20260731-010-local-only-plotly.md).
Актуальный `graph-output-zone` запрещает runtime CDN fallback.

## Контекст

При здоровых local app/API CDN Plotly отвечал на HEAD 200, но GET body stalled,
из-за чего реальные графики не становились ready. Evidence не изолирует Engee
defect и не регистрируется как Engee bug.

## Альтернативы

Оставить CDN-only; vendored local-only; local-first с fallback на CDN.

## Решение

Vendored official npm `plotly.js-cartesian-dist-min@3.1.0` под MIT загружается
до app script. App вычисляет local URL относительно `document.currentScript`,
нормализует UMD `window.moduleName` в `window.Plotly` и обращается к CDN только
если local load не дал рабочий Plotly.

Artifacts: `public/js/vendor/plotly-cartesian-3.1.0.min.js`, SHA-256
`c462b40a1a542e16c3533f97d39fbbb91af4f5267f3cbf23bd70d785efc44c38`, и
`public/js/vendor/plotly-cartesian-3.1.0.LICENSE`.

## Последствия

Статус сейчас только `implemented` по Frontend handoff. `verified` требует
Tester regression; `deployed` требует prod E2E. Acceptance: четыре ready plot
hosts, ноль видимых placeholders и ноль CDN requests при успешном local load.
CDN fallback сохраняет восстановление при повреждённом/missing local artifact.

## Связи и evidence

[SPEC-SA-UI-001](../specifications/signal-visibility-and-plots.md),
[traceability](../traceability/signal-analyser-cascades.md).
