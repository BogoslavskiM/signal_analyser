"use strict";

const fs = require("fs");
const path = require("path");

const coverageDir = path.resolve(process.argv[2] || "");
const projectRoot = path.resolve(process.argv[3] || process.cwd());
const sourceRoot = path.join(projectRoot, "public", "js") + path.sep;

if (!fs.existsSync(coverageDir)) {
  throw new Error(`Coverage directory does not exist: ${coverageDir}`);
}

const functions = new Map();
const scripts = new Set();

for (const name of fs.readdirSync(coverageDir).sort()) {
  if (!name.endsWith(".json")) continue;
  const payload = JSON.parse(fs.readFileSync(path.join(coverageDir, name), "utf8"));

  for (const script of payload.result || []) {
    const scriptPath = script.url.startsWith("file://") ?
      new URL(script.url).pathname :
      script.url;
    const absolutePath = path.isAbsolute(scriptPath || "") ?
      path.resolve(scriptPath) :
      path.resolve(sourceRoot, scriptPath || "");
    if (!absolutePath.startsWith(sourceRoot) || !fs.existsSync(absolutePath)) continue;

    scripts.add(absolutePath);
    for (const fn of script.functions || []) {
      const rootRange = fn.ranges && fn.ranges[0];
      if (!rootRange) continue;
      const key = `${absolutePath}:${rootRange.startOffset}:${rootRange.endOffset}`;
      const previous = functions.get(key) || { covered: false, name: fn.functionName || "<anonymous>" };
      previous.covered = previous.covered || rootRange.count > 0;
      functions.set(key, previous);
    }
  }
}

const totalFunctions = functions.size;
const coveredFunctions = Array.from(functions.values()).filter((fn) => fn.covered).length;
const functionPercent = totalFunctions === 0 ? 0 : 100 * coveredFunctions / totalFunctions;

console.log([
  `scripts=${scripts.size}`,
  `functions=${totalFunctions}`,
  `covered_functions=${coveredFunctions}`,
  `function_coverage=${functionPercent.toFixed(2)}%`,
].join(" "));
