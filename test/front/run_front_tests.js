"use strict";

const fs = require("fs");
const path = require("path");

function findTests(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findTests(fullPath);
    return entry.isFile() && entry.name.endsWith(".test.js") ? [fullPath] : [];
  });
}

function createAssert(file) {
  return function assert(condition, message) {
    if (!condition) throw new Error(`${file}: ${message}`);
  };
}

(async function run() {
  const tests = findTests(__dirname).sort();
  for (const file of tests) {
    await require(file)(createAssert(file));
    console.log(`ok - ${path.relative(__dirname, file)}`);
  }
  console.log(`front tests: ${tests.length} file(s) passed`);
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
