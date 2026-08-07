# Pulse Waveform Analyser visual references

Этот набор показывает multi-page graph application с правой settings zone и
нижним inspector. Browser chrome, URL, app name, signal data и labels не входят
в canonical design.

| File | Наблюдаемое состояние | Что извлекать |
|---|---|---|
| `default-real-imaginary-page.png` | Default graph page, settings и inspector | Zone proportions, two-plot stack, tabs/settings/table density |
| `page-picker-menu.png` | Меню добавления graph pages | Menu grouping, icon/label/description rhythm, anchor geometry |
| `annotated-tabs-overflow.png` | Много tabs, overflow arrows и открытое page menu | Tab min/max width, clipping, scroll controls; красные рамки являются annotation, не UI |
| `delay-cut-page-control.png` | Graph page со slider control | Plot/control vertical split, units/value alignment, active tab |
| `settings-scroll.png` | Прокручиваемая settings zone | Sticky action placement, section rhythm, scrollbar and available width |
| `toolbar-export-menu.png` | Export dropdown | Toolbar menu placement, icon/label alignment and compact items |
| `jld2-export-dialog.png` | Object export form | Dialog dimensions, dense rows, checkbox-field pairing and footer actions |
| `engee-export-success-dialog.png` | Успешный экспорт Engee-модели | Success dialog, modal layering, `16px` success mark, message/action alignment |
| `startup-loading-overlay.png` | Legacy global loading presentation | Только spinner, backdrop и layer visual; не копировать full-screen startup behavior |

Performance contract имеет приоритет над последним screenshot: новый frontend
сначала показывает `/api/state-lite` controls и использует local loader только
для active output. Screenshot не разрешает снова блокировать весь UI до
готовности графиков.

Все PNG имеют исходный размер 3584×2240 и хранятся без редактирования.
