# Signal Analyser: Cascade 8 selectable Statistics

Status: implemented-and-locally-verified; not-deployed

## Результат

Каждый Display хранит ordered `measurement_kinds` из шести показателей:
Minimum, Maximum, Mean, Median, Peak to peak и RMS. Новый Display начинает с
первых трёх, выбор другой страницы не меняется, а пустой subset разрешён.
Clear Display сохраняет preference; первый re-add пересчитывает сохранённый
набор. Неизвестные, повторные и неверно типизированные значения дают
field-level 422 без частичной mutation.

Все показатели вычисляются backend по единому inclusive raw Time ROI до plot
bounding. Median поддерживает нечётный и чётный размер ROI, Peak-to-Peak равен
`max-min`, RMS использует scale-normalized формулу для защиты от
промежуточного переполнения. Minimum и Maximum сохраняют абсолютные zero-based
sample/time coordinates; остальные позиции равны null. Пустой выбор не
материализует ROI и возвращает typed `items=[]`.

В интерфейсе Display/Time/Measurements стали функциональными settings tabs.
Measurements содержит native checkbox каждого canonical ID, одна смена
checkbox отправляет один полный revision-safe `/api/view`, а `Signal
statistics` открывает и настройки, и нижнюю панель результатов. Вычислений на
frontend нет. Пустой Display временно блокирует controls, не теряя preference;
непустой non-Time Display сохраняет доступ к ним через authoritative Time ROI.

## Проверки

| Проверка | Результат |
| --- | --- |
| Backend unit/API | PASS, 789/789 |
| Frontend static/behavior | PASS, 2/2 |
| Playwright syntax/support/help | PASS |
| Skills catalog | PASS, 40 manifests, schema 2, versions only in manifests |
| Vanilla frontend validator | PASS, 10 bundles / 9 templates |

Product/test checkpoint: `0fc70fd6b8323b86cffcf2011810ac8cb1c6d076`
(`feat: добавить выбираемые статистики Display`). После commit branch был
`0 behind / 18 ahead` относительно upstream.

Runtime DevHub E2E, push и deployment не выполнялись. Реальный `pspectrum` и
EngeeDSP provider path этим локальным C8 gate не подтверждались; локальное
отсутствие EngeeDSP остаётся известным target-preflight ограничением и не
заменено fallback. Statistics C8 используют Base/Statistics.

Sources:

- [DEC-20260731-014](../decisions/DEC-20260731-014-selectable-statistics.md)
- [Текущая UI/API спецификация](../specifications/signal-visibility-and-plots.md)
- [Реализованная математика](../specifications/mathematics/signal-analysis.md)
- https://www.mathworks.com/help/signal/ug/measure-signals.html
