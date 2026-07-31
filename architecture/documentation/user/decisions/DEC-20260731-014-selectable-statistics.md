# DEC-20260731-014: selectable per-Display Statistics

ID: `DEC-20260731-014`
Дата: 2026-07-31
Статус: accepted
Supersedes: none

## Контекст

SA-UI-010 подтвердил точный набор и порядок Signal Statistics, первые три
defaults и page-local восстановление. Cascade 7 уже предоставляет единый
authoritative inclusive raw ROI; фильтрация строк только на frontend сделала бы
revision и вычисления неавторитетными.

## Решение

Выбор статистик становится typed per-Display state и additive полем
`measurement_kinds` существующего `/api/view`. Допустим любой subset, включая
пустой; backend канонизирует порядок. Snapshot Measurements сохраняет прежнюю
форму, но содержит только выбранные items.

Median, Peak-to-Peak и RMS вычисляются по тому же raw ordinate/ROI, что и
существующие extrema/mean. Неэкстремальные показатели не имеют sample/time
position. RMS вычисляется scale-normalized способом без EngeeDSP.

Clear сохраняет preference, новый Display получает defaults. Настройки
revision-safe; локальными остаются только открытая settings/bottom вкладка.

## Последствия

- Display state и API snapshot получают ordered `measurement_kinds`.
- Existing default payload остаётся совместимым: Minimum/Maximum/Mean.
- Пустой selection не выполняет ROI calculation и возвращает `items=[]` при
  сохранённых signal/ordinate/units для непустого Display.
- Settings tabs становятся настоящей локальной навигацией; вычисления остаются
  только на backend.

## Evidence

- SA-UI-010 external saved scenario, SHA-256
  `da95228f1e960413d78a6ad8304f64b984e42cc783817634bdf8fb338973bffe`;
  client delivery relies on the summarized evidence here.
- MathWorks Measure Signals:
  https://www.mathworks.com/help/signal/ug/measure-signals.html
- Product/test checkpoint
  `0fc70fd6b8323b86cffcf2011810ac8cb1c6d076`.
- Backend gate: 789/789 assertions PASS, including strict/atomic API input,
  canonical ordering, page lifecycle, empty selection, inclusive ROI,
  odd/even median, Peak-to-Peak, complex magnitude and scale-normalized RMS.
- Frontend gate: 2/2 files PASS. Playwright JavaScript syntax, support contract
  and runner-help smoke PASS; live authenticated runtime E2E remains a separate
  deployment gate and is not claimed here.
