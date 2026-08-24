"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
function helper(source){const a=source.indexOf("(function registerSignalAnalyserTask0141(window)"),b=source.indexOf("}(window));",a),window={};vm.runInNewContext(source.slice(a,b+"}(window));".length),{window,Object,String,Number,Array,Math,RegExp},{filename:"task0141"});return window.SignalAnalyserTask0141;}
module.exports=async function(assert){
 const root=path.resolve(__dirname,"../../../.."),app=fs.readFileSync(path.join(root,"public/js/app.js"),"utf8"),h=helper(app);
 assert(h.labels.frequency==="Связать частоты"&&h.labels.magnitude==="Связать магнитуды","exact renamed spectral link labels must be published");
 const spectrum={id:"s",plotType:"spectrum",frequencyUnit:"kilohertz",frequencyScale:"linear",valueScale:"db"},persistence={id:"p",plotType:"persistence",frequencyUnit:"megahertz",frequencyScale:"log",valueScale:"db"},spectrogram={id:"g",plotType:"spectrogram",frequencyUnit:"hertz",frequencyScale:"linear",valueScale:"db"};
 const frequency=h.projectLinkedRelayout("frequency",spectrum,persistence,{"xaxis.range":[10,20]});
 assert(frequency["xaxis.range[0]"]===-2&&Math.abs(frequency["xaxis.range[1]"]-Math.log10(0.02))<1e-12&&frequency["xaxis.autorange"]===false,"frequency link must project canonical Hz across units and linear/log coordinates");
 assert(h.linkedTargets("frequency",spectrum,[spectrum,persistence,spectrogram]).map(x=>x.id).join(",")==="p","frequency link must target Persistence only and exclude Spectrogram");
 assert(h.projectLinkedRelayout("magnitude",spectrum,persistence,{"yaxis.range":[-80,-20]})["yaxis.range[1]"]===-20,"dB Spectrum magnitude must link to Persistence power");
 assert(h.linkDescriptor("magnitude",Object.assign({},persistence,{valueScale:"linear"}))===null&&h.linkDescriptor("magnitude",spectrogram)===null,"linear magnitude and density/spectrogram must be rejected from magnitude linking");
 assert(h.areaRanges("time",{time:true,amplitude:true},"linear").map(x=>x.fieldId).join(",")==="","linked Time fields must be hidden from the active Area slider set");
 assert(h.areaRanges("spectrum",{frequency:false,magnitude:true},"db").map(x=>x.fieldId).join(",")==="spectrum.frequency_limits"&&h.areaRanges("persistence",{frequency:false,magnitude:true},"linear").map(x=>x.fieldId).join(",")==="persistence.frequency_limits,persistence.power_limits,persistence.density_limits","Area ranges must be active-pane scoped, hide linked dB fields, retain linear rejected power, and keep density independent");
 assert(h.areaRanges("spectrogram",{},"db").map(x=>x.fieldId).join(",")==="time.x_limits,spectrogram.frequency_limits,spectrogram.power_limits","Spectrogram must expose all three applicable dual-handle ranges");
 const below=h.anchoredMenuPosition({left:900,right:940,top:700,bottom:730},{width:224,height:220},{left:0,top:0,right:1000,bottom:800},{width:1200,height:900});
 assert(below.close===false&&below.vertical==="above"&&below.left>=8&&below.top>=8,"pane menu must flip within shell∩viewport with 8px inset");
 assert(h.anchoredMenuPosition({left:-100,right:-50,top:0,bottom:20},{width:224,height:200},{left:0,top:0,right:1000,bottom:800},{width:1200,height:900}).close,"outside/disconnected anchor must close pane menu");
 assert(/document\.addEventListener\("scroll", positionPaneMenu, true\)/.test(app)&&/window\.addEventListener\("resize", function \(\) \{[\s\S]*?positionPaneMenu/.test(app)&&/if \(result\.close\) return closePaneMenu\(true\)/.test(app),"pane menu must reposition on capture-scroll/resize and restore focus on boundary close");
 assert(/screen-range-slider[\s\S]*?data-screen-range-input='min'[\s\S]*?data-screen-range-input='max'/.test(app)&&/keepAutomaticRangeInputsEmpty\([\s\S]*?settings\.setValue\(fieldId, \{ min:"", max:"" \}\)/.test(app),"all applicable Area ranges must reuse dual handles with blank automatic endpoints and double-click reset");
 assert(/linkedTargets\("frequency"[\s\S]*?projectLinkedRelayout\("frequency"/.test(app)&&/axisLinkSuppressByPane/.test(app),"linked relayout must filter targets and suppress echo propagation");
};
