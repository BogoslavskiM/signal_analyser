"use strict";

const { DEFAULT_TIMEOUT, testIdSelector, waitForAppReady } = require("./app_page");

const VIEW_TIMEOUT = 30000;
const PLOTS = ["time", "spectrum", "spectrogram", "persistence"];
function performanceLog(log, label, elapsedMs, warningMs, outcome) {
  const emit = typeof log === "function" ? log : console.log;
  const hasWarning = Number.isFinite(warningMs);
  const status = hasWarning && elapsedMs > warningMs ? "PERF_BUDGET_EXCEEDED" : "PERF";
  const warning = hasWarning ? `; warning ${warningMs}ms` : "";
  emit(`${status} ${label}: ${elapsedMs}ms (${outcome || "ok"}${warning})`);
  return elapsedMs;
}

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

function visibilityCheckboxes(page, config) {
  return page.locator(`[data-testid^=${JSON.stringify(testIds(config).signalVisibilityCheckboxPrefix)}]`);
}

function activePlotFields(page, config) {
  return page.locator(`[data-testid^=${JSON.stringify(testIds(config).activePlotFieldPrefix)}]`);
}

function plotHost(card) {
  return card.locator(".js-plotly-plot");
}

function plotHostByName(page, config, plot) {
  return page.locator(testIdSelector(`${testIds(config).plotHostPrefix}${plot}`));
}

function measurementsConfig(config) {
  const measurements = testIds(config).measurements;
  if (!measurements || typeof measurements !== "object") {
    throw new Error("Missing Signal Analyser measurements test id contract");
  }
  return measurements;
}

function measurementLocator(page, config, name) {
  const id = measurementsConfig(config)[name];
  if (typeof id !== "string") {
    throw new Error(`Missing Signal Analyser measurements test id: ${name}`);
  }
  return page.locator(testIdSelector(id));
}

function measurementRow(page, config, statistic) {
  const id = measurementsConfig(config).rows && measurementsConfig(config).rows[statistic];
  if (typeof id !== "string") {
    throw new Error(`Missing Signal Analyser measurements row test id: ${statistic}`);
  }
  return page.locator(testIdSelector(id));
}

function endpointMatches(response, endpoint, method) {
  const matchesPath = function (pathname) {
    if (pathname === endpoint) return true;
    const suffixStart = pathname.length - endpoint.length;
    return suffixStart > 0 && pathname.endsWith(endpoint) &&
      pathname.charAt(suffixStart) === "/";
  };

  try {
    const url = new URL(response.url());
    return response.request().method() === method && matchesPath(url.pathname);
  } catch (_error) {
    const pathname = response.url().split(/[?#]/, 1)[0];
    return response.request().method() === method && matchesPath(pathname);
  }
}

function isApiRequestUrl(request) {
  const url = typeof request === "string" ? request : request.url();
  try {
    return /(?:^|\/)api\//.test(new URL(url).pathname);
  } catch (_error) {
    return /(?:^|\/)api\//.test(url.split(/[?#]/, 1)[0]);
  }
}

function waitForApi(page, config, endpoint, method) {
  return page.waitForResponse(function (response) {
    return endpointMatches(response, endpoint, method);
  }, { timeout: VIEW_TIMEOUT });
}

async function waitForTimedApi(page, config, endpoint, method, log, label, warningMs) {
  const startedAt = Date.now();
  try {
    const response = await waitForApi(page, config, endpoint, method);
    performanceLog(log, `${label} ${method} ${endpoint}`, Date.now() - startedAt, warningMs,
      `HTTP ${response.status()}`);
    return response;
  } catch (error) {
    performanceLog(log, `${label} ${method} ${endpoint}`, Date.now() - startedAt, warningMs,
      `hang/failure: ${error && error.message ? error.message : error}`);
    throw error;
  }
}

async function responseJson(response, label) {
  try {
    return await response.json();
  } catch (error) {
    throw new Error(`${label} response is not JSON: ${error.message}`);
  }
}

function stateRevisionFromPayload(payload, label) {
  const direct = payload && payload.state_revision;
  const nested = payload && payload.state && payload.state.state_revision;
  const revision = Number.isInteger(direct) ? direct : nested;
  if (!Number.isInteger(revision)) {
    throw new Error(`${label} response must expose integer state_revision`);
  }
  return revision;
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
  const responsePromise = waitForTimedApi(page, config, signalConfig(config).api.view, "POST", log, label);
  await locator.click({ timeout: VIEW_TIMEOUT });
  const response = await responsePromise;
  await assertOkResponse(response, `${label} /api/view`);
  await waitForSettled(page, config);
  log(`${label}: POST /api/view ${response.status()}`);
  return response;
}

async function setCheckboxAndWaitForView(page, config, locator, checked, log, label) {
  const responsePromise = waitForTimedApi(page, config, signalConfig(config).api.view, "POST", log, label);
  await locator.setChecked(checked, { timeout: VIEW_TIMEOUT });
  const response = await responsePromise;
  await assertOkResponse(response, `${label} /api/view`);
  await waitForSettled(page, config);
  log(`${label}: POST /api/view ${response.status()}`);
  return response;
}

function documentBox(viewportBox, scrollPosition) {
  return {
    height: viewportBox.height,
    width: viewportBox.width,
    x: viewportBox.x + scrollPosition.x,
    y: viewportBox.y + scrollPosition.y,
  };
}

function roundedBox(box) {
  return {
    height: Math.round(box.height),
    width: Math.round(box.width),
    x: Math.round(box.x),
    y: Math.round(box.y),
  };
}

async function boxSignature(locator) {
  const viewportBox = await locator.boundingBox();
  if (!viewportBox) return null;
  const scrollPosition = await locator.evaluate(function () {
    return { x: window.scrollX, y: window.scrollY };
  });
  return roundedBox(documentBox(viewportBox, scrollPosition));
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
      placeholderText: Array.prototype.slice.call(element.querySelectorAll(".plot-placeholder")).map(function (node) {
        return (node.textContent || "").trim();
      }).filter(Boolean),
      ready: element.getAttribute("data-plot-ready"),
      state: element.getAttribute("data-plot-state"),
      traceCount: traces.length,
      traces: traces.map(function (trace) {
        return {
          color: trace.line && trace.line.color ||
            trace.marker && trace.marker.color ||
            trace.color || "",
          name: trace.name || "",
          showlegend: trace.showlegend,
          type: trace.type || "scatter",
        };
      }),
      types: traces.map(function (trace) { return trace.type || "scatter"; }),
    };
  });
}

async function waitForPlotlyReady(page, config, plots, log, warningMs) {
  const names = plots || PLOTS;
  for (const plot of names) {
    const startedAt = Date.now();
    const host = plotHostByName(page, config, plot);
    try {
      await host.waitFor({ state: "visible", timeout: VIEW_TIMEOUT });
      await page.waitForFunction(function (selector) {
        const element = document.querySelector(selector);
        const traces = element && (Array.isArray(element.data) ? element.data :
          Array.isArray(element._fullData) ? element._fullData : []);
        return Boolean(element && element.isConnected &&
          element.classList.contains("js-plotly-plot") &&
          element.getAttribute("data-plot-ready") === "true" &&
          traces.length > 0);
      }, testIdSelector(`${testIds(config).plotHostPrefix}${plot}`), { timeout: VIEW_TIMEOUT });
      performanceLog(log, `${plot} Plotly ready/render`, Date.now() - startedAt, warningMs, "ready");
    } catch (error) {
      performanceLog(log, `${plot} Plotly ready/render`, Date.now() - startedAt, warningMs,
        `hang/failure: ${error && error.message ? error.message : error}`);
      throw error;
    }
  }
}

async function assertNoPreparingPlaceholders(page, assert) {
  const visiblePreparing = await page.locator(".plot-placeholder").evaluateAll(function (elements) {
    return elements.filter(function (element) {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return /Подготовка графика/.test(element.textContent || "") &&
        rect.width > 0 && rect.height > 0 &&
        style.display !== "none" && style.visibility !== "hidden" &&
        style.opacity !== "0";
    }).map(function (element) {
      return (element.textContent || "").trim();
    });
  });
  assert(visiblePreparing.length === 0,
    `no visible preparation placeholder may remain after Plotly ready: ${JSON.stringify(visiblePreparing)}`);
}

async function markPlotHosts(page, config) {
  const selectors = PLOTS.map(function (plot) {
    return testIdSelector(`${testIds(config).plotHostPrefix}${plot}`);
  });
  await page.evaluate(function (hostSelectors) {
    hostSelectors.forEach(function (selector, index) {
      const host = document.querySelector(selector);
      if (host) host.__e2ePlotHostMarker = `plot-host-${index}`;
    });
  }, selectors);
}

async function assertMarkedPlotHostsAlive(page, config, assert) {
  const hostStates = await page.evaluate(function (hostSelectors) {
    return hostSelectors.map(function (selector) {
      const host = document.querySelector(selector);
      const traces = host && (Array.isArray(host.data) ? host.data :
        Array.isArray(host._fullData) ? host._fullData : []);
      return {
        className: host && host.className || "",
        connected: Boolean(host && host.isConnected),
        marker: host && host.__e2ePlotHostMarker || "",
        ready: host && host.getAttribute("data-plot-ready"),
        traceCount: traces ? traces.length : 0,
      };
    });
  }, PLOTS.map(function (plot) {
    return testIdSelector(`${testIds(config).plotHostPrefix}${plot}`);
  }));
  hostStates.forEach(function (state, index) {
    assert(state.connected, `${PLOTS[index]} Plotly host must remain connected after react`);
    assert(state.marker === `plot-host-${index}`,
      `${PLOTS[index]} Plotly host element must not be replaced during react`);
    assert(String(state.className).includes("js-plotly-plot"),
      `${PLOTS[index]} Plotly host must remain a live Plotly element`);
    assert(state.ready === "true" && state.traceCount > 0,
      `${PLOTS[index]} Plotly host must keep ready data after react`);
  });
}

async function signalRowsState(page, config) {
  const ids = testIds(config);
  return signalRows(page, config).evaluateAll(function (elements, prefixes) {
    function checkboxState(row) {
      return row.querySelector(`[data-testid^="${prefixes.checkbox}"]`);
    }
    function visibilityState(row) {
      return row.querySelector(`[data-testid^="${prefixes.state}"]`);
    }
    return elements.map(function (row) {
      const checkbox = checkboxState(row);
      const state = visibilityState(row);
      const swatch = row.querySelector(".color-swatch");
      const style = swatch ? window.getComputedStyle(swatch) : null;
      return {
        checkboxTestId: checkbox && checkbox.getAttribute("data-testid") || "",
        color: style && style.getPropertyValue("--signal-color").trim() ||
          swatch && swatch.style.getPropertyValue("--signal-color").trim() || "",
        disabled: Boolean(checkbox && checkbox.disabled),
        id: row.getAttribute("data-testid") || "",
        label: checkbox && checkbox.getAttribute("aria-label") || "",
        name: row.getAttribute("data-signal") || "",
        selected: row.getAttribute("aria-pressed") === "true",
        stateTestId: state && state.getAttribute("data-testid") || "",
        visibilityText: state && (state.textContent || "").trim() || "",
        visible: row.getAttribute("data-visible") === "true",
        checked: Boolean(checkbox && checkbox.checked),
      };
    });
  }, {
    checkbox: ids.signalVisibilityCheckboxPrefix,
    state: ids.signalVisibilityStatePrefix,
  });
}

function normalizeColor(value) {
  return String(value || "").replace(/\s+/g, "").toLowerCase();
}

function assertRussianVisibilityControls(assert, rows) {
  assert(rows.length > 0, "signal table must expose signal rows");
  rows.forEach(function (row) {
    assert(row.checkboxTestId, `${row.id} must expose a stable visibility checkbox test id`);
    assert(row.stateTestId, `${row.id} must expose a stable visibility state test id`);
    assert(/^Видимость сигнала\s+/.test(row.label),
      `${row.id} visibility checkbox must use Russian accessible label`);
    assert(row.visibilityText === (row.checked ? "Виден" : "Скрыт"),
      `${row.id} visibility state must be Russian and match checkbox state`);
  });
}

function assertAtLeastOneVisible(assert, rows) {
  const visible = rows.filter(function (row) { return row.checked; });
  assert(visible.length >= 1, "at least one signal must remain visible");
  if (visible.length === 1) {
    assert(visible[0].disabled,
      "the last visible signal checkbox must be disabled to preserve the minimum-visible contract");
  }
}

function assertLineLegendForVisible(assert, signature, visibleRows, label) {
  const lineTraces = signature.traces.filter(function (trace) {
    return trace.type === "scatter" || trace.type === "scattergl" || trace.type === "";
  });
  visibleRows.forEach(function (row) {
    const trace = lineTraces.find(function (item) { return item.name === row.name; });
    assert(trace, `${label} must include a named trace for visible signal ${row.name}`);
    assert(trace.showlegend !== false,
      `${label} trace ${row.name} must remain visible in the legend`);
    assert(trace.color, `${label} trace ${row.name} must expose a line color`);
    if (row.color) {
      assert(normalizeColor(trace.color) === normalizeColor(row.color),
        `${label} trace ${row.name} color must match the signal swatch`);
    }
  });
  assert(lineTraces.length >= visibleRows.length,
    `${label} must expose separate line traces for all visible signals`);
}

function assertSelectedHeatmap(assert, signature, selectedName, label) {
  assert(signature.ready === "true", `${label} host must be ready`);
  assert(signature.placeholderText.length === 0,
    `${label} must not keep placeholder text after ready render`);
  assert(signature.types.includes("heatmap"), `${label} must render a heatmap trace`);
  const heatmapTrace = signature.traces[signature.types.indexOf("heatmap")];
  assert(heatmapTrace && heatmapTrace.name === selectedName,
    `${label} heatmap trace must belong to selected visible signal ${selectedName}`);
}

async function measurementTableState(page, config) {
  const table = measurementLocator(page, config, "table");
  const rows = measurementsConfig(config).rows;
  await table.waitFor({ state: "visible", timeout: VIEW_TIMEOUT });
  return table.evaluate(function (element, rowIds) {
    const rowElements = Object.entries(rowIds).map(function (entry) {
      return [entry[0], element.querySelector(`[data-testid="${entry[1]}"]`)];
    });
    const headers = Array.prototype.slice.call(element.querySelectorAll("th")).map(function (node) {
      return (node.textContent || "").trim();
    }).filter(Boolean);
    const scopeNodes = Array.prototype.slice.call(element.querySelectorAll("[data-signal], [data-selected-signal]"));
    return {
      ariaLabel: element.getAttribute("aria-label") || "",
      caption: element.querySelector("caption") && (element.querySelector("caption").textContent || "").trim() || "",
      domRowIds: Array.prototype.slice.call(element.querySelectorAll("tbody tr[data-testid]")).map(function (row) {
        return row.getAttribute("data-testid") || "";
      }),
      headers,
      id: element.getAttribute("data-testid") || "",
      rows: rowElements.map(function (entry) {
        const row = entry[1];
        if (!row) return { statistic: entry[0], id: "", signal: "", text: "", values: [] };
        const cells = Array.prototype.slice.call(row.querySelectorAll("th, td")).map(function (cell) {
          return (cell.textContent || "").trim();
        }).filter(Boolean);
        return {
          statistic: entry[0],
          id: row.getAttribute("data-testid") || "",
          signal: row.getAttribute("data-signal") || row.getAttribute("data-selected-signal") || "",
          text: (row.textContent || "").replace(/\s+/g, " ").trim(),
          values: cells,
        };
      }),
      scopeSignals: scopeNodes.map(function (node) {
        return node.getAttribute("data-signal") || node.getAttribute("data-selected-signal") || "";
      }).filter(Boolean),
      selectedSignal: element.getAttribute("data-selected-signal") || element.getAttribute("data-signal") || "",
      text: (element.textContent || "").replace(/\s+/g, " ").trim(),
    };
  }, rows);
}

async function measurementSnapshotState(page, config) {
  const panel = measurementLocator(page, config, "panel");
  const signalName = measurementLocator(page, config, "signalName");
  await panel.waitFor({ state: "visible", timeout: VIEW_TIMEOUT });
  return {
    panelText: (await panel.innerText()).replace(/\s+/g, " ").trim(),
    signalName: (await signalName.innerText()).replace(/\s+/g, " ").trim(),
    table: await measurementTableState(page, config),
  };
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
  assertAtLeastOneVisible,
  assertLineLegendForVisible,
  assertMarkedPlotHostsAlive,
  assertNoPreparingPlaceholders,
  assertRussianVisibilityControls,
  assertSelectedHeatmap,
  boxSignature,
  cardLocator,
  cardTestId,
  clickAndWaitForView,
  documentBox,
  endpointMatches,
  isApiRequestUrl,
  logDiagnosticState,
  markPlotHosts,
  measurementLocator,
  measurementRow,
  measurementSnapshotState,
  measurementTableState,
  namedTestId,
  plotHostByName,
  plotHost,
  plotSignature,
  responseJson,
  selectedRowId,
  setCheckboxAndWaitForView,
  signalRows,
  signalRowsState,
  stateRevisionFromPayload,
  testIds,
  visibilityCheckboxes,
  waitForApi,
  waitForTimedApi,
  waitForPlotlyReady,
  waitForSettled,
  performanceLog,
};
