"use strict";
const fs=require("fs"), path=require("path"), vm=require("vm");
function helper(app){const a=app.indexOf("(function registerSignalSamplesCalculatedColumns(window)"),b=app.indexOf("}(window));",a),window={};vm.runInNewContext(app.slice(a,b+"}(window));".length),{window,Array,Object},{filename:"task0138"});return window.SignalSamplesCalculatedColumns;}
module.exports=async function(assert){
 const root=path.resolve(__dirname,"../../../.."),app=fs.readFileSync(path.join(root,"public/js/app.js"),"utf8"),css=fs.readFileSync(path.join(root,"public/css/app.css"),"utf8"),h=helper(app);
 assert(h.baseColumns.map(x=>x.id).join(",")==="sample_index,time,value"&&h.optionalColumns.map(x=>x.id).join(",")==="magnitude,square,signed_square_root_magnitude","base and three supported calculated sample columns must be exact");
 const none=h.visibleColumns(h.defaultVisibility()); assert(none.length===3&&none.every((x,i)=>x.id===["sample_index","time","value"][i]),"all optional calculated columns must be hidden by default");
 const on=h.toggle(h.defaultVisibility(),"signed_square_root_magnitude"); assert(on.signed_square_root_magnitude&&h.visibleColumns(on).length===4&&h.rowProjection({square_root:17,signed_square_root_magnitude:-4},on).find(x=>x.id==="signed_square_root_magnitude").value===-4,"toggle must project the supported provider field only, never browser math");
 assert(h.optionalColumns.every(x=>x.id!=="square_root")&&!h.visibleColumns(on).some(x=>x.id==="square_root"),"Root must be absent from the Values UI helper and visible projection");
 assert(/standaloneAction:false[\s\S]*?submit:"Enter on sample-point-search-input"[\s\S]*?persistentStatus:false/.test(app)&&!/sample-point-search-action/.test(app),"point search must be Enter-only without standalone action or persistent status");
 assert(/errorStatus=state\.searchState === "error"/.test(app)&&/data-testid='sample-columns-menu-trigger'/.test(app)&&/placement:"final search-row slot"/.test(app),"only compact errors may render before the final search-row eye menu trigger");
 assert(/function toggleSampleColumn\(columnId\)[\s\S]*?scrollTop[\s\S]*?model\.sampleColumnsVisibility=helper\.toggle[\s\S]*?renderSignalSamplesInspector[\s\S]*?scroll\.scrollTop=scrollTop[\s\S]*?renderSampleColumnsMenu[\s\S]*?restored\.focus/.test(app),"column toggles must retain window/scroll, menu and focused menu row without API calls");
 assert(/closeSampleColumnsMenu/.test(app)&&/event\.key === "Escape"/.test(app)&&/ArrowDown|ArrowUp/.test(app)&&/event\.key === "Home"[\s\S]*?event\.key === "End"/.test(app),"menu must support Escape/outside and Arrow/Home/End keyboard navigation");
 assert(/data-sample-column='sample_index'[\s\S]*?markerMarkup/.test(app)&&/footer=controller \? controller\.footer/.test(app)&&/markerMap/.test(app),"dynamic cells must preserve point-marker ordering, pagination footer, and extrema markers");
 assert(/\.sample-table \{ table-layout: auto; \}/.test(css)&&!/data-sample-column="square_root"/.test(css)&&/signed_square_root_magnitude/.test(css),"calculated columns require compact table CSS widths without Root column styling");
};
