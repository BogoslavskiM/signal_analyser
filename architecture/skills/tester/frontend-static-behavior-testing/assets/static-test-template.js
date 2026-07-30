"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testStaticContract(assert) {
  const root = path.resolve(__dirname, "<relative-project-root>");
  const js = fs.readFileSync(path.join(root, "public/js/<module>.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "public/css/<module>.css"), "utf8");
  const html = fs.readFileSync(path.join(root, "public/html/<module>.html"), "utf8");
  const index = fs.readFileSync(path.join(root, "public/index.html"), "utf8");

  assert(index.includes("./js/<module>.js"), "index should load module JS");
  assert(index.includes("./css/<module>.css"), "index should load module CSS");
  assert(html.includes('data-testid="<stable-id>"'), "template should expose stable E2E selector");
  assert(js.includes("window.GenieAppModules"), "module should use the shared registry");
  assert(!js.includes("<source-app-name>"), "module should not keep source application names");
};
