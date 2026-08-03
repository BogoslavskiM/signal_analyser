---
name: visual-analysis
---
# E2E Visual Analysis and Screenshots

Используй этот stage skill для каждого UI-affecting regression handoff. Цель —
найти визуальные и динамические дефекты по реальным screenshots и закрепить
ожидаемое поведение устойчивыми Playwright tests.

## Входные данные

- production target либо явный `target_status: unavailable`;
- reference images и их назначение;
- утверждённая Engee visual system;
- список viewports из handoff;
- inventory зон, таблиц, settings controls и динамических элементов;
- stable `data-testid` contract.

Reference image определяет структуру и наблюдаемое состояние, но не становится
источником CSS, если handoff не говорит обратного. При конфликте прямое
требование пользователя и утверждённая Engee visual system имеют приоритет.

## Детерминированный screenshot

1. Открой только project-locked production target и дождись ready-state,
   скрытия loader, завершения fonts/render и ожидаемых API responses.
2. Установи точный viewport из handoff. Минимально проверь reference viewport
   и поддерживаемый приложением minimum viewport, если они заданы.
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

## Закрепление тестами

1. Создай или обнови scenario в `test/playwright/**`.
2. Проверяй semantics и interaction lifecycle отдельно от geometry.
3. Добавь geometry assertions для размеров строк, колонок, settings controls и
   overlays, из-за которых был открыт visual finding.
4. Сохрани screenshot evidence path в runtime report; committed baselines —
   только когда они явно приняты task.
5. Обнови coverage mapping динамических элементов, чтобы отсутствие состояния
   было видно как gap, а не считалось pass.
6. Запусти новый scenario и соответствующий quick/full suite по выбранному
   regression mode.

## Report

Верни Orchestrator: references, viewports, screenshots, visual actual versus
expected, geometry measurements/tolerances, dynamic coverage matrix, changed
tests, commands, pass/fail counts, uncovered states и owner каждого finding.
