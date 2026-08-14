"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function task0106NativeSessionIoStatic(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const html = read("public/index.html");
  const api = read("public/js/api.js");
  const native = read("public/js/native-session-io.js");
  const app = read("public/js/app.js");
  const css = read("public/css/app.css");

  assert(html.indexOf("./js/native-session-io.js") > html.indexOf("./js/api.js") && html.indexOf("./js/native-session-io.js") > html.indexOf("./js/value-select.js"), "native I/O module must load after API and custom-select dependencies");
  assert(/data-native-import-control/.test(html) && /data-testid="toolbar-import"[^>]*aria-haspopup="menu"[^>]*aria-expanded="false"/.test(html), "Import toolbar control must expose a closed menu trigger");
  const menu = (html.match(/<div id="toolbar-import-menu"[\s\S]*?<\/div>/) || [""])[0];
  assert(/role="menu"/.test(menu) && /hidden/.test(menu), "Import source menu must be hidden initially and own menu semantics");
  assert((menu.match(/role="menuitem"/g) || []).length === 2, "Import source menu must contain exactly two actions");
  assert(/data-native-import-source="engee"[^>]*>Из Engee</.test(menu), "first Import action must be Engee");
  assert(/data-native-import-source="local"[^>]*>Из локального файла</.test(menu), "second Import action must be local file");
  assert(!/data-native-import-source="(?!engee|local)/.test(menu), "Import menu must not expose an additional source");
  const localInput = (html.match(/<input[^>]*data-testid="native-local-file-input"[^>]*>/) || [""])[0];
  assert(localInput && /accept="\.sazip,application\/vnd\.engee\.signal-analyser-package\+zip"/.test(localInput), "local source must use the hidden .sazip file input");
  assert(/SignalAnalyserOpenSessionFilePicker/.test(app) && /native-local-file-input/.test(app), "local Import action must reuse the package reader through the exported picker hook");

  assert(/nativeSaveOptions:[\s\S]*\.\/api\/save\/options/.test(api), "save/import defaults use the exact options route");
  assert(/nativeFileBrowser:[\s\S]*\.\/api\/file-browser\/list/.test(api), "the legacy file-browser list route must remain available");
  assert(/nativeFileBrowserAction:[\s\S]*\.\/api\/file-browser\/action/.test(api), "interactive file browser must use the backend-owned action route");
  assert(/nativeSave:[\s\S]*\.\/api\/save/.test(api) && /nativeImportSession:[\s\S]*\.\/api\/import\/session/.test(api), "Save and Import retain their typed routes");

  assert(/function openEngeeImport\(trigger\)[\s\S]*?nativeSaveOptions\(\)[\s\S]*?defaults\.import_session_target \|\| defaults\.session_target[\s\S]*?state\.import = true;[\s\S]*?render\(\);/.test(native), "Engee Import must load options, apply the default JLD2 path, and only then open its parent dialog");
  const openEngee = (native.match(/function openEngeeImport\(trigger\)[\s\S]*?\n  function openLocalImport/) || [""])[0];
  assert(openEngee && !/openFileBrowser|nativeFileBrowserAction/.test(openEngee), "Engee Import must not open or request the file browser automatically");
  assert(/state\.importDraft\.path = String\(defaults\.import_session_target \|\| defaults\.session_target \|\| ""\)/.test(native), "Import path field must start with the backend-provided file path");
  assert(/data-testid='native-import-path' value='" \+ esc\(state\.importDraft\.path\)/.test(native), "Import dialog must render the default path in its input");
  assert(/data-native-browser-open='native-import-file' data-testid='native-import-path-browse'/.test(native), "only the folder button must own browser opening for Import");
  assert(/function openLocalImport\(trigger\)[\s\S]*SignalAnalyserOpenSessionFilePicker/.test(native), "local action must invoke the local .sazip picker directly");
  assert(!/state\.source|data-native-source|native-import-source-switch/.test(native), "the parent Import dialog must not retain a duplicate source switch");

  assert(/pointerenter[\s\S]*pointerType === "touch"[\s\S]*openImportMenu\(120\)/.test(native), "mouse hover must use the 120ms open delay while touch hover is ignored");
  assert(/pointerleave[\s\S]*closeImportMenu\(false, 180\)/.test(native), "pointer leave must use the 180ms close grace period");
  assert(/focusin[\s\S]*openImportMenu\(0\)/.test(native), "keyboard focus must open the Import menu immediately");
  assert(/event\.key === "Escape"[\s\S]*closeImportMenu\(true, 0\)/.test(native), "Escape must close the menu and restore the trigger");
  assert(/\["ArrowDown", "ArrowUp", "Home", "End"\][\s\S]*focusImportMenuItem/.test(native), "Import menu must support arrows and Home/End keyboard navigation");
  assert(/button\.dataset\.testid === "toolbar-import"[\s\S]*importMenuOpen = !importMenuOpen/.test(native), "click/touch activation must toggle the same two-action menu");
  assert(/\.menu\.toolbar-import-menu\s*\{[^}]*width:\s*196px[^}]*border:\s*0[^}]*box-shadow:\s*var\(--shadow-menu\)/.test(css), "Import menu must keep the compact borderless 196px visual contract");

  assert(/fileBrowserPayload\(action, patch\)[\s\S]*file_browser_target:[\s\S]*mode:[\s\S]*allowed_extensions:[\s\S]*root_path:[\s\S]*current_path:[\s\S]*selected_path:[\s\S]*sort_ascending:[\s\S]*expanded_paths:/.test(native), "every file-browser action must send the complete backend-owned state");
  assert(/runFileBrowserAction\("open", \{ initial_path:String\(browserTargetValue\(target\) \|\| ""\) \}\)/.test(native), "folder action must send the current field value as the open initial path");
  assert(/runFileBrowserAction\("path", \{ current_path:path \}\)/.test(native), "directory name activation must navigate into that path");
  assert(/runFileBrowserAction\("toggle", \{ toggle_path:button\.dataset\.nativeBrowserCaret \}\)/.test(native), "folder caret must independently expand/collapse a branch");
  assert(/runFileBrowserAction\("sort", \{ sort_ascending:!state\.browserState\.sort_ascending \}\)/.test(native), "sort control must request the opposite deterministic order");
  assert(/runFileBrowserAction\("select"\)/.test(native) && /runFileBrowserAction\("cancel"\)/.test(native), "Select and Cancel must be backend-owned actions");
  assert(/entry\.depth[\s\S]*entry\.expanded[\s\S]*browser-caret[\s\S]*browser-entry-button/.test(native), "tree rows must consume backend depth/expanded fields and separate caret from name action");
  assert(/padding-left:" \+ \(16 \+ depth \* 24\) \+ "px/.test(native), "nested tree rows must indent by depth");
  assert(/entry\.selectable !== false/.test(native) && /is-disabled/.test(native), "unsafe or wrong-extension entries must remain visible but disabled");
  assert(/browser\.selected_path = "";[\s\S]*browser\.entries = \[\]/.test(native), "a new browser open must clear selection and old expanded rows");
  assert(/function commitBrowserSelection\(payload\)[\s\S]*payload\.open !== false[\s\S]*state\.importDraft\.path = selected/.test(native), "field mutation must happen only after a committed Select response");
  const cancelBinding = (native.match(/var cancel = q\("\[data-native-browser-cancel\]"\);[\s\S]*?\n    var sort =/) || [""])[0];
  assert(cancelBinding && /runFileBrowserAction\("cancel"\)/.test(cancelBinding) && !/importDraft\.path\s*=|saveDraft\.target\s*=/.test(cancelBinding), "Cancel must close through the backend without mutating the owner field");
  assert(/if \(browser\.busy\) return Promise\.resolve\(null\)/.test(native), "file browser must reject duplicate actions while busy");
  assert(/token !== state\.requestToken \|\| !active\(generation\)/.test(native), "file browser must reject stale action responses");
  assert(/file-browser-loading/.test(native) && /file-browser-error/.test(native) && /data-native-browser-retry/.test(native), "browser must retain loading, inline error and retry states");
  assert(/\.native-file-browser-layer \.file-browser-list\s*\{[^}]*overflow-y:\s*auto/.test(css), "tree list must remain the only vertically scrollable browser surface");

  assert(/function errorCode\(error\)[\s\S]*nested && nested\.code/.test(native), "frontend must normalize typed nested API error codes");
  const handleError = (native.match(/function handleError\(error, generation\)[\s\S]*?\n  \}/) || [""])[0];
  assert(/status === 409 && code === "stale_state"[\s\S]*loadOptions\(\)[\s\S]*Состояние обновлено/.test(handleError), "stale_state must reload options and show the stale-form warning");
  const targetBranch = (handleError.match(/else if \(error && error\.status === 409 && code === "target_exists"\)[\s\S]*?\n    \} else/) || [""])[0];
  assert(/Переменная уже существует/.test(targetBranch) && /включите перезапись/.test(targetBranch), "target_exists must explain the forbidden overwrite and corrective actions");
  assert(targetBranch && !/loadOptions\(\)|applySaveDefaults|saveDraft\s*=/.test(targetBranch), "target_exists must preserve the current form instead of resetting it as stale");
  assert(/data-error-code='" \+ esc\(state\.message\.code\)/.test(native), "typed errors must remain inspectable on the visible message dialog");

  assert(/SignalAnalyserValueSelect/.test(native) && !/<select\b/i.test(native), "save type must use the shared custom select");
  assert(/data-testid='save-signals-input'/.test(native) && /data-testid='save-signals-menu'/.test(native), "Save must retain the searchable signal multi-select");
  assert(/nativeSave\(\{[\s\S]*state_revision:[\s\S]*operation:[\s\S]*scope:[\s\S]*signal_names:[\s\S]*target:[\s\S]*overwrite:/.test(native), "Save must send the complete typed payload");
  assert(/nativeImportSession\(\{[\s\S]*state_revision:[\s\S]*path:[\s\S]*replace: true/.test(native), "Import must send the typed replacement payload");
  assert(/native-session-imported/.test(native) && /native-session-imported/.test(app), "successful native import must refresh the application snapshot");
};
