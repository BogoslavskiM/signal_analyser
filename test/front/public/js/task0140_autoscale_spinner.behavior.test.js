"use strict";

const fs=require("fs"), path=require("path"), vm=require("vm");
function block(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a);if(a<0||b<0)throw new Error("missing "+start);return source.slice(a,b+end.length);}
function helper(source){const window={};vm.runInNewContext(block(source,"(function registerPlotAutoscaleContract(window)","}(window));"),{window,Object,String,Array,Number},{filename:"task0140-autoscale"});return window.SignalAnalyserPlotAutoscale;}

module.exports=async function(assert){
 const root=path.resolve(__dirname,"../../../.."),app=fs.readFileSync(path.join(root,"public/js/app.js"),"utf8"),css=fs.readFileSync(path.join(root,"public/css/app.css"),"utf8"),h=helper(app);
 assert(h.plotTypes.join(",")==="time,spectrum,spectrogram,persistence","autoscale helper must support every plot type");
 const fixtures=[
   ["time",{xaxis:{range:[1,9]},yaxis:{range:[-2,4]}},{xaxis:{range:[0,10]},yaxis:{range:[-3,5]}},{"xaxis.range[0]":1,"xaxis.range[1]":9,"yaxis.range[0]":-2}],
   ["spectrum",{xaxis:{type:"log",range:[1,5]},yaxis:{range:[-9,-1]}},{xaxis:{range:[0,6],type:"log"},yaxis:{range:[-10,0]}},{"xaxis.range[0]":1,"xaxis.range[1]":5,"yaxis.range[0]":-9}],
   ["spectrogram",{xaxis:{range:[2,8]},yaxis:{type:"log",range:[-3,3]}},{xaxis:{range:[0,10]},yaxis:{range:[-4,4],type:"log"}},{"xaxis.range[0]":2,"xaxis.range[1]":8,"yaxis.range[0]":-3}],
   ["persistence",{xaxis:{type:"log",range:[0,4]},yaxis:{range:[-8,2]}},{xaxis:{range:[-1,5],type:"log"},yaxis:{range:[-9,3]}},{"xaxis.range[0]":0,"xaxis.range[1]":4,"yaxis.range[0]":-8}]
 ];
 fixtures.forEach(([type,source,rendered,expected])=>{const snap=h.capture({plotType:type,sourceLayout:source,fullLayout:rendered,outputIdentity:type+"-r1"}),update=h.relayout(snap);assert(snap.outputIdentity===type+"-r1"&&snap.axes.xaxis.type===(source.xaxis.type||"linear")&&snap.axes.yaxis.type===(source.yaxis.type||"linear"),type+" must capture exact provider/default axes including Plotly log coordinates");Object.keys(expected).forEach(key=>assert(update[key]===expected[key],type+" reset must restore the exact captured range for "+key));assert(update["xaxis.autorange"]===false&&update["yaxis.autorange"]===false,type+" reset must be local explicit ranges, not a broad autorange");});
 const automatic=h.capture({plotType:"time",sourceLayout:{},fullLayout:{xaxis:{range:[0,12]},yaxis:{range:[-1,1]}},outputIdentity:"r2"});
 assert(automatic.axes.xaxis.mode==="automatic_full_domain"&&h.relayout(automatic)["xaxis.range[1]"]===12,"rendered automatic range must be captured when provider omits an explicit range");
 assert(/var sliderEligible=paneHasSignals\(pane\) && \["time", "spectrum"\]/.test(app)&&/if \(!paneHasSignals\(pane\)\) \{[\s\S]*?delete model\.graphDefaultRangeByPane[\s\S]*?delete model\.plotAutoscaleByPane/.test(app),"layout reconciliation must preserve baseline/autoscale for every signal-bearing plot while sliders remain Time/Spectrum-only and empty panes clear state");
 assert(/var outputIdentity=plotOutputIdentity\(pane, queued\);[\s\S]*?var defaultChanged = model\.graphDefaultSignatureByPane\[runtimeKey\] !== defaultSignature;[\s\S]*?if \(defaultChanged\) \{[\s\S]*?delete model\.rangeSliderFullRangeByPane[\s\S]*?autoscale\.capture\(\{ plotType:pane\.plot_type/.test(app),"changed output identity/domain must invalidate derived slider state and recapture the plot baseline only after matching Plotly.react");
 const reset=block(app,"    function resetGraphRange(event)","    host.addEventListener(\"pointerdown\"");
 assert(/autoscale\.relayout\(resetSnapshot\)/.test(reset)&&/Plotly\.relayout\(host, update\)/.test(reset)&&!/queueLinkedTimeRelayout|settings\.|SignalAnalyserApi|main_signal|color/.test(reset),"double-click autoscale must relayout only the clicked host without linked-axis, settings, API or other-pane side effects");
 assert(/\.pane-output-loading-overlay \.ui-loader-spinner,[\s\S]*?animation: loader-rotate 800ms linear infinite;/.test(css)&&/@keyframes loader-rotate/.test(css)&&/@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation: loader-rotate 1600ms linear infinite/.test(css),"overlay spinner must use the defined rotating loader-rotate animation and remain rotating at slower reduced-motion duration");
};
