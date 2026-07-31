---
name: test-suite-maintenance
---
# Test Suite Maintenance

## When to Use
- Нужно добавить, перенести, переименовать или диагностировать tests.
- Нужно работать с backend unit/API tests, frontend static/behavior tests или Engee contract tests.

## When NOT to Use
- Нужно исправить product source вместо теста.
- Нужно реализовать Playwright/devhub сценарий — используйте e2e skill.

## Core Contract
- Загрузи testing skill для фактически изменённой contract surface.
- Проверяй только product capabilities и optional skill ids, включённые в
  blueprint/handoff. Наличие checklist ниже не делает capability обязательной.
- При product failure верни handoff владельцу и не исправляй source.

## Optional Capabilities
- `tests.backend-unit` — domain/state unit tests.
- `tests.backend-api` — route/handler contracts.
- `tests.frontend-static` — JS/CSS/HTML source contracts.
- `tests.frontend-behavior` — deterministic VM/DOM/API behavior.
- `tests.engee-contract` — target Engee function contracts через MCP.

## Workflow
1. Определи тип покрытия: backend unit/API, frontend static/behavior или Engee package contract.
   Для backend unit tests загрузи `tester/backend-unit-testing`.
   Для backend API tests загрузи `tester/backend-api-testing`.
   Для frontend static/behavior tests загрузи
   `tester/frontend-static-behavior-testing`.
   Для Engee package contract загрузи `tester/engee-contract-testing` и
   обязательно используй Engee MCP.
2. Прочитай ближайший production contract только чтобы понять expected behavior.
3. Держи тест детерминированным и сфокусированным на одном behavior/contract.
4. Если failure вызван product code, верни handoff владельцу продукта.
5. Для inspector CRUD проверяй полный table payload только если включена
   соответствующая inspector capability.
6. Проверь bulk selection: без `object_ids` операция применяется ко всем объектам; с ids — только к переданному filtered subset; selection вне subset сохраняется; ответ содержит полный table payload.
7. Проверь inspector без metric columns и header row: checkbox, имя и row actions остаются работоспособными.
8. Для settings проверь metadata, typed values, one-field update и полный settings response.
9. Проверь, что semantic invalid typed value сохраняется с HTTP 200 и validation error, а wrong API type считается programmer error с HTTP 500.
10. Проверь быстрый Apply: старая revision и очередь инвалидируются до валидации без ожидания физического завершения worker; invalid draft даёт HTTP 200, `success=false`, `error`; successful Apply выставляет boolean dirty flags и сразу даёт только HTTP 200, `success=true`.
11. Проверь состояния зоны: pending — прежнее типизированное `data`, `isready=false`, `success=false`, пустой `error`; успех — новое `data`, `isready=true`, `success=true`; ошибка расчёта — прежнее `data`, `isready=true`, `success=false` и короткий `error`. До первого успешного расчёта ожидай типизированное пустое `data`, а не `null`.
12. Проверь, что после успешного Apply frontend сохраняет текущее состояние до первого data response, а после ответа `isready=false` скрывает прежнее `data` под preloader.
13. Проверь очередь inspector: расчётные зоны `settings` и `data` идут первыми, остальные — по убыванию времени последнего явного действия пользователя. Polling не меняет приоритет, а ни разу явно не открытые зоны сохраняют стабильный порядок.
14. Проверь, что исключение одной задачи расчёта не завершает worker thread и не останавливает остальные задачи.
15. Проверь cancellation token и запрет записи результата предыдущего `calculation_revision` при повторном Apply.
16. Проверь отмену и автоматическое перестроение очереди при смене `main_object`, `main_page`, `selection` и импорте сессии.
17. Проверь общую задачу расчёта: она выполняется до зависимых задач, зависимые задачи переиспользуют её результат, а ошибка общей задачи переводит все зависимые зоны в одинаковый error state и не останавливает независимые задачи.
18. Проверь, что calculation error не запускает автоматический retry и повторный расчёт выполняется только через Apply.
19. Проверь независимые zone data routes: завершённая зона публикуется сразу, не ожидая остальных, а Apply не возвращает `isready` или данные зон.
20. Проверь сохранение сессии во время активного расчёта: операция не ждёт, сохраняет последнее полностью записанное `data` и текущие statuses из объектов.
21. Проверь импорт сессии: `data`, `isready`, `success`, `error`, `selection` и `main_object` восстанавливаются без нормализации статусов; runtime queue, worker и cancellation state не сериализуются, очередь строится заново, а импортированные готовые зоны не пересчитываются.
22. Для Inspector UI проверь table mode, headerless list и table со всеми скрытыми дополнительными колонками.
23. Проверь name-only frontend search, select-all только по отфильтрованным rows, отсутствие `indeterminate` и сохранение selection вне фильтра.
24. Проверь cell contract `{value, units}`: frontend округляет number до пяти значащих цифр, показывает `—` для `null`, применяет column `abbreviations` и сохраняет полное значение в tooltip.
25. Проверь sticky header, checkbox/name cells, horizontal scroll и row actions поверх последней видимой cell.
26. Проверь, что create/duplicate/delete/main/selection не меняют table оптимистично и после ответа применяют полный payload.
27. Для multi-page element проверь stable page ids, backend order, opened pages, immediate `main_page` switch и отсутствие rollback при sync error.
28. Проверь открытие, закрытие, выбор первой оставшейся страницы и восстановление default page при попытке закрыть последнюю.
29. Проверь, что static page не вызывает HTTP request, а output page использует `data/isready/success/error`, polling и local page error.
30. Проверь stale page sync/data response, остановку polling неактивной страницы и наличие в DOM только active page component.
31. Для graph output проверь ordered массив `{data, layout, config}`, frontend-defined grid, пустой массив и пустые места при неполном массиве.
32. Проверь сравнимые графики с `main_object + selected_objects` без дубликата и несравнимый график только с main object, скрытой legend и именем объекта в title.
33. Проверь preloader и calculation error overlay поверх всей graph grid; controls под canvas должны оставаться видимыми и быть disabled только при pending.
34. Проверь локальную Plotly с русской modebar без логотипа, resize/remount и отсутствие zoom/pan/selection в backend payload и сессии.
35. Проверь page controls: backend update без общего Apply, dirty только соответствующей страницы и восстановление из session payload.
36. Проверь обязательное поле `__genie_app_name` и отказ импорта при его отсутствии или несовпадении. Не ожидай version field или migrations.
37. Проверь выбранное backend-разработчиком разделение быстрых и долгих расчётов по backend logs и при необходимости Engee contract/performance test.
38. Проверь, что worker manager создаётся только для нагруженного приложения, Apply не выполняет расчёты, а timeout не появляется без отдельного требования.
39. Проверь stable frontend selectors для numeric, integer и enum fields.
40. При переносе тестов обнови verification commands и architecture references.
41. Для dialogs проверь закрытие только крестиком и видимыми action buttons; keyboard и overlay click не должны закрывать dialog.
42. Проверь disabled close/cancel/primary actions и operation text при busy request.
43. Проверь, что при API error form dialog остаётся открытым с введёнными значениями, а unexpected error появляется поверх него.
44. Проверь отсутствие error queue: новая unexpected error заменяет текст уже открытого error dialog.
45. Проверь stacking form → file browser → error, success sequence, повторную инициализацию form и scroll body на узком viewport.
46. Для file browser проверь directory/file modes, initial target path, cancel без изменения target и normalized path после select.
47. Проверь structured entries, folders-first name sorting, сохранение direction, reset expanded/selected и отсутствие hidden entries.
48. Проверь root boundary и symlink: real path за пределами root недоступен.
49. Проверь case-insensitive allowed extensions, disabled неподходящие files, single-click selection и отсутствие double-click/multi-select.
50. Проверь local busy overlay, блокировку всех actions, empty state, ellipsis/tooltip и unexpected error поверх file browser.
51. Для session export проверь backend defaults, typed path control, `.jld2`, overwrite и success message с normalized path.
52. Проверь dialog busy и global loader для export/import, а также закрытие form до success dialog только после backend success.
53. Проверь atomic session replace/merge, backend conflict mapping и отсутствие частичного state при import error.
54. Проверь полный imported frontend state, сохранение output statuses/page controls и отсутствие ожидания или frontend-нормализации расчётов.
55. Проверь, что import/export error оставляет form и fields, а unexpected error показывается поверх.
56. Для object export проверь zero/one/multiple доступных operations, всегда
    видимый selector и его disabled state при одной операции.
57. Проверь context-dependent defaults при каждом open и полный reset формы при
    switch operation; значения предыдущей операции не должны восстанавливаться.
58. Проверь explicit operation forms, inline field validation, global loader,
    сохранение form при error и success message с нормализованным target.
59. Для каждого подключённого delivery format проверь extension/name,
    overwrite, отсутствие partial write и round-trip подготовленного
    value/description.
60. В итоговом application test проверь не только формат экспорта, но и
    предметную математику экспортированного объекта по domain/calculation
    contract. Если готового общего math skill ещё нет, expected behavior должен
    предоставить владелец domain logic.
61. Для style system проверь светлую тему, порядок подключения `theme.css` и
    использование общих tokens вместо повторяемых hardcoded colors, размеров,
    теней и z-index.
62. Проверь fixed canvas: при viewport меньше `920 × 680` зоны не меняют число,
    порядок и пропорции, а приложение может не помещаться в окно.
63. Проверь default, hover, focus-visible, active, disabled, busy, validation
    error и warning для соответствующих интерактивных элементов.
64. Проверь общий внешний вид buttons, inputs, selects, tables и dialogs;
    предметные модули не должны заново определять их базовый стиль.
65. Проверь SVG symbols, `currentColor`, tooltip и accessible name для
    icon-only actions; tooltip появляется через `1500 ms`, корректно
    позиционируется и скрывается при mouseout/focusout/click/scroll/resize; в
    поставке должны находиться только используемые SVG.
66. Проверь локальную загрузку Roboto без Google Fonts/CDN и отсутствие
    необязательных декоративных animations.
67. Проверь системные scrollbars по умолчанию и тонкий стилизованный scrollbar
    только у горизонтальной ленты вкладок.
68. Для application toolbar проверь некликабельный Engee logo, frontend app
    name и backend `app_version`.
69. Проверь порядок import, export, other actions, help; unsupported actions
    отсутствуют, временно недоступные остаются видимыми и disabled.
70. Проверь icon-only buttons, tooltip, accessible name и отсутствие
    неиспользуемых SVG.
71. При нескольких export operations проверь split button: primary и arrow
    являются отдельными controls, menu открывается только arrow click и не
    открывается hover/focus. При одной operation должна остаться обычная button
    без arrow.
72. Проверь запуск backend default operation primary-кнопкой и каждой
    operation через dropdown с icon и text; список содержит default и
    временно disabled operations.
73. Проверь закрытие export menu после выбора, любого другого toolbar action,
    outside click, scroll и resize.
74. Проверь help как обычную ссылку в новой вкладке и отсутствие responsive
    collapse/overflow menu toolbar.
75. Запусти релевантные проверки выбранных capabilities или явно опиши, почему
    среда недоступна.
76. Для численной обработки различай базовую агрегацию и специализированные
    MATLAB-toolbox аналоги. Base/Statistics допустимы для min/max/mean,
    extrema indices, index-to-time и простой dB formula, но тестовые данные
    должны доказывать расчёт по полным raw samples до plot downsampling.
    `findpeaks`, `pspectrum`, spectrogram, persistence,
    filters/windows/coherence и подобные операции обязаны вызывать доказанную
    Engee/domain функцию. Missing/broken специализированная функция не получает
    hand-rolled fallback: ожидай явную ошибку, bug candidate и отдельный
    workaround ADR/regression contract.

## Guardrails
- Tester не чинит product source.
- `test/engee/**` принадлежит обычному tester, не e2e-tester.
- Не исследуй Engee contract без `tester/engee-contract-testing` и Engee MCP.
- Недоступность `EngeePhased`, `EngeeDSP`, `MATLAB.jl` или MATLAB runtime — environment condition, если задача не требует сделать их обязательными.
- Не добавляй flaky sleeps или network-dependent tests без явной причины.
- Не проверяй очередь фиксированными sleeps; используй наблюдаемые status/revision transitions.

## Reference
Проверки:

```bash
julia --project=. test/back/runtests.jl
julia --startup-file=no test/engee/engee_package_contract_tests.jl
node test/front/run_front_tests.js
```
