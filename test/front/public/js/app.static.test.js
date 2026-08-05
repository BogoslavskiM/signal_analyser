"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testSignalAnalyserDisplayStaticContract(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const html = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
  const css = fs.readFileSync(path.join(root, "public/css/app.css"), "utf8");
  const settingsCss = fs.readFileSync(path.join(root, "public/css/settings.css"), "utf8");
  const theme = fs.readFileSync(path.join(root, "public/css/theme.css"), "utf8");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const api = fs.readFileSync(path.join(root, "public/js/api.js"), "utf8");
  const plotlyPath = path.join(root, "public/js/vendor/plotly-cartesian-3.1.0.min.js");
  const plotlyLicensePath = path.join(root, "public/js/vendor/plotly-cartesian-3.1.0.LICENSE");
  const plotly = fs.readFileSync(plotlyPath);
  const license = fs.readFileSync(plotlyLicensePath, "utf8");
  const crypto = require("crypto");

  const layouts = fs.readFileSync(path.join(root, "public/js/layouts.js"), "utf8");
  const layoutCss = fs.readFileSync(path.join(root, "public/css/layouts.css"), "utf8");
  const publicText = [app, layouts, html].join("\n");
  assert((html.match(/data-testid="active-plot-host"/g) || []).length === 1, "exactly one detached app-owned active graph host must remain available to layouts.js");
  assert(layouts.includes("data-pane-plot-host") && layouts.includes("Plotly.react(task.host") && layouts.includes("data-pane-output-state='ready'"), "each ready pane must own its own live Plotly.react host");
  [app, layouts].forEach((source) => {
    assert(source.includes('dragmode:"zoom"') && source.includes("displayModeBar:false") && source.includes("displaylogo:false") && source.includes("showTips:false"), "every Plotly render path must preserve zoom while hiding modebar/logo/tips");
  });
  ["staticPlot", "fixedrange", "Plotly.newPlot", "Plotly.toImage", "backgroundImage"].forEach((forbidden) => assert(!publicText.includes(forbidden), `interactive graph source must not contain ${forbidden}`));
  assert(/\.pane-plot-host \.modebar[^}]*display:none!important/.test(layoutCss), "no visible Plotly modebar or reserved modebar container may survive CSS");
  assert(layoutCss.includes(".compact-legend{pointer-events:none") && layoutCss.includes(".graph-help-overlay{position:absolute;z-index:var(--layer-graph-help)") && theme.includes("--layer-graph-help: 1200"), "compact legend and graph-help must be pointer-inert/overlayed at the canonical layer without plot flow changes");
  ["Перетаскивать график: Shift + ЛКМ", "Автомасштабирование: двойной клик", "Зум: зажать ЛКМ и выделить область"].forEach((copy) => assert(app.includes(copy), `Russian graph-help must retain ${copy}`));
  assert(/<th data-column="name">Имя<\/th>/.test(html) && (html.match(/<th data-column=/g) || []).length === 7, "Signals table must expose exactly seven columns including mandatory Name");
  assert(layoutCss.includes(".signal-table th[data-column='name'],.signal-table td[data-column='name']{display:table-cell!important}") && !app.includes('name:"Имя"'), "Name column must be restored as mandatory and absent from the optional-column menu");
  assert(app.includes("class='color-swatch'") && layoutCss.includes(".color-swatch{width:16px;height:16px;padding:0;border:0;outline:0") && layoutCss.includes(".color-swatch:hover,.color-swatch:active{opacity:.72}"), "signal swatches must be borderless color-only controls with opacity-only interaction");
  assert(app.includes("class='signal-row-actions'") && app.includes("data-signal-duplicate") && app.includes("data-signal-delete") && !app.includes("data-signal-info"), "Type cell must retain inline duplicate/delete actions and omit removed Info action");
  assert(app.includes("display-scroll-left") && app.includes("display-scroll-right") && app.includes("add-display") && app.includes("close-display-") && !app.includes(">Добавить экран</button>"), "Display navigation must expose edge arrows, icon-only add, and separate close controls");
  assert(html.includes("graph-help-action") && html.includes("clear-display-action") && /data-testid="display-overflow-menu"[^>]*role="menu"/.test(html), "clear and graph-help actions must share the semantic area menu");
  assert(layoutCss.includes("height:calc(clamp(270px,36vh,324px) - 18px)") && layoutCss.includes(".pane-header .pane-type-select") && layoutCss.includes("height:28px;width:212px"), "pinned v2 table and pane-control geometry must remain source-derived");
  ["app-shell", "display-tabs", "display-canvas", "active-plot-host", "plot-type-select", "settings-view-select", "signal-table", "toggle-all-signals", "bottom-panel-signals", "measurements-panel"].forEach((id) =>
    assert(html.includes(`data-testid="${id}"`), `missing stable Display UI selector ${id}`)
  );
  ["engee-logo.svg", "eye.svg"].forEach((file) => {
    const asset = path.join(root, "public", "icons", file);
    assert(fs.existsSync(asset) && /<svg\b/.test(fs.readFileSync(asset, "utf8")), `TASK-0027 must use the approved local ${file} asset`);
  });
  assert(/class="app-brand"[^>]*aria-label="Engee"[\s\S]*?<img[^>]*src="\.\/icons\/engee-logo\.svg"[^>]*aria-hidden="true"[\s\S]*?<span class="engee-name">Engee<\/span>/.test(html), "TASK-0027 must render the local Engee mark and capitalized Engee name");
  ["signals-add-action", "signal-columns-menu-trigger", "signal-columns-menu"].forEach((id) =>
    assert(html.includes(`data-testid="${id}"`), `TASK-0027 column controls must expose stable selector ${id}`)
  );
  assert(/data-testid="signal-columns-menu"[^>]*role="menu"[^>]*hidden/.test(html), "TASK-0027 column menu must start hidden with menu semantics");
  assert(app.includes("data-hidden-columns") && app.includes("data-signal-column-toggle") && app.includes("role='menuitem'"), "TASK-0027 column visibility must use optional-column state and accessible menu semantics");
  assert(/\.signal-table\[data-hidden-columns~="color"\][\s\S]*\[data-column="color"\][\s\S]*display:none/.test(css), "TASK-0027 optional columns must be visually hidden without removing row data");
  assert(app.includes("class='signal-type-cell'") && app.includes("class='signal-row-actions'") && !app.includes("data-column='actions'"), "TASK-0058 duplicate/delete controls must render inline in the Type cell without a dedicated action column");
  assert(/\.signal-type-cell\{position:relative;padding-right:72px!important\}/.test(layoutCss), "TASK-0058 Type cell must reserve stable inline-action geometry");
  assert(/\.display-tab-scroll[\s\S]*overflow-x:\s*auto/.test(layoutCss), "TASK-0058 Display tab owner must be horizontally scrollable on overflow");
  assert(/\.bottom-zone\{height:calc\(clamp\(270px,36vh,324px\) - 18px\);min-height:0\}/.test(layoutCss), "TASK-0058 bottom table zone must use the pinned v2 reduced height");
  assert(/\.settings-field\{grid-template-columns:minmax\(118px,42%\) minmax\(0,1fr\)/.test(settingsCss), "TASK-0027 Settings fields must use stable label/control columns");
  assert(/\.main-stage\{[^}]*grid-template-columns:minmax\(650px,1fr\) 370px/.test(css), "design-v1 1440 source contract must retain the base 370px Settings column");
  assert(/@media \(max-width:1280px\)\{\.main-stage\{[^}]*grid-template-columns:minmax\(520px,1fr\) 340px/.test(css), "design-v1 1280 source contract must use the 340px Settings column");
  assert(/@media \(max-width:1080px\)\{\.main-stage\{[^}]*grid-template-columns:minmax\(0,1fr\) 300px/.test(css), "design-v1 1024 source contract must use the 300px Settings column");
  assert(/\.setting-row\{display:grid;grid-template-columns:140px minmax\(0,1fr\)/.test(settingsCss), "design-v2 Settings rows must retain the pinned 140px label/control mapping");
  assert(/\.settings-tabs,\.bottom-tablist\{[^}]*flex-wrap:nowrap[^}]*overflow-x:auto[^}]*white-space:nowrap/.test(css), "design-v1 tabs must remain nonwrapping and horizontally scrollable");
  assert(/\.signal-table\{min-width:960px\}/.test(css) && /\.signal-table \[data-column='type'\]\{width:126px\}/.test(css) && /\.signal-row-actions\{float:right;width:60px;min-width:60px;height:24px\}/.test(css), "design-v2 table must retain its 960px minimum and reserved 60x24 inline-action zone");
  assert(/\.signal-columns-menu\{z-index:var\(--layer-menu\);width:244px/.test(layoutCss) && theme.includes("--layer-menu: 1100") && !app.includes("signal-info-card"), "design-v2 column menu must be 244px at the canonical menu layer and removed Signal Info must stay absent");
  ["--warning", "--warning-soft", "--success", "--success-soft"].forEach((token) => assert(theme.includes(token), `design-v1 feedback token ${token} must remain defined`));
  const obsoleteWorkspaceNodes = ["open-window-action", "signals-add-selection-action", "signals-copy-action", "signals-delete-action", "display-count-status", "active-display-status"];
  const publicSources = [];
  function collectPublicSources(directory) {
    fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) collectPublicSources(fullPath);
      else if (/\.(?:html|js|css)$/i.test(entry.name)) publicSources.push({ path: fullPath, text: fs.readFileSync(fullPath, "utf8") });
    });
  }
  collectPublicSources(path.join(root, "public"));
  const retainedCleanupNodes = obsoleteWorkspaceNodes.flatMap((id) => publicSources.filter((source) => source.text.includes(id)).map((source) => `${id} in ${path.relative(root, source.path)}`));
  assert(retainedCleanupNodes.length === 0, `obsolete workspace controls/status selectors must be physically absent from public sources, not merely hidden; still present: ${retainedCleanupNodes.join(", ")}`);
  assert((html.match(/data-testid="active-plot-host"/g) || []).length === 1, "each active Display must own one graph host");
  assert(/data-testid="active-plot-host"[^>]*role="region"[^>]*aria-labelledby="display-plot-title"/.test(html), "the active graph host must expose its labelled region semantics");
  assert(/data-bottom-tab="signals"[^>]*role="tab"[^>]*aria-controls="bottom-panel-signals"[^>]*aria-selected="true"[^>]*tabindex="0"/.test(html), "Signals must initialize as the sole roving-tabindex tab");
  assert(/data-bottom-tab="measurements"[^>]*role="tab"[^>]*aria-controls="measurements-panel"[^>]*aria-selected="false"[^>]*tabindex="-1"/.test(html), "Measurements must initialize outside the tab sequence");
  assert(/id="bottom-panel-signals"[^>]*role="tabpanel"[^>]*aria-labelledby="signal-panel-tab-signals"/.test(html), "Signals panel must be labelled by its tab");
  assert(/id="measurements-panel"[^>]*role="tabpanel"[^>]*aria-labelledby="signal-panel-tab-measurements"/.test(html), "Measurements panel must be labelled by its tab");
  assert(html.includes('data-testid="pane-grid"') && !html.includes("layout-chooser"), "multi-pane Display must expose one canonical pane grid without the obsolete layout chooser");
  assert(html.includes("data-signal-rows") && app.includes("data-signal-visibility"), "signal list must contain per-signal checkbox controls at runtime");
  ["data-signal-duplicate", "data-signal-delete", "signal-duplicate-action-", "signal-delete-action-"].forEach((term) =>
    assert(app.includes(term), `Inspector rows must retain the stable inline row-action contract term ${term}`)
  );
  assert(!app.includes("data-signal-info") && !app.includes("signal-info-card-"), "removed inline Info control and card must stay absent");
  assert(app.includes("names().length <= 1") && app.includes("deleteDisabled"), "last remaining signal must render its row Delete action disabled");
  assert(/\.signal-row:hover \.signal-row-actions,\.signal-row:focus-within \.signal-row-actions\{[^}]*opacity:1[^}]*pointer-events:auto/.test(css), "row actions must become available on hover and keyboard focus");
  assert(app.includes('if (fatalSnapshotError || ["Enter", " ", "Spacebar"].indexOf(e.key) < 0 || e.target.matches("input,button")) return;'), "native row buttons must bypass delegated Enter/Space row activation");
  assert(/\.signal-row:hover \.signal-row-actions,\.signal-row:focus-within \.signal-row-actions\{[^}]*opacity:1[^}]*pointer-events:auto/.test(css), "inline actions must reveal without geometry shift on hover and focus-within");
  assert(css.includes(".signal-row-action:focus-visible") && css.includes("outline:2px solid var(--accent)"), "inline row actions must retain visible keyboard focus");
  ["signals-add-action", "signals-workspace-dialog", "signals-workspace-refresh", "signals-workspace-loading", "signals-workspace-empty", "signals-workspace-list", "signals-workspace-selection-count", "signals-workspace-sample-rate-group", "signals-workspace-sample-rate-input", "signals-workspace-sample-rate-error", "signals-workspace-batch-error", "signals-workspace-retry", "signals-workspace-submit", "signals-workspace-cancel", "signals-workspace-close", "signals-workspace-success", "signals-workspace-success-count", "signals-workspace-done", "signals-delete-dialog", "signals-delete-name", "signals-delete-confirm", "signals-delete-cancel", "signals-delete-close"].forEach((id) =>
    assert(html.includes(`data-testid="${id}"`), `Signals inspector must expose stable selector ${id}`)
  );
  assert(/id="signals-workspace-title"[^>]*tabindex="-1"/.test(html), "workspace catalog must expose a focusable stable dialog-title anchor without inventing a data-testid");
  assert(/data-testid="signals-add-action"[^>]*aria-label="Добавить сигнал"[^>]*title="Добавить сигнал"/.test(html), "Signals Add icon control must expose its direct-dialog accessible semantics");
  assert(!html.includes('data-testid="signals-add-menu"') && !html.includes('data-testid="signals-add-workspace-action"'), "Signals Add must open the primary dialog directly without an intermediate popup control");
  assert(/data-testid="signals-workspace-dialog"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="signals-workspace-title"/.test(html), "workspace catalog must use the labelled modal dialog contract");
  assert(/data-testid="signals-workspace-success"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="signals-workspace-success-count"/.test(html), "workspace success must use its own labelled modal dialog");
  assert(/data-testid="signals-delete-dialog"[^>]*role="alertdialog"[^>]*aria-modal="true"/.test(html), "signal deletion must use a modal destructive confirmation dialog");
  assert(/data-testid="signals-workspace-batch-error"[^>]*role="alert"/.test(html), "workspace catalog errors must have an accessible feedback surface");
  ["signals-toolbar-error", "signals-delete-done"].forEach((id) => assert(html.includes(`data-testid="${id}"`), `Signals audit selector ${id} must exist`));
  ["signals-workspace-success", "signals-workspace-success-count", "signals-workspace-done"].forEach((id) => assert(html.includes(`data-testid="${id}"`), `workspace success selector ${id} must exist`));
  assert(/data-testid="signals-delete-dialog"[^>]*aria-describedby="signals-delete-(?:name|status)"/.test(html), "Delete dialog must describe its current name or acknowledged completion status");
  assert(/data-testid="signals-workspace-sample-rate-input"[^>]*aria-describedby=/.test(html), "workspace sample rate must expose validation description semantics");
  assert(!html.includes("signals-workspace-variable-input") && !html.includes("signals-workspace-name-input"), "catalog browser must not retain manual variable-name or rename controls");
  ["signals-toolbar-error", "signals-delete-done", "aria-invalid", "Home", "End", "signalsToolbar"].forEach((term) => assert(app.includes(term), `frontend must preserve final Signals audit behavior ${term}`));
  ["workspaceBrowser", "workspaceVariables", "signals-workspace-success", "signals-workspace-done", "signals-delete-success", "focus", "Shift+Tab", "signals-add-action"].forEach((term) => assert(app.includes(term), `frontend must preserve catalog completion/menu focus behavior ${term}`));
  ["workspace/variables", "Cache-Control", "no-store"].forEach((term) => assert(api.includes(term), `catalog API must retain ${term}`));
  ["aria-busy", "signals-workspace-loading", "signals-workspace-empty", "signals-workspace-retry", "signals-workspace-selection-count", "Не поддерживается", "Тип:", "Размер:", "Отсчёты:", "Источник:", "Совместимость:", "Частота дискретизации:"].forEach((term) => assert(html.includes(term) || app.includes(term), `catalog must retain visible/auditable metadata and busy term ${term}`));
  ["workspace_changed", "stale_workspace_catalog", "stale_state", "catalog_revision", "loadWorkspaceCatalog", "workspaceBrowser.catalog = null", "Escape", "Tab"].forEach((term) => assert(app.includes(term), `catalog stale/focus fail-closed behavior must retain ${term}`));
  assert(!/grid-template-(?:columns|rows)\s*:\s*repeat\(5/i.test(css), "workspace browser must not introduce a fixed fifth-row grid shift");
  assert(/@media\s*\([^)]*max-width\s*:\s*\d+px[^)]*\)\s*\{[^}]*(?:\.signals-workspace-browser\s+)?\.signals-workspace-metadata\s*\{[^}]*grid-template-columns\s*:\s*(?:1fr|repeat\(2,)/is.test(css), "narrow workspace dialog CSS must collapse metadata columns without inventing an application layout row");
  assert(/\.signals-workspace-browser\s*\{[^}]*grid-template-rows\s*:\s*auto\s+minmax\(0,1fr\)\s+auto/is.test(css) && /\.signal-analyser\s*\{[^}]*grid-template-rows\s*:\s*64px\s+minmax\(0,1fr\)\s+205px\s+38px/is.test(css), "responsive catalog styles must preserve the existing dialog footer and four-row application/bottom-panel geometry");
  assert(!/overflows*:s*hidden/i.test(css.slice(css.indexOf(".signals"), css.indexOf(".signals") + 1600)), "Signals toolbar/rows must not clip its menu or dialogs");
  assert(/<script\b[^>]*src=["']\.\/js\/api\.js["']/.test(html) && /<script\b[^>]*src=["']\.\/js\/app\.js["']/.test(html), "Genie-relative API and app scripts must be registered");
  assert(!/\b(?:href|src)\s*=\s*["']\/(?:css|js)\//i.test(html), "frontend assets must remain Genie-relative, not root-absolute");
  assert(html.includes('./js/vendor/plotly-cartesian-3.1.0.min.js'), "Plotly must be loaded from the pinned local vendor asset before the app");
  assert(html.indexOf('./js/vendor/plotly-cartesian-3.1.0.min.js') < html.indexOf('./js/app.js'), "local Plotly must load before app.js");
  assert(crypto.createHash("sha256").update(plotly).digest("hex") === "c462b40a1a542e16c3533f97d39fbbb91af4f5267f3cbf23bd70d785efc44c38", "the bundled Plotly artifact must retain its reviewed SHA-256");
  assert(license.includes("MIT License") && license.includes("Plotly Technologies Inc."), "the bundled Plotly artifact must retain its matching MIT license notice");

  assert(api.includes('request("./api/state")'), "state API must use ./api/state");
  assert(api.includes('request("./api/view", {'), "view API must use ./api/view");
  assert(api.includes('request("./api/displays", {'), "Display lifecycle API must use ./api/displays");
  assert(api.includes('request("./api/signals", {'), "Signals inspector mutations must use the sole ./api/signals route");
  ["import_workspace", "import_workspace_batch", "catalog_revision", "selections", "duplicate", "extract_time_limits", "delete", "signalsAction", "signals-workspace-dialog", "signals-delete-dialog", "payload.current", "status===409"].forEach((term) =>
    assert(app.includes(term), `frontend must preserve Signals inspector lifecycle term ${term}`)
  );
  assert((api.match(/method: "POST"/g) || []).length >= 2, "view and displays mutations must POST JSON");
  ["export-action", "import-session-action", "session-action-status", "session-import-dialog", "session-file-input", "session-import-error", "session-import-success", "session-import-submit"].forEach((id) =>
    assert(html.includes(`data-testid="${id}"`), `session UI must expose stable selector ${id}`)
  );
  assert(/data-testid="session-import-dialog"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="session-import-title"/.test(html), "session import must expose a labelled modal dialog");
  assert(/id="session-file-input"[^>]*type="file"[^>]*accept="application\/json,\.json"[^>]*data-testid="session-file-input"/.test(html), "session import must constrain file selection to JSON");
  assert(/data-testid="session-action-status"[^>]*role="status"[^>]*aria-live="polite"/.test(html), "session feedback must expose a polite live status");
  assert(/data-testid="session-import-error"[^>]*role="alert"/.test(html) && /data-testid="session-import-success"[^>]*role="status"/.test(html), "session import must reserve accessible error and success feedback");
  ["./api/session", "session", "importSession", "cache: \"no-store\""].forEach((term) => assert(api.includes(term), `session API must retain ${term}`));
  ["downloadSession", "readSessionFile", "importSession", "reloadSessionState", "state_revision:state.state_revision", "JSON.parse", "error.status === 409", "aria-busy"].forEach((term) => assert(app.includes(term), `session lifecycle must retain ${term}`));
  assert(app.includes("return reloadSessionState();") && app.includes("sessionUi.success = true"), "successful session import must reload authoritative state before success feedback");
  const iconDirectory = path.join(root, "public", "icons");
  ["save.svg", "import.svg", "help-circle.svg", "copy.svg", "trash.svg"].forEach((file) => {
    const asset = path.join(iconDirectory, file);
    assert(fs.existsSync(asset) && /<svg\b/.test(fs.readFileSync(asset, "utf8")), `approved Engee icon must be a local SVG asset: ${file}`);
  });
  [
    ["export-action", "save.svg"], ["import-session-action", "import.svg"], ["help-action", "help-circle.svg"],
  ].forEach(([control, icon]) =>
    assert(new RegExp(`data-testid="${control}"[^>]*>[\\s\\S]*?<img[^>]*src="\\./icons/${icon}"[^>]*alt=""[^>]*aria-hidden="true"`).test(html), `${control} must retain its accessible control while using local ${icon}`)
  );
  assert(app.includes("data-testid='signal-duplicate-action-") && app.includes("data-testid='signal-delete-action-") && app.includes("./icons/copy.svg") && app.includes("./icons/trash.svg"), "dynamic row actions must retain stable IDs while using local icons");

  const toolbarActionOrder = ["import-session-action", "export-action", "help-action"];
  const toolbarPositions = toolbarActionOrder.map((id) => html.indexOf(`data-testid="${id}"`));
  assert(toolbarPositions.every((position) => position >= 0) && toolbarPositions.every((position, index) => index === 0 || toolbarPositions[index - 1] < position), "toolbar must keep Import, Export, Help action order");
  assert(/data-testid="help-action"[^>]*aria-label="Справка недоступна"[^>]*disabled/.test(html), "disabled Help must retain its accessible unavailable state");
  ["--warning", "--warning-soft", "--accent-hover", "--accent-active", "--shadow", "--shadow-dialog", "--control-height"].forEach((token) =>
    assert(theme.includes(token), `shared interaction token ${token} must be defined in theme.css`)
  );
  assert(/html, body\s*\{[^}]*min-width:\s*1024px[^}]*min-height:\s*768px/.test(theme), "application minimum viewport must be 1024x768");
  assert(/button:not\(:disabled\), select:not\(:disabled\), input:not\(:disabled\)\s*\{[^}]*transition:/.test(theme), "enabled controls must share transition states");
  assert(/button:focus-visible, select:focus-visible, input:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--accent\)/.test(theme), "shared controls must retain visible focus styling");
  assert(/\.toolbar-actions \.icon-button:hover,[\s\S]*\.toolbar-actions \.icon-button:active,[\s\S]*\.toolbar-actions \.icon-button:focus-visible/.test(css), "toolbar actions must retain hover, active, and keyboard-focus states");
  assert(/\.signals-dialog-layer\{[^}]*z-index:var\(--layer-main-modal-backdrop\)/.test(css) && /\.signals-dialog\{position:relative;z-index:var\(--layer-main-modal\)/.test(css) && theme.includes("--layer-main-modal-backdrop: 94990") && theme.includes("--layer-main-modal: 95000"), "modal backdrop/card must retain deterministic tokenized stacking order");
  assert(/\.display-settings\s*\.panel-content\{[^}]*min-height:0[^}]*overflow:auto/.test(css), "inspector settings content must scroll instead of overflowing its panel");
  assert(/\.signal-table td\[data-column='name'\],\.signal-table td\[data-column='type'\]\{[^}]*overflow:hidden[^}]*text-overflow:ellipsis[^}]*white-space:nowrap/.test(css), "inspector name/type cells must clip long values without widening the table");

  ["active_display_id", "displays", "visible_signals", "row_selected_signal", "analysis_signal", "selected_signal", "displayMutation", "addDisplay", "selectDisplay", "closeDisplay", "pendingAction"].forEach((term) =>
    assert(app.includes(term), `frontend must preserve Display state contract term ${term}`)
  );
  ["requestDisplayReorder", "reorderedDisplayIds", "displayReorderPending", "reorderBusy", "focusDisplayTab", 'operation:"reorder"'].forEach((term) =>
    assert(app.includes(term), `persistent Display reorder must retain source contract term ${term}`)
  );
  assert(app.includes('if (intent.kind === "reorder") { if (!accept(e.payload.current)) return;') && app.includes("Порядок Display изменился на сервере. Повторите перестановку."), "reorder 409 must accept current and return without generic replay");
  assert(app.includes('displayMutation("create"') && app.includes('displayMutation("select"') && app.includes('displayMutation("close"'), "frontend must emit create/select/close Display operations");
  assert(app.includes("data-testid='close-display-"), "close controls must have stable per-display test IDs");
  assert(app.includes("data-signal-visibility") && app.includes("visible_signals"), "checkbox actions must update active Display membership");
  assert(/data-testid="display-overflow-trigger"[^>]*aria-haspopup="menu"[^>]*aria-controls="display-overflow-menu"/.test(html), "Display overflow must expose the accessible Clear Display menu trigger");
  assert(/data-testid="display-overflow-menu"[^>]*role="menu"[^>]*hidden/.test(html), "Display overflow menu must start hidden");
  assert(/data-testid="clear-display-action"[^>]*role="menuitem"/.test(html), "Clear Display must be a semantic menu action");
  ["row_selected_signal", "analysis_signal", "clear-display-action", "display-overflow-trigger"].forEach((term) =>
    assert(app.includes(term), `frontend must preserve Cascade 5 state/control term ${term}`)
  );
  assert(app.includes("payload.current") && app.includes("status===409"), "stale API responses must canonicalize from the authoritative snapshot");
  assert(app.includes("moduleName") && app.includes("window.Plotly"), "the local Plotly UMD moduleName export must normalize before rendering");
  assert(app.includes("loadPlotlyScript(localPlotlyUrl())"), "Plotly recovery must address only the pinned local artifact");
  assert(!/https?:\/\/|cdn\./i.test(app), "Plotly runtime must not load a CDN asset");
  assert(app.includes("activeBottomTab") && !app.includes("api.bottom"), "bottom Signals/Measurements tabs must remain frontend-local state");
  ["ArrowLeft", "ArrowRight", "Home", "End"].forEach((key) => assert(app.includes(`"${key}"`), `bottom tab keyboard navigation must support ${key}`));
  assert(app.includes("function activateBottomTab(tabId, focus)") && app.includes('tab.setAttribute("tabindex", selected ? "0" : "-1")') && app.includes("target.focus()"), "bottom tabs must apply roving tabindex through the shared activator and move focus to the selected tab");
  assert(/data-testid="find-peaks-action"[^>]*aria-pressed="false"[^>]*aria-controls="peaks-panel"/.test(html), "Find Peaks must expose a controlled capability toggle");
  assert(/data-testid="signal-statistics-action"[^>]*aria-controls="measurements-panel"[^>]*aria-label="Открыть измерения активного отображения"/.test(html), "Signal statistics must expose its Russian local Measurements destination accessibly");
  assert(/data-testid="time-min-input"[^>]*inputmode="decimal"/.test(html) && /data-testid="time-max-input"[^>]*inputmode="decimal"/.test(html), "Time Limits must expose typed seconds inputs");
  assert(/data-testid="time-limits-error"[^>]*role="alert"[^>]*hidden/.test(html), "Time Limits must reserve an accessible inline validation state");
  assert(/data-testid="peaks-panel-tab"[^>]*data-bottom-tab="peaks"[^>]*role="tab"[^>]*aria-controls="peaks-panel"[^>]*hidden/.test(html), "the local Peaks tab must start hidden and retain tab semantics");
  assert(/id="peaks-panel"[^>]*role="tabpanel"[^>]*aria-labelledby="peaks-panel-tab"[^>]*hidden/.test(html), "the Peaks table panel must be labelled by its local tab");
  ["peaks_enabled", "peaksBusyDisplayId", "peaksFor", "peakMarkerTrace", "find-peaks-action"].forEach((term) =>
    assert(app.includes(term), `frontend must preserve the authoritative Peaks contract term ${term}`)
  );
  assert(!api.includes("./api/peaks") && !/findpeaks\s*\(/i.test(app), "frontend must not create a Peaks endpoint or calculate peaks in JavaScript");
  assert(app.includes("signal-statistics-action") && app.includes('activateBottomTab("measurements", true)'), "Signal statistics must activate and focus the local Measurements tab");
  assert(app.includes("p.items.map") && app.includes("item.time_s") && app.includes("item.value"), "peak markers must consume backend-provided peak items only");
  ["traceScale", "normalizedValues", "display.normalizeY", "display.showMarkers", "show-markers-checkbox", "normalize-y-checkbox"].forEach((term) =>
    assert(app.includes(term), `frontend must preserve Cascade 6 Time presentation term ${term}`)
  );
  assert(app.includes("plot === \"time\" && display.normalizeY") && app.includes("plot === \"time\" && display.showMarkers"), "normalization and ordinary markers must be constrained to Time traces");
  assert(app.includes("peakMarkerTrace(display, sourceScale)") && app.includes("normalizedValues(p.items.map"), "Peaks markers must align to the analysis-source normalization scale");
  assert(app.includes("analysis-source-affine-unclipped") && app.includes("plot-invalid-data-state") && app.includes("clearPlotHost()"), "Time presentation must retain unclipped Peak provenance and the stable invalid-data host state");
  assert(app.includes('plot === "time" && d.normalizeY ? true : undefined'), "Normalize-specific y-axis layout must be constrained to Time");
  assert(app.includes("Object.keys(change).every") && app.includes("showLegend") && app.includes("normalizeY") && app.includes("showMarkers"), "presentation toggles must remain local rather than create a view mutation");
  ["time_limits", "time-min-input", "time-max-input", "time-limits-error"].forEach((term) =>
    assert(app.includes(term), `frontend must preserve Cascade 7 Time Limits term ${term}`)
  );
  ["measurement_kinds", "statistics-settings-tab", "statistics-controls", "statistics-selection-error", "statistics-option-minimum", "statistics-option-maximum", "statistics-option-mean", "statistics-option-median", "statistics-option-peak_to_peak", "statistics-option-rms"].forEach((term) =>
    assert(html.includes(term) || app.includes(term), `frontend must preserve Cascade 8 selectable Statistics term ${term}`)
  );
  assert(/data-testid="statistics-controls"[^>]*role="group"/.test(html), "Statistics controls must expose an accessible native-checkbox group");
  assert((html.match(/data-testid="statistics-option-/g) || []).length === 6, "Statistics settings must expose exactly six stable metric controls");
  assert(app.includes("MEASUREMENT_KINDS") && app.includes("measurementKinds") && app.includes("measurementKindsCommit"), "Statistics must be canonicalized and revisioned by frontend state rather than calculated locally");
  assert(app.includes("measurementKindsErrors") && app.includes("fields.measurement_kinds"), "nested measurement_kinds validation errors must have a dedicated inline rollback path");
  ["spectrum-settings", "spectrum-scale-select", "spectrum-frequency-scale-select", "spectrum-leakage-input", "spectrum-settings-error"].forEach((id) =>
    assert(html.includes(`data-testid="${id}"`), `Spectrum settings must expose stable selector ${id}`)
  );
  assert(/data-testid="spectrum-settings-error"[^>]*role="alert"[^>]*hidden/.test(html), "Spectrum settings must reserve an accessible inline validation state");
  assert(/data-testid="spectrum-leakage-input"[^>]*type="range"[^>]*min="0"[^>]*max="1"/.test(html), "Spectrum leakage must expose its bounded numeric control");
  ["spectrum-frequency-min-input", "spectrum-frequency-max-input", "spectrum-frequency-limits-error"].forEach((id) =>
    assert(html.includes(`data-testid="${id}"`), `Frequency Limits must expose stable selector ${id}`)
  );
  assert(/data-testid="spectrum-frequency-min-input"[^>]*inputmode="decimal"/.test(html) && /data-testid="spectrum-frequency-max-input"[^>]*inputmode="decimal"/.test(html), "Frequency Limits must expose typed Hz inputs");
  assert(/data-testid="spectrum-frequency-limits-error"[^>]*role="alert"[^>]*hidden/.test(html), "Frequency Limits must reserve an accessible inline validation state");
  assert((html.match(/data-settings-tab=/g) || []).length === 3 && (html.match(/data-settings-panel=/g) || []).length === 3, "Frequency Limits must remain in the existing three settings tabs");
  ["spectrum_settings", "spectrumSettingsErrors", "bindSpectrumSettings", "renderSpectrumSettings", "frequency_scale", "hasVisibleComplexSignal"].forEach((term) =>
    assert(app.includes(term), `frontend must preserve Cascade 9 Spectrum settings term ${term}`)
  );
  assert(app.includes('xaxis.type = spectrumSettings(d.spectrum_settings).frequency_scale'), "Spectrum frequency scale must map to Spectrum x-axis layout only");
  assert(app.includes('option.value === "log") option.disabled = !enabled || complex'), "Log Spectrum frequency scale must be unavailable with a visible complex signal or quarantined contract");
  ["frequency_limits", "spectrumFrequencyLimits", "spectrum-frequency-min-input", "spectrum-frequency-max-input", "spectrum-frequency-limits-error"].forEach((term) =>
    assert(app.includes(term), `frontend must preserve Cascade 10 Frequency Limits term ${term}`)
  );
  assert(!/log[-_ ]?floor/i.test(html) && !/log[-_ ]?floor/i.test(app), "Cascade 10 must not add a Log-floor field or client-side floor calculation");
  ["spectrogram-time-resolution"].forEach((term) =>
    assert(!html.includes(term) && !app.includes(term), `Cascade 11 must not add unaccepted Spectrogram controls (${term})`)
  );
  assert((html.match(/data-settings-tab=/g) || []).length === 3, "Cascade 11 must preserve exactly three settings tabs");
  assert(!api.includes("spectrogram"), "Cascade 11 must not add a Spectrogram-specific route");
  assert(html.includes('data-testid="spectrogram-overlap-percent-input"'), "Cascade 12 must expose the stable Overlap input selector");
  assert(/data-testid="spectrogram-overlap-percent-error"[^>]*role="alert"[^>]*hidden/.test(html), "Cascade 12 must reserve an accessible Overlap inline error");
  assert(/data-testid="spectrogram-leakage-input"[^>]*type="range"[^>]*min="0"[^>]*max="1"[^>]*step="0\.01"/.test(html), "Cascade 13 must expose normalized Leakage range control");
  assert(/data-testid="spectrogram-leakage-error"[^>]*role="alert"[^>]*hidden/.test(html), "Cascade 13 must reserve an accessible Leakage inline error");
  ["spectrogram-frequency-min-input", "spectrogram-frequency-max-input", "spectrogram-frequency-limits-error"].forEach((id) =>
    assert(html.includes(`data-testid="${id}"`), `Cascade 15 Spectrogram Frequency Limits must expose stable selector ${id}`)
  );
  assert(/data-testid="spectrogram-frequency-min-input"[^>]*inputmode="decimal"/.test(html) && /data-testid="spectrogram-frequency-max-input"[^>]*inputmode="decimal"/.test(html), "Cascade 15 must expose typed Spectrogram Hz inputs");
  assert(/data-testid="spectrogram-frequency-limits-error"[^>]*role="alert"[^>]*hidden/.test(html), "Cascade 15 must reserve an accessible Spectrogram Frequency Limits error");
  ["spectrogram_settings", "overlap_percent", "leakage", "spectrogram-overlap-percent-input", "spectrogram-overlap-percent-error", "spectrogram-leakage-input", "spectrogram-leakage-error"].forEach((term) =>
    assert(app.includes(term), `frontend must preserve Cascade 13 Spectrogram settings term ${term}`)
  );
  assert((html.match(/data-settings-tab=/g) || []).length === 3, "Cascade 13 Leakage must remain inside exactly three settings tabs");
  assert(!api.includes("overlap") && !api.includes("leakage") && !api.includes("spectrogram_settings"), "Cascade 13 must reuse /api/view rather than add a Spectrogram settings route");
  assert(!/fft|stft|window\(/i.test(app), "Cascade 13 must not add client-side DSP");
  ["spectrogramFrequencyLimits", "spectrogram-frequency-min-input", "spectrogram-frequency-max-input", "spectrogram-frequency-limits-error", "frequency_limits"].forEach((term) =>
    assert(app.includes(term), `Cascade 15 frontend must preserve Spectrogram Frequency Limits term ${term}`)
  );
  assert(!/cropFrequency|frequencyCrop|fft|stft|window\(/i.test(app), "Cascade 15 must not add client-side frequency cropping or DSP");
  ["spectrogram-frequency-scale-select", "spectrogram-frequency-scale-effective", "spectrogram-frequency-scale-error"].forEach((id) =>
    assert(html.includes(`data-testid="${id}"`), `Cascade 16 must expose stable Spectrogram Frequency Scale selector ${id}`)
  );
  assert(app.includes("spectrogram-log-frequency-error-state") && app.includes("без положительных частот"), "Cascade 16 must expose a stable all-nonpositive Log-frequency plot error");
  assert(/data-testid="spectrogram-frequency-scale-error"[^>]*role="alert"[^>]*hidden/.test(html), "Cascade 16 must reserve an accessible Frequency Scale error");
  ["spectrogramSettings", "spectrogramFrequencyScaleErrors", "frequency_scale", "available", "effective", "min.apply", "spectrogramFrequencyScaleCommit"].forEach((term) =>
    assert(app.includes(term), `Cascade 16 frontend must retain display-local Frequency Scale term ${term}`)
  );
  assert(app.includes('scale.disabled = !enabled || !Array.isArray(scaleMeta.available) || scaleMeta.available.length < 2'), "availability metadata must authoritatively disable Spectrogram Log");
  assert(app.includes('type:spectrogramScale === "log" ? "log" : undefined'), "effective Spectrogram scale must control only the y axis");
  assert(!/spectrogram.*(?:fft|stft|pspectrum)/i.test(app), "Cascade 16 must not add client-side Spectrogram DSP");
  ["spectrogram-power-min-input", "spectrogram-power-max-input", "spectrogram-power-limits-effective", "spectrogram-power-limits-error"].forEach((id) =>
    assert(html.includes(`data-testid="${id}"`), `Cascade 17 must expose stable Spectrogram Power Limits selector ${id}`)
  );
  assert(/data-testid="spectrogram-power-min-input"[^>]*inputmode="decimal"/.test(html) && /data-testid="spectrogram-power-max-input"[^>]*inputmode="decimal"/.test(html), "Cascade 17 must expose typed dB pair inputs");
  assert(/data-testid="spectrogram-power-limits-effective"[^>]*aria-live="polite"/.test(html), "Cascade 17 must expose a read-only live effective Power Limits state");
  assert(/data-testid="spectrogram-power-limits-error"[^>]*role="alert"[^>]*hidden/.test(html), "Cascade 17 must reserve an accessible Power Limits error");
  ["power_limits", "spectrogramPowerLimits", "spectrogramPowerLimitsCommit", "zauto", "zmin", "zmax"].forEach((term) =>
    assert(app.includes(term), `Cascade 17 frontend must retain Power Limits term ${term}`)
  );
  assert(!/spectrogram.*(?:fft|stft|pspectrum|minthreshold)/i.test(app), "Cascade 17 must not add client-side DSP or MinThreshold behavior");
  assert(html.includes('<option value="persistence">Спектр персистентности</option>'), "Cascade 18 must retain Persistence as the Russian generic plot-kind option");
  ["persistence-settings", "persistence-leakage-input", "persistence-leakage-value", "persistence-leakage-error"].forEach((id) =>
    assert(html.includes(`data-testid="${id}"`), `Cascade 19 must expose stable Persistence Leakage selector ${id}`)
  );
  assert(/data-testid="persistence-leakage-input"[^>]*type="range"[^>]*min="0"[^>]*max="1"[^>]*step="0\.01"/.test(html), "Cascade 19 must expose bounded normalized Persistence Leakage range");
  assert(/data-testid="persistence-leakage-error"[^>]*role="alert"[^>]*hidden/.test(html), "Cascade 19 must reserve accessible Persistence Leakage error");
  ["persistence_settings", "persistenceSettings", "persistenceLeakageDrafts", "persistenceLeakageErrors", "persistenceLeakageCommit"].forEach((term) =>
    assert(app.includes(term), `Cascade 19 must retain Persistence Leakage state term ${term}`)
  );
  assert(!api.includes("persistence"), "Cascade 19 must retain the existing generic state/view wire without a Persistence route");
  assert(!/persistence.*(?:fft|stft|pspectrum|histogram|minthreshold|log10)/i.test(app), "Cascade 18 must not calculate Persistence DSP, histogram, or dB conversion in JavaScript");
  assert((app.match(/function renderStatisticsControls\(/g) || []).length === 1, "Statistics settings must have exactly one render function");
  assert((app.match(/function render\(/g) || []).length === 1, "frontend must retain exactly one render declaration");
  assert(!app.includes("function bindStatisticsShortcut("), "Statistics shortcut must not retain a dead duplicate binding path");
  [
    ["display-settings-tab", "display-settings-panel"],
    ["time-settings-tab", "time-settings-panel"],
    ["statistics-settings-tab", "measurements-settings-panel"],
  ].forEach(([tab, panel]) => {
    assert(new RegExp(`id="${tab}"[^>]*role="tab"[^>]*aria-controls="${panel}"`).test(html), `${tab} must own an accessible settings tab`);
    assert(new RegExp(`id="${panel}"[^>]*role="tabpanel"[^>]*aria-labelledby="${tab}"`).test(html), `${panel} must be the labelled panel for its settings tab`);
  });
  assert((html.match(/data-settings-panel=/g) || []).length === 3 && (html.match(/data-settings-tab=/g) || []).length === 3, "settings must expose exactly three tab/panel sections");
  assert(app.includes("[data-settings-panel]") && app.includes("panel.hidden = panel.dataset.settingsPanel !== activeSettingsTab"), "settings navigation must hide whole sections rather than only individual controls");
  assert(app.includes("bindSettingsKeyboard") && app.includes("ArrowLeft") && app.includes("ArrowRight") && app.includes('tabindex", on ? "0" : "-1"'), "settings tabs must support roving keyboard navigation");
  assert(/<section id="statistics-controls"[^>]*data-testid="statistics-controls"(?![^>]*\bhidden\b)/.test(html), "Statistics controls must not carry a literal hidden attribute once their Measurements tabpanel is selected");
  const displayPanelAt = html.indexOf('id="display-settings-panel"');
  const timePanelAt = html.indexOf('id="time-settings-panel"');
  const analysisAt = html.indexOf('data-display-settings-actions');
  assert(displayPanelAt >= 0 && analysisAt > displayPanelAt && analysisAt < timePanelAt, "Analysis actions must belong exclusively to the Display settings panel");
  assert(!/https?:\/\/|cdn\./i.test(app), "Peaks integration must not add a CDN dependency");
  assert(!/\.plot-grid[^}]*grid-template-(?:columns|rows)\s*:\s*repeat\(2/i.test(css), "MVP styling must not retain a fixed four-plot grid; responsive catalog metadata may legitimately use two columns");
};
