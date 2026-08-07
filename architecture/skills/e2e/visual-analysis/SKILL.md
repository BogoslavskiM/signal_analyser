# E2E Visual Analysis and Screenshots

Используй этот stage skill для каждого UI-affecting regression handoff. Цель —
найти визуальные и динамические дефекты по реальным screenshots и закрепить
ожидаемое поведение устойчивыми Playwright tests.

## Входные данные

- production target либо явный `target_status: unavailable`;
- pinned `design_ref`/`design_version`, `DESIGN.md`, prototype entry,
  interaction map и reference images;
- proportion contract, `page_sizing_contract`, local asset inventory и их
  назначение;
- canonical UI profile и source-derived dimensions/radii/state values;
- утверждённая Engee visual system;
- список viewports из handoff;
- inventory зон, таблиц, settings controls и динамических элементов;
- stable `data-testid` contract.

Reference image определяет структуру и наблюдаемое состояние, но не становится
источником CSS, если handoff не говорит обратного. При конфликте прямое
требование пользователя и утверждённая Engee visual system имеют приоритет.

## Сначала прочитать и прокликать дизайн

До открытия production для UI-affecting scope:

1. Разреши exact `design_ref`, проверь pinned version/status и прочитай весь
   `DESIGN.md`: screens/zones, required states/viewports, prototype walkthrough,
   proportions, page sizing, typography/colors, assets и overlay priority
   contract.
2. Открой prototype entry отдельной видимой foreground Chrome page напрямую
   как локальный `file://` artifact и вызови `page.bringToFront()`. Это
   разрешённая статическая проверка дизайн-пакета, а не
   запуск приложения: не запускай Genie/backend, не вызывай product API и не
   считай prototype runtime evidence. Если browser не может открыть package
   напрямую или assets отсутствуют, верни Designer contract gap; не поднимай
   локальный application/server.
3. Последовательно прокликай каждый `data-design-id` и semantic control из
   prototype interaction map. Для hover/focus/keyboard состояний выполни exact
   action из `DESIGN.md`; не ограничивайся чтением HTML/CSS.
4. На каждом required viewport/state сними и визуально просмотри screenshot,
   проверь observable behavior, geometry, menu placement, overlay order,
   canonical colors, Roboto headings, SVG aspect ratio и заданные proportions
   toolbar/settings/plots/controls. Для hover, pressed, selected,
   focus-visible и disabled сравни computed styles до/во время/после действия,
   чтобы доказать transient/persistent semantics и отсутствие layout shift.
   Для page-layout scope отдельно проверь minimum, минимум два larger и один
   undersized viewport из sizing contract: порядок/ориентация/grouping зон не
   меняются, growth ratios соблюдаются, fixed controls не растягиваются, а
   minimum canvas доступен через document scroll.
5. Составь observed design map: action → state → screenshot → geometry. Только
   после этого открой production Engee и повтори тот же пользовательский путь.

`data-design-id` используется только для walkthrough prototype. В production
используй semantic locators и stable `data-testid`; не требуй переносить
prototype ids в product DOM.

## Детерминированный screenshot

1. Открой project-locked production target в том же foreground Chrome,
   вызови `page.bringToFront()` и дождись ready-state,
   скрытия loader, завершения fonts/render и ожидаемых API responses.
2. Установи точный viewport из handoff. Минимально проверь reference viewport
   и поддерживаемый приложением minimum viewport, если они заданы. Для
   `page_sizing_contract` также проверь два larger viewport и один viewport
   меньше application minimum по обеим релевантным осям.
3. Подготовь воспроизводимые данные и зафиксируй active tab, selection, scroll,
   focus, hover/open state и browser scale.
4. Не используй произвольный sleep. Ожидай observable state, transition end
   либо стабильную geometry.
5. Сними full-zone и прицельные locator screenshots. Для каждого artifact
   запиши target, viewport, state, selector, timestamp и scenario step.
6. Просмотри screenshot визуально; не делай вывод только по DOM или наличию
   файла.

Не коммить новый baseline и не обновляй существующий молча. Изменение baseline
допустимо только как явный deliverable task с указанным reference/approval.

## Что измерять

Для таблиц и settings обязательно сравни:

- высоту header и data rows, vertical rhythm и плотность;
- ширины колонок, min/max width, распределение свободного места;
- clipping, overflow, ellipsis, wrapping и горизонтальный scroll;
- padding, gaps, alignment labels/values/icons/checkboxes;
- высоту и ширину inputs, selects, buttons, tabs и settings sections;
- положение overlays относительно trigger и viewport boundaries;
- z-index/occlusion, отсутствие скачков layout и выхода за экран.
- exact eye/eye-off state в column visibility menu без checkmark;
- local Roboto Medium на headings, canonical template colors/menu geometry и
  сохранение proportions из Designer contract;
- exact source-derived profile для toolbar, controls, rows, menus и dialogs:
  dimensions/radii проверяй computed style и `boundingBox`, не визуальной
  оценкой на глаз.
- application/zone minima, computed grid/flex growth, отношения основных зон
  на larger viewports и отсутствие structural `max-width`/`max-height` cap;
- invariant composition и document/root overflow в undersized viewport без
  transform/zoom, clipping, reorder, stacking, hiding или замены элементов;
- для каждого Plotly output белые `paper`/`plot`/modebar (`#ffffff`), default
  modebar icons `#b8b8b8`, hover `#7a7a7a` на `#f8f8f8`, active
  `#5f5f5f` на `#f2f2f2`; также отсутствие Plotly logo, общей тёмной или
  полупрозрачной подложки, border/shadow и geometry shift при hover/active.

Screenshot review дополняй `boundingBox`/computed-style assertions с явно
обоснованными tolerances. Не используй хрупкое pixel-perfect сравнение как
единственное доказательство.

## Dynamic UI coverage matrix

Для каждого динамического элемента зафиксируй и протестируй применимые состояния:

- closed/open и trigger action;
- mouse hover и keyboard focus;
- Enter/Space/Escape, Tab order, focus trap и focus restore;
- outside click и overlay behavior;
- enabled/disabled, busy/loading, empty, validation error, runtime error,
  success и retry;
- placement, size, clipping и viewport collision;
- cleanup после закрытия и сохранность authoritative state.

К динамическим элементам относятся все menus, dropdowns, context/row actions,
tooltips, popovers, dialogs, confirmation/success windows, toasts, loaders,
expanders, tabs и transient plot/settings states. Если stable selector
отсутствует, отправь Frontend handoff и не закрепляй test через хрупкий CSS
selector.

## Обязательная проверка overlay stack

Если два или более popup/overlay могут сосуществовать, для каждого сочетания из
Designer priority contract:

1. открой layers в реальном пользовательском порядке, включая stale
   dropdown/popover/tooltip перед новым blocking dialog;
2. сними screenshot top state и зафиксируй ожидаемый bottom-to-top order;
3. в точках пересечения используй `document.elementFromPoint` и реальные click
   targets: top layer должен получать hit, перекрытые controls — нет;
4. проверь focus owner/trap и отсутствие pointer/keyboard interaction с нижним
   blocking layer;
5. проверь, что backdrop ниже своей surface, child popup выше parent surface,
   актуальный blocking overlay выше старых transient elements, а passive toast
   не перекрывает active modal control;
6. закрой top layer, проверь восстановление следующего layer, focus target и
   сохранённого state, затем сними recovery screenshot.

Computed `z-index` и DOM presence сами по себе не являются pass: assertion
обязана подтвердить фактические occlusion, hit testing, focus/pointer blocking
и restoration. Finding о неверном visual priority маршрутизируй Designer, а о
реализации утверждённого priority contract — Frontend.

## Закрепление тестами

1. Создай или обнови scenario в `test/playwright/**`.
2. Проверяй semantics и interaction lifecycle отдельно от geometry.
3. Добавь geometry assertions для размеров строк, колонок, settings controls и
   overlays, из-за которых был открыт visual finding.
4. Для Plotly modebar наведи реальный pointer и активируй инструмент в
   foreground Chrome; сравни computed color/background до, во время и после
   действия и приложи прицельный screenshot modebar.
5. Сохрани screenshot evidence path в runtime report; committed baselines —
   только когда они явно приняты task.
6. Обнови coverage mapping динамических элементов, чтобы отсутствие состояния
   было видно как gap, а не считалось pass.
7. Запусти новый scenario и соответствующий quick/full suite по выбранному
   regression mode.

## Report

Верни Orchestrator: exact design reference/version, prototype entry, clicked
interaction map, prototype и production screenshots, viewports, visual actual
versus expected, geometry/proportion measurements/tolerances, font/color/icon
checks, page-sizing measurements and undersized-scroll evidence, dynamic
coverage matrix,
overlay-priority matrix с hit/focus/restoration evidence, changed tests,
commands, pass/fail counts, uncovered states и owner каждого finding.

Неработающий/неполный prototype, отсутствующее state или противоречивый
Designer contract маршрутизируй Designer. Расхождение production с готовым
contract маршрутизируй Frontend. Prototype pass не является API, functionality,
deployment или production runtime pass.

Перед report проверь, что каждый screenshot действительно просмотрен,
artifact связан с exact target/revision/state, а важный finding закреплён
semantic/interaction/geometry assertion либо явно оставлен gap с владельцем.
