const fs=require("fs"),path=require("path"),vm=require("vm");
const root=path.resolve(__dirname,"..");
const nodes={};
function node(){return {hidden:false,dataset:{},inert:false,isConnected:true,firstChild:null,children:[],attributes:{},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},querySelector(s){return this.children.find(x=>s===".app-bootstrap-spinner"&&x.className==="app-bootstrap-spinner")||null;},insertBefore(x){this.children.unshift(x);this.firstChild=x;},addEventListener(){},focus(){this.focused=true;}};}
["host","shell","loading","error","retry","loadingText","errorText"].forEach(k=>nodes[k]=node());
nodes.loading.querySelector=s=>s===".app-bootstrap-spinner"?nodes.loading.children.find(x=>x.className==="app-bootstrap-spinner")||null:s==="[data-loading-text]"?nodes.loadingText:null;
nodes.error.querySelector=s=>s==="[data-error-text]"?nodes.errorText:null;
const document={querySelector(s){return ({".app-status":nodes.host,"[data-testid='app-shell']":nodes.shell,"[data-testid='app-loading']":nodes.loading,"[data-testid='app-error']":nodes.error,"[data-retry]":nodes.retry})[s]||null;},createElement(){return node();}};
let timers=[];const window={setTimeout(fn){timers.push(fn);return timers.length;},clearTimeout(){},requestAnimationFrame:fn=>fn(),CustomEvent:function(n,o){this.type=n;this.detail=o.detail;},dispatchEvent(){},addEventListener(){}};
const context={window,document,Number,JSON};
vm.runInNewContext(fs.readFileSync(path.join(root,"frontend-source/integration/js/task-0143-bootstrap-loader.js"),"utf8"),context);
vm.runInNewContext(fs.readFileSync(path.join(root,"frontend-source/integration/js/task-0144-synchronized-ranges.js"),"utf8"),context);
const b=window.SignalAnalyserBootstrapLoading,r=window.SignalAnalyserSynchronizedRanges,results=[];
function check(id,fn){try{results.push({id,passed:true,detail:fn()});}catch(e){results.push({id,passed:false,error:e.message});}}
function ok(v,m){if(!v)throw new Error(m);}
check("86-bootstrap-barrier",()=>{const t=b.begin();b.acceptInitialState(t);b.acceptActiveSettings(t);ok(b.state().phase==="loading","closed before render");b.commitInitialRender(t);ok(b.state().phase==="ready","not ready");return b.requiredMilestones;});
check("87-stale-retry-guard",()=>{const old=b.begin(),fresh=b.begin();ok(!b.acceptInitialState(old),"stale accepted");ok(b.state().token===fresh,"fresh dismissed");return b.state();});
check("88-bootstrap-error-contract",()=>{const t=b.begin();b.fail(t,"request");ok(b.state().phase==="error"&&nodes.shell.inert,"not blocked error");ok(!/ArgumentError|Engee|Settings Signal/.test(b.sanitizedError),"raw copy");return b.sanitizedError;});
check("89-range-grouping",()=>{["time","spectrum","spectrogram","persistence"].forEach(t=>{const g=r.grouping(t);ok(g.ranges.title==="Диапазоны"&&g.ranges.collapsible,"group "+t);});return r.grouping("time");});
check("90-log-and-auto-projection",()=>{const d=r.descriptors("spectrum")[0],p=r.settingsProjection({"xaxis.range":[2,3]},d,{axisScale:"log",unit:"kilohertz"});ok(p.min===100&&p.max===1000,"log projection");const reset=r.plotlyProjection({auto:true},d,{});ok(reset["xaxis.autorange"]===true&&reset["xaxis.rangeslider.autorange"]===true,"auto reset");return {p,reset};});
check("91-settle-contract",()=>{ok(r.settleDelayMs===150&&/plotly_relayouting/.test(r.contract.liveProjection)&&/plotly_relayout/.test(r.contract.settleBoundary),"settle boundary");return r.contract;});
const out={design_version:48,method:"bounded controller/contract regression; reused visual tokens; no browser or screenshot",passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length,results};
fs.writeFileSync(path.join(root,"evidence/interaction-regression-v48-task0143-0144.json"),JSON.stringify(out,null,2)+"\n");
process.stdout.write(JSON.stringify(out));if(out.failed)process.exitCode=1;
