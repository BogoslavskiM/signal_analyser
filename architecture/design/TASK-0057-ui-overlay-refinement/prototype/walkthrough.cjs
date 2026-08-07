const fs = require("fs");
const path = require("path");
const { chromium } = require(path.resolve(__dirname, "../../../../test/playwright/node_modules/playwright-core"));

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const entryPath = path.resolve(__dirname, "index.html");
const entryUrl = `file://${entryPath}`;
const screenshotDir = path.resolve(__dirname, "../screenshots");
const evidencePath = path.resolve(__dirname, "../evidence/interaction-walkthrough.json");
const viewports = [
  { width: 1440, height: 900, key: "1440x900" },
  { width: 1280, height: 720, key: "1280x720" },
  { width: 1024, height: 768, key: "1024x768" }
];
const plotTypes = ["time", "spectrum", "spectrogram", "persistence"];
const settingsPages = ["display", "time", "measurements"];
const records = [];
const screenshots = [];
const browserErrors = [];
const computedEvidence = { graph_help_geometry: {}, plotly_interactions: {}, tabs: {}, swatches: {}, proportions: {}, lower_table_zone: {}, dropdown_states: {}, settings_matrix: {} };
let browser;
let page;
let viewport;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function isVisible(selector) {
  return page.locator(selector).isVisible();
}

async function record(id, action, expected, run) {
  const started = Date.now();
  try {
    await run();
    records.push({ id, viewport: viewport.key, action, expected, status: "pass", duration_ms: Date.now() - started });
  } catch (error) {
    records.push({ id, viewport: viewport.key, action, expected, status: "fail", duration_ms: Date.now() - started, error: error.message });
    throw error;
  }
}

async function shot(name, preservePointer = false) {
  if (!preservePointer) await page.mouse.move(2, 2);
  const filename = `${name}--${viewport.key}.png`;
  await page.screenshot({ path: path.join(screenshotDir, filename), animations: "disabled" });
  screenshots.push(`screenshots/${filename}`);
}

async function fresh(nextViewport = viewport) {
  viewport = nextViewport;
  if (page) await page.close();
  page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
  page.on("console", message => {
    if (message.type() === "error") browserErrors.push({ viewport: viewport.key, type: "console", text: message.text() });
  });
  page.on("pageerror", error => browserErrors.push({ viewport: viewport.key, type: "pageerror", text: error.message }));
  await page.goto(entryUrl);
  await page.evaluate(() => window.__TASK0057_DESIGN__.waitForPlots());
  await page.waitForTimeout(40);
}

async function chooseSelect(designId, value) {
  const trigger = page.locator(`[data-design-id="${designId}"]`);
  await trigger.click();
  await page.locator(`[data-design-id="select-menu"] [data-option-value="${value}"]`).click();
  await page.evaluate(() => window.__TASK0057_DESIGN__.waitForPlots());
}

async function keyboardFocus(locator) {
  await locator.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  assert(await locator.evaluate(element => element === document.activeElement), "Keyboard focus did not return to target");
}

async function graphGeometry() {
  return page.locator(".plot-pane").evaluateAll(panes => panes.map(pane => {
    const box = element => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    };
    return { pane: box(pane), canvas: box(pane.querySelector(".plot-canvas")), chart: box(pane.querySelector(".plot-chart")), svg: box(pane.querySelector(".plot-chart svg")) };
  }));
}

async function assertRepresentativeGraphs(expectedCount) {
  await page.evaluate(() => window.__TASK0057_DESIGN__.waitForPlots());
  const panes = await page.locator(".plot-pane").count();
  if (expectedCount !== undefined) assert(panes === expectedCount, `Expected ${expectedCount} panes, got ${panes}`);
  const result = await page.locator(".plot-pane").evaluateAll(elements => elements.map(pane => ({
    ready: !!(pane.querySelector("[data-plotly-ready='true']") && pane.querySelector("[data-plotly-ready='true']")._fullLayout),
    svg: !!pane.querySelector(".plotly-host .main-svg"),
    axes: !!pane.querySelector(".plotly-host .xaxislayer-above, .plotly-host .yaxislayer-above"),
    trace: !!pane.querySelector(".plotly-host .scatterlayer .trace, .plotly-host .heatmaplayer .hm"),
    legend: !!pane.querySelector(".plot-legend"),
    canvasWidth: pane.querySelector(".plot-canvas").getBoundingClientRect().width
  })));
  assert(result.length > 0 && result.every(item => item.ready && item.svg && item.axes && item.trace && item.legend && item.canvasWidth > 0), `Incomplete interactive Plotly contract: ${JSON.stringify(result)}`);
  assert(await page.locator(".modebar, .modebar-container, .plot-tools, [data-plotly-host]").count() === 0, "Superseded graph tools/container are present");
}

async function assertNoLegendCollision() {
  const collision = await page.evaluate(() => {
    const help = document.querySelector("[data-design-id='graph-help']").getBoundingClientRect();
    const pane = document.querySelector(".plot-pane.is-active");
    const legend = pane.querySelector(".plot-legend").getBoundingClientRect();
    const controls = pane.querySelector(".plot-control-cluster").getBoundingClientRect();
    const overlap = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    return { helpLegend: overlap(help, legend), helpControls: overlap(help, controls), legendControls: overlap(legend, controls) };
  });
  assert(!collision.helpLegend && !collision.helpControls && !collision.legendControls, `Overlay/legend collision: ${JSON.stringify(collision)}`);
}

async function scrollToEdge(direction) {
  const selector = direction < 0 ? "[data-design-id='display-scroll-left']" : "[data-design-id='display-scroll-right']";
  for (let index = 0; index < 12 && await isVisible(selector); index += 1) {
    try {
      await page.locator(selector).click({ timeout: 1200 });
    } catch (error) {
      if (await page.locator(selector).isHidden()) break;
      throw error;
    }
    await page.waitForTimeout(240);
  }
}

async function baselineAndScreenNavigation() {
  await fresh(viewport);
  await record(`default-one-screen-${viewport.key}`, "Открыть prototype", "Ровно один screen; две pane с axes/traces/legend; icon-only add; borderless swatches", async () => {
    assert(await page.locator(".display-tab-shell").count() === 1, "Default does not contain exactly one screen");
    assert(await page.locator("[data-screen-close]").count() === 1, "Default screen has no close control");
    assert(await page.locator("[data-design-id='display-scroll-left']").isHidden(), "Left arrow must be hidden without overflow");
    assert(await page.locator("[data-design-id='display-scroll-right']").isHidden(), "Right arrow must be hidden without overflow");
    const add = page.locator("[data-design-id='display-add']");
    assert((await add.innerText()).trim() === "", "Display add has visible copy");
    assert(await add.getAttribute("aria-label") === "Добавить экран", "Display add accessible name is missing");
    const addBox = await add.boundingBox();
    const layoutBox = await page.locator("[data-design-id='layout-trigger']").boundingBox();
    assert(addBox && layoutBox && Math.abs(addBox.x + addBox.width - layoutBox.x) <= 1, "Display add is not immediately left of layout");
    assert(addBox.width === 32 && addBox.height === 32, `Display add geometry is ${JSON.stringify(addBox)}`);
    assert(!(await page.locator("body").innerText()).includes("Добавить экран"), "Forbidden visible phrase is present");
    await assertRepresentativeGraphs(2);
    const clusters = await page.locator(".plot-control-cluster").evaluateAll(elements => elements.map(cluster => {
      const select = cluster.querySelector(".pane-select").getBoundingClientRect();
      const more = cluster.querySelector(".plot-more").getBoundingClientRect();
      return { gap: more.left - select.right, selectHeight: select.height, moreHeight: more.height };
    }));
    assert(clusters.every(item => Math.abs(item.gap) < 0.1 && item.selectHeight === 28 && item.moreHeight === 28), `Pane cluster contract failed: ${JSON.stringify(clusters)}`);
    const swatches = await page.locator("[data-color-swatch]").evaluateAll(elements => elements.map(element => {
      const style = getComputedStyle(element);
      return { text: element.innerText, border: style.borderWidth, outline: style.outlineWidth, aria: element.getAttribute("aria-label"), tooltip: element.dataset.tooltip };
    }));
    assert(swatches.every(item => item.text === "" && item.border === "0px" && item.outline === "0px" && item.aria && item.tooltip), `Swatch semantics/geometry failed: ${JSON.stringify(swatches)}`);
    computedEvidence.proportions[viewport.key] = { add: addBox, pane_controls: clusters };
    const tableZone = await page.locator(".inspector").evaluate(element => element.getBoundingClientRect().height);
    const expectedTableZone = Math.min(324, Math.max(270, viewport.height * 0.36)) - 18;
    assert(Math.abs(tableZone - expectedTableZone) < 0.02, `Lower table zone ${tableZone}px != ${expectedTableZone}px`);
    computedEvidence.lower_table_zone[viewport.key] = { current_px: tableZone, prior_review_px: tableZone + 10, delta_px: -10, row_px: 32 };
    computedEvidence.swatches[viewport.key] = swatches;
    await shot("workspace--default-one-screen");
  });

  await record(`screen-overflow-${viewport.key}`, "Нажать icon-only + восемь раз", "Возникает реальный overflow из девяти screen tabs; каждый screen сохраняет representative graphs", async () => {
    for (let index = 0; index < 8; index += 1) await page.locator("[data-design-id='display-add']").click();
    await page.waitForTimeout(320);
    assert(await page.locator(".display-tab-shell").count() === 9, "Nine screens were not created by click");
    assert(await page.locator("[data-screen-close]").count() === 9, "Not every screen has a close cross");
    await assertRepresentativeGraphs(2);
    await scrollToEdge(-1);
    assert(await page.locator("[data-design-id='display-scroll-left']").isHidden(), "Left arrow is not fully hidden at left edge");
    assert(await isVisible("[data-design-id='display-scroll-right']"), "Right arrow missing at left edge");
    const leftState = await page.locator("[data-design-id='display-tablist']").evaluate(element => ({ left: element.scrollLeft, width: element.clientWidth, scrollWidth: element.scrollWidth }));
    computedEvidence.tabs[viewport.key] = { left: leftState };
    await page.locator(".display-tab").first().click();
    await assertRepresentativeGraphs(2);
    await shot("screen-list--left-edge");

    const right = page.locator("[data-design-id='display-scroll-right']");
    await right.hover();
    await shot("screen-arrow--hover", true);
    await page.locator("[data-design-id='display-add']").focus();
    await page.keyboard.press("Shift+Tab");
    assert(await right.evaluate(element => element === document.activeElement), "Keyboard focus did not reach right arrow");
    assert(await right.evaluate(element => element.matches(":focus-visible")), "Arrow has no focus-visible state");
    await shot("screen-arrow--focus-visible", true);
    const rightBox = await right.boundingBox();
    await page.mouse.move(rightBox.x + rightBox.width / 2, rightBox.y + rightBox.height / 2);
    await page.mouse.down();
    await shot("screen-arrow--active", true);
    await page.mouse.up();
    await page.waitForTimeout(240);
    assert(await isVisible("[data-design-id='display-scroll-left']") && await isVisible("[data-design-id='display-scroll-right']"), "Both arrows are not visible in middle position");
    const middleState = await page.locator("[data-design-id='display-tablist']").evaluate(element => ({ left: element.scrollLeft, max: element.scrollWidth - element.clientWidth }));
    assert(middleState.left > 1 && middleState.left < middleState.max - 1, `Not in middle: ${JSON.stringify(middleState)}`);
    computedEvidence.tabs[viewport.key].middle = middleState;
    await shot("screen-list--middle");

    const beforeKeyboard = middleState.left;
    const leftArrow = page.locator("[data-design-id='display-scroll-left']");
    await leftArrow.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(240);
    const afterKeyboard = await page.locator("[data-design-id='display-tablist']").evaluate(element => element.scrollLeft);
    assert(afterKeyboard < beforeKeyboard, "Keyboard activation did not scroll tabs left");
    if (await isVisible("[data-design-id='display-scroll-right']")) {
      await page.locator("[data-design-id='display-scroll-right']").focus();
      await page.keyboard.press("Space");
      await page.waitForTimeout(240);
    }
    await scrollToEdge(1);
    assert(await page.locator("[data-design-id='display-scroll-right']").isHidden(), "Right arrow is not fully hidden at right edge");
    assert(await isVisible("[data-design-id='display-scroll-left']"), "Left arrow missing at right edge");
    const rightState = await page.locator("[data-design-id='display-tablist']").evaluate(element => ({ left: element.scrollLeft, max: element.scrollWidth - element.clientWidth }));
    computedEvidence.tabs[viewport.key].right = rightState;
    await page.locator(".display-tab").last().click();
    await assertRepresentativeGraphs(2);
    await shot("screen-list--right-edge");

    for (let index = 0; index < await page.locator(".display-tab").count(); index += 1) {
      await page.locator(".display-tab").nth(index).click();
      await assertRepresentativeGraphs(2);
    }
  });

  await record(`screen-delete-${viewport.key}`, "Открыть delete confirmation крестиком; проверить cancel, close и confirm", "До confirm screen сохранён; cancel/close возвращают focus на крестик; confirm удаляет выбранный screen", async () => {
    const selectedClose = page.locator(".display-tab-shell.is-selected [data-screen-close]");
    await selectedClose.hover();
    await shot("screen-close--hover", true);
    await keyboardFocus(selectedClose);
    assert(await selectedClose.evaluate(element => element.matches(":focus-visible")), "Screen close has no focus-visible");
    await shot("screen-close--focus-visible", true);
    const before = await page.locator(".display-tab-shell").count();
    await page.keyboard.press("Enter");
    assert(await isVisible("[data-design-id='screen-delete-layer']"), "Screen delete confirmation did not open by keyboard");
    assert(await page.locator(".display-tab-shell").count() === before, "Screen was removed before confirmation");
    await shot("screen-delete-confirmation--open");
    await page.locator("[data-screen-delete-cancel]").click();
    assert(await page.locator(".display-tab-shell").count() === before, "Cancel removed screen");
    assert(await selectedClose.evaluate(element => element === document.activeElement), "Cancel did not restore focus to cross");
    await shot("screen-delete-confirmation--cancelled");
    await selectedClose.click();
    await page.locator("[data-screen-delete-close]").click();
    assert(await selectedClose.evaluate(element => element === document.activeElement), "Dialog close did not restore focus to cross");
    await selectedClose.click();
    await page.locator("[data-screen-delete-confirm]").click();
    assert(await page.locator(".display-tab-shell").count() === before - 1, "Confirm did not delete screen");
    assert(await page.locator(".display-tab[aria-selected='true']").evaluate(element => element === document.activeElement), "Confirm did not focus deterministic surviving tab");
    await shot("screen-delete-confirmation--confirmed");
  });
}

async function areaMenuAndDeleteOverlay() {
  await fresh(viewport);
  await record(`plotly-interactions-${viewport.key}`, "На package-local Plotly выполнить ЛКМ drag-zoom, double-click autoscale и Shift+ЛКМ pan", "Axis ranges подтверждают zoom, reset и pan; modebar/container отсутствуют", async () => {
    await assertRepresentativeGraphs(2);
    const host = page.locator(".plot-pane.is-active [data-plotly-ready='true']");
    const dragLayer = host.locator(".nsewdrag");
    const axisState = () => host.evaluate(element => ({
      x: element._fullLayout.xaxis.range.slice(),
      y: element._fullLayout.yaxis.range.slice(),
      dragmode: element.layout.dragmode,
      displayModeBar: element._context.displayModeBar,
      source: Array.from(document.scripts).map(script => script.src).find(src => src.includes("plotly-cartesian-3.1.0.min.js")) || null
    }));
    const span = range => Math.abs(range[1] - range[0]);
    const initial = await axisState();
    assert(initial.displayModeBar === false && initial.source && initial.source.startsWith("file:"), `Plotly source/config invalid: ${JSON.stringify(initial)}`);
    const box = await dragLayer.boundingBox();
    assert(box && box.width > 120 && box.height > 80, `Plotly drag layer is not operable: ${JSON.stringify(box)}`);
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2);
    await page.mouse.down({ button: "left" });
    await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.76, { steps: 8 });
    await page.mouse.up({ button: "left" });
    await page.waitForTimeout(220);
    const zoomed = await axisState();
    assert(span(zoomed.x) < span(initial.x) * 0.75 && span(zoomed.y) < span(initial.y) * 0.75, `LMB drag did not zoom: ${JSON.stringify({ initial, zoomed })}`);
    await shot("plotly--lmb-drag-zoom");

    await page.mouse.dblclick(box.x + box.width * 0.5, box.y + box.height * 0.55, { button: "left", delay: 70 });
    await page.waitForTimeout(340);
    const reset = await axisState();
    assert(Math.abs(span(reset.x) - span(initial.x)) < span(initial.x) * 0.03, `Double-click did not reset/autoscale X: ${JSON.stringify({ initial, reset })}`);
    assert(Math.abs(span(reset.y) - span(initial.y)) < span(initial.y) * 0.03, `Double-click did not reset/autoscale Y: ${JSON.stringify({ initial, reset })}`);
    await shot("plotly--double-click-autoscale");

    await page.keyboard.down("Shift");
    await page.waitForTimeout(80);
    assert((await axisState()).dragmode === "zoom", "Default Plotly dragmode changed before native Shift-pan");
    await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.58);
    await page.mouse.down({ button: "left" });
    await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.58, { steps: 8 });
    await page.mouse.up({ button: "left" });
    await page.keyboard.up("Shift");
    await page.waitForTimeout(220);
    const panned = await axisState();
    assert(panned.dragmode === "zoom", "Shift release did not restore default zoom mode");
    assert(Math.abs(span(panned.x) - span(reset.x)) < span(reset.x) * 0.03, `Shift+LMB changed span instead of panning: ${JSON.stringify({ reset, panned })}`);
    assert(Math.abs(panned.x[0] - reset.x[0]) > span(reset.x) * 0.03, `Shift+LMB did not translate X range: ${JSON.stringify({ reset, panned })}`);
    await shot("plotly--shift-lmb-pan");
    assert(await page.locator(".modebar, .modebar-container").count() === 0, "Modebar or empty container appeared after interactions");
    assert(!(await page.locator("body").innerText()).includes("Double-click to zoom back out"), "Plotly emitted a non-localized built-in tip");
    computedEvidence.plotly_interactions[viewport.key] = { initial, zoomed, reset, panned };
  });

  for (let index = 0; index < 2; index += 1) await page.locator("[data-design-id='display-add']").click();
  await record(`area-menu-help-${viewport.key}`, "Открыть ellipsis, затем Управление графиком", "Один menu содержит clear/help; новый help layer не меняет ни один graph bounding box; focus возвращается", async () => {
    const trigger = page.locator(".plot-pane.is-active [data-plot-menu-trigger]");
    await trigger.click();
    const menu = page.locator("[data-design-id='plot-menu']");
    assert(await menu.locator("button").count() === 2, "Pane menu does not contain exactly two actions");
    assert((await menu.innerText()).includes("Очистить область") && (await menu.innerText()).includes("Управление графиком"), "Pane menu copy is incomplete");
    assert(await page.locator("[data-plot-clear-context], .plot-context-clear").count() === 0, "External clear action is present");
    await menu.locator("[data-plot-clear]").hover();
    await shot("area-menu--clear-hover", true);
    await keyboardFocus(menu.locator("[data-plot-help]"));
    await shot("area-menu--graph-help-focus", true);
    const before = await graphGeometry();
    await menu.locator("[data-plot-help]").click();
    const help = page.locator("[data-design-id='graph-help']");
    assert(await help.isVisible(), "Graph help did not open");
    const expectedCopy = ["Перетаскивать график: Shift + ЛКМ", "Автомасштабирование: двойной клик", "Зум: зажать ЛКМ и выделить область"];
    const actualCopy = await help.locator(".graph-help-copy span").allTextContents();
    assert(JSON.stringify(actualCopy) === JSON.stringify(expectedCopy), `Graph help copy changed: ${JSON.stringify(actualCopy)}`);
    const open = await graphGeometry();
    assert(JSON.stringify(before) === JSON.stringify(open), `Graph geometry shifted on help open: ${JSON.stringify({ before, open })}`);
    await assertNoLegendCollision();
    computedEvidence.graph_help_geometry[viewport.key] = { before, open };
    await shot("overlay-area-menu-graph-help--top");
    await page.keyboard.press("Escape");
    const closed = await graphGeometry();
    assert(JSON.stringify(before) === JSON.stringify(closed), "Graph geometry shifted on help close");
    assert(await menu.locator("[data-plot-help]").evaluate(element => element === document.activeElement), "Graph help close did not restore focus to menu action");
    computedEvidence.graph_help_geometry[viewport.key].closed = closed;
    await shot("overlay-area-menu-graph-help--after-close");
    await page.keyboard.press("Escape");
    assert(await trigger.evaluate(element => element === document.activeElement), "Menu close did not restore focus to ellipsis");
  });

  await record(`delete-over-pane-help-${viewport.key}`, "Оставить pane menu/help открытыми и активировать screen cross", "Delete confirmation становится focus/pointer owner поверх stale menu/help; cancel сохраняет screen и возвращает focus", async () => {
    const trigger = page.locator(".plot-pane.is-active [data-plot-menu-trigger]");
    await trigger.click();
    await page.locator("[data-design-id='plot-menu'] [data-plot-help]").click();
    const close = page.locator(".display-tab-shell.is-selected [data-screen-close]");
    const count = await page.locator(".display-tab-shell").count();
    await close.click();
    assert(await isVisible("[data-design-id='screen-delete-layer']"), "Screen confirmation not open");
    assert(await isVisible("[data-design-id='plot-menu']") && await isVisible("[data-design-id='graph-help']"), "Underlying menu/help did not remain observable");
    assert(await page.locator("[data-design-id='plot-menu']").evaluate(element => element.classList.contains("is-stale") && element.inert), "Pane menu is not stale/inert");
    assert(await page.locator("[data-design-id='graph-help']").evaluate(element => element.classList.contains("is-stale") && element.inert), "Graph help is not stale/inert");
    const z = await page.evaluate(() => ({
      menu: Number(getComputedStyle(document.querySelector("[data-design-id='plot-menu']")).zIndex),
      help: Number(getComputedStyle(document.querySelector("[data-design-id='graph-help']")).zIndex),
      confirmation: Number(getComputedStyle(document.querySelector("[data-design-id='screen-delete-layer']")).zIndex)
    }));
    assert(z.confirmation > z.help && z.help > z.menu, `Invalid overlay order: ${JSON.stringify(z)}`);
    assert(await page.locator(".display-tab-shell").count() === count, "Screen deleted before confirmation");
    await shot("overlay-screen-delete-pane-help--top");
    await page.locator("[data-screen-delete-cancel]").click();
    assert(await page.locator(".display-tab-shell").count() === count, "Cancel deleted screen");
    assert(await close.evaluate(element => element === document.activeElement), "Cancel did not restore focus to screen cross");
    assert(await page.locator("[data-design-id='plot-menu']").isHidden() && await page.locator("[data-design-id='graph-help']").isHidden(), "Stale underlying overlays were not dismissed after cancel");
    await shot("overlay-screen-delete-pane-help--after-close");
  });

  await record(`clear-area-menu-${viewport.key}`, "Активировать Очистить область в общем ellipsis menu", "Открывается confirmation; cancel возвращает focus на ellipsis", async () => {
    const trigger = page.locator(".plot-pane.is-active [data-plot-menu-trigger]");
    await trigger.click();
    await keyboardFocus(page.locator("[data-design-id='plot-menu'] [data-plot-clear]"));
    assert(await page.locator("[data-design-id='plot-menu'] [data-plot-clear]").evaluate(element => element.matches(":focus-visible")), "Clear menu item has no focus-visible");
    await page.locator("[data-design-id='plot-menu'] [data-plot-clear]").click();
    assert(await isVisible("[data-design-id='nested-confirm-layer']"), "Clear confirmation missing");
    await shot("active-area-context-action--confirmation");
    await page.locator("[data-confirm-stay]").click();
    assert(await trigger.evaluate(element => element === document.activeElement), "Clear cancel did not restore focus to ellipsis");
  });
}

async function settingsMatrixAndStates() {
  await fresh(viewport);
  await record(`settings-matrix-${viewport.key}`, "Для четырёх plot types прокликать три settings pages", "Все 12 combinations детализированы; Display plot type — первая строка; pane/settings selectors синхронны", async () => {
    computedEvidence.settings_matrix[viewport.key] = {};
    for (const type of plotTypes) {
      await chooseSelect("plot-type-pane-time", type);
      computedEvidence.settings_matrix[viewport.key][type] = {};
      for (const settingsPage of settingsPages) {
        await page.locator(`[data-settings-page="${settingsPage}"]`).click();
        const groups = await page.locator(".settings-group").count();
        const fields = await page.locator(".settings-field-row").count();
        assert(groups > 0 && fields > 0, `Empty settings ${settingsPage}/${type}`);
        if (settingsPage === "display") {
          assert(await page.locator(".settings-field-row").first().getAttribute("data-design-id") === "settings-field-display.plot_type", `Plot type is not first for ${type}`);
        }
        computedEvidence.settings_matrix[viewport.key][type][settingsPage] = { groups, fields };
        await assertRepresentativeGraphs(2);
        await shot(`settings--${settingsPage}--${type}`);
      }
    }
    await page.locator("[data-settings-page='display']").click();
    await chooseSelect("field-display.plot_type", "spectrum");
    assert((await page.locator("[data-design-id='plot-type-pane-time'] span").innerText()) === "Спектр", "Settings → pane synchronization failed");
    await chooseSelect("plot-type-pane-time", "time");
    assert((await page.locator("[data-design-id='field-display.plot_type'] span").innerText()) === "Временная область", "Pane → settings synchronization failed");
  });

  await record(`dropdown-checkbox-states-${viewport.key}`, "Прокликать canonical dropdown и ordinary checkbox states", "28px pane cluster центрирован; 34px options не переносятся; default/hover/pressed/selected/focus/disabled и canonical marks точны", async () => {
    await page.locator("[data-settings-page='display']").click();
    const trigger = page.locator("[data-design-id='plot-type-pane-time']");
    const clusterGeometry = await trigger.evaluate(element => {
      const header = element.closest(".plot-pane-header").getBoundingClientRect();
      const cluster = element.closest(".plot-control-cluster").getBoundingClientRect();
      const chevron = getComputedStyle(element, "::after");
      return { topInset: cluster.top - header.top, bottomInset: header.bottom - cluster.bottom, headerHeight: header.height, clusterHeight: cluster.height, chevronTop: chevron.top, chevronTransform: chevron.transform };
    });
    assert(clusterGeometry.headerHeight === 32 && clusterGeometry.clusterHeight === 28 && clusterGeometry.topInset === 2 && clusterGeometry.bottomInset === 2, `Pane cluster is not vertically symmetric: ${JSON.stringify(clusterGeometry)}`);
    assert(clusterGeometry.chevronTop === "14px" && clusterGeometry.chevronTransform.includes("-8"), `Chevron is not vertically centered: ${JSON.stringify(clusterGeometry)}`);
    await trigger.click();
    const options = page.locator("[data-design-id='select-menu'] [data-option-value]");
    const optionMetrics = await options.evaluateAll(elements => elements.map(element => {
      const style = getComputedStyle(element);
      const label = element.querySelector(".select-option-label");
      const mark = element.querySelector(".select-option-check").getBoundingClientRect();
      return { height: element.getBoundingClientRect().height, padding: style.padding, fontSize: style.fontSize, fontWeight: style.fontWeight, lineHeight: style.lineHeight, wrap: label.scrollHeight > label.clientHeight, clipped: label.scrollWidth > label.clientWidth, mark: { width: mark.width, height: mark.height } };
    }));
    assert(optionMetrics.every(item => item.height === 34 && item.padding === "6px 12px" && item.fontSize === "14px" && item.fontWeight === "400" && item.lineHeight === "20px" && !item.wrap && !item.clipped && item.mark.width === 16 && item.mark.height === 16), `Dropdown analytical-dense metrics failed: ${JSON.stringify(optionMetrics)}`);
    const selected = options.filter({ has: page.locator(".select-option-label", { hasText: "Временная область" }) });
    const spectrum = page.locator("[data-design-id='select-menu'] [data-option-value='spectrum']");
    const defaultStyles = await page.evaluate(() => {
      const menu = document.querySelector("[data-design-id='select-menu']");
      const ordinary = menu.querySelector("[data-option-value='spectrum']");
      const selectedOption = menu.querySelector(".is-selected");
      return { ordinaryBackground: getComputedStyle(ordinary).backgroundColor, selectedBackground: getComputedStyle(selectedOption).backgroundColor, selectedMarkOpacity: getComputedStyle(selectedOption.querySelector(".select-option-check")).opacity };
    });
    assert(defaultStyles.selectedMarkOpacity === "1", "Selected option mark is not visible");
    await shot("dropdown--default-selected");
    await spectrum.hover();
    const hoverBackground = await spectrum.evaluate(element => getComputedStyle(element).backgroundColor);
    await shot("dropdown--hover", true);
    await keyboardFocus(spectrum);
    assert(await spectrum.evaluate(element => element.matches(":focus-visible")), "Dropdown option lacks focus-visible");
    await shot("dropdown--focus-visible", true);
    const optionBox = await spectrum.boundingBox();
    await page.mouse.move(optionBox.x + optionBox.width / 2, optionBox.y + optionBox.height / 2);
    await page.mouse.down();
    const pressedBackground = await spectrum.evaluate(element => getComputedStyle(element).backgroundColor);
    await shot("dropdown--pressed", true);
    await page.mouse.up();
    await page.evaluate(() => window.__TASK0057_DESIGN__.waitForPlots());

    const frequencyScale = page.locator("[data-design-id='field-spectrum.frequency_scale']");
    await frequencyScale.click();
    const disabledOption = page.locator("[data-design-id='select-menu'] [data-option-value='log']");
    assert(await disabledOption.isDisabled(), "Disabled dropdown option missing");
    const disabledOptionStyle = await disabledOption.evaluate(element => ({ opacity: getComputedStyle(element).opacity, cursor: getComputedStyle(element).cursor, height: element.getBoundingClientRect().height }));
    assert(disabledOptionStyle.opacity === "0.72" && disabledOptionStyle.height === 34, `Disabled option metrics failed: ${JSON.stringify(disabledOptionStyle)}`);
    await shot("dropdown--disabled-option");
    await page.keyboard.press("Escape");

    await page.locator("[data-design-id='settings-apply']").click();
    const disabledTrigger = page.locator("[data-design-id='field-display.plot_type']");
    assert(await disabledTrigger.isDisabled(), "Busy state did not disable dropdown trigger");
    await shot("dropdown-trigger--disabled");
    await page.waitForTimeout(940);

    await chooseSelect("plot-type-pane-time", "time");
    await page.locator("[data-settings-page='measurements']").click();
    const checked = page.locator("[data-field-checkbox='measurement.minimum']");
    const checkboxMark = await checked.evaluate(element => ({
      size: element.getBoundingClientRect().width,
      radius: getComputedStyle(element).borderRadius,
      background: getComputedStyle(element).backgroundColor,
      pseudoClip: getComputedStyle(element, "::after").clipPath
    }));
    assert(checkboxMark.size === 16 && checkboxMark.radius === "2px" && checkboxMark.pseudoClip !== "none", `Canonical checkbox mark failed: ${JSON.stringify(checkboxMark)}`);
    await checked.hover();
    await shot("checkbox--canonical-checked", true);
    await keyboardFocus(checked);
    await shot("checkbox--canonical-focus-visible", true);
    computedEvidence.dropdown_states[viewport.key] = { clusterGeometry, optionMetrics, defaultStyles, hoverBackground, pressedBackground, disabledOptionStyle, checkboxMark };
  });

  await record(`primary-button-states-${viewport.key}`, "Проверить hover/focus/active Применить", "32px primary target сохраняет geometry во всех states", async () => {
    const button = page.locator("[data-design-id='settings-apply']");
    const rest = await button.boundingBox();
    await button.hover();
    assert(JSON.stringify(rest) === JSON.stringify(await button.boundingBox()), "Primary hover shifted geometry");
    await shot("button-primary--hover", true);
    await keyboardFocus(button);
    assert(await button.evaluate(element => element.matches(":focus-visible")), "Primary button has no focus-visible");
    await shot("control--focus-visible", true);
    const box = await button.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    assert(JSON.stringify(rest) === JSON.stringify(await button.boundingBox()), "Primary active shifted geometry");
    await shot("button-primary--pressed", true);
    await page.mouse.up();
  });
}

async function tableStates() {
  await fresh(viewport);
  await record(`table-swatches-${viewport.key}`, "Прокликать borderless color swatches", "Нет visible text/border/outline; tooltip/accessible name сохранены; hover/focus/selected без layout shift", async () => {
    const swatches = page.locator("[data-color-swatch]");
    assert(await swatches.count() === 4, "Expected four swatches");
    const baseBoxes = await swatches.evaluateAll(elements => elements.map(element => element.getBoundingClientRect().toJSON()));
    const dark = page.locator("[data-color-swatch='echoComplex']");
    await dark.hover();
    await shot("table-color-swatch--hover-borderless", true);
    await keyboardFocus(dark);
    assert(await dark.evaluate(element => {
      const style = getComputedStyle(element);
      return style.borderWidth === "0px" && style.outlineWidth === "0px" && element.matches(":focus-visible");
    }), "Focused dark swatch gained border/outline or lacks focus-visible semantics");
    await shot("table-color-swatch--focus-borderless", true);
    const light = page.locator("[data-color-swatch='referenceWave']");
    await light.click();
    assert(await page.locator("[data-signal-row='referenceWave']").evaluate(element => element.classList.contains("is-selected")), "Swatch did not select row");
    const afterBoxes = await swatches.evaluateAll(elements => elements.map(element => element.getBoundingClientRect().toJSON()));
    assert(JSON.stringify(baseBoxes) === JSON.stringify(afterBoxes), "Swatch interaction changed layout boxes");
    await shot("table-color-swatch--selected-borderless");
  });

  await record(`table-inline-actions-${viewport.key}`, "Проверить resting/hover/focus/active/disabled inline actions", "Actions находятся в последней content cell; Info/action column отсутствуют; reveal не меняет geometry", async () => {
    const row = page.locator("[data-signal-row='radarPulse']");
    const geometry = await row.evaluate(element => ({ row: element.getBoundingClientRect().toJSON(), cells: Array.from(element.cells).map(cell => cell.getBoundingClientRect().toJSON()) }));
    assert(await page.locator(".signal-row-actions").first().evaluate(element => getComputedStyle(element).opacity) === "0", "Actions visible at rest");
    assert(await page.locator("th").evaluateAll(elements => elements.every(element => !/действ/i.test(element.textContent))), "Separate action column exists");
    assert(!(await page.locator("body").innerText()).match(/\bInfo\b|Инфо|Информация/i), "Info action returned");
    await row.hover();
    await page.waitForTimeout(160);
    assert(await row.locator(".signal-row-actions").evaluate(element => getComputedStyle(element).opacity) === "1", "Hover did not reveal actions");
    assert(JSON.stringify(geometry) === JSON.stringify(await row.evaluate(element => ({ row: element.getBoundingClientRect().toJSON(), cells: Array.from(element.cells).map(cell => cell.getBoundingClientRect().toJSON()) }))), "Hover shifted table geometry");
    await shot("table-row-actions--hover", true);
    const duplicate = row.locator("[data-signal-row-action='duplicate']");
    await keyboardFocus(duplicate);
    assert(await duplicate.evaluate(element => element.matches(":focus-visible")), "Inline action has no focus-visible");
    await shot("table-row-actions--focus-visible", true);
    const actionBox = await duplicate.boundingBox();
    await page.mouse.move(actionBox.x + actionBox.width / 2, actionBox.y + actionBox.height / 2);
    await page.mouse.down();
    await shot("table-row-actions--active", true);
    await page.mouse.up();
    assert(await row.locator("[data-signal-row-action]:disabled").count() === 2, "Busy actions not disabled together");
    await shot("table-row-actions--disabled", true);
    await page.waitForTimeout(560);
    assert(await page.locator("[data-signal-row='radarPulse_copy']").count() === 1, "Duplicate action did not execute");
    const longHost = page.locator("[data-signal-row='noiseFloor'] td.is-actions-host");
    assert(await longHost.count() === 1 && await longHost.locator(".signal-row-actions").count() === 1, "Actions are not inside last content cell");
    assert(await longHost.locator(".signal-cell-value").evaluate(element => element.scrollWidth > element.clientWidth), "Long last-cell case does not overflow/ellipsize");
    await longHost.hover();
    await shot("table--long-last-cell", true);
  });
}

async function overlayCombinations() {
  await fresh(viewport);
  await record(`blocking-stale-${viewport.key}`, "Открыть settings dropdown и tooltip, затем прямой Add signal dialog", "Blocking dialog owns focus above stale dropdown/tooltip; close restores Signals +", async () => {
    await page.locator("[data-settings-page='display']").click();
    await page.locator("[data-design-id='field-display.plot_type']").click();
    const add = page.locator("[data-design-id='signals-add']");
    await add.hover();
    assert(await isVisible("[data-design-id='tooltip']"), "Tooltip did not open");
    await add.click();
    assert(await isVisible("[data-design-id='add-dialog-layer']"), "Main dialog did not open directly");
    assert(await isVisible("[data-design-id='select-menu']"), "Stale dropdown is not observable under dialog");
    assert(await page.locator("[data-design-id='select-menu']").evaluate(element => element.classList.contains("is-stale") && element.inert), "Dropdown is not stale/inert");
    assert(await page.locator("#add-dialog-title").evaluate(element => element === document.activeElement), "Dialog does not own focus");
    await shot("overlay-blocking-stale-dropdown-tooltip--top");
    await page.locator("[data-add-cancel]").click();
    assert(await add.evaluate(element => element === document.activeElement), "Main dialog close did not restore focus to Signals +");
    assert(await page.locator("[data-design-id='select-menu']").isHidden(), "Stale dropdown remained after close");
    await shot("overlay-blocking-stale-dropdown-tooltip--after-close");
  });

  await fresh(viewport);
  await record(`passive-toast-dialog-${viewport.key}`, "Получить success toast через Duplicate, затем открыть Add dialog", "Toast остаётся passive под modal controls; после close видим и не получает focus", async () => {
    const row = page.locator("[data-signal-row='radarPulse']");
    await row.hover();
    await row.locator("[data-signal-row-action='duplicate']").click();
    await page.waitForTimeout(560);
    assert(await isVisible("[data-design-id='success-toast']"), "Success toast missing");
    await page.locator("[data-design-id='signals-add']").click();
    const order = await page.evaluate(() => ({ toast: Number(getComputedStyle(document.querySelector("[data-design-id='success-toast']")).zIndex), modal: Number(getComputedStyle(document.querySelector("[data-design-id='add-dialog-layer']")).zIndex) }));
    assert(order.modal > order.toast, `Toast eclipses modal: ${JSON.stringify(order)}`);
    await shot("overlay-passive-toast-active-dialog--top");
    await page.locator("[data-add-cancel]").click();
    assert(await isVisible("[data-design-id='success-toast']"), "Passive toast disappeared with dialog");
    await shot("overlay-passive-toast-active-dialog--after-close");
  });

  await fresh(viewport);
  await record(`nested-confirm-${viewport.key}`, "Открыть Add, изменить выбор и закрыть", "Nested dirty confirmation traps focus above main dialog; cancel restores close control", async () => {
    await page.locator("[data-design-id='signals-add']").click();
    await page.locator("[data-dialog-signal]").first().check();
    await page.locator("[data-add-close]").click();
    assert(await isVisible("[data-design-id='nested-confirm-layer']"), "Nested confirmation missing");
    await shot("overlay-nested-confirm--top");
    await page.locator("[data-confirm-stay]").click();
    assert(await page.locator("[data-add-close]").evaluate(element => element === document.activeElement), "Nested cancel did not restore main close focus");
    await shot("overlay-nested-confirm--after-close");
    await page.locator("[data-add-cancel]").click();
    await page.locator("[data-confirm-leave]").click();
  });

  await fresh(viewport);
  await record(`inspector-menu-${viewport.key}`, "Открыть Signals ellipsis, focus/tooltip и toggle column", "Eye/eye-off icons используются вместо checkmarks; focus возвращается на ellipsis", async () => {
    const trigger = page.locator("[data-design-id='signals-overflow']");
    await trigger.click();
    assert(await page.locator("[data-design-id='inspector-menu'] [data-column-id='name']").count() === 0, "Always-visible Имя exposes a hide action/state");
    assert(await page.locator(".signal-table th").filter({ hasText: "Имя" }).count() === 1, "Always-visible Имя is absent from table");
    const first = page.locator("[data-design-id='inspector-menu'] [data-column-id]").first();
    await first.hover();
    assert(await page.locator("[data-design-id='inspector-menu'] img").count() > 0, "Column menu lacks eye icons");
    assert(await page.locator("[data-design-id='inspector-menu'] img[src*='eye']").count() === await page.locator("[data-design-id='inspector-menu'] [data-column-id]").count(), "Column menu uses non-eye indicators");
    assert(await page.locator("[data-design-id='inspector-menu'] [data-column-id]").evaluateAll(elements => elements.every(element => element.getBoundingClientRect().height === 28)), "Column menu items are not exact 28px analytical rows");
    await shot("overlay-inspector-menu-tooltip--top", true);
    await first.click();
    await page.keyboard.press("Escape");
    assert(await trigger.evaluate(element => element === document.activeElement), "Inspector menu did not restore focus");
    await shot("overlay-inspector-menu-tooltip--after-close");
  });
}

async function extendedStates1440() {
  viewport = viewports[0];
  await fresh(viewport);
  await record("validation-error-1440x900", "На странице Время задать min ≥ max и применить", "Inline error и plot error доступны без пустого graph placeholder", async () => {
    await page.locator("[data-settings-page='time']").click();
    const minimum = page.locator("[data-range-field='time.x_limits'][data-range-index='0']");
    const maximum = page.locator("[data-range-field='time.x_limits'][data-range-index='1']");
    await minimum.fill("2");
    await maximum.fill("1");
    await maximum.blur();
    await page.locator("[data-design-id='settings-apply']").click();
    assert(await page.locator(".settings-field-row.has-error").count() > 0, "Validation error missing");
    assert(await page.locator(".plot-state-overlay.is-error").count() === 1, "Plot error state missing");
    await assertRepresentativeGraphs(2);
    await shot("state--error");
  });

  await fresh(viewport);
  await record("loading-success-1440x900", "Нажать Применить и дождаться завершения", "Loading сохраняет graph; success даёт passive toast", async () => {
    await page.locator("[data-design-id='settings-apply']").click();
    assert(await page.locator(".plot-state-overlay .spinner").count() === 1, "Loading state missing");
    await assertRepresentativeGraphs(2);
    await shot("state--loading");
    await page.waitForTimeout(940);
    assert(await isVisible("[data-design-id='success-toast']"), "Success toast missing");
    await shot("state--success");
  });

  await fresh(viewport);
  await record("empty-1440x900", "Через pane ellipsis подтвердить Очистить область", "Empty overlay появляется поверх сохранённого representative graph", async () => {
    await page.locator(".plot-pane.is-active [data-plot-menu-trigger]").click();
    await page.locator("[data-plot-clear]").click();
    await page.locator("[data-confirm-leave]").click();
    assert(await page.locator(".plot-state-overlay").filter({ hasText: "Нет видимых сигналов" }).count() === 1, "Empty state missing");
    await assertRepresentativeGraphs(2);
    await shot("state--empty");
  });

  await fresh(viewport);
  await record("layout-10x10-1440x900", "Реально выбрать 10 rows и 10 columns, затем применить", "Non-blocking warning видим; Apply остаётся доступным; все 100 panes имеют axes/traces/legend", async () => {
    await page.locator("[data-design-id='layout-trigger']").click();
    await page.locator("[data-layout-rows] [data-layout-value='10']").click();
    await page.locator("[data-layout-columns] [data-layout-value='10']").click();
    assert(await isVisible("[data-layout-warning]"), "Large-layout warning missing");
    assert(!(await page.locator("[data-layout-apply]").isDisabled()), "Warning blocks Apply");
    await shot("layout--10x10-warning");
    await page.locator("[data-layout-apply]").click();
    await assertRepresentativeGraphs(100);
    await shot("layout--10x10-applied");
  });
}

(async () => {
  fs.mkdirSync(screenshotDir, { recursive: true });
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
  for (const filename of fs.readdirSync(screenshotDir)) {
    if (filename.endsWith(".png")) fs.unlinkSync(path.join(screenshotDir, filename));
  }
  browser = await chromium.launch({ executablePath: chromePath, headless: true });
  try {
    for (const item of viewports) {
      viewport = item;
      await baselineAndScreenNavigation();
      await areaMenuAndDeleteOverlay();
      await settingsMatrixAndStates();
      await tableStates();
      await overlayCombinations();
    }
    await extendedStates1440();
    assert(browserErrors.length === 0, `Browser errors: ${JSON.stringify(browserErrors)}`);
    const evidence = {
      role: "Designer",
      task: ["TASK-0057", "TASK-0067"],
      design_version: 2,
      status: "pass",
      generated_at: new Date().toISOString(),
      entry: "prototype/index.html",
      viewports: viewports.map(item => item.key),
      interaction_count: records.length,
      screenshot_count: screenshots.length,
      interactions: records,
      screenshots,
      computed_evidence: computedEvidence,
      browser_errors: browserErrors
    };
    fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + "\n");
    process.stdout.write(JSON.stringify({ status: evidence.status, interaction_count: evidence.interaction_count, screenshot_count: evidence.screenshot_count }, null, 2));
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
})().catch(error => {
  const evidence = {
    role: "Designer",
    task: ["TASK-0057", "TASK-0067"],
    design_version: 2,
    status: "fail",
    generated_at: new Date().toISOString(),
    interactions: records,
    screenshots,
    computed_evidence: computedEvidence,
    browser_errors: browserErrors,
    error: error.stack || error.message
  };
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + "\n");
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
