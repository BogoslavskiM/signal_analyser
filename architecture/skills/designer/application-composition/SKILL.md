# Application Composition Designer

## Назначение и вход

Спроектируй screen/zone composition по ТЗ и required viewports. Используй
`reference/application-toolbar.html` и `.css` для global shell, а
`reference/multi-page-element.html` и `.css` для tabs/pages только когда эти
patterns совпадают со scope. Размеры application canvas, минимумы зон,
growth ratios и поведение undersized viewport определяй совместно с
обязательным `designer/page-sizing-contract`.

## Порядок работы

1. Раздели экран на именованные зоны с одной понятной ответственностью.
2. Задай иерархию и composition зон. Минимумы, resize, overflow, scroll и
   пропорциональный рост закрепи через `page-sizing-contract`; не задавай
   structural `max-width`/`max-height` растягиваемым зонам.
3. Размести global actions в toolbar, zone actions внутри соответствующей
   зоны, а graph controls рядом с их output. Сохраняй canonical toolbar height,
   logo/action proportions, gaps и typography; меняй только требуемую ТЗ
   composition/layout.
4. Определи tabs/opened-page behavior только визуально: selected, overflow,
   close affordance, loading/error markers.
5. Опиши modal/overlay anchor и z-order; исключи перекрытие критичных controls.
6. Для каждого viewport подтверди неизменность порядка, ориентации, grouping и
   видимости зон. При viewport меньше application minimum сохраняй минимальный
   canvas и используй document scroll; не переставляй, не складывай и не
   скрывай элементы как resize adaptation.

Не определяй production DOM modules, route state, API handlers или polling.
Нестандартная зона допустима, когда типовые patterns не покрывают ТЗ.

## Проверка и завершение

Проверь геометрию на каждом required viewport, отсутствие overlap, доступность
global actions и сохранение пользовательского контекста при переключении
страниц. Зафиксируй карту зон и ссылку на заполненный `page_sizing_contract` в
`DESIGN.md`; проверь minimum, larger и undersized viewports.
