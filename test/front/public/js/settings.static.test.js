"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testCatalogSettingsResolutionStaticContract(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const html = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
  const settings = fs.readFileSync(path.join(root, "public/js/settings.js"), "utf8");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const renderer = settings + app;

  assert(html.includes('./js/settings.js') && html.indexOf('./js/settings.js') < html.indexOf('./js/app.js'), "catalog settings module must load before the application renderer");
  ["resolution", "setting-", "-error", "-effect-status", "aria-describedby", "aria-invalid", "aria-busy", "visible", "enabled"].forEach((term) =>
    assert(renderer.includes(term), `catalog settings renderer must retain ${term} for resolution visibility/status/selectors`)
  );
  assert(!/\b(?:pspectrum|fft|dft)\s*\(/i.test(settings), "DFT Points controls must not calculate DSP in the browser");
};
