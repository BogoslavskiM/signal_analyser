# Design packages

Designer хранит здесь результат конкретной task:

```text
TASK-XXXX-<slug>/
  DESIGN.md
  prototype/
    index.html
    design.css
    demo.js
  assets/
    fonts/       # local Roboto files used by prototype
    icons/       # only used canonical SVGs
  screenshots/  # required screen/state/viewport evidence
```

`DESIGN.md` содержит `design_mode`, `design_status`, `design_version`, выбранный
`ui_profile`, scope,
screen/zone map, clickable prototype interaction map, viewport rules,
proportion contract, local asset inventory, used visual references, acceptance
and change log. Для сосуществующих overlays он также содержит inventory,
bottom-to-top priority, pointer/focus owner и restoration order. Обновление
повышает version внутри того же пакета; каталоги версий и копии общих templates
запрещены.

Canonical reusable HTML/CSS/demo templates, Roboto/SVG и application screenshot
catalogs находятся в
`architecture/skills/designer/**/reference/`. Production frontend находится в
`public/**`. Handoff только pin-ит `design_ref` и `design_version`.
