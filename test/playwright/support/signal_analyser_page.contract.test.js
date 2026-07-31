"use strict";

const assert = require("node:assert/strict");
const { endpointMatches } = require("./signal_analyser_page");

function response(url, method) {
  return {
    request: function () {
      return { method: function () { return method; } };
    },
    url: function () { return url; },
  };
}

assert.equal(endpointMatches(response("https://prod.example/api/view", "POST"), "/api/view", "POST"), true);
assert.equal(endpointMatches(response("https://prod.example/user/apps/signal_analyser/api/view", "POST"), "/api/view", "POST"), true);
assert.equal(endpointMatches(response("https://prod.example/user/apps/signal_analyser/api/view?tab=plots", "POST"), "/api/view", "POST"), true);
assert.equal(endpointMatches(response("https://prod.example/user/apps/signal_analyser/api/view", "GET"), "/api/view", "POST"), false);
assert.equal(endpointMatches(response("https://prod.example/user/apps/signal_analyser/api/viewer", "POST"), "/api/view", "POST"), false);
assert.equal(endpointMatches(response("https://prod.example/user/apps/signal_analyser/not-api/view", "POST"), "/api/view", "POST"), false);

console.log("ok - signal_analyser_page endpointMatches contract");
