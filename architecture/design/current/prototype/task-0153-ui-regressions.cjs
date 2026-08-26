const fs=require("fs"),path=require("path"),vm=require("vm");
const root=path.resolve(__dirname,"..");
const context={window:{},Number,Object,Array,String};
vm.runInNewContext(fs.readFileSync(path.join(root,"frontend-source/integration/js/task-0153-ui-regressions.js"),"utf8"),context);
const h=context.window.SignalAnalyserTask0153,results=[];
function ok(value,message){if(!value)throw new Error(message);}
function check(id,run){try{results.push({id,passed:true,detail:run()});}catch(error){results.push({id,passed:false,error:error.message});}}

check("120-graph-doubleclick-is-autoscale-only",()=>{const result=h.plotDoubleClickProjection({xRangeSliderVisible:false,yRangeSliderVisible:true});ok(result.trueAutorange&&!result.sliderVisibilityMutation&&!result.paneMenuMutation&&!result.settingsPageMutation,"side effect");ok(result.xRangeSliderVisible===false&&result.yRangeSliderVisible===true,"visibility changed");return result;});
check("121-doubleclick-target-isolation",()=>{function target(match){return {closest:s=>match[s]||null};}const host={contains:n=>n&&n.owner==="host"},graph={owner:"host"},slider={owner:"host"};ok(h.doubleClickIntent(target({".nsewdrag, .plotly, .plot-container, .svg-container":graph}),host)==="plot_autoscale","graph");ok(h.doubleClickIntent(target({".rangeslider-container, [data-amplitude-slider]":slider}),host)==="in_plot_slider_reset","plot slider");ok(h.doubleClickIntent(target({"[data-screen-range-slider], .settings-field-row[data-range-boundary-validation]":{}}),host)==="settings_range_reset","settings slider");return h.contract.doubleClick;});
check("122-screen-tab-never-blocked-by-autosave",()=>{const result=h.settingsTabIntent("screen",{available:true,applying:true,currentPage:"display",activationToken:8});ok(result.accepted&&result.page==="screen"&&result.backgroundApplyContinues&&!result.blockedByApply&&result.activationToken===9,"screen blocked");return result;});
check("123-all-area-ranges-own-sliders",()=>{const expected={time:2,spectrum:2,spectrogram:3,persistence:3};Object.keys(expected).forEach(type=>{const ranges=h.areaRanges(type);ok(ranges.length===expected[type],type);ok(ranges.every(x=>x.sliderRequired&&x.linkedVisibilityIndependent),type+" slider");});return Object.keys(expected).reduce((out,type)=>(out[type]=h.areaRanges(type).map(x=>x.fieldId),out),{});});
check("124-linked-state-does-not-hide-area-slider",()=>{const spectrum=h.areaRanges("spectrum",{frequency:true,magnitude:true},"db");ok(spectrum.map(x=>x.fieldId).join("|")==="spectrum.frequency_limits|spectrum.y_limits","spectrum linked hidden");const persistence=h.areaRanges("persistence",{frequency:true,magnitude:true},"db");ok(persistence.length===3,"persistence linked hidden");return {spectrum,persistence};});
check("125-footer-actions-primary",()=>{const nodes=[{classList:{values:[],add(v){this.values.push(v);}},dataset:{}},{classList:{values:[],add(v){this.values.push(v);}},dataset:{}}],rootNode={querySelectorAll:()=>nodes};ok(h.decorateFooter(rootNode)===2,"count");ok(nodes.every(n=>n.classList.values[0]==="button-primary"&&n.dataset.footerActionStyle==="primary"),"primary class");return h.contract.footer;});

const output={design_version:55,method:"bounded TASK-0153 UI event/tab/range-slider/primary-action contract regression",passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length,results};
fs.writeFileSync(path.join(root,"evidence/interaction-regression-v55-task0153.json"),JSON.stringify(output,null,2)+"\n");
process.stdout.write(JSON.stringify(output,null,2));
if(output.failed)process.exitCode=1;
