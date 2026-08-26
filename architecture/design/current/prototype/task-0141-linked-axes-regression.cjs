const fs=require("fs");
const path=require("path");
const vm=require("vm");
const root=path.resolve(__dirname,"..");
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,"frontend-source/integration/js/task-0141-linked-axes-area-sliders.js"),"utf8"),context);
const h=context.window.SignalAnalyserTask0141;
const results=[];
function check(id,fn){try{results.push({id,passed:true,detail:fn()});}catch(e){results.push({id,passed:false,error:e.message});}}
function ok(v,m){if(!v)throw new Error(m);}
check("72-short-labels",()=>{ok(h.labels.frequency==="Связать частоты"&&h.labels.magnitude==="Связать магнитуды","labels");return h.labels;});
check("73-frequency-spectrum-persistence",()=>{const u=h.projectLinkedRelayout("frequency",{type:"spectrum",frequencyUnit:"kilohertz",frequencyScale:"linear"},{type:"persistence",frequencyUnit:"hertz",frequencyScale:"log"},{"xaxis.range":[1,1000]});ok(u["xaxis.range[0]"]===3&&u["xaxis.range[1]"]===6,"Hz/log projection");return u;});
check("74-spectrogram-excluded",()=>{ok(!h.linkDescriptor("frequency",{type:"spectrogram"}),"spectrogram linked");return "excluded";});
check("75-db-only-magnitude-power",()=>{ok(h.linkDescriptor("magnitude",{type:"spectrum",scale:"db"}),"spectrum db");ok(h.linkDescriptor("magnitude",{type:"persistence",scale:"db"}),"persistence db");ok(!h.linkDescriptor("magnitude",{type:"persistence",scale:"linear"}),"linear included");return "dB only";});
check("76-area-slider-map",()=>{const ids=h.areaRanges("persistence",{frequency:false,magnitude:false},"db").map(x=>x.fieldId);ok(ids.join("|")==="persistence.frequency_limits|persistence.power_limits|persistence.density_limits","persistence map");ok(h.areaRanges("spectrogram",{time:false},"db").length===3,"spectrogram map");return ids;});
check("77-jet-provider-ownership",()=>{ok(!h.heatmapColorscale,"frontend Jet override exported");ok(/Backend\/provider authors Jet/.test(h.contract.heatmaps),"provider Jet contract");return h.contract.heatmaps;});
check("78-menu-anchor",()=>{const p=h.anchoredMenuPosition({left:890,right:914,top:650,bottom:682},{width:224,height:360},{left:40,top:40,right:920,bottom:700},{width:1024,height:768});ok(!p.close&&p.vertical==="above"&&p.left>=48&&p.top>=48,"placement");return p;});
check("79-menu-offscreen-close",()=>{const p=h.anchoredMenuPosition({left:0,right:20,top:0,bottom:20},{width:224,height:300},{left:40,top:40,right:920,bottom:700},{width:1024,height:768});ok(p.close,"not closed");return p;});
check("80-new-display-provider-ownership",()=>{ok(!h.freshDisplayLayout,"frontend layout factory exported");ok(/Backend\/provider authors/.test(h.contract.freshDisplay)&&/Frontend renders accepted layout\/ids only/.test(h.contract.freshDisplay),"provider layout contract");return h.contract.freshDisplay;});
const output={design_version:45,method:"bounded source/contract regression; accepted components reused; no browser or new screenshot",passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length,results};
fs.writeFileSync(path.join(root,"evidence/interaction-regression-v45-task0141.json"),JSON.stringify(output,null,2)+"\n");
process.stdout.write(JSON.stringify(output,null,2));
if(output.failed)process.exitCode=1;
