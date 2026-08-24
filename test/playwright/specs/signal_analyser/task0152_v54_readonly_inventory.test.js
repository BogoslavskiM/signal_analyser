"use strict";

const fs = require("fs");
const path = require("path");
const { testIdSelector, waitForAppReady } = require("../../support/app_page");

const artifactDir = path.join(__dirname, "..", "..", "artifacts", "TASK-0152-V54-readonly");

async function task0152V54Readonly({ appUrl, assert, config, page, step }) {
  await step("read-only production inventory", async function () {
    const mutations = [];
    const observe = function (request) {
      if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) mutations.push({ method: request.method(), url: request.url() });
    };
    page.on("request", observe);
    try {
      await page.goto(appUrl, { waitUntil: "domcontentloaded" });
      await waitForAppReady(page, config, { timeout: 30000 });
      const state = await page.evaluate(async function () {
        const response = await fetch("./api/state-lite", { cache: "no-store", headers: { Accept: "application/json" } });
        return { status: response.status, body: await response.json() };
      });
      assert(state.status === 200, `state-lite must return 200, got ${state.status}`);
      const dom = await page.locator("[data-signal-row], [data-testid='display-tabs'] [role='tab']").evaluateAll(function (nodes) {
        return nodes.map(function (node) { return { signal: node.getAttribute("data-signal-name"), display: node.getAttribute("data-display-select") }; });
      });
      fs.mkdirSync(artifactDir, { recursive: true });
      fs.writeFileSync(path.join(artifactDir, "inventory.json"), JSON.stringify({ state, dom, mutations }, null, 2));
      await page.screenshot({ path: path.join(artifactDir, "production-readonly.png"), fullPage: true });
      assert(mutations.length === 0, `read-only inspection observed mutations: ${JSON.stringify(mutations)}`);
    } finally { page.off("request", observe); }
  });
}

task0152V54Readonly.scenarioFlags = ["TASK-0152-V54-READONLY"];
module.exports = task0152V54Readonly;
