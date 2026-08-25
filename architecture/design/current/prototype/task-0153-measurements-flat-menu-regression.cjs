const fs=require("fs"),path=require("path"),vm=require("vm");
const root=path.resolve(__dirname,"..");
const helperPath=path.join(root,"frontend-source/integration/js/task-0148-measurement-cursor-columns.js");
const source=fs.readFileSync(helperPath,"utf8");
const context={window:{},Number,JSON};
vm.runInNewContext(source,context);
const helper=context.window.SignalAnalyserMeasurementCursorColumns;
const results=[];
function ok(value,message){if(!value)throw new Error(message);}
function check(id,run){try{results.push({id,passed:true,detail:run()});}catch(error){results.push({id,passed:false,error:error.message});}}
const host={data:[{legendgroup:"signal-a",x:[0,1],y:[0,1]}],_fullLayout:{xaxis:{title:{text:"Время, s"}},yaxis:{title:{text:"Амплитуда"}}}};
const single={mode:"single",values:[0],host:host,eligible:true};
const controller=helper.createController();
const cursorMarkup=helper.menuMarkup(controller.menuItems("pane",single,"time"),".");
const existingMarkup="<div class='inspector-menu-title'>Видимость измерений</div><button role='menuitemcheckbox' data-measurement-column='minimum'>Минимум</button>";
const merged=existingMarkup+cursorMarkup;
check("126-one-menu-title-no-redundant-subgroup",function(){
  ok((merged.match(/inspector-menu-title/g)||[]).length===1,"expected one menu title");
  ok((merged.match(/Видимость измерений/g)||[]).length===1,"main title missing or duplicated");
  ok(!/Видимость столбцов/.test(merged),"redundant subgroup title remains");
  return {title:"Видимость измерений",redundantTitle:false};
});
check("127-flat-order-measurements-then-cursors",function(){
  const expected=["x1","y1","x2","y2","delta_x","delta_y"];
  const actual=Array.from(cursorMarkup.matchAll(/data-measurement-cursor-column='([^']+)'/g),function(match){return match[1];});
  ok(merged.indexOf("data-measurement-column='minimum'")<merged.indexOf("data-measurement-cursor-column='x1'"),"cursor rows precede existing measurements");
  ok(JSON.stringify(actual)===JSON.stringify(expected),"cursor order changed");
  ok(!/<fieldset|<section|<ul|inspector-menu-title/.test(cursorMarkup),"cursor subgroup wrapper remains");
  return {flatOrder:["existing_measurements"].concat(actual),divider:"absent"};
});
check("128-eye-eligibility-focus-contract-preserved",function(){
  ok((cursorMarkup.match(/role='menuitemcheckbox'/g)||[]).length===6,"six cursor menu rows required");
  ok((cursorMarkup.match(/eye-off\.svg/g)||[]).length===6,"all cursor eyes must start hidden");
  ok((cursorMarkup.match(/ disabled/g)||[]).length===4,"single mode must disable four cursor rows");
  ok(helper.contract.menu.indexOf("No cursor subgroup title")>=0,"flat menu contract missing");
  return {width_px:244,eyes:"preserved",single_enabled:["x1","y1"],focus:"existing roving menu focus unchanged"};
});
const out={design_version:56,method:"bounded TASK-0153 Measurements flat eye-menu source/contract regression; no browser/Figma",passed:results.filter(function(x){return x.passed;}).length,failed:results.filter(function(x){return !x.passed;}).length,results:results};
fs.writeFileSync(path.join(root,"evidence/interaction-regression-v56-task0153-measurements-menu.json"),JSON.stringify(out,null,2)+"\n");
process.stdout.write(JSON.stringify(out,null,2));
if(out.failed)process.exitCode=1;
