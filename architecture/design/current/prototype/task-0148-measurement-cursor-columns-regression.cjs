const fs=require("fs"),path=require("path"),vm=require("vm");
const root=path.resolve(__dirname,"..");
const context={window:{},Number,JSON};
vm.runInNewContext(fs.readFileSync(path.join(root,"frontend-source/integration/js/task-0148-measurement-cursor-columns.js"),"utf8"),context);
const h=context.window.SignalAnalyserMeasurementCursorColumns,results=[];
function ok(value,message){if(!value)throw new Error(message);}
function check(id,run){try{results.push({id,passed:true,detail:run()});}catch(error){results.push({id,passed:false,error:error.message});}}
const host={
  data:[
    {name:"real A",legendgroup:"signal-a",x:[0,1,2,3],y:[10,20,40,80]},
    {name:"duplicate A",legendgroup:"signal-a",x:[0,1,2,3],y:[100,200,400,800]},
    {name:"real B",legendgroup:"signal-b",x:[0,1,2,3],y:[5,8,13,21]},
    {name:"peaks",meta:{signal_analyser_peaks_overlay:true},x:[1],y:[999]}
  ],
  _fullLayout:{xaxis:{title:{text:"Время, ms"}},yaxis:{title:{text:"Амплитуда, V"}}}
};
const off={mode:"off",values:[],host,eligible:false};
const single={mode:"single",values:[1],host,eligible:true};
const dual={mode:"dual",values:[1,3],host,eligible:true};
check("102-off-default-hidden-disabled",()=>{const c=h.createController(),state=c.reconcile("pane",off,"time");ok(Object.values(state.visible).every(v=>!v),"default visible");ok(Object.values(state.enabled).every(v=>!v),"off enabled");return state;});
check("103-single-eligibility-and-latent-intent",()=>{const c=h.createController();let state=c.toggle("pane","x1",single,"time");state=c.toggle("pane","y1",single,"time");ok(state.visible.x1&&state.visible.y1&&!state.enabled.x2,"single mismatch");const hidden=c.reconcile("pane",off,"time");ok(!hidden.visible.x1&&hidden.intent.x1,"intent lost while off");const restored=c.reconcile("pane",single,"time");ok(restored.visible.x1&&restored.visible.y1,"intent not restored");return restored;});
check("104-dual-all-six-available",()=>{const c=h.createController();h.columns.forEach(column=>c.toggle("pane",column.id,dual,"spectrum"));const state=c.reconcile("pane",dual,"spectrum");ok(Object.values(state.enabled).every(Boolean)&&Object.values(state.visible).every(Boolean),"dual incomplete");return state;});
check("105-row-legendgroup-first-trace-formulas-and-units",()=>{const visible=h.columns.reduce((r,c)=>(r[c.id]=true,r),{});const groupA=h.rowProjection({signal_id:"signal-a"},dual,"time",visible);const groupB=h.rowProjection({legendgroup:"signal-b"},dual,"time",visible);ok(groupA.y1.raw===20&&groupA.y2.raw===80&&groupA.delta_y.raw===60,"first legendgroup trace mapping");ok(groupB.y1.raw===8&&groupB.y2.raw===21&&groupB.delta_y.raw===13,"explicit legendgroup mapping");ok(groupA.delta_x.raw===2&&groupA.x1.text==="1 ms"&&groupA.y1.text==="20 V","format or signed delta");return {groupA,groupB};});
check("106-noneligible-plot-hides-intent",()=>{const intent={x1:true,y1:true,x2:true,y2:true,delta_x:true,delta_y:true};const state=h.projection(intent,"dual","spectrogram",dual);ok(Object.values(state.enabled).every(v=>!v)&&Object.values(state.visible).every(v=>!v),"noneligible columns visible");return state;});
check("107-menu-eye-disabled-keyboard-semantics",()=>{const c=h.createController(),items=c.menuItems("pane",single,"time"),markup=h.menuMarkup(items,".");ok((markup.match(/ disabled/g)||[]).length===4,"disabled count");ok((markup.match(/role='menuitemcheckbox'/g)||[]).length===6,"menu roles");ok((markup.match(/eye-off\.svg/g)||[]).length===6,"default eyes");ok(/aria-disabled='true' disabled/.test(markup),"disabled aria");return {items:items.map(x=>({id:x.id,enabled:x.enabled})),contract:h.contract.isolation};});
const out={design_version:52,method:"bounded cursor-column eligibility/intent/trace-projection/menu regression; no browser/Figma",passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length,results};
fs.writeFileSync(path.join(root,"evidence/interaction-regression-v52-task0148.json"),JSON.stringify(out,null,2)+"\n");
process.stdout.write(JSON.stringify(out));if(out.failed)process.exitCode=1;
