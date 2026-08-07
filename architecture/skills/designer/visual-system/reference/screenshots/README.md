# Application screenshot catalogs

Открывай только каталоги, относящиеся к текущему pattern:

- `window-designer/README.md` — two-plot composition, inspector/settings,
  toolbar menus, dialogs, file browser and pending import;
- `pulse-waveform-analyser/README.md` — multi-page graph workspace, page picker,
  tabs overflow, plot controls, scrolling settings and object export.

Screenshots ниже task specification и canonical tokens/components по
приоритету. Они помогают сохранять реальные proportions и interaction density,
но не переносят app-specific layout, labels, data или legacy runtime behavior.
Каждый использованный файл и извлечённое решение перечисляй в `DESIGN.md`.

Для hover/focus/pressed/selected сначала открой interactive
`../interaction-state-showcase.html`, а точные source-derived значения и два
geometry profile прочитай в `../source-derived-ui-spec.md`. Затем сравни с
реальными captures:

- Window Designer `toolbar-tooltip.png` — hover tooltip;
- Window Designer `plot-settings-menu.png` и `toolbar-export-menu.png` — active
  toolbar trigger/open popup;
- Window Designer `renamed-window-state.png` — focused input и selected row;
- Pulse Waveform Analyser `default-real-imaginary-page.png` и
  `delay-cut-page-control.png` — selected tab;
- Pulse Waveform Analyser `page-picker-menu.png` — focused/active add-page
  trigger;
- Pulse Waveform Analyser `toolbar-export-menu.png` — open split-action menu.
- Pulse Waveform Analyser `engee-export-success-dialog.png` — modal success
  state и action hierarchy.

Не смешивай состояния: `:active` существует во время pointer press, persistent
selected задаётся state/ARIA, а `:focus-visible` должен оставаться отдельным
keyboard indicator. Hover/press не меняют размеры и не вызывают layout shift.
