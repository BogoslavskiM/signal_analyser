"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function testDisplayTabArrowContracts(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const html = read("public/index.html");
  const css = read("public/css/app.css");
  const app = read("public/js/app.js");

  ["display-scroll-left", "display-scroll-right"].forEach((id) => {
    assert(new RegExp(`data-testid="${id}"[^>]*hidden`).test(html), `authored ${id} must start hidden`);
  });
  assert(/\.display-tab-scroll\[hidden\]\s*\{\s*display:\s*none;\s*\}/.test(css), "hidden tab arrows must have no display box");

  const update = (app.match(/function updateDisplayTabScroll\(\)\s*\{[\s\S]*?\n  \}/) || [""])[0];
  assert(/tablist\.scrollWidth - tablist\.clientWidth/.test(update), "tab-arrow overflow must use scrollWidth minus clientWidth");
  assert(/var hasOverflow = maxScroll > 1/.test(update), "tab-arrow state must distinguish overflow from a fitting tab list");
  assert(/previous\.hidden = !hasOverflow \|\| tablist\.scrollLeft <= 1/.test(update), "left arrow must hide at the start and without overflow");
  assert(/next\.hidden = !hasOverflow \|\| tablist\.scrollLeft >= maxScroll - 1/.test(update), "right arrow must hide at the end and without overflow");

  assert(/q\("\[data-testid='display-tabs'\]"\)\.addEventListener\("scroll", function \(\) \{ scheduleDisplayTabScrollUpdate\(false\); \}/.test(app), "tab scrolling must update arrow state");
  assert(/window\.addEventListener\("resize", function \(\) \{ scheduleDisplayTabScrollUpdate\(false\); \}\)/.test(app), "window resize must update arrow state");
  assert(/new window\.ResizeObserver\(function \(\) \{ scheduleDisplayTabScrollUpdate\(false\); \}\)[\s\S]*?observe\(q\("\[data-testid='display-tabs-wrap'\]"\)\)/.test(app), "ResizeObserver must update arrows when the tab viewport changes");
  assert(/function scrollDisplayTabs\(direction\)[\s\S]*?tablist\.scrollBy\(\{ left: direction \* distance, behavior: "smooth" \}\)/.test(app), "arrow action must scroll the tab list by its requested direction");
  assert(/button\.dataset\.testid === "display-scroll-left"\) return void scrollDisplayTabs\(-1\)/.test(app), "left arrow must request backward scrolling");
  assert(/button\.dataset\.testid === "display-scroll-right"\) return void scrollDisplayTabs\(1\)/.test(app), "right arrow must request forward scrolling");
};
