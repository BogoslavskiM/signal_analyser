"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function source() { return fs.readFileSync(path.join(path.resolve(__dirname, "../../../.."), "public/js/app.js"), "utf8"); }
function controller(text) {
  const begin=text.indexOf("(function registerSignalSamplesRowWindow(window) {");
  const end=text.indexOf("}(window));", begin);
  if(begin < 0 || end < 0) throw new Error("SignalSamplesRowWindow seam is missing");
  const window={};
  vm.runInNewContext(text.slice(begin,end+"}(window));".length),{window,Number,String,Array,Math},{filename:"app.js:task0134-window"});
  return window.SignalSamplesRowWindow;
}
function normalizer(text) {
  const begin=text.indexOf("  function normalizeSignalSamplesPage(page) {");
  const end=text.indexOf("\n  function loadSignalSamples(",begin);
  if(begin < 0 || end < 0) throw new Error("samples page normalizer is missing");
  const context={Number,String,Array,Object};
  vm.runInNewContext(text.slice(begin,end),context,{filename:"app.js:task0134-normalizer"});
  return context.normalizeSignalSamplesPage;
}
function rows(start,count) { return Array.from({length:count},(_unused,index)=>({sample_index:start+index})); }
function page(start,count,total) { return {cursor:start,signal:{id:"sig"},rows:rows(start,count),total}; }

module.exports=async function task0134SignalSamplesWindow(assert) {
  const app=source(), window=controller(app), normalize=normalizer(app), total=100000001;
  assert(window.API_BATCH_SIZE===500&&window.MAX_DOM_ROWS===1000&&window.PREFETCH_THRESHOLD_ROWS===100,"row-window constants must stay exactly 500/1000/100");
  const normalized=normalize(page(500,500,total));
  assert(normalized.signal_id==="sig"&&normalized.start_offset===500&&normalized.end_offset===1000,"provider cursor/nested signal page must normalize to authoritative offsets without a full payload");
  const state=window.create("sig",7);
  const first=window.begin(state,"down");
  assert(first.startOffset===0&&first.limit===500&&window.begin(state,"down")===null,"initial down request must use cursor 0/limit 500 and dedupe its pending direction");
  let result=window.apply(state,first,normalize(page(0,500,total)));
  assert(result.accepted&&state.rows.length===500&&window.footer(state)==="1–500 из 100000001","first page must create the 1–500 window and footer");
  const second=window.begin(state,"down");
  assert(second.startOffset===500&&second.limit===500,"second downward batch must request cursor 500");
  result=window.apply(state,second,normalize(page(500,500,total)));
  assert(result.accepted&&state.rows.length===1000&&state.startOffset===0&&state.endOffset===1000,"second page must expand the retained window to 1–1000");
  const third=window.begin(state,"down");
  assert(third.startOffset===1000,"third downward batch must request cursor 1000");
  result=window.apply(state,third,normalize(page(1000,500,total)));
  assert(result.accepted&&state.rows.length===1000&&state.startOffset===500&&state.endOffset===1500&&result.footer==="501–1500 из 100000001","third page must trim leading rows and retain exactly 1000 DOM/state rows");
  assert(window.scrollCompensation(result,17)===-8500,"downward trimming must use actual supplied row height, not a hard-coded pixel value");
  const up=window.begin(state,"up");
  assert(up.startOffset===0&&window.begin(state,"up")===null,"upward prefetch must request cursor 0 and dedupe its direction");
  result=window.apply(state,up,normalize(page(0,500,total)));
  assert(result.accepted&&state.rows.length===1000&&state.startOffset===0&&state.endOffset===1000&&result.footer==="1–1000 из 100000001","upward prepend/drop must restore the 1–1000 window");
  assert(window.scrollCompensation(result,17)===8500,"upward prepend must use opposite actual-row-height compensation");
  assert(JSON.stringify(window.prefetchDirections(state,101,898))===JSON.stringify([]),"middle viewport must not prefetch");
  assert(JSON.stringify(window.prefetchDirections(state,100,899))===JSON.stringify(["down"]),"the 100-row bottom threshold must prefetch exactly at its boundary");
  state.startOffset=500;
  assert(JSON.stringify(window.prefetchDirections(state,100,899))===JSON.stringify(["up","down"]),"top and bottom threshold must independently permit both directions");
  const stale=window.create("sig",9), staleRequest=window.begin(stale,"down"); stale.token+=1;
  assert(window.apply(stale,staleRequest,normalize(page(0,500,total))).reason==="stale-token"&&stale.rows.length===0,"stale signal-token response must be ignored without mutation");
  const mismatch=window.create("sig",4), mismatchRequest=window.begin(mismatch,"down");
  assert(window.apply(mismatch,mismatchRequest,Object.assign(normalize(page(0,500,total)),{signal_id:"other"})).reason==="signal-mismatch","wrong stable-id response must not populate rows");
  assert(/api\.signalSamples\(request\.signalId, request\.startOffset, requestLimit\)/.test(app)&&!/signalSamples\([^\n]+,\s*200\)/.test(app),"provider seam must request bounded cursor pages, never old 200/full payload path");
  assert(/getBoundingClientRect[\s\S]*?rect\.height[\s\S]*?scrollCompensation\(result, rowHeight\)/.test(app),"rerender restoration must use measured rendered row height for both signs");
  assert(/renderInspector\(\); restoreSignalSamplesScrollTop\(scrollTop\)/.test(app)&&/renderInspector\(\); restoreSignalSamplesScrollTop\(scrollTop, result, rowHeight\)/.test(app),"begin/apply rerenders must preserve scroll position");
};
