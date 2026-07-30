"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

module.exports = async function testBehaviorContract(assert) {
  const root = path.resolve(__dirname, "<relative-project-root>");
  const apiCalls = [];
  const pendingResponses = [];
  const context = {
    window: {
      GenieApi: {
        update: function (payload) {
          apiCalls.push(payload);
          return new Promise((resolve) => pendingResponses.push(resolve));
        },
      },
    },
    document: {
      addEventListener: function () {},
      removeEventListener: function () {},
    },
    Promise,
    setTimeout,
    clearTimeout,
  };

  const source = fs.readFileSync(path.join(root, "public/js/<module>.js"), "utf8");
  vm.runInNewContext(source, context, { filename: "<module>.js" });

  const moduleContract = context.window.GenieAppModules["<owner>"]["<module>"];
  const frontend = Object.assign(moduleContract.state(), moduleContract.methods);

  const request = frontend.performAction("new value");
  assert(apiCalls.length === 1, "action should send one API request");

  pendingResponses[0]({ success: true, value: "server value" });
  await request;
  assert(frontend.value === "server value", "latest response should replace module state");
};
