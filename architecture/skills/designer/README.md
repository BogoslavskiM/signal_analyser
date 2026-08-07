# Designer skills

Designer всегда начинает с `designer-workflow` и `visual-system`, затем
подключает только нужные composition/data/output/dialog subskills.

`designer/page-sizing-contract` принадлежит Designer и обязателен для каждого
нового или изменённого application page, shell или zone layout. Он задаёт
application/zone minima, invariant composition, proportional unlimited growth
и document scroll при viewport меньше application minimum. Frontend реализует
этот контракт, но не дублирует skill и не выбирает размеры самостоятельно.

Canonical visual references включают:

- local Roboto Regular/Medium Cyrillic/Latin;
- полный набор shared SVG и icon showcase;
- theme colors, menus and component proportions;
- source-derived `analytical-dense` / `form-workbench` dimensions, radii and
  hover/pressed/selected/focus-visible/disabled states;
- application screenshot catalogs в `visual-system/reference/screenshots/`.

Screenshot catalogs служат evidence реальных proportions/states, но не
переносят app-specific layout, labels/data, browser chrome или legacy loading.
Готовый design package содержит local assets и полностью clickable prototype;
E2E сначала прокликивает его через `file://`, затем сравнивает production Engee.
