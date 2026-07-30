"use strict";

const { DEFAULT_TIMEOUT, testIdSelector, waitForAppReady } = require("./app_page");

const VIEW_TIMEOUT = 30000;

function signalConfig(config) {
  if (!config || !config.app || !config.app.testIds) {
    throw new Error("Signal Analyser E2E configuration is incomplete");
  }
  return config.app;
}

function testIds(config) {
  return signalConfig(config).testIds;
}

function namedTestId(config, name) {
  const id = testIds(config)[name];
  if (typeof id !== "string") {
    throw new Error(`Missing Signal Analyser test id: ${name}`);
  }
  return id;
}

function cardTestId(config, plot) {
  const id = testIds(config).plotCards[plot];
  if (typeof id !== "string") {
    throw new Error(`Missing Signal Analyser plot-card test id: ${plot}`);
  }
  return id;
}

function cardLocator(page, config, plot) {
  return page.locator(testIdSelector(cardTestId(config, plot)));
}

function signalRows(page, config) {
  return page.locator(`[data-testid^=${JSON.stringify(testIds(config).signalRowPrefix)}]`);
}

function activePlotFields(page, config) {
  return page.locator(`[data-testid^=${JSON.stringify(testIds(config).activePlotFieldPrefix)}]`);
}

function plotHost(card) {
  return card.locator(".js-plotly-plot");
}

function endpointMatches(response, endpoint, method) {
  try {
    const url = new URL(response.url());
    return response.request().method() === method && url.pathname === endpoint;
  } catch (_error) {
    return response.request().method() === method && response.url().includes(endpoint);
  }
}

function waitForApi(page, config, endpoint, method) {
  return page.waitForResponse(function (response) {
    return endpointMatches(response, endpoint, method);
  }, { timeout: VIEW_TIMEOUT });
}

async function assertOkResponse(response, label) {
  if (!response.ok()) {
    let body = "";
    try {
      body = (await response.text()).slice(0, 600);
    } catch (_error) {
      body = "<response body unavailable>";
    }
    throw new Error(`${label} failed: HTTP ${response.status()} ${body}`);
  }
}

async function waitForSettled(page, config) {
  await waitForAppReady(page, config, { timeout: VIEW_TIMEOUT });
  const error = page.locator(testIdSelector(signalConfig(config).errorTestId));
  if (await error.count() && await error.isVisible()) {
    throw new Error(`Application error is visible: ${(await error.innerText()).slice(0, 600)}`);
  }
}

async function clickAndWaitForView(page, config, locator, log, label) {
  const responsePromise = waitForApi(page, config, signalConfig(config).api.view, "POST");
  await locator.click({ timeout: VIEW_TIMEOUT });
  const response = await responsePromise;
  await assertOkResponse(response, `${label} /api/view`);
  await waitForSettled(page, config);
  log(`${label}: POST /api/view ${response.status()}`);
  return response;
}

async function boxSignature(locator) {
  const box = await locator.boundingBox();
  if (!box) return null;
  return {
    height: Math.round(box.height),
    width: Math.round(box.width),
    x: Math.round(box.x),
    y: Math.round(box.y),
  };
}

async function plotSignature(card) {
  const host = plotHost(card);
  await host.waitFor({ state: "visible", timeout: VIEW_TIMEOUT });
  return host.evaluate(function (element) {
    const traces = Array.isArray(element.data) ? element.data :
      (Array.isArray(element._fullData) ? element._fullData : []);
    const layout = element._fullLayout || element.layout || {};
    return {
      colorbar: traces.some(function (trace) {
        return Boolean(trace.colorbar) || Boolean(trace.marker && trace.marker.colorbar);
      }),
      dimensions: traces.map(function (trace) {
        const x = Array.isArray(trace.x) ? trace.x.filter(Number.isFinite) : [];
        const y = Array.isArray(trace.y) ? trace.y.filter(Number.isFinite) : [];
        const z = Array.isArray(trace.z) ? trace.z : [];
        const zValues = z.flat().filter(Number.isFinite);
        return {
          mode: trace.mode || "",
          type: trace.type || "scatter",
          x: x.length,
          xMax: x.length ? Math.max(...x) : null,
          xMin: x.length ? Math.min(...x) : null,
          y: y.length,
          yMax: y.length ? Math.max(...y) : null,
          yMin: y.length ? Math.min(...y) : null,
          z: z.length,
          zMax: zValues.length ? Math.max(...zValues) : null,
          zMin: zValues.length ? Math.min(...zValues) : null,
          zRowLengths: z.filter(Array.isArray).map(function (row) { return row.length; }),
          zRows: z.filter(Array.isArray).length,
          zmax: Number.isFinite(trace.zmax) ? trace.zmax : null,
          zmin: Number.isFinite(trace.zmin) ? trace.zmin : null,
        };
      }),
      layout: {
        xaxisRange: layout.xaxis && layout.xaxis.range,
        xaxisTitle: layout.xaxis && layout.xaxis.title && layout.xaxis.title.text,
      },
      traceCount: traces.length,
      types: traces.map(function (trace) { return trace.type || "scatter"; }),
    };
  });
}

async function selectedRowId(page, config) {
  const states = signalConfig(config).selectedState;
  const rows = signalRows(page, config);
  const selected = await rows.evaluateAll(function (elements, stateNames) {
    const chosen = elements.filter(function (element) {
      return stateNames.some(function (name) {
        return element.getAttribute(name) === "true";
      });
    });
    if (chosen.length !== 1) return { count: chosen.length, id: "" };
    return { count: chosen.length, id: chosen[0].getAttribute("data-testid") || "" };
  }, states);
  if (selected.count !== 1) {
    throw new Error(`Expected exactly one selected signal row, observed ${selected.count}`);
  }
  return selected.id;
}

async function activeCardIds(page, config) {
  const appConfig = signalConfig(config);
  const states = appConfig.activeState;
  const activeClass = appConfig.activeClass;
  const cardIds = Object.values(testIds(config).plotCards);
  return page.locator("[data-testid^='plot-card-']").evaluateAll(function (elements, options) {
    return elements.filter(function (element) {
      const stateIsActive = options.states.some(function (name) {
        return element.getAttribute(name) === "true";
      });
      return options.cardIds.includes(element.getAttribute("data-testid")) &&
        (stateIsActive || element.classList.contains(options.activeClass));
    }).map(function (element) {
      return element.getAttribute("data-testid");
    });
  }, { activeClass, cardIds, states });
}

async function activePanelState(page, config) {
  const ids = testIds(config);
  const panel = page.locator(testIdSelector(ids.activePlotPanel));
  const title = page.locator(testIdSelector(ids.activePlotTitle));
  await panel.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT });
  return {
    activeCards: await activeCardIds(page, config),
    fields: await activePlotFields(page, config).evaluateAll(function (elements) {
      return elements.map(function (element) {
        return {
          id: element.getAttribute("data-testid"),
          text: (element.textContent || "").trim(),
          value: "value" in element ? String(element.value) : "",
        };
      });
    }),
    title: (await title.innerText()).trim(),
  };
}

async function logDiagnosticState(page, config, log, label) {
  const state = {
    activeCards: await activeCardIds(page, config),
    activePanel: await activePanelState(page, config),
    selectedRow: await selectedRowId(page, config),
    url: page.url(),
  };
  log(`${label}: ${JSON.stringify(state)}`);
}

module.exports = {
  VIEW_TIMEOUT,
  activeCardIds,
  activePanelState,
  boxSignature,
  cardLocator,
  cardTestId,
  clickAndWaitForView,
  logDiagnosticState,
  namedTestId,
  plotHost,
  plotSignature,
  selectedRowId,
  signalRows,
  testIds,
  waitForApi,
  waitForSettled,
};
