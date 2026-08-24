"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
function moduleBlock(source,start,end,window){const a=source.indexOf(start),b=source.indexOf(end,a);if(a<0||b<0)throw new Error("missing "+start);vm.runInNewContext(source.slice(a,b+end.length),{window,Object,Array,Number,String,Math,JSON,RegExp,Promise,setTimeout,clearTimeout},{filename:start});return window;}
module.exports=async function(assert){
 const root=path.resolve(__dirname,"../../../.."),app=fs.readFileSync(path.join(root,"public/js/app.js"),"utf8"),css=fs.readFileSync(path.join(root,"public/css/app.css"),"utf8");
 // TASK-0148: cursor range is visual-only; identity and terminal / autorange hooks stay explicit.
 assert(/plotly_relayouting[\s\S]*?projectGraph[\s\S]*?false/.test(app)&&/plotly_relayout[\s\S]*?projectGraph[\s\S]*?true/.test(app),"viewport preview/terminal range events must remain graph-only");
 assert(/publishRange|\/api\/settings|output\(true\)|state_revision|session persistence/.test(app.match(/persistence:"[\s\S]*?"/)[0]),"viewport contract must prohibit API/settings/output/session mutation");
 assert(/overflow:\s*hidden/.test(css)&&/dblclick[\s\S]*?autorange/.test(app)&&/synchronizedRangeSettlers\[key\][\s\S]*?\.cancel\(\)/.test(app),"drag must preserve DOM without overflow, reset true autorange, and cancel stale settle work");
 // TASK-0149: off/single/dual columns, menu and live per-pane frontend-only projection.
 const w={};moduleBlock(app,"(function registerMeasurementCursorColumns(window)","}(window));",w);const m=w.SignalAnalyserMeasurementCursorColumns,ctl=m.createController();
 let off=ctl.reconcile("d::p",{mode:"off",eligible:true},"time");assert(!Object.values(off.enabled).some(Boolean),"off cursor mode exposes no columns");
 let single=ctl.toggle("d::p","x1",{mode:"single",eligible:true},"time");assert(single.visible.x1&&!single.enabled.x2,"single cursor permits only X1/Y1");
 let dual=ctl.toggle("d::p","x2",{mode:"dual",eligible:true},"time");dual=ctl.toggle("d::p","y1",{mode:"dual",eligible:true},"time");dual=ctl.toggle("d::p","delta_y",{mode:"dual",eligible:true},"time");assert(dual.visible.x1&&dual.visible.x2&&dual.visible.y1&&dual.visible.delta_y&&dual.enabled.delta_y,"dual cursor restores intent and enables all six columns");
 assert(m.menuMarkup(ctl.menuItems("d::p",{mode:"dual",eligible:true},"time")).includes("eye.svg")&&m.contract.isolation.includes("No API, DSP, settings, session or state_revision"),"column menu uses visibility icons and is frontend-only");
 const host={data:[{legendgroup:"s",x:[0,1,2],y:[4,5,8]}],_fullLayout:{xaxis:{title:"Time, s"},yaxis:{title:"Amplitude, V"}}};
 const live=m.rowProjection({signal_name:"s"},{mode:"dual",eligible:true,values:[.9,2],host},"time",dual.visible);assert(live.x1.text==="0.9 s"&&live.y1.text==="5 V"&&live.delta_y.text==="3 V","live row values use nearest trace samples and delta formula");
 assert(/measurementCursorSnapshotByPane\[runtimeKey\][\s\S]*?measurementCursorColumnsController\(\)[\s\S]*?reconcile/.test(app),"measurement table projects the active per-pane cursor snapshot without a view request");
 // TASK-0150/0151: persisted labels and absolute hover suppression for all plot types.
 const a={};moduleBlock(app,"(function registerAxisLabelsAndHoverPolicy(window)","}(window));",a);const axis=a.SignalAnalyserAxisLabelsAndHover;
 assert(axis.field.id==="display.show_axis_labels"&&axis.field.defaultValue===true,"axis-label setting defaults true");
 ["time","spectrum","spectrogram","persistence"].forEach(type=>{const payload=axis.suppressHover({layout:{},data:[{type:type}]});assert(payload.layout.hovermode===false&&payload.data.every(t=>t.hoverinfo==="skip"&&t.hovertemplate===null),type+" suppresses hover globally");});
 assert(/show_axis_labels/.test(app)&&/colorbar/.test(app)&&/hovermode:false/.test(app),"labels are pane/session-aware and colorbar titles obey the same setting");
 // TASK-0152: crop eligibility, exact canonical request, retry and success cleanup.
 const t={};moduleBlock(app,"(function registerCursorTrimSignal(window)","}(window));",t);const trim=t.SignalAnalyserCursorTrimSignal;
 const context={plotType:"time",xUnit:"ms",stateRevision:7,mainSignal:{id:"source",name:"src"},cursorSnapshot:{mode:"dual",values:[8,2]}};
 assert(trim.eligibility(context)&&!trim.eligibility(Object.assign({},context,{plotType:"spectrum"})),"crop action is eligible only for dual Time cursors");
 assert(JSON.stringify(trim.payload(context," cut ",true))===JSON.stringify({state_revision:7,source_signal_id:"source",min_s:.002,max_s:.008,target_name:"cut",overwrite:true}),"crop payload is exact, canonical seconds, ordered and inclusive");
 let calls=[],closed=0;const controller=trim.createController({createSignal:p=>{calls.push(p);return calls.length===1?Promise.reject({status:409}):Promise.resolve({derived_signal:{id:"cut"}});},setBusy:()=>{},error:()=>{},acceptSignal:()=>{},close:()=>closed++});
 controller.open(context,null);await controller.submit("cut",false);assert(calls.length===1&&controller.isBusy()===false,"typed failure ends busy state and permits retry");await controller.submit("cut",true);assert(calls.length===2&&closed===1,"successful crop accepts returned inventory then closes/cleans dialog");
 assert(/pane-trim-signal/.test(app)&&/signal-trim-dialog/.test(app)&&/api\.cropSignal/.test(app)&&!/cursor:\s*(?:wait|progress)/.test(css),"trim action/modal/API seam retains the standard cursor on busy/loading surfaces");
};
