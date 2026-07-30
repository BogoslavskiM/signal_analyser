"use strict";

function timestamp() {
  return new Date().toISOString().replace("T", " ").replace("Z", "");
}

function createLogger(scope) {
  function log(message) {
    console.log(`[${timestamp()}] [${scope}] ${message}`);
  }

  async function step(message, action) {
    const startedAt = Date.now();
    log(`START ${message}`);
    try {
      const result = await action();
      log(`DONE ${message} (${Date.now() - startedAt}ms)`);
      return result;
    } catch (error) {
      log(`FAIL ${message} (${Date.now() - startedAt}ms): ${error && error.message ? error.message : error}`);
      throw error;
    }
  }

  return { log, step };
}

module.exports = { createLogger };
