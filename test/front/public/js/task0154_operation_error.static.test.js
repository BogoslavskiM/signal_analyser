"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function task0154OperationErrorStatic(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "public/css/app.css"), "utf8");

  assert(/data-testid="signal-operation-error-layer"/.test(app) && /role="alertdialog"/.test(app) && /aria-modal="true"/.test(app), "provider failure must use a standard modal alertdialog above the operation form");
  assert(/payloadError=error && error\.payload && error\.payload\.error \|\| \{\}[\s\S]*?errorDialog\.open\(\{status:error && error\.status,code:payloadError\.code\}/.test(app), "operation failure must pass only typed status/code to the error dialog");
  assert(!/state\.error=safeErrorText\(error/.test(app), "operation provider failure must not persist raw error text in the operation form");
  assert(/sanitizedMessage/.test(app) && /Never render error\.message, Julia\/Engee\/TypeError text/.test(app), "error dialog must sanitize backend/provider details");
  assert(/signal-operation-error-layer/.test(css) && /z-index:\s*calc\(var\(--layer-modal-backdrop\) \+ 20\)/.test(css), "error dialog must be layered above the still-mounted operation dialog");
  assert(!/plot-cursor-readout/.test(app) && !/plot-cursor-readout/.test(css), "the removed graph readout must not re-enter production assets");
};
