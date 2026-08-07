# Design Implementation Frontend

## Назначение и вход

Реализуй только готовый Designer contract. Прочитай `design_ref`, pinned
`design_version`, `DESIGN.md`, prototype, assets, screenshots, required states
и viewports, proportion contract и `page_sizing_contract`. Не используй
корпоративную Figma и старые frontend visual
templates как параллельный источник дизайна.

## Design coverage gate

До видимых изменений проверь:

- package имеет `design_status: ready`;
- version совпадает с handoff;
- каждый реализуемый screen/zone перечислен;
- все требуемые states и viewports покрыты;
- assets и evidence существуют;
- prototype entry и interaction map существуют, а каждый required state
  достигается реальным click/focus action без API;
- asset inventory и proportion contract покрывают затрагиваемые зоны;
- для нового/изменённого page, shell или zone layout присутствует измеримый
  `page_sizing_contract` с application/zone minima, growth ratios,
  `layout_invariant_on_resize: true`, отсутствием structural maxima и
  `undersized_viewport_behavior: document_scroll`;
- canonical UI profile и source-derived dimensions/radii/state values явно
  указаны и не смешаны;
- дизайн не противоречит ТЗ и реальному техническому ограничению.

Если проверка не пройдена, отправь Designer `design_revision`. Укажи
`design_ref`, version, affected screen/state/viewport, точное ограничение и
current screenshot/code evidence. Продолжай только независимую техническую
работу; не закрывай visual gap самостоятельно.

## Порядок реализации

1. Сопоставь design zones с production modules из `zone-structure-api`.
2. Перенеси утверждённые geometry, tokens, classes and local assets в
   project-owned HTML/CSS без runtime CDN. Скопируй все четыре локальных
   Roboto TTF из design package в `public/fonts`, применяй Roboto Medium 500 к
   headings и сохраняй исходный aspect ratio каждого SVG.
3. Реализуй `page_sizing_contract`: application/zone minima, заданные grid/flex
   growth ratios и unlimited growth structural zones без `max-width`/
   `max-height`. Не меняй composition на breakpoints. При viewport меньше
   minimum сохраняй canvas и включай document/root overflow; не используй
   transform/zoom, clipping или adaptive stacking. Fixed template controls
   сохраняют canonical dimensions.
4. Не копируй prototype `demo.js`; свяжи states с реальными component data,
   actions, API lifecycle and guards.
5. Реализуй visible focus, semantic roles, keyboard behavior and accessible
   names; Designer задаёт visual expectation, Frontend — production semantics.
6. Добавь stable `data-testid` наблюдаемым actions/states, не используя их как
   CSS hooks.
7. Проверь каждый required state and viewport. Если техническая реализация
   требует видимого отклонения, запроси новую design version до завершения.
8. Используй только colors/tokens из pinned package. Toolbar, settings,
   plot/settings menus, graph frames, controls, gaps и icons сохраняют
   утверждённые proportions. Реализуй exact размеры, радиусы и hover/pressed/
   selected/focus-visible/disabled values выбранного profile; меняется только
   требуемая ТЗ layout composition.
9. Все settings menus собирай по canonical menu pattern design package.
   В column visibility menu показывай локальные `eye.svg`/`eye-off.svg`, а не
   checkbox или checkmark.

`data-design-id` принадлежит только prototype walkthrough. В production для
наблюдаемого поведения добавляй semantic markup и stable `data-testid`.

## Проверка и завершение

Запусти frontend syntax/static/behavior checks, открой реализованные states в
required viewports и сопоставь их с screenshots/visual contract. В report
укажи `design_ref`, `implemented_design_version`, covered screens/states/
viewports, canonical UI profile, copied fonts/icons, verified dimensions/radii/
state styles and proportions, page sizing minima/growth/undersized-scroll
evidence, approved deviations,
selectors and remaining gaps. Не объявляй E2E
или production visual verification выполненной по локальному source.
