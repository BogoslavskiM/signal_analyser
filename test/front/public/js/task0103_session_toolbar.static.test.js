"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testTask0103SessionToolbarStatic(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const html = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const api = fs.readFileSync(path.join(root, "public/js/api.js"), "utf8");

  assert(/data-testid="import-session-action"[\s\S]*aria-label="Импортировать сессию"/.test(html), "the existing import toolbar action must remain visible and labelled");
  assert(/data-testid="export-action"[\s\S]*aria-label="Сохранить сессию"/.test(html), "the existing export toolbar action must remain visible and labelled");
  assert(/id="session-file-input"[^>]*type="file"[^>]*accept="application\/json,\.json"[^>]*data-testid="session-file-input"/.test(html), "import must expose the JSON-only hidden picker with a stable test id");
  assert(/session:\s*function \(\)[\s\S]*request\("\.\/api\/session"/.test(api) && /importSession:[\s\S]*request\("\.\/api\/session"[\s\S]*method:\s*"POST"/.test(api), "the toolbar flow must use the normal GET/POST session adapter");
  const download = app.match(/function downloadSessionDocument\(trigger\)[\s\S]*?\n  function plotEnvelope/)[0];
  assert(/api\.session\(\)/.test(download) && /JSON\.stringify\(response\.document, null, 2\)/.test(download) && /type:"application\/json"/.test(download) && /link\.download = "signal-analyser-session\.json"/.test(download) && /link\.remove\(\)/.test(download) && /URL\.revokeObjectURL\(url\)/.test(download), "export must serialize only response.document as pretty application/json and clean up its temporary download resources");
  assert(/function openSessionFilePicker\(trigger\)[\s\S]*input\.value = ""[\s\S]*input\.click\(\)/.test(app), "opening import must clear the picker before click so the same file can be selected again");
  assert(/function importSessionDocument\(\)[\s\S]*api\.importSession\(\{ state_revision:model\.revision, document:current\.document \}\)[\s\S]*if \(error && error\.status === 409\) return refreshSnapshot\(render\)/.test(app), "import must send only revision/document and refresh on conflict without replaying the POST");
  assert(/role", "dialog"[\s\S]*aria-modal", "true"[\s\S]*session-import-error' role='alert'[\s\S]*event\.key === "Escape"[\s\S]*event\.key !== "Tab"/.test(app), "the explicit confirmation dialog must retain modal, alert, Escape, and focus-trap contracts");
  assert(/function clearSessionTransientState\(\)[\s\S]*model\.outputs = \{\}; model\.outputTokens = \{\}; model\.pollByPane = \{\}; model\.plotQueue = \{\}/.test(app) && /refreshSnapshot\(render\)[\s\S]*settings\.load\(\)[\s\S]*output\(true\)/.test(app), "success must reset transient output work and refresh authoritative state, settings, and active output");
};
