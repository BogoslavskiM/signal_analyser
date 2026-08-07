"use strict";

const fs = require("fs");
const path = require("path");

const testDir = __dirname;

function findTests(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
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
  const testFiles = findTests(testDir).sort();
  let count = 0;

  for (const file of testFiles) {
    const test = require(file);
    await test(createAssert(file));
    count += 1;
    console.log(`ok - ${path.relative(testDir, file)}`);
  }

  console.log(`front tests: ${count} file(s) passed`);
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
