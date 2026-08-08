"use strict";

const fs = require("fs");
const path = require("path");

function mediaBody(source, query) {
  const start = source.indexOf(`@media(${query}){`);
  if (start < 0) return null;
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  return null;
}

module.exports = async function test1024SettingsSelectWidthStaticContract(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const css = fs.readFileSync(path.join(root, "public/css/layouts.css"), "utf8");
  const selector = "#display-settings-panel>#settings-view";
  const responsive = mediaBody(css, "max-width:1080px");

  assert(!responsive || !responsive.includes(selector), "accepted design v1 forbids selector-specific settings select reflow at the 1080px breakpoint");
  assert(css.includes("grid-template-columns:140px minmax(0,1fr)"), "accepted design v1 requires the 140px label / flexible control settings-row grid");
  assert(/\.signal-analyser\{[^}]*min-width:920px[^}]*min-height:680px/.test(css), "the application shell must retain the 920×680 readable invariant rather than compress the Settings track");
  assert(/html,body\{[^}]*min-width:0[^}]*min-height:0[^}]*overflow:auto/.test(css), "an undersized viewport must use document scrolling around the shell minimum rather than a responsive settings-row reflow");

  assert(!/(?:html|body|\.signal-analyser)\s*\{[^}]*\bmax-(?:width|height)\s*:/i.test(css), "the design must not introduce a broad page or application maximum");
};
