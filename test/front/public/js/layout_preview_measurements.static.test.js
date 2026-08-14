"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testLayoutPreviewAndMeasurementsInspector(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const app = read("public/js/app.js");
  const api = read("public/js/api.js");
  const css = read("public/css/app.css");

  const draft = (app.match(/function renderLayoutDraft\(\)[\s\S]*?\n  \}/) || [""])[0];
  assert(/gridTemplateColumns = "repeat\(" \+ draft\.columns/.test(draft), "layout preview must use the selected column count");
  assert(/gridTemplateRows = "repeat\(" \+ draft\.rows/.test(draft), "layout preview must use the selected row count");
  assert(/draft\.rows \* draft\.columns[\s\S]*return "<i><\/i>"/.test(draft), "layout preview must render one visible cell per selected pane");

  assert(/getFullState:[\s\S]*request\("\.\/api\/state"/.test(api), "Measurements must reuse the authoritative full-state endpoint");
  assert(/button\.dataset\.bottomTab[\s\S]*model\.inspectorPage === "measurements"\) loadMeasurements\(\)/.test(app), "Measurements data must load only when its inspector tab is opened");
  const measurements = (app.match(/function renderMeasurementsInspector\(body\)[\s\S]*?\n  \}/) || [""])[0];
  ["Имя", "Цвет", "Начало области", "Конец области", "Минимум", "Время минимума", "Максимум", "Время максимума", "Среднее", "Медиана", "Размах", "СКЗ"].forEach((header) => {
    assert(measurements.includes(`"${header}"`), `Measurements table must include ${header}`);
  });
  assert(/measurement-search-input[\s\S]*placeholder='Введите название'/.test(measurements), "Measurements must have the same search row pattern as Signals");
  assert(/measurement-columns-menu-trigger[\s\S]*aria-haspopup='menu'/.test(measurements), "Measurements search row must expose its right-side visibility menu trigger");
  assert(!/ui-checkbox|visible-all-signals|visible-signal/.test(measurements), "Measurements rows must not render signal checkboxes");
  assert(/measurementColumns\s*=\s*\{[\s\S]*kind:"minimum"[\s\S]*kind:"maximum"[\s\S]*kind:"mean"[\s\S]*kind:"median"[\s\S]*kind:"peak_to_peak"[\s\S]*kind:"rms"/.test(measurements), "Measurements columns must map authoritative backend statistics");
  assert(/selectedKinds = Array\.isArray\(display\.measurement_kinds\)[\s\S]*selectedKinds\.indexOf\(kind\) >= 0[\s\S]*columns = columns\.concat\(measurementColumns\[kind\]\)/.test(measurements), "Measurements table columns must follow the authoritative checked measurement kinds");
  assert(/\["minimum", "maximum", "mean", "median", "peak_to_peak", "rms"\]/.test(measurements), "Measurements columns must retain the settings checkbox order");
  assert(/measurementRows = Array\.isArray\(record\.measurementRows\)[\s\S]*measurementRows\.filter[\s\S]*visibleRows\.map/.test(measurements), "Measurements must render and search every authoritative signal row from the active pane");
  assert(/measurements\.time_limits \|\| display\.time_limits/.test(measurements), "Each Measurements ROI row must prefer its authoritative signal limits");
  assert(/items\[column\.kind\], column\.itemKey/.test(measurements), "Each Measurements row must render its own authoritative statistics");
  assert(/measurementRows:Array\.isArray\(snapshot\.measurement_rows\)[\s\S]*snapshot\.measurements \? \[snapshot\.measurements\]/.test(app), "Measurements loading must consume all backend rows with a one-row compatibility fallback");
  assert(/\{ id:"name", label:"Имя", width:152 \}[\s\S]*\{ id:"line", label:"Цвет", width:56[\s\S]*\{ id:"roi_min", label:"Начало области", width:112 \}[\s\S]*\{ id:"roi_max", label:"Конец области", width:104 \}/.test(measurements), "Measurements fixed columns must be exactly 152/56/112/104px");
  assert(/minimum:\[\{[^}]*width:88 \}, \{[^}]*width:120 \}\][\s\S]*maximum:\[\{[^}]*width:96 \}, \{[^}]*width:128 \}\][\s\S]*mean:\[\{[^}]*width:88 \}/.test(measurements), "Measurements default metric columns must be exactly 88/120/96/128/88px");
  assert(/var tableWidth = columns\.reduce\(function \(total, column\) \{ return total \+ column\.width; \}, 0\);[\s\S]*--measurement-table-width:" \+ tableWidth \+ "px/.test(measurements), "Measurements table width must be derived from the actual selected column widths");
  const defaultMeasurementWidth = [152, 56, 112, 104, 88, 120, 96, 128, 88].reduce((total, width) => total + width, 0);
  assert(defaultMeasurementWidth === 944, "The fixed and default metric columns must total the 944px table minimum");
  assert(/\.measurement-table\s*\{[^}]*width:\s*100%;[^}]*min-width:\s*var\(--measurement-table-width, 944px\)/.test(css), "Measurements table must retain its 944px source-derived minimum width");
  assert(/else if \(column\.id === "line"\) value = "<span class='color-swatch measurement-color-swatch'/.test(measurements), "Measurements Color must reuse the passive main color swatch");
  assert(/\.color-swatch\s*\{[^}]*width:\s*16px;[^}]*height:\s*16px;[^}]*border-radius:\s*2px/.test(css) && /\.measurement-color-swatch\s*\{[^}]*cursor:\s*default;[^}]*pointer-events:\s*none/.test(css), "Measurements Color swatch must be passive 16×16px with a 2px radius");
  assert(!/measurement-line-swatch|\.measurement-line-cell\s*\{[^}]*width:\s*64px/.test(app + css), "Measurements must not retain the 64px color line");

  [
    { parent: ".display-tablist", tab: ".display-tab-shell", selected: ".display-tab-shell.is-selected::after" },
    { parent: ".settings-tabs", tab: ".settings-tabs button", selected: ".settings-tabs button[aria-selected=\"true\"]::after" },
    { parent: ".inspector-tabs", tab: ".inspector-tabs button", selected: ".inspector-tabs button[aria-selected=\"true\"]::after" }
  ].forEach(({ parent, tab, selected }) => {
    const stylesFor = (selector) => css.split("}").filter((rule) => rule.split("{")[0].split(",").map((part) => part.trim()).includes(selector)).map((rule) => rule.split("{").slice(1).join("{")).join("\n");
    const parentStyles = stylesFor(parent);
    const tabStyles = stylesFor(tab);
    const selectedStyles = stylesFor(selected);
    assert(parentStyles && !/border-bottom\s*:/.test(parentStyles), `${parent} must not paint a competing parent bottom border`);
    assert(tabStyles && /z-index\s*:\s*1\b/.test(tabStyles), `${tab} must paint above the neutral rule at z1`);
    assert(selectedStyles && /z-index\s*:\s*2\b/.test(selectedStyles) && /height\s*:\s*var\(--selected-tab-indicator-thickness\)/.test(selectedStyles), `${selected} must paint the selected indicator above tabs at z2`);
  });
  assert(/--selected-tab-indicator-thickness:\s*3px/.test(css), "All selected tab indicators must be exactly 3px");
  assert(/\.display-tablist::before,\s*\.settings-tabs::before,\s*\.inspector-tabs::before\s*\{[^}]*z-index:\s*0[^}]*height:\s*1px/.test(css), "All three tab families must share a neutral 1px baseline at z0");
};
