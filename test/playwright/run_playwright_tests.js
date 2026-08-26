"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const config = require("./e2e.config");
const { createLogger } = require("./support/logger");

const testRoot = __dirname;
const specsDir = path.join(testRoot, "specs");

function usage() {
  return [
    "Usage:",
    "  node run_playwright_tests.js --current",
    "  node run_playwright_tests.js <app-url>",
    "",
    "Environment:",
    "  PLAYWRIGHT_CDP_URL       Chrome DevTools endpoint, default http://127.0.0.1:9222",
    "  PLAYWRIGHT_APP_URL       Alternative to <app-url>",
    "  PLAYWRIGHT_PAGE_URL_MATCH Select an already-open page by URL fragment",
    "  PLAYWRIGHT_CURRENT=1     Use an already-open page and skip navigation",
    "  PLAYWRIGHT_SPEC          Run specs whose relative path contains this text",
    "  PLAYWRIGHT_FEATURES      Comma-separated enabled feature override",
  ].join("\n");
}

function findTests(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(function (entry) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return findTests(fullPath);
    return entry.isFile() && entry.name.endsWith(".test.js") ? [fullPath] : [];
  });
}

function createAssert(file) {
  return function assert(condition, message) {
    if (!condition) {
      throw new Error(`${path.relative(testRoot, file)}: ${message}`);
    }
  };
}

function relativeSpec(file) {
  return path.relative(specsDir, file);
}

function appUrlFromArgs() {
  const arg = process.argv.slice(2).find(function (item) {
    return !["--help", "-h", "--current"].includes(item) && !item.startsWith("--flag=");
  });
  return arg || process.env.PLAYWRIGHT_APP_URL || "";
}

function useCurrentPageFromArgs() {
  return process.argv.includes("--current") || process.env.PLAYWRIGHT_CURRENT === "1";
}

function assertAllowedTarget(url, source) {
  const allowed = config.app && Array.isArray(config.app.allowedOrigins) ? config.app.allowedOrigins : [];
  let origin;
  try { origin = new URL(url).origin; }
  catch (_error) { throw new Error(`${source} must be an absolute allowed production URL: ${url}`); }
  if (!allowed.includes(origin)) {
    throw new Error(`${source} origin ${origin} is forbidden; allowed origins: ${allowed.join(", ") || "(none)"}`);
  }
}

function enabledFeatures() {
  const override = process.env.PLAYWRIGHT_FEATURES;
  if (override != null) {
    return new Set(override.split(",").map(function (item) {
      return item.trim();
    }).filter(Boolean));
  }

  return new Set(Object.entries(config.features || {}).filter(function (entry) {
    return entry[1] === true;
  }).map(function (entry) {
    return entry[0];
  }));
}

function requiredFeatures(test) {
  if (!Array.isArray(test.requiredFeatures)) return [];
  return test.requiredFeatures.map(String);
}

function requestedFlags() {
  return String(process.env.E2E_FLAGS || "").split(",").map(function (flag) {
    return flag.trim();
  }).filter(Boolean);
}

function matchesRequestedFlags(test, flags) {
  if (!flags.length) return true;
  const declared = Array.isArray(test.scenarioFlags) ? test.scenarioFlags.map(String) : [];
  return flags.some(function (flag) { return declared.includes(flag); });
}

function acquireRunnerLock(cdpUrl) {
  const lockName = Buffer.from(cdpUrl).toString("hex").slice(0, 80);
  const lockPath = path.join(os.tmpdir(), `genie-playwright-${lockName}.lock`);

  function createLock() {
    const descriptor = fs.openSync(lockPath, "wx");
    fs.writeFileSync(descriptor, String(process.pid));
    fs.closeSync(descriptor);
  }

  try {
    createLock();
  } catch (error) {
    if (!error || error.code !== "EEXIST") throw error;
    const ownerPid = Number(fs.readFileSync(lockPath, "utf8").trim());
    try {
      process.kill(ownerPid, 0);
      throw new Error(`Another Playwright runner is already using ${cdpUrl} (PID ${ownerPid})`);
    } catch (ownerError) {
      if (ownerError && ownerError.code !== "ESRCH") throw ownerError;
      fs.unlinkSync(lockPath);
      createLock();
    }
  }

  let released = false;
  return function releaseRunnerLock() {
    if (released) return;
    released = true;
    try {
      if (Number(fs.readFileSync(lockPath, "utf8")) === process.pid) {
        fs.unlinkSync(lockPath);
      }
    } catch (error) {
      if (!error || error.code !== "ENOENT") throw error;
    }
  };
}

async function currentPage(browser, urlMatch) {
  if (urlMatch) {
    for (const context of browser.contexts()) {
      const matched = context.pages().find(function (page) {
        return page.url().includes(urlMatch);
      });
      if (matched) return matched;
    }
    throw new Error(`No open Chrome page found with URL containing ${urlMatch}`);
  }

  for (const context of browser.contexts()) {
    const pages = context.pages();
    if (pages.length) return pages[pages.length - 1];
  }
  throw new Error("No open Chrome page found");
}

(async function run() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage());
    return;
  }

  const appUrl = appUrlFromArgs();
  const useCurrentPage = useCurrentPageFromArgs();
  if (!appUrl && !useCurrentPage) {
    console.error(usage());
    process.exit(2);
  }
  if (appUrl) assertAllowedTarget(appUrl, "application URL");

  const cdpUrl = process.env.PLAYWRIGHT_CDP_URL || "http://127.0.0.1:9222";
  const releaseRunnerLock = acquireRunnerLock(cdpUrl);
  process.once("exit", releaseRunnerLock);

  const runnerLog = createLogger("runner");
  runnerLog.log(`Connecting to Chrome CDP: ${cdpUrl}`);
  const { chromium } = require("playwright-core");
  const browser = await chromium.connectOverCDP(cdpUrl);
  runnerLog.log("Connected to Chrome CDP");

  const urlMatch = process.env.PLAYWRIGHT_PAGE_URL_MATCH ||
    (useCurrentPage ? config.app.pageUrlMatch || "" : "");
  const page = await currentPage(browser, urlMatch);
  if (useCurrentPage) assertAllowedTarget(page.url(), "current browser page");
  runnerLog.log(`Using page: ${page.url() || "(blank)"}`);

  const specFilter = process.env.PLAYWRIGHT_SPEC || "";
  const flags = requestedFlags();
  const testFiles = findTests(specsDir).sort().filter(function (file) {
    return !specFilter || relativeSpec(file).includes(specFilter);
  }).filter(function (file) {
    if (!flags.length) return true;
    const test = require(file);
    return matchesRequestedFlags(test, flags);
  });
  if (!testFiles.length) {
    throw new Error(`No Playwright specs matched PLAYWRIGHT_SPEC=${specFilter} E2E_FLAGS=${flags.join(",")}`);
  }

  const features = enabledFeatures();
  const knownFeatures = new Set(Object.keys(config.features || {}));
  const unknownEnabled = Array.from(features).filter(function (feature) {
    return !knownFeatures.has(feature);
  });
  if (unknownEnabled.length) {
    throw new Error(`Unknown enabled features: ${unknownEnabled.join(", ")}`);
  }
  runnerLog.log(`Enabled features: ${Array.from(features).sort().join(", ") || "(core only)"}`);
  runnerLog.log(`Discovered ${testFiles.length} spec file(s); flags=${flags.join(",") || "(none)"}`);

  let passedCount = 0;
  let skippedCount = 0;
  const failures = [];

  try {
    for (const file of testFiles) {
      const specName = relativeSpec(file);
      const logger = createLogger(specName);
      const startedAt = Date.now();
      try {
        const test = require(file);
        if (typeof test !== "function") {
          throw new Error(`${specName} must export a test function`);
        }

        const required = requiredFeatures(test);
        const unknown = required.filter(function (feature) {
          return !knownFeatures.has(feature);
        });
        if (unknown.length) {
          throw new Error(`${specName} requires unknown features: ${unknown.join(", ")}`);
        }
        const disabled = required.filter(function (feature) {
          return !features.has(feature);
        });
        if (disabled.length) {
          skippedCount += 1;
          console.log(`skip - ${specName}: disabled features ${disabled.join(", ")}`);
          continue;
        }

        await runnerLog.step(`spec ${specName}`, async function () {
          await test({
            appUrl,
            assert: createAssert(file),
            config,
            features,
            log: logger.log,
            page,
            step: logger.step,
            useCurrentPage,
          });
        });
        passedCount += 1;
        console.log(`ok - ${specName}`);
      } catch (error) {
        failures.push({
          durationMs: Date.now() - startedAt,
          error,
          specName,
        });
        console.error(`not ok - ${specName}: ${error && error.message ? error.message : error}`);
      }
    }
  } finally {
    runnerLog.log("Disconnecting from Chrome CDP");
    if (typeof browser.disconnect === "function") {
      await browser.disconnect();
    } else if (browser._connection && typeof browser._connection.close === "function") {
      await browser._connection.close();
    }
  }

  console.log(
    `playwright tests: ${passedCount} passed, ${failures.length} failed, ` +
    `${skippedCount} skipped, ${testFiles.length} total`
  );
  if (failures.length) {
    console.error("\nFailed specs:");
    failures.forEach(function (failure, index) {
      console.error(
        `\n${index + 1}. ${failure.specName} (${failure.durationMs}ms)\n` +
        (failure.error && failure.error.stack ? failure.error.stack : String(failure.error))
      );
    });
    process.exit(1);
  }
})().catch(function (error) {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
