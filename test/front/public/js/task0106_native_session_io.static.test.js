"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function task0106NativeSessionIoStatic(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const html = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
  const api = fs.readFileSync(path.join(root, "public/js/api.js"), "utf8");
  const native = fs.readFileSync(path.join(root, "public/js/native-session-io.js"), "utf8");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "public/css/app.css"), "utf8");

  assert(html.indexOf("./js/native-session-io.js") > html.indexOf("./js/api.js") && html.indexOf("./js/native-session-io.js") > html.indexOf("./js/value-select.js"), "native I/O module must load after its API and custom-select dependencies");
  assert(/data-testid="toolbar-save"/.test(html) && /data-testid="toolbar-import"/.test(html), "primary native Save and Import toolbar actions stay visible");
  assert(/session-package-file-input/.test(html) && /accept="\.sazip,application\/vnd\.engee\.signal-analyser-package\+zip"/.test(html), ".sazip must remain a secondary local format");
  assert(/SignalAnalyserValueSelect/.test(native) && !/<select\b/i.test(native), "save type must use the shared custom value-select, never a native select");

  assert(/nativeSaveOptions: function \(\) \{ return request\("\.\/api\/save\/options"/.test(api), "save options use the exact API route");
  assert(/nativeFileBrowser: function \(payload\) \{ return request\("\.\/api\/file-browser\/list"/.test(api), "file browser uses the exact API route");
  assert(/nativeSave: function \(payload\) \{ return request\("\.\/api\/save"/.test(api) && /nativeImportSession: function \(payload\) \{ return request\("\.\/api\/import\/session"/.test(api), "save and import use exact API routes");
  assert(/nativeSave\(\{state_revision:state\.revision,operation:state\.saveType,scope:state\.saveDraft\.scope,signal_names:state\.saveDraft\.signalNames,target:state\.saveDraft\.target,overwrite:state\.saveDraft\.overwrite\}\)/.test(native), "save sends the exact typed payload");
  assert(/nativeImportSession\(\{state_revision:state\.revision,path:state\.importDraft\.path,replace:true\}\)/.test(native), "import sends the exact typed replacement payload");
  assert(/selection_mode:state\.browserState\.mode,extension:state\.browserState\.mode==="file"\?"\.jld2":null,sort_direction:state\.browserState\.sort/.test(native), "browser preserves selection mode, JLD2 filter and sort payload");

  assert(/state\.browser=state\.import/.test(native) && /if\(state\.save\)loadOptions\(\); else loadBrowser\(\);/.test(native), "Import opens the Engee browser immediately while Save loads typed options");
  assert(/state\.browserState\.path=state\.browserState\.parent/.test(native) && /state\.browserState\.sort=state\.browserState\.sort==="asc"\?"desc":"asc"/.test(native), "browser supports parent navigation and deterministic sort toggling");
  assert(/file-browser-loading/.test(native) && /file-browser-error/.test(native) && /data-native-browser-retry/.test(native), "browser has loading, error and retry states");
  assert(/file-browser-parent/.test(native) && /file-browser-cancel/.test(native) && /file-browser-select/.test(native) && /file-browser-empty/.test(native), "browser exposes parent, cancel, select and empty controls");
  assert(/entry\.kind==="directory"/.test(native) && /else if\(entry\.selectable\)/.test(native), "directory navigation and file selection remain distinct");
  assert(/state\.source === "local"[\s\S]*?session-package-file-input/.test(native), "local .sazip stays an explicit secondary source");
  assert(/error && error\.status===409/.test(native) && /Данные изменились\. Проверьте форму и повторите действие/.test(native), "409 produces an explicit retry warning rather than replaying stale data");
  assert(/native-session-imported/.test(native) && /native-session-imported/.test(app), "successful native import refreshes the application snapshot integration point");
  assert(/event\.key !== "Escape"[\s\S]*?state\.message[\s\S]*?else if\(state\.browser\)/.test(native), "Escape closes only the topmost native overlay");
  assert(/saveReady=typeof state\.revision === "number"[\s\S]*?native-save-submit/.test(native) && /state\.busy\?"Сохранение…":"Сохранить"/.test(native), "Save validates revision, target and scope and renders a distinct busy state");
  assert(/\.finally\(function\(\)\{state\.busy=false;render\(\);\}\)/.test(native), "save/import always render the final non-busy state after settled requests");

  assert(/\.native-save-dialog\s*\{[^}]*width:\s*560px[^}]*height:\s*568px/.test(css), "v23 Save geometry is exactly 560×568");
  assert(/\.native-import-dialog\s*\{[^}]*width:\s*560px[^}]*height:\s*360px/.test(css), "v23 Import geometry is exactly 560×360");
  assert(/\.native-dialog\s*\{[^}]*grid-template-rows:\s*48px minmax\(0, 1fr\) 56px[^}]*border-radius:\s*12px/.test(css), "dialog chrome keeps exact 48/body/56 and 12px radius");
  assert(/\.native-dialog-row\s*\{[^}]*grid-template-columns:\s*136px minmax\(0, 1fr\)[^}]*gap:\s*12px/.test(css) && /\.native-field\s*\{[^}]*height:\s*32px[^}]*border-radius:\s*6px/.test(css), "v23 rows and controls keep exact dimensions");
  assert(/\.file-browser-card\s*\{[^}]*min-width:\s*480px[^}]*min-height:\s*380px/.test(css) && /\.file-browser-list\s*\{[^}]*overscroll-behavior:\s*contain/.test(css), "browser geometry and sole list scroll contract remain pinned");
};
