"use strict";
const fs=require("fs"), path=require("path");
module.exports=async function(assert){
  const app=fs.readFileSync(path.join(path.resolve(__dirname,"../../../.."),"public/js/app.js"),"utf8");
  const sync=(app.match(/function syncSignalSamplesWithMain\(\)[\s\S]*?\n  \}/)||[""])[0];
  const load=(app.match(/function loadSignalSamples\(\)[\s\S]*?\n  \}/)||[""])[0];
  assert(/mainSignalForPane\(paneById\(model\.activePane\)\)/.test(sync)&&/var signalId=stableSignalId\(signal\)/.test(sync)&&/tab\.textContent=signal\.name/.test(sync),"a valid pane-local main, including an unbound signal, creates a values tab named exactly for that signal");
  assert(/var signalId=stableSignalId\(signal\);[\s\S]*?if \(!signal \|\| !signalId\)[\s\S]*?tab\.remove\(\)[\s\S]*?model\.inspectorPage === "samples"/.test(sync),"no valid stable main must remove the values tab and never retain a prior signal request");
  assert(/function showSignalSamples\(\)[\s\S]*?syncSignalSamplesWithMain\(\)[\s\S]*?model\.inspectorPage="samples"[\s\S]*?renderInspector\(\)[\s\S]*?tab\.focus\(\)/.test(app)&&/button\.dataset\.testid === "signal-values-action"[\s\S]*?showSignalSamples\(\)/.test(app),"Signal settings Values explicitly synchronizes, selects, renders, and focuses the same samples tab");
  assert(/api\.signalSamples\(state\.signalId, state\.nextCursor, 200\)/.test(load)&&/state !== model\.signalSamples \|\| token !== state\.token/.test(load)&&/String\(page\.signal\.id\) !== state\.signalId/.test(load),"first GET uses the stable id and stale/wrong responses are ignored");
  assert(/<th>№ точки<\/th><th>Время<\/th><th>Значение<\/th><th>Модуль<\/th><th>Квадрат<\/th>/.test(app)&&/state\.error=safeErrorText/.test(load)&&/scroll\.addEventListener\("scroll"[\s\S]*?loadSignalSamples\(\)/.test(app),"responses render five columns, errors remain visible, and pagination is reusable");
};
