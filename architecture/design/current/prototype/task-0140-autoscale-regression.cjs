const fs=require("fs");
const path=require("path");
const vm=require("vm");

const root=path.resolve(__dirname,"..");
const read=(relative)=>fs.readFileSync(path.join(root,relative),"utf8");
const context={window:{}};
vm.runInNewContext(read("frontend-source/integration/js/task-0140-plot-autoscale.js"),context);
const helper=context.window.SignalAnalyserPlotAutoscale;
const css=read("frontend-source/integration/css/task-0139-loading-overlays.css");
const results=[];
function assert(value,message){if(!value)throw new Error(message);}
function check(id,run){try{results.push({id,passed:true,detail:run()});}catch(error){results.push({id,passed:false,error:error.message});}}
function snapshot(plotType,sourceLayout,fullLayout){return helper.capture({plotType,sourceLayout,fullLayout,outputIdentity:"current-17"});}

check("69-scoped-spinners-use-defined-rotation",()=>{
  assert(/animation:\s*loader-rotate 800ms linear infinite/.test(css),"normal loader animation");
  assert(/prefers-reduced-motion[\s\S]*animation:\s*loader-rotate 1600ms linear infinite/.test(css),"reduced-motion loader animation");
  assert(!/animation:\s*ui-spinner-rotate/.test(css),"undefined keyframe name remains");
  return {normal:"loader-rotate 800ms linear infinite",reduced_motion:"loader-rotate 1600ms linear infinite"};
});

check("70-time-authoritative-default",()=>{
  const state=snapshot("time",{xaxis:{type:"linear",range:[0,250]},yaxis:{type:"linear"}},{xaxis:{type:"linear",range:[0,250]},yaxis:{type:"linear",range:[-1.1,1.1]}});
  const update=helper.relayout(state);
  assert(update["xaxis.range[0]"]===0 && update["xaxis.range[1]"]===250,"time x");
  assert(update["yaxis.range[0]"]===-1.1 && update["yaxis.range[1]"]===1.1,"time y");
  return {axes:state.axes,update};
});

check("71-spectrum-preserves-log-coordinates-and-units",()=>{
  const state=snapshot("spectrum",{xaxis:{type:"log"},yaxis:{type:"linear",range:[-120,0]}},{xaxis:{type:"log",range:[-1,3]},yaxis:{type:"linear",range:[-120,0]}});
  const update=helper.relayout(state);
  assert(state.axes.xaxis.type==="log","spectrum log type");
  assert(update["xaxis.range[0]"]===-1 && update["xaxis.range[1]"]===3,"Plotly log coordinates altered");
  assert(state.axes.yaxis.mode==="provider_default","provider magnitude default");
  return {axes:state.axes,update};
});

check("72-spectrogram-resets-time-and-log-frequency-only",()=>{
  const state=snapshot("spectrogram",{xaxis:{type:"linear"},yaxis:{type:"log"}},{xaxis:{type:"linear",range:[0,0.5]},yaxis:{type:"log",range:[1,6]}});
  const update=helper.relayout(state);
  assert(state.axes.xaxis.semantic==="time" && state.axes.yaxis.semantic==="frequency","spectrogram semantics");
  assert(update["xaxis.range[1]"]===0.5 && update["yaxis.range[0]"]===1,"spectrogram ranges");
  assert(!Object.keys(update).some(key=>/^z|min|max|color/i.test(key)),"color range changed");
  return {axes:state.axes,update};
});

check("73-persistence-resets-frequency-and-power-only",()=>{
  const state=snapshot("persistence",{xaxis:{type:"log"},yaxis:{type:"linear"}},{xaxis:{type:"log",range:[0,5]},yaxis:{type:"linear",range:[-100,-5]}});
  const update=helper.relayout(state);
  assert(state.axes.xaxis.semantic==="frequency" && state.axes.yaxis.semantic==="power","persistence semantics");
  assert(update["xaxis.range[0]"]===0 && update["yaxis.range[1]"]===-5,"persistence ranges");
  return {axes:state.axes,update};
});

check("74-autoscale-is-pane-local-ui-only",()=>{
  const contract=helper.contract;
  assert(/clicked pane/.test(contract.isolation),"pane isolation absent");
  assert(/do not propagate linked axes/.test(contract.isolation),"linked pane isolation absent");
  assert(/do not.*publish settings/.test(contract.isolation),"settings isolation absent");
  assert(/main signal/.test(contract.isolation),"main signal isolation absent");
  return contract;
});

const output={design_version:44,method:"bounded source/contract regression; no new visual component or screenshot",passed:results.filter(item=>item.passed).length,failed:results.filter(item=>!item.passed).length,results};
fs.writeFileSync(path.join(root,"evidence/interaction-regression-v44-task0140.json"),JSON.stringify(output,null,2)+"\n");
process.stdout.write(JSON.stringify(output,null,2));
if(output.failed)process.exitCode=1;
