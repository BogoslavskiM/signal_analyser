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
  assert(/if \(!options\.length\) options=Object\.keys\(labels\)\.map/.test(native) && /var labels = \{ workspace:/.test(native), "save-type selector retains a non-empty four-operation fallback when API options have not loaded");
  assert(/\(\(state\.options&&state\.options\.signal_names\)\|\|\[\]\)\.map\(function\(n\)/.test(native) && /bs\.entries\.map\(function\(entry\)/.test(native), "save signals and browser entries retain their option-to-control rendering paths");

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
  assert(/state\.browser=false; render\(\); focus\(state\.save \? q\("\[data-testid='native-save-browse'\]"\) : q\("\[data-testid='native-import-browse'\]"\)\);/.test(native), "browser Cancel restores focus to the owning dialog browse action");
  assert(/else if\(state\.browser\) \{ state\.browser=false; render\(\); focus\(state\.save \? q\("\[data-testid='native-save-browse'\]"\) : q\("\[data-testid='native-import-browse'\]\"\)\); return; \}/.test(native), "Escape closes only the browser layer and restores focus to its owning browse action");
  assert(/var parent=q\("\[data-testid='native-save-dialog'\], \[data-testid='native-import-dialog'\]"\);[\s\S]*?parent\.inert=true; parent\.setAttribute\("aria-hidden", "true"\); parent\.classList\.add\("is-inert-parent"\)/.test(native), "a browser/message overlay makes its parent inert, aria-hidden, and pointer-isolated");
  assert(/if \(window\.SignalAnalyserValueSelect\) window\.SignalAnalyserValueSelect\.close\(false\);/.test(native), "native rerender closes a transient selector before replacing its owner dialog");
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
  const browserLayerRule = (css.match(/\.native-file-browser-layer\s*\{[^}]*\}/) || [""])[0];
  const browserCardRule = (css.match(/\.native-file-browser-layer \.file-browser-card\s*\{[^}]*\}/) || [""])[0];
  const browserListRule = (css.match(/\.native-file-browser-layer \.file-browser-list\s*\{[^}]*\}/) || [""])[0];
  const browserWrapRule = (css.match(/\.native-file-browser-layer \.file-browser-list-wrap\s*\{[^}]*\}/) || [""])[0];
  const nativeParentIsolationRule = (css.match(/\.native-modal-layer\.is-inert-parent\s*\{[^}]*\}/) || [""])[0];
  const modalSelectRule = (css.match(/\.value-select-popup\.is-modal-owned\s*\{[^}]*\}/) || [""])[0];
  const ordinarySelectRule = (css.match(/\.value-select-popup\s*\{[^}]*\}/) || [""])[0];
  assert(/position:\s*fixed/.test(browserLayerRule) && /inset:\s*0/.test(browserLayerRule) && /display:\s*flex/.test(browserLayerRule) && /align-items:\s*center/.test(browserLayerRule) && /justify-content:\s*center/.test(browserLayerRule) && /z-index:\s*97000/.test(browserLayerRule), "browser is a fixed, viewport-inset, centered layer above its parent dialog");
  assert(/width:\s*480px/.test(browserCardRule) && /height:\s*380px/.test(browserCardRule) && /grid-template-rows:\s*16px 32px minmax\(0, 1fr\) 32px 64px/.test(browserCardRule) && /overflow:\s*hidden/.test(browserCardRule), "browser card pins exact 480×380 grid tracks and prevents card/surface scrolling");
  assert(/position:\s*relative/.test(browserWrapRule) && /min-height:\s*0/.test(browserWrapRule) && /height:\s*100%/.test(browserListRule) && /overflow-x:\s*hidden/.test(browserListRule) && /overflow-y:\s*auto/.test(browserListRule) && /overscroll-behavior:\s*contain/.test(browserListRule), "browser list is the sole scrollable surface");
  assert(/pointer-events:\s*none/.test(nativeParentIsolationRule), "an inert parent dialog is also pointer-isolated beneath its nested browser");
  assert(/z-index:\s*96000/.test(modalSelectRule) && /z-index:\s*var\(--layer-dropdown\)/.test(ordinarySelectRule) && /--layer-dropdown:\s*1100/.test(css) && /--layer-modal:\s*95000/.test(css) && /--layer-nested:\s*97000/.test(css), "modal-owned selectors layer at 96000 between parent 95000 and browser 97000 while ordinary selectors stay at 1100");
  assert(/menu\.classList\.toggle\("is-modal-owned", !!trigger\.closest\("\.native-modal-layer"\)\);/.test(fs.readFileSync(path.join(root, "public/js/value-select.js"), "utf8")) && /menu\.classList\.remove\("is-modal-owned"\);/.test(fs.readFileSync(path.join(root, "public/js/value-select.js"), "utf8")), "only selectors opened from a native modal gain—and on close lose—the modal-owned layer");
};
