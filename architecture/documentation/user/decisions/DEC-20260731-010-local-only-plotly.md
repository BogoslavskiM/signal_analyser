# DEC-20260731-010: локальная поставка Plotly без CDN

ID: `DEC-20260731-010`
Дата: 2026-07-31
Статус: accepted, implemented locally, runtime unverified
Supersedes: `DEC-20260731-006`

## Контекст

DEC-006 допускал CDN fallback при повреждённом локальном bundle. Актуальный
универсальный контракт `frontend/graph-output-zone` требует локальные Plotly и
locale и прямо запрещает runtime-загрузку библиотеки с CDN. Это также исключает
сетевую зависимость приложения в изолированной Engee-среде.

## Альтернативы

Сохранить local-first с CDN fallback; вернуть CDN-only; использовать только
версионированный локальный artifact и явное error state при его недоступности.

## Решение

Plotly `3.1.0` поставляется только локально как vendored cartesian bundle.
Frontend нормализует UMD export и не содержит runtime CDN URL. Если локальная
библиотека отсутствует или повреждена, graph zone показывает стабильное
русское error state вместо внешней загрузки.

Artifact: `public/js/vendor/plotly-cartesian-3.1.0.min.js`, SHA-256
`c462b40a1a542e16c3533f97d39fbbb91af4f5267f3cbf23bd70d785efc44c38`, MIT.

## Последствия

Tester проверяет hash, license, load order, отсутствие CDN URL и local failure
state. Runtime E2E проверяет ready host активной страницы, отсутствие видимого
placeholder и отсутствие CDN requests. Повреждённый artifact не маскируется
внешней сетью.

## Связи и evidence

[SPEC-SA-UI-001](../specifications/signal-visibility-and-plots.md),
[traceability](../traceability/signal-analyser-cascades.md),
`architecture/skills/frontend/graph-output-zone/SKILL.md`.
