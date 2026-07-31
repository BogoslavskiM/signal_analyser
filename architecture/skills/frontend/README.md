# Скиллы frontend-разработчика

Frontend-скиллы охватывают JS/CSS/HTML, использование API-клиента, состояние
интерфейса, селекторы и пользовательское поведение.

Bundled JavaScript assets используют единый vanilla contract
`create → state/actions/render/mount/unmount`. Перед переносом запускай
`node architecture/skills/frontend/validate_vanilla_assets.js`.

Добавляй сюда скилл только для повторяемой проектной процедуры. Базовые правила
передачи задач, отчетности, проверки и границ уже находятся в
`architecture/agents/roles/frontend.toml`.

Доступные скиллы:

- `frontend-project-structure/` — стандартный vanilla JavaScript frontend без
  bundler, структура JS/CSS/HTML, module registry и минимальный root app.
- `style-system/` — светлая визуальная система, CSS tokens, общие controls и
  состояния, SVG-символы и fixed canvas без responsive-перестройки.
- `application-toolbar/` — верхняя панель при выборе capability: бренд, название,
  backend version, capability actions, export split button и help link.
- `frontend-state-management/` — root state по владельцам, последовательная
  синхронизация draft-полей, debounce и защита от устаревших ответов.
- `settings-controls/` — типизированные scalar controls, searchable enum,
  validation errors, warnings, units и группы настроек.
- `inspector-ui/` — table или headerless list объектов, main object, selection,
  CRUD, поиск, колонки и форматирование cells.
- `multi-page-element/` — встраиваемый агрегатор static/output страниц,
  вкладки, main page, readiness, page menu и overflow navigation.
- `graph-output-zone/` — Plotly-графики с backend payload, frontend-defined
  grid, loading/error overlays, page controls и локальной русской библиотекой.
- `dialog-system/` — общий modal template, form/error/success flow, busy state,
  stacking file browser/error и закрытие только видимыми кнопками.
- `file-browser-dialog/` — server-side выбор директории или одного файла,
  backend root, structured entries, сортировка, target fields и busy state.
- `session-import-export-ui/` — наследуемые JLD2 session dialogs, typed path
  control, backend defaults, global loader и полное применение imported state.
- `object-export-dialog/` — необязательный экспорт выбранных domain objects:
  доступные backend-операции, всегда видимый selector, явные формы и defaults,
  зависящие от состояния приложения.
- `layout-geometry/` — реализация зон канваса и их пропорций до назначения
  содержимого.
- `zone-composition/` — размещение типовых UI-элементов по зонам и определение
  необходимых frontend-данных и действий.
- `ui-contract-change/` — типизированные элементы настроек, payload таблицы
  инспектора, состояние валидации и стабильные селекторы.
- `output-loading-flow/` — опрос выходных данных после Apply, загрузка активной
  зоны, повторные запросы и независимые ошибки.
