"use strict";
const fs=require("fs"), path=require("path");
module.exports=async function(assert){
  const app=fs.readFileSync(path.join(path.resolve(__dirname,"../../../.."),"public/js/app.js"),"utf8");
  const sync=(app.match(/function syncSignalSamplesWithMain\(\)[\s\S]*?\n  \}/)||[""])[0];
  const load=(app.match(/function loadSignalSamples\(direction\)[\s\S]*?\n  \}/)||[""])[0];
  assert(/mainSignalForPane\(paneById\(model\.activePane\)\)/.test(sync)&&/var signalId=stableSignalId\(signal\)/.test(sync)&&/tab\.textContent=signal\.name/.test(sync),"a valid pane-local main, including an unbound signal, creates a values tab named exactly for that signal");
  assert(/var signalId=stableSignalId\(signal\);[\s\S]*?if \(!signal \|\| !signalId\)[\s\S]*?tab\.remove\(\)[\s\S]*?model\.inspectorPage === "samples"/.test(sync),"no valid stable main must remove the values tab and never retain a prior signal request");
  assert(/function showSignalSamples\(\)[\s\S]*?syncSignalSamplesWithMain\(\{ retry:true \}\)[\s\S]*?model\.inspectorPage="samples"[\s\S]*?renderInspector\(\)[\s\S]*?tab\.focus\(\)/.test(app)&&/button\.dataset\.testid === "signal-values-action"[\s\S]*?showSignalSamples\(\)/.test(app),"Signal settings Values explicitly synchronizes, selects, renders, and focuses the same samples tab");
  assert(/api\.signalSamples\(request\.signalId, request\.startOffset, requestLimit\)/.test(load)&&/state !== model\.signalSamples \|\| request\.token !== state\.token/.test(load)&&/normalizeSignalSamplesPage\(page\)/.test(load),"bounded GET uses the stable id/cursor token and stale or wrong responses are ignored");
  assert(/SignalSamplesCalculatedColumns/.test(app)&&/headMarkup[\s\S]*?rowsMarkup/.test(app)&&/controller\.reject\(state, request, safeErrorText/.test(load)&&/scroll\.addEventListener\("scroll"[\s\S]*?prefetchSignalSamples\(scroll, state\)/.test(app),"responses render dynamic columns, errors remain visible, and pagination is reusable");
};
