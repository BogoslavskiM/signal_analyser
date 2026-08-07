# Window Designer visual references

Эти screenshots фиксируют реальные композиционные и interaction patterns
другого Engee-приложения. Используй их как визуальное evidence для пропорций,
плотности и состояния компонентов, а не как готовое ТЗ нового приложения.

Browser chrome, URL, имя приложения, тексты, данные графиков и предметные поля
не входят в дизайн-систему. Не копируй их без требования task. Не воспроизводи
screenshots pixel-perfect и не меняй требуемую раскладку только ради сходства.

| File | Наблюдаемое состояние | Что извлекать |
|---|---|---|
| `default-single-window.png` | Один объект, два графика, inspector и settings | Общая вертикальная плотность, toolbar/graph/table/settings proportions |
| `renamed-window-state.png` | Редактирование имени выбранного объекта | Focus state, selected row, alignment settings form |
| `toolbar-tooltip.png` | Tooltip icon-only action | Anchor, offset, compact tooltip geometry |
| `toolbar-export-menu.png` | Toolbar export dropdown | Menu width, item rhythm, alignment under split action |
| `object-export-operation-menu.png` | Select внутри export dialog | Form proportions, nested menu density, selected marker |
| `plot-settings-menu.png` | Меню видимости plots и переход к settings | Toolbar popup placement, compact settings menu |
| `analysis-settings-dialog.png` | Settings dialog поверх application | Dialog field rhythm, footer actions, backdrop and layer priority |
| `session-import-dialog.png` | Session import | Form dialog proportions, path field, checkbox and actions |
| `file-browser-dialog.png` | File browser поверх application | Browser rows, hierarchy, path footer, modal dimensions |
| `session-import-loading.png` | Pending import | Loader placement, disabled/background state and preserved context |

Все PNG имеют исходный размер 3584×2240 и хранятся без редактирования. При
подготовке нового design package перечисли использованные screenshots в
`DESIGN.md`, укажи какие именно measurements/patterns извлечены и отдели их от
решений из ТЗ, canonical templates и corporate Figma.
