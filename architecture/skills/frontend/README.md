# Скиллы Frontend

Порядок: `task-analysis` с design-coverage gate, затем
`zone-structure-api` и `design-implementation`. Frontend не проектирует zoning,
не выбирает visual system и не анализирует Figma вместо Designer.

Component subskills содержат только technical behavior/API/state patterns:

- foundation: `frontend-project-structure`;
- controls/zones: `application-toolbar`, `settings-controls`, `inspector-ui`,
  `multi-page-element`, `graph-output-zone`, `output-loading-flow`;
- dialogs/export: `dialog-system`, `file-browser-dialog`,
  `session-import-export-ui`, `object-export-dialog`.

Canonical HTML/CSS visual templates находятся только в
`designer/*/reference/`; Frontend реализует pinned versioned design package.
Designer задаёт overlay priority; Frontend реализует stacking/focus/hit
semantics. При confirmed Engee blocker видимый action продолжает вызывать
обычный Backend API и показывает typed unavailable state без fake result.

Для data-heavy UI обязательны `/api/state-lite`, active-only outputs,
`state_revision`, settings debounce 150 ms, UI-state debounce 350 ms, local
lazy Plotly, latest-only rAF/`Plotly.react`, coalesced resize и Vue 3 production
zone modules. DSP и Plotly payload готовит Julia backend. Design implementation
копирует local Roboto/SVG, сохраняет canonical colors/menu/proportions и
использует eye/eye-off в column visibility menu.
