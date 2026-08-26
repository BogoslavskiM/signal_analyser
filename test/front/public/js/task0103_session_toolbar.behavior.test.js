"use strict";
const fs = require("fs");
const path = require("path");
module.exports = async function task0104PackageToolbarBehavior(assert) {
  const app = fs.readFileSync(path.join(path.resolve(__dirname, "../../../.."), "public/js/app.js"), "utf8");
  const schedule = app.match(/function scheduleWorkspacePreflight\(\)[\s\S]*?\n  function bindPackageDialog/)[0];
  assert(/clearTimeout\(c\.preflightTimer\)/.test(schedule) && /if\(!c\.publish\)return/.test(schedule), "new preflight cancels old work and never runs while opted out");
  assert(/token===c\.preflightToken/.test(schedule), "stale preflight results/errors are rejected");
  const flow = app.match(/function importSessionDocument\(\)[\s\S]*?\n  function renderSessionSaveDialog/)[0];
  assert(/!current\.archiveBase64 \|\| !current\.replace/.test(flow) && /current\.phase="commit"/.test(flow), "commit requires file and explicit replacement confirmation");
  assert(/current\.result=response; return refreshImportedSession\(\)/.test(flow) && /current\.busy = false/.test(flow), "import clears busy and refreshes state before success");
};
