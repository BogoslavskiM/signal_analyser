---
id: TASK-0067
kind: task
title: Пересобрать навигацию экранов, graph help и inline actions таблицы
status: done
priority: P0
queue_order: 1
model: gpt-5.6-sol
reasoning: xhigh
owner: orchestrator
assignees: [designer]
parent: TASK-0055
depends_on: []
blocks: [TASK-0057, TASK-0058]
source_handoffs: []
related_handoffs: [HND-0242, HND-0258, HND-0345, HND-0348]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_refinement
ui_impact: new_or_changed
design_mode: review
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: 2
---

# Приоритетная ревизия экранов, graph help и действий строк

## User value

Навигация между отображаемыми экранами и действия над активной областью
выглядят и работают как стандартные элементы Engee, а контекстные действия
таблицы сигналов не создают лишнюю колонку, визуальный шум или неверные цвета.

## Source evidence

- Прямые сообщения пользователя от 2026-08-05 в текущем thread.
- Пользователь явно отклонил текущее дизайн-решение панели инструментов.
- Пользователь отменил прежнее требование показывать Plotly modebar/tools и
  заменил его справкой по жестам в меню троеточия настроек области.
- Актуальные на момент будущего запуска Designer skill-patterns являются
  обязательным visual source после прямого ТЗ этой задачи.

## Scope

- Переместить icon-only кнопку `+` добавления экрана в один action cluster с
  кнопкой `Изменить макет`, непосредственно слева от неё. Видимый текст
  `Добавить экран` запрещён; назначение остаётся в accessible name и tooltip.
- У каждой области использовать один dropdown по кнопке с тремя точками.
  Внутри одного меню расположить отдельные actions `Очистить область` и
  `Управление графиком`; отдельных кнопок для них вне этого menu не показывать.
- Полностью убрать видимые кнопки инструментов графика и Plotly modebar.
  Текущий toolbar не считать допустимым reference и не передавать во Frontend.
- Action `Управление графиком` в том же menu открывает компактную подсказку с
  точным содержанием:
  - `Перетаскивать график: Shift + ЛКМ`;
  - `Автомасштабирование: двойной клик`;
  - `Зум: зажать ЛКМ и выделить область`.
- Canonical dropdown выбора типа графика (`Спектр`, `Временная` и остальные
  доступные типы) расположен вплотную рядом с кнопкой троеточия в одном
  компактном pane-control cluster, без случайного промежутка или переноса.
- В default state этот cluster встроен внутрь pane header row и вертикально
  центрирован: верхний и нижний inset симметричны. Dropdown/ellipsis не
  прилеплены к нижней границе строки.
- Chevron dropdown выровнен точно по вертикальному центру control. Selected
  check marks и ordinary checkbox marks используют только canonical assets/
  states из Designer references; column visibility остаётся eye/eye-off.
- Для dropdown закрепить exact default, hover, pressed, selected,
  focus-visible и disabled states, а также source-derived высоту control/item,
  padding, Roboto font-size/weight/line-height и правила wrapping.
- Закрепить anchor, dismissal, keyboard focus и restoration для этой подсказки
  в общей overlay priority matrix. Подсказка открывается новым overlay-слоем
  поверх workspace и не участвует в document flow: открытие/закрытие не
  двигает, не сжимает и не меняет геометрию графиков.
- Компактная легенда остаётся в правом верхнем секторе plot area, но не
  пересекается с троеточием настроек области или открытой подсказкой на любом
  required viewport и при длинных названиях серий.
- Список отображаемых экранов сделать горизонтально прокручиваемым. При
  overflow показать канонические стрелки прокрутки, geometry и states которых
  точно следуют Designer skills и reference `annotated-tabs-overflow.png`.
- Стрелки являются реальными pointer/keyboard кнопками прокрутки. На крайнем
  левом положении левая стрелка полностью скрыта, на крайнем правом — правая;
  в промежуточном положении обе видимы и кликабельны.
- Каждый отображаемый экран и каждая его видимая plot area в prototype и
  screenshots содержат настоящий интерактивный local Plotly graph с axes,
  traces и legend выбранного типа; image/static mock, пустой canvas или
  placeholder вместо графика запрещены. Prototype без CDN/API реально
  поддерживает Shift+ЛКМ pan, drag-selection zoom и double-click autoscale.
- Скриншоты дизайн-пакета являются только evidence для ревью. Они не задают
  допустимый способ рендера: рабочий prototype и будущий production UI обязаны
  создавать живой Plotly DOM instance; rasterized snapshot, background image,
  SVG/Canvas-заглушка или неинтерактивный fallback не принимаются даже временно.
- В default startup state доступен ровно один экран.
- У tab каждого экрана есть keyboard-accessible крестик. Его активация не
  удаляет экран сразу, а открывает confirmation dialog с явными действиями
  удалить/отменить; cancel сохраняет экран и возвращает focus на крестик.
- Удалить лишнюю одиночную точку справа в строке таблицы сигналов.
- Уменьшить нижнюю table zone дополнительно ровно на `10px` по вертикали
  относительно текущего review-макета, сохранив header/body readability,
  scroll и inline-action hit targets.
- Колонка `Имя` обязательна и всегда видима. Её нельзя скрыть через column
  visibility menu, keyboard action или восстановленный view/session state;
  menu не показывает доступное действие скрытия `Имя`.
- В столбце цвета таблицы показывать сам цвет компактным каноническим swatch,
  а не видимое текстовое имя, hex-код или другое текстовое представление.
  Swatch не имеет рамки/outline; доступное имя цвета остаётся только в
  accessibility semantics и tooltip, не в тексте ячейки.
- Сохранённые inline actions строки размещать внутри крайней правой
  содержательной ячейки, выравнивая по правому краю; отдельная action-колонка
  запрещена.
- Inline actions появляются на row hover и keyboard focus/focus-within без
  изменения ширины ячейки, колонок или строки.
- Заново определить default/hover/focus-visible/active/disabled цвета,
  границы и backgrounds inline actions строго из выбранного единого
  source-derived profile. Текущие цвета отклонены.
- Inline Info остаётся удалённой; остальные ранее принятые действия не терять.

## Out of scope

- Реализация в `public/**`, backend, tests, deploy или E2E до отдельного запуска.
- Изменение данных таблицы, business semantics экранов или Plotly calculations.
- Использование текущей отклонённой панели как основы с косметической
  перекраской или сохранение скрытого/пустого modebar container.

## Required states and viewports

- Viewports: `1440×900`, `1280×720`, `1024×768`.
- States: default, screen-list overflow, left-scroll-edge,
  middle-scroll-position, right-scroll-edge, arrow hover/focus/active,
  pane-control cluster, area ellipsis menu, clear-area menu item hover/focus,
  graph-control menu item hover/focus, graph-help tooltip open,
  graph-help dismissed/focus restored, screen-close focus/hover,
  delete-screen confirmation open/cancel/confirm/focus-restored,
  table row hover, row focus-within,
  color swatch default/hover/focus/selected, inline action
  hover/focus-visible/active/disabled, long last-cell content.

## Acceptance criteria

- [ ] Icon-only `+` добавления экрана находится непосредственно слева от
  `Изменить макет`; видимой надписи `Добавить экран` нет, tooltip и accessible
  name однозначны.
- [ ] `Очистить область` и `Управление графиком` являются двумя actions одного
  dropdown по троеточию; отдельных внешних кнопок этих действий нет.
- [ ] На графике нет modebar, видимых кнопок инструментов или оставшегося под
  них пустого container.
- [ ] В троеточии настроек области есть keyboard-accessible кнопка справки;
  открытая подсказка содержит три закреплённые инструкции без перефразирования.
- [ ] Plot-type dropdown расположен вплотную рядом с троеточием в устойчивом
  pane-control cluster на всех required viewports.
- [ ] Pane-control cluster вертикально центрирован в строке с равными top/bottom
  insets и не прилеплен к нижней border line; chevron центрирован в control.
- [ ] Dropdown checks/checkboxes, hover/pressed/selected/focus/disabled, row
  heights, padding и Roboto typography точно соответствуют canonical profile;
  обычные options не раздувают строку и не получают случайный wrap.
- [ ] Подсказка корректно закрывается, возвращает focus на trigger и следует
  общей overlay priority matrix.
- [ ] Graph-help является отдельным верхним overlay-слоем; его открытие и
  закрытие не меняет bounding boxes, layout или Plotly viewport графиков.
- [ ] Легенда не пересекается с area ellipsis trigger и graph-help подсказкой.
- [ ] Список экранов имеет реальный horizontal scroll и канонические left/right
  overflow arrows с корректными enabled/disabled и pointer/keyboard states.
- [ ] На left/right edge соответствующая стрелка полностью скрывается; в
  промежуточном положении обе стрелки кликабельны и двигают список.
- [ ] На каждом screen/pane показан график с mock data, axes и compact legend;
  он отрисован интерактивным local Plotly, а не картинкой/static mock; три
  закреплённых gesture реально работают и входят в interaction walkthrough.
- [ ] После первичного render и каждого layout/type update Plotly instance
  остаётся интерактивным: axes ranges реально меняются от zoom/pan и
  восстанавливаются double-click autoscale без подмены изображения.
- [ ] Default state содержит ровно один экран.
- [ ] Каждый screen tab имеет крестик; click/keyboard activation открывает
  confirmation dialog, cancel сохраняет экран, confirm удаляет его, focus
  восстанавливается детерминированно.
- [ ] В таблице нет лишней одиночной точки и отдельного столбца действий.
- [ ] Нижняя table zone на 10px ниже текущего review-макета без clipping строк,
  scroll regression или уменьшения action hit targets.
- [ ] Колонка `Имя` всегда видима и не имеет доступного hide action/state.
- [ ] Цвет в таблице отображается swatch без видимого текстового имени/кода и
  без рамки/outline; accessible name сохранён.
- [ ] Inline actions находятся внутри крайней правой содержательной ячейки,
  появляются на hover/focus и не вызывают layout shift.
- [ ] Цвета, borders и состояния inline actions совпадают с exact tokens одного
  выбранного source-derived profile; ad-hoc цвета отсутствуют.
- [ ] Info отсутствует, остальные inline actions сохранены.
- [ ] Designer публикует updated ready package и evidence с точечными review
  corrections; остальные visual choices уже приняты пользователем.

## User review

- 2026-08-05: пользователь одобрил остальной текущий дизайн. Остались точечные
  corrections по screenshots `15.44.21` и `15.49.23`: symmetric row embedding,
  centered chevron, canonical checks/checkboxes и exact dropdown states,
  row geometry и typography. После их доказательной ревизии новый material
  visual decision не требуется.
- 2026-08-05: пользователь отдельно подтвердил, что графики не могут быть
  картинками: интерактивность является обязательной частью дизайна и runtime,
  а не декоративным улучшением.

## Queue decision

- P0: пользователь назвал эти визуальные дефекты неприемлемыми и явно отклонил
  текущую панель; задача блокирует приемку TASK-0057 и запуск TASK-0058.
- После возобновления автономного процесса выбрана первой в очереди и выдана
  Designer через HND-0242; Frontend остаётся закрыт design gate до review.
