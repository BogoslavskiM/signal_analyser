"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function task0127CursorCheckbox(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const settings = fs.readFileSync(path.join(root, "public/js/settings.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "public/css/app.css"), "utf8");

  assert(/document\.addEventListener\("input"[\s\S]*?\["display\.name", "pane\.name"\]\.indexOf\(item\.id\) >= 0[\s\S]*?update\(item, rawFor\(item, node\)\)/.test(settings) && /setTimeout\(function \(\) \{ send\(item\); \}, 150\)/.test(settings), "typing either persisted name must use input events and one 150ms debounced publication rather than rebuilding the field per character");
  assert(/signal-settings-name-preview[\s\S]*?projectNamePreview/.test(app) && /function projectNamePreview\(detail\)[\s\S]*?tab\.textContent=value[\s\S]*?title\.textContent=value[\s\S]*?context\.textContent=displayPreviewName/.test(app), "every typed name must update the header and context optimistically without replacing the active settings input");
  assert(/function reconcileNamePreviews\(snapshot\)[\s\S]*?delete model\.namePreview/.test(app) && /signal-settings-save-failed[\s\S]*?clearNamePreview[\s\S]*?render\(\)/.test(app), "accepted snapshots reconcile optimistic names, while a failed save reverts the preview only after the request resolves");
  assert(/function setBusyPreservingCheckboxes\(root, busy\)[\s\S]*?root\.setAttribute\("aria-busy", String\(!!busy\)\)[\s\S]*?checkbox\.dataset\.wasDisabledBeforeBusy[\s\S]*?checkbox\.disabled=true[\s\S]*?delete checkbox\.dataset\.wasDisabledBeforeBusy/.test(app), "busy checkbox regions must retain each checked node and only toggle disabled/aria-busy state");
  assert(/renderSignalAddCatalog\([\s\S]*?model\.signalAddLoading[\s\S]*?setCheckboxRegionBusy\(list, true\)/.test(app) && /renderSignalAddCatalog\([\s\S]*?var checked = !!model\.signalAddSelection\[variable\.variable_id\][\s\S]*?\(checked \? " checked" : ""\)/.test(app) && /submitSignalAddDialog\([\s\S]*?setCheckboxRegionBusy\(layer\.querySelector\("\[data-testid='signal-add-variables'\]"\), true\)[\s\S]*?setCheckboxRegionBusy\(layer\.querySelector\("\[data-testid='signal-add-variables'\]"\), false\)/.test(app), "Engee Add must preserve selected checkbox state across loading and submit mutation");
  assert(/\.checkbox-control input:checked,\s*\.workspace-list input:checked,\s*\.signal-table input:checked\s*\{[\s\S]*?border-color:\s*var\(--accent\)[\s\S]*?background:\s*var\(--accent\)/.test(css) && /\.checkbox-control input:checked::after,\s*\.workspace-list input:checked::after,\s*\.signal-table input:checked::after\s*\{/.test(css) && /\.checkbox-control input:checked:disabled,\s*\.workspace-list input:checked:disabled,\s*\.signal-table input:checked:disabled\s*\{[\s\S]*?border-color:\s*var\(--accent\)[\s\S]*?background:\s*var\(--accent\)/.test(css) && /\.workspace-list label:has\(input:checked\)/.test(css), "a disabled selected Engee Add checkbox retains the checked glyph and selected-row visual contract");
};
