"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function explicitApplyStaticContract(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const html = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
  const api = fs.readFileSync(path.join(root, "public/js/api.js"), "utf8");
  const settings = fs.readFileSync(path.join(root, "public/js/settings.js"), "utf8");
  const component = fs.readFileSync(path.join(root, "public/js/components/explicit-apply.js"), "utf8");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");

  assert((html.match(/id="explicit-apply-vue-root"/g) || []).length === 1, "exactly one local Vue Apply root is allowed");
  assert(html.indexOf('./vendor/vue/3.5.41/vue.global.prod.js') < html.indexOf('./js/components/explicit-apply.js'), "the pinned local Vue runtime must load before the Apply component");
  assert(api.includes('applySettings: function (payload)') && api.includes('"./api/settings/apply"'), "Apply must use the normal /api/settings/apply API boundary");
  assert(component.includes('settings.flushForApply()') && component.includes('state_revision:context.revision, display_id:context.displayId'), "Apply must flush then submit the exact snapshot-free payload");
  assert(!component.includes('field_id') && !component.includes('outputRequest'), "Apply component must not submit settings snapshots or request output directly");
  assert(component.includes('output.refreshAfterApply(response.state_revision)'), "accepted Apply must refresh only through the active-output owner");
  assert(settings.includes('SETTINGS_DEBOUNCE_MS = 150'), "field updates retain the 150 ms debounce contract");
  assert(!/https?:\/\/|cdn\./i.test(component), "Apply must not add a CDN dependency");

  // MATLAB-compatible normalization is an accepted backend presentation
  // contract.  Client-side derived graph math would make the render dependent
  // on stale/raw payloads and bypass the explicit Apply boundary.
  assert(!app.includes('function normalizedValues(') && !app.includes('normalizedValues(t.y, scale)'), "frontend must not recompute normalized Time values; backend supplies accepted min-max traces");
};
