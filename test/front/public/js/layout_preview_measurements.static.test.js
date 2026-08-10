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
  ["Имя", "Линия", "Начало области", "Конец области", "Минимум", "Время минимума", "Максимум", "Время максимума", "Среднее", "Медиана", "Размах", "СКЗ"].forEach((header) => {
    assert(measurements.includes(`"${header}"`), `Measurements table must include ${header}`);
  });
  assert(/measurement-search-input[\s\S]*placeholder='Введите название'/.test(measurements), "Measurements must have the same search row pattern as Signals");
  assert(!/ui-checkbox|visible-all-signals|visible-signal/.test(measurements), "Measurements rows must not render signal checkboxes");
  assert(/measurementColumns\s*=\s*\{[\s\S]*items\.minimum[\s\S]*items\.maximum[\s\S]*items\.mean[\s\S]*items\.median[\s\S]*items\.peak_to_peak[\s\S]*items\.rms/.test(measurements), "Measurements columns must map authoritative backend statistics");
  assert(/selectedKinds = Array\.isArray\(display\.measurement_kinds\)[\s\S]*selectedKinds\.indexOf\(kind\) >= 0[\s\S]*columns = columns\.concat\(measurementColumns\[kind\]\)/.test(measurements), "Measurements table columns must follow the authoritative checked measurement kinds");
  assert(/\["minimum", "maximum", "mean", "median", "peak_to_peak", "rms"\]/.test(measurements), "Measurements columns must retain the settings checkbox order");
  assert(/display\.time_limits/.test(measurements), "Measurements ROI columns must use the active Display limits");
  assert(/\.measurement-table\s*\{[^}]*min-width:\s*max\(100%, var\(--measurement-table-width, 536px\)\)/.test(css), "Measurements table width must adapt to the checked columns without shrinking below its zone");
  assert(/\.signal-table\.measurement-table th:first-child,[\s\S]*width:\s*220px/.test(css), "Measurements Name column must keep its design width");
};
