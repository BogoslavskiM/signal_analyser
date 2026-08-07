---
id: TASK-0055
kind: group
title: Дополнительная структурная, визуальная и performance ревизия UI
status: in_progress
priority: P0
queue_order: null
model: null
reasoning: null
owner: orchestrator
assignees: []
parent: null
depends_on: []
blocks: []
source_handoffs: [HND-0222]
related_handoffs: [HND-0222, HND-0225, HND-0226, HND-0412, HND-0413, HND-0414]
blocked_by: []
blocker_reason: null
feature_slug: signal_analyser_ui_refinement
development_branch: neuro_signal_analyser_ui_refinement
integration_sha: null
ui_impact: new_or_changed
design_mode: autonomous
design_ref: null
design_version: null
---

# Дополнительная UI и performance ревизия

## User value

Settings имеют понятную семантическую структуру, overlays безошибочно работают
в многослойных комбинациях, основные действия не содержат лишних промежуточных
шагов, а frontend не зависает при обычной пользовательской работе.

## Source evidence

- Сообщения пользователя от 2026-08-05 в текущем thread.
- `/Users/makar/Desktop/Снимок экрана 2026-08-05 в 10.40.15.png`, 720×1016.
- На изображении показан блок `Time`: Options (`Normalize Y`, `Show markers`),
  `Time units`, X limits и Y limits. Пользователь требует разместить этот блок
  во вкладке Time и проверить принадлежность всех остальных settings tabs по
  смыслу, не выводя решение из визуального дизайна.
- Пользователь отдельно оценил frontend-залипание как неприемлемое и сообщил,
  что дополнит performance skills.
- Пользователь закрепил положение legend: в правой верхней части каждого
  графика, компактного малого размера.
- `/Users/makar/Desktop/Снимок экрана 2026-08-05 в 11.30.48.png`, фрагмент
  inspector header `Signals 4 signals`; пользователь требует оставить только
  название вкладки без подписи количества.
- Пользователь требует заново и полностью спроектировать все три страницы
  `Display settings`, используя стандартные skill-patterns для settings forms,
  dropdowns и checkboxes, а затем перевести весь интерфейс на русский язык.
- Пользователь требует привести окантовки кнопок, границы компонентов и все
  hover/active эффекты кнопок к готовящимся референсам.

## Accepted requirements

- Перенести показанный settings block во вкладку Time и провести полный
  семантический аудит распределения всех controls по вкладкам.
- Уменьшить нижнюю часть с таблицей по вертикали суммарно на 5–10 px.
- Удалить inline-кнопку Info.
- Заменить искажённую эмблему Engee корректным asset из project templates.
- По клику `+` сразу открывать основной диалог, полностью удалив первичный popup.
- Устранить неприемлемые frontend stalls; решение может требовать изменения
  frontend architecture, а не только локальной оптимизации.
- Проверить уровни всех popup/modal/popover/dropdown/tooltip/toast и поведение
  многослойного frontend во всех допустимых комбинациях.
- Легенда каждого графика находится внутри plot area в правом верхнем углу и
  использует единый компактный малый размер.
- Все три страницы `Display settings` имеют полный согласованный дизайн для
  всех полей, состояний и поддерживаемых типов графиков.
- Settings оформлены стандартными строками `название: параметр`: label и
  соответствующий control образуют одну предсказуемую строку. Dropdowns и
  checkboxes следуют применимым skill-patterns; checkbox не ставится слева
  перед названием параметра.
- Полностью удалить текст `Bindings for Pane 2 Spectrum Checkboxes affect this
  pane only` и его динамические варианты без замещающей подписи.
- В строке toolbar инспектора рядом расположены `+` и кнопка с канонической
  template-иконкой вертикального троеточия. Кнопка-глаз отсутствует в toolbar
  по умолчанию и доступна как действие внутри меню троеточия.
- В header инспектора убрать подпись количества сигналов: оставить только
  название страницы `Signals` до общей локализации.
- Перевести весь интерфейс на русский: visible copy, controls, menus, dialogs,
  tooltips, validation, empty/loading/error/success states и accessibility names.
- Привести border/outline/divider/radius всех кнопок и компонентов, а также
  default/hover/active/pressed/focus-visible/disabled/loading button states к
  переданным референсам без локальных визуальных исключений.
- Поддержать layout grid до `10×10` включительно. Большие раскладки разрешены,
  но selection UI показывает заметный non-blocking warning, что такой режим не
  рекомендуется; точный recommended envelope/trigger фиксирует design package.
- Кнопка `+ Add Display`, добавляющая новый экран, постоянно видна в строке
  Display tabs на всех поддерживаемых viewports/states. Это отдельный control
  от Signals `+`, который остаётся рядом с vertical-ellipsis по предыдущему ТЗ.
- Первой строкой страницы `Display settings` показать стандартный dropdown
  типа графика. Он дублирует pane selector как второй view одного значения:
  изменение любого selector синхронно обновляет другой без duplicate state.
- Видимые кнопки инструментов графика и Plotly.js modebar полностью убраны.
  В меню троеточия настроек каждой области находится кнопка справки, которая
  открывает подсказку с инструкциями `Перетаскивать график: Shift + ЛКМ`,
  `Автомасштабирование: двойной клик` и
  `Зум: зажать ЛКМ и выделить область`.
- Компактная легенда справа сверху не пересекается с троеточием настроек
  области или открытой graph-help подсказкой.
- Inline row actions таблицы, кроме удаляемой кнопки Info, сохраняются и
  становятся видимы на row hover и keyboard focus без сдвига колонок/данных.

## Out of scope

- Незаявленные новые функции вне зафиксированного пользовательского intake.
- Вывод semantic settings ownership только из дизайна или скриншота.
- Изменение backend math, signal calculations или dependency files.
- Merge/deploy без отдельных handoff и явной приемки feature.

## Acceptance criteria

- [ ] Каждое settings field имеет единственную документированную вкладку по смыслу.
- [ ] Показанный screenshot block находится во вкладке Time.
- [ ] Таблица ниже на 5–10 px без потери строк, scroll или responsive behavior.
- [ ] Inline Info отсутствует, а `+` открывает основной dialog одним действием.
- [ ] Эмблема Engee взята из канонического project template без искажения.
- [ ] Все overlay combinations проходят layer/focus/keyboard/scroll/clipping matrix.
- [ ] Легенда каждого графика закреплена справа сверху, компактна и не
  перекрывает данные, оси, selectors или другие controls на всех viewports.
- [ ] Все три страницы Display settings полностью спроектированы и реализованы
  по одной стандартной form/control системе во всех состояниях.
- [ ] Нет нестандартных dropdowns и checkbox-before-label композиций.
- [ ] Binding-caption полностью отсутствует; inspector header не показывает
  количество сигналов.
- [ ] В inspector toolbar `+` соседствует с вертикальным троеточием из template,
  а управление видимостью столбцов с иконкой глаза находится внутри его меню.
- [ ] Интерфейс полностью русскоязычный без смешанной системной UI-копии;
  user data, units и технические identifiers сохранены без искажения.
- [ ] Для каждого button family и bordered component существует reference
  mapping; фактические border/outline/radius и hover/active states ему равны.
- [ ] Layout selector/API/session принимают `1×1`…`10×10`; большие разрешённые
  раскладки показывают design-defined warning «не рекомендуется».
- [ ] `+ Add Display` всегда виден в Display tabs и добавляет новый экран;
  Signals `+`/ellipsis сохраняют отдельный ранее закреплённый contract.
- [ ] Первый control Display settings — plot-type dropdown; он двусторонне
  синхронизирован с pane selector и использует один authoritative state.
- [ ] Ни один plot pane не показывает modebar или кнопки graph tools; пустой
  toolbar container также отсутствует.
- [ ] Кнопка graph-help в area ellipsis menu доступна pointer/keyboard users,
  показывает три закреплённые инструкции и корректно восстанавливает focus.
- [ ] Legend, area ellipsis и открытая graph-help подсказка не пересекаются.
- [ ] Inline table actions появляются на hover/focus в зарезервированной action
  zone; Info отсутствует, остальные действия не потеряны и не сдвигают row.
- [ ] Подтверждённые frontend stalls устранены и защищены измеримым regression gate.
- [ ] Frontend/backend tests, exact production deploy и post-task E2E пройдены.

## Decomposition

| ID | Role | Deliverable | Depends on | Status |
|---|---|---|---|---|
| TASK-0056 | Backender | Authoritative settings-tab ownership contract | — | backlog |
| TASK-0057 | Designer | Versioned UI/overlay refinement package | — | backlog |
| TASK-0066 | Backender | Layout contract up to 10×10 | — | backlog |
| TASK-0058 | Frontend | UI structure, icon, table and direct-dialog implementation | TASK-0056, TASK-0057, TASK-0066 | backlog |
| TASK-0059 | E2E | Reproduce and profile unacceptable frontend stalls | user performance skills update | backlog |
| TASK-0065 | Backender | State-lite/cache/revision/active-page performance architecture | TASK-0059 | backlog |
| TASK-0060 | Frontend | Lazy Plotly/render/debounce performance architecture | TASK-0059, TASK-0065 | backlog |
| TASK-0061 | Tester | Functional and performance regression suite | TASK-0058, TASK-0060, TASK-0064, TASK-0065 | backlog |
| TASK-0062 | Tester | Deterministic overlay stacking contract coverage | TASK-0058 | backlog |
| TASK-0063 | E2E | Browser UI/overlay regression across all settings pages | TASK-0062, TASK-0064 | backlog |
| TASK-0064 | Frontend | Complete Russian interface localization | TASK-0058 | backlog |
| TASK-0067 | Designer | Priority revision of display navigation, graph help and signal-row inline actions | — | backlog |
| TASK-0077 | Orchestrator/multi-role | Explicit Apply, MATLAB/Engee parity and current skill-stack alignment | — | in_progress |

## Stage matrix

| Stage | Decision | Reason |
|---|---|---|
| Design | required | Visible structure, geometry, icon, dialog and layers change. |
| Backend | required | Settings ownership plus data-heavy cache/revision/API architecture. |
| Frontend | required | UI interactions, controls, localization, overlays and performance architecture change. |
| Tester | required | Functional, layer and performance regressions are needed. |
| E2E | required | Performance profiling and real browser overlay combinations. |
| Engee contract/MATLAB research | not_applicable | Existing calculations are preserved; no new Engee function, math or MATLAB-derived behavior is introduced. |
| DevOps feature branch | required | Open once the completed predecessor feature is integrated into neuro_dev. |
| Deploy/merge | required | Production Engee deploy, required E2E and automatic technical integration gate. |

## Queue decision

- Priority: P0 because the user identified frontend freezing as unacceptable in
  current work; other UI corrections remain in the same accepted package.
- Intake status: closed by the user's request to resume autonomous development
  after the announced skills update.
- Queue order: assigned after the shared feature branch is reported by DevOps.
- Eligibility: independent design/settings/performance evidence tasks become
  queueable once the shared feature branch is recorded.

## Verification and results

Intake and decomposition recorded as `HND-0222`. Completed predecessor feature
was integrated into `neuro_dev` at cac83c5f445352a50f04aeeeb269b47007766d79;
DevOps created and activated `neuro_signal_analyser_ui_refinement` from that
exact base (`HND-0226`). Independent design/settings/performance evidence lanes
are dispatched in HND-0227/HND-0228/HND-0229. User scope update for 10×10,
visible signal `+` and synchronized settings plot type is routed through
HND-0237/HND-0238 without starting stale Frontend work.

## Risks, blockers and follow-ups

Updated canonical skill references are authoritative for the started design
cycle. A later explicit user reference remains higher priority and must enter
through a recorded design revision rather than a silent implementation change.
The user subsequently rejected and then removed the graph toolbar requirement,
replacing it with area-menu interaction help, and rejected the row-action treatment;
the complete replacement scope is preserved as highest-priority backlog task
TASK-0067 and blocks design acceptance/frontend dispatch until resumed.
