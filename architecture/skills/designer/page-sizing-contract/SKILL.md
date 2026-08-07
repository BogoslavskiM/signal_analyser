# Page Sizing Contract

Сформируй в `DESIGN.md` однозначный контракт размеров страницы. Designer
определяет геометрию; Frontend только реализует закреплённый контракт и не
выбирает новые размеры самостоятельно.

## Базовые правила

- Зафиксируй `application_min_width` и `application_min_height` в пикселях.
- Зафиксируй минимальную ширину и высоту каждой крупной зоны и каждого
  растягиваемого элемента.
- Не задавай `max-width` или `max-height` для application canvas,
  растягиваемых структурных зон, графиков, таблиц и рабочих панелей.
- Для template controls с канонической фиксированной геометрией — toolbar
  icons, icon buttons, checkbox/radio, стандартных input heights — сохраняй
  точный размер шаблона. Они не участвуют в распределении лишнего пространства.
- Не меняй порядок, ориентацию, grouping, видимость или composition зон при
  resize. Не вводи breakpoint, который переставляет, складывает, скрывает или
  заменяет элементы.
- Сохраняй исходные пропорции приложения при росте viewport. Распредели
  дополнительную ширину и высоту через явные `growth_ratio` зон; размеры могут
  расти без верхнего ограничения.
- Не сжимай ни одну зону ниже её минимума ради помещения во viewport.

## Viewport меньше приложения

Разрешай пользователю уменьшать окно браузера ниже минимального размера
приложения. При этом:

1. application canvas остаётся не меньше `application_min_width ×
   application_min_height`;
2. внутренняя раскладка и пропорции не перестраиваются;
3. document/root scroll container получает необходимую горизонтальную и/или
   вертикальную прокрутку;
4. контент не масштабируется CSS transform/zoom, не обрезается и не переносится
   в другую композицию;
5. overlays сохраняют собственный Designer contract и не изменяют page
   composition.

Не блокируй изменение размера самого browser window и не пытайся программно
возвращать его к минимуму.

## Формат контракта

Добавь в `DESIGN.md` заполненный блок:

```yaml
page_sizing_contract:
  application_min_width: <px>
  application_min_height: <px>
  layout_invariant_on_resize: true
  undersized_viewport_behavior: document_scroll
  structural_max_sizes: none
  zones:
    - id: <zone-id>
      min_width: <px>
      min_height: <px>
      width_growth_ratio: <number>
      height_growth_ratio: <number>
  fixed_template_controls:
    - id: <control-pattern>
      width: <px or intrinsic>
      height: <px>
```

Для каждой оси сумма `growth_ratio` должна отражать исходную пропорцию зон.
Если зона по одной оси фиксирована, укажи ratio `0` и точный template size.
Не используй расплывчатые значения `responsive`, `auto` или «примерно» вместо
измеримого правила.

## Prototype и evidence

Проверь один минимальный, минимум два увеличенных и один undersized viewport.
В undersized viewport screenshot должен показать неизменившийся application
canvas и доступную прокрутку. В увеличенных viewport измерь отношения основных
зон и зафиксируй допустимое округление не более одного CSS pixel на track.

Добавь в prototype диагностические `data-design-id` для application root и
главных зон, но не превращай их в production selectors. Убедись, что resize не
вызывает layout shift, reorder, hide, stack или изменение canonical размеров
фиксированных controls.

## Результат

Верни `page_sizing_contract`, tested viewports, screenshots и найденные
ограничения в `design_report`. Если текущий пакет не может выполнить эти
правила без изменения требуемой композиции, выпусти новую design version; не
перекладывай выбор размеров на Frontend.
