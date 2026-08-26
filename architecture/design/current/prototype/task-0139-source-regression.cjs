const fs=require("fs");
const path=require("path");
const vm=require("vm");

const root=path.resolve(__dirname,"..");
const read=(relative)=>fs.readFileSync(path.join(root,relative),"utf8");
const context={window:{},document:{},Date,Promise};
vm.runInNewContext(read("frontend-source/integration/js/task-0138-values-columns.js"),context);
vm.runInNewContext(read("frontend-source/integration/js/task-0139-ui-inventory.js"),context);
vm.runInNewContext(read("frontend-source/integration/js/task-0139-loading-overlays.js"),context);

const columns=context.window.SignalSamplesCalculatedColumns;
const inventory=context.window.SignalAnalyserTask0139Inventory;
const loading=context.window.SignalAnalyserScopedLoading;
const operationUi=read("frontend-source/js/ui/dialogs/signal-operation.js");
const css=read("frontend-source/integration/css/task-0139-loading-overlays.css");
const results=[];
function check(id,run){try{results.push({id,passed:true,detail:run()});}catch(error){results.push({id,passed:false,error:error.message});}}
function assert(value,message){if(!value)throw new Error(message);}

check("64-values-default-base-only",()=>{
  const visibility=columns.defaultVisibility();
  assert(Object.values(visibility).every(value=>value===false),JSON.stringify(visibility));
  assert(columns.visibleColumns(visibility).map(column=>column.id).join("|")==="sample_index|time|value","base columns");
  return visibility;
});
check("65-square-root-removed-and-three-optionals",()=>{
  const ids=columns.optionalColumns.map(column=>column.id);
  assert(ids.join("|")==="magnitude|square|signed_square_root_magnitude",ids.join("|"));
  assert(!/data-sample-column=.["']?square_root/.test(read("frontend-source/js/ui/zones/inspector/ui.js")),"square_root renderer");
  return ids;
});
check("66-fft-removed-from-operation-ui",()=>{
  const projected=inventory.withoutFft(["abs","fft","custom"]);
  assert(projected.join("|")==="abs|custom",projected.join("|"));
  assert(!/\["fft",\s*"FFT"\]/.test(operationUi),"FFT mock option remains");
  return projected;
});
check("67-scoped-loader-terminals-and-stale-guards",()=>{
  assert(loading.paneTerminalStates.join("|")==="ready|empty|error","pane terminals");
  assert(loading.layoutTerminalStates.join("|")==="ready|empty|error","layout terminals");
  assert(/clean\(token\) !== current\.token/.test(read("frontend-source/integration/js/task-0139-loading-overlays.js")),"pane stale guard");
  assert(/clean\(token\) !== layoutRequest\.token/.test(read("frontend-source/integration/js/task-0139-loading-overlays.js")),"layout stale guard");
  return loading.lifecycle;
});
check("68-display-priority-and-existing-loader-visual",()=>{
  assert(/layout overlay suppresses every pane overlay/.test(loading.lifecycle.priority),"priority");
  assert(/\[data-layout-reconciling="true"\] \.pane-output-loading-overlay/.test(css),"pane suppression CSS");
  assert(/\.display-canvas-loading-overlay[\s\S]*position: absolute/.test(css),"canvas anchor");
  assert(/width: 64px;[\s\S]*height: 64px;/.test(css),"existing spinner geometry");
  return {priority:loading.lifecycle.priority,spinner:"64x64 existing tokens"};
});

const output={design_version:43,method:"bounded source/controller regression; browser launch unavailable in sandbox",passed:results.filter(item=>item.passed).length,failed:results.filter(item=>!item.passed).length,results};
fs.writeFileSync(path.join(root,"evidence/interaction-regression-v43-task0139.json"),JSON.stringify(output,null,2)+"\n");
process.stdout.write(JSON.stringify(output,null,2));
if(output.failed)process.exitCode=1;
