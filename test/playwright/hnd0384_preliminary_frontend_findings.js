"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const ROOT = path.join(__dirname, "artifacts", "HND-0384", "preliminary");
const TARGET = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const VIEWS = [[1024, 768], [1280, 720], [1440, 900]];

function visibleBox(element) {
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  return {
    tag: element.tagName.toLowerCase(),
    testid: element.dataset.testid || null,
    className: element.className && String(element.className),
    aria: element.getAttribute("aria-label"),
    text: (element.innerText || element.textContent || "").trim().slice(0, 120),
    box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom },
    color: style.color,
    background: style.backgroundColor,
    fill: style.fill,
    stroke: style.stroke,
    overflow: style.overflow,
    display: style.display,
    visibility: style.visibility,
  };
}

(async () => {
  fs.mkdirSync(ROOT, { recursive: true });
  const report = {
    handoff_id: "HND-0384",
    mode: "preliminary_frontend_finding",
    target: TARGET,
    expected_revision: "e0d1253433505943569c2a6b5e07555d5504be0b",
    browser_channel: "chrome",
    headless: false,
    browser_visibility: "foreground",
    worker_count: 1,
    started_at: new Date().toISOString(),
    views: [],
  };
  const browser = await chromium.launch({ channel: "chrome", headless: false });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  try {
    for (const [width, height] of VIEWS) {
      await page.setViewportSize({ width, height });
      await page.goto(TARGET, { waitUntil: "commit", timeout: 45000 });
      await page.bringToFront();
      await page.waitForTimeout(3000);
      const key = `${width}x${height}`;
      await page.screenshot({ path: path.join(ROOT, `production-${key}.png`), fullPage: false });
      const data = await page.evaluate(() => {
        function visibleBox(element) {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            tag: element.tagName.toLowerCase(), testid: element.dataset.testid || null,
            className: element.className && String(element.className), aria: element.getAttribute("aria-label"),
            text: (element.innerText || element.textContent || "").trim().slice(0, 120),
            box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom },
            color: style.color, background: style.backgroundColor, fill: style.fill, stroke: style.stroke,
            overflow: style.overflow, display: style.display, visibility: style.visibility,
          };
        }
        const ids = ["app-shell", "display-workspace", "display-canvas", "display-settings", "bottom-panel-signals", "signal-table"];
        const shell = document.querySelector('[data-testid="app-shell"]');
        const zones = Object.fromEntries(ids.map((id) => {
          const element = document.querySelector(`[data-testid="${id}"]`);
          return [id, element ? visibleBox(element) : null];
        }));
        const viewport = { width: innerWidth, height: innerHeight, documentScrollWidth: document.documentElement.scrollWidth, documentScrollHeight: document.documentElement.scrollHeight, bodyScrollWidth: document.body.scrollWidth, bodyScrollHeight: document.body.scrollHeight };
        const green = Array.from(document.querySelectorAll("svg, path, use, span, i, button, input"))
          .map((element) => {
            const record = visibleBox(element);
            const rect = element.getBoundingClientRect();
            const parent = element.parentElement;
            const parentRect = parent && parent.getBoundingClientRect();
            const style = getComputedStyle(element);
            const parentStyle = parent && getComputedStyle(parent);
            const greenStyle = [style.color, style.fill, style.stroke, style.backgroundColor].join(" ").match(/rgb\(\s*(?:0|1?\d?\d)\s*,\s*(?:[89]\d|1\d\d|2[0-5]\d?)\s*,\s*(?:0|1?\d?\d)\s*\)/);
            const overflow = parentRect && (rect.left < parentRect.left - 0.5 || rect.top < parentRect.top - 0.5 || rect.right > parentRect.right + 0.5 || rect.bottom > parentRect.bottom + 0.5);
            return { record, parent: parent ? visibleBox(parent) : null, greenStyle: Boolean(greenStyle), overflow };
          })
          .filter((entry) => entry.greenStyle || entry.overflow)
          .filter((entry) => entry.record.box.width > 0 && entry.record.box.height > 0)
          .slice(0, 100);
        const error = document.querySelector('[data-testid="layout-load-error"]');
        return { viewport, shell: shell ? visibleBox(shell) : null, zones, green, layoutLoadError: error ? visibleBox(error) : null, activeElement: document.activeElement && visibleBox(document.activeElement) };
      });
      report.views.push({ viewport: key, screenshot: path.join(ROOT, `production-${key}.png`), ...data });
    }
    report.status = await page.evaluate(() => fetch("./api/status", { cache: "no-store" }).then(async (response) => ({ status: response.status, body: await response.json() })));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.bringToFront();
    const trigger = page.locator('[data-testid="plot-type-select"]');
    if (await trigger.count()) {
      await trigger.click();
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(ROOT, "production-plot-type-options-1440x900.png"), fullPage: false });
      report.plot_type_options = await page.evaluate(() => Array.from(document.querySelectorAll("svg, path, use, [role=option], option, input[type=checkbox]"))
        .map((element) => {
          const rect = element.getBoundingClientRect();
          const control = element.closest("button, [role=option], label, li, div") || element.parentElement;
          const controlRect = control && control.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            selector: element.id ? `#${element.id}` : element.dataset.testid ? `[data-testid="${element.dataset.testid}"]` : `${element.tagName.toLowerCase()}.${String(element.className || "").trim().replace(/\\s+/g, ".")}`,
            tag: element.tagName.toLowerCase(), className: String(element.className || ""),
            color: style.color, fill: style.fill, stroke: style.stroke, background: style.backgroundColor,
            box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom },
            controlSelector: control && (control.dataset.testid ? `[data-testid="${control.dataset.testid}"]` : `${control.tagName.toLowerCase()}.${String(control.className || "").trim().replace(/\\s+/g, ".")}`),
            controlBox: controlRect && { x: controlRect.x, y: controlRect.y, width: controlRect.width, height: controlRect.height, right: controlRect.right, bottom: controlRect.bottom },
            overflowsControl: Boolean(controlRect && (rect.left < controlRect.left - .5 || rect.top < controlRect.top - .5 || rect.right > controlRect.right + .5 || rect.bottom > controlRect.bottom + .5)),
          };
        }).filter((entry) => entry.box.width > 0 && entry.box.height > 0 && (entry.tag === "path" || entry.tag === "svg" || entry.tag === "input" || entry.tag === "option" || /option|check|tick|selected/i.test(entry.className))));
    }
    await page.keyboard.press("Escape");
    const columnsTrigger = page.locator('[data-testid="signal-columns-menu-trigger"]');
    if (await columnsTrigger.count()) {
      await columnsTrigger.click();
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(ROOT, "production-column-options-1440x900.png"), fullPage: false });
      report.column_visibility_menu = await page.evaluate(() => {
        const menu = document.querySelector('[data-testid="signal-columns-menu"]');
        const itemData = menu ? Array.from(menu.querySelectorAll("*")) : [];
        const rect = (element) => { const box = element.getBoundingClientRect(); return { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom }; };
        return {
          menu: menu && { selector: '[data-testid="signal-columns-menu"]', box: rect(menu), overflow: getComputedStyle(menu).overflow },
          checked: itemData.filter((element) => element.matches("input:checked, svg, path, use") && rect(element).width > 0 && rect(element).height > 0).map((element) => {
            const parent = element.closest("button, label, [role=menuitem], li") || element.parentElement;
            const style = getComputedStyle(element);
            const child = rect(element); const parentBox = parent && rect(parent);
            return { selector: element.dataset.testid ? `[data-testid="${element.dataset.testid}"]` : `${element.tagName.toLowerCase()}.${String(element.className || "").trim().replace(/\\s+/g, ".")}`,
              html: element.outerHTML.slice(0, 500), color: style.color, fill: style.fill, stroke: style.stroke, box: child,
              parentSelector: parent && `${parent.tagName.toLowerCase()}.${String(parent.className || "").trim().replace(/\\s+/g, ".")}`, parentBox,
              overflowsParent: Boolean(parentBox && (child.left < parentBox.x - .5 || child.y < parentBox.y - .5 || child.right > parentBox.right + .5 || child.bottom > parentBox.bottom + .5)) };
          }),
        };
      });
    }
  } catch (error) {
    report.error = error.stack || String(error);
  }
  report.page_errors = errors;
  report.completed_at = new Date().toISOString();
  fs.writeFileSync(path.join(ROOT, "report.json"), JSON.stringify(report, null, 2));
  process.stdout.write(JSON.stringify(report, null, 2));
})().catch((error) => { console.error(error.stack || error); process.exit(1); });
