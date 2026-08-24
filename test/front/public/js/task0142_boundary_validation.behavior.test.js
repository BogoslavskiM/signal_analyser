"use strict";

const fs=require("fs"),path=require("path"),vm=require("vm");

function task0142(source) {
  const start=source.indexOf("(function registerSignalAnalyserTask0142(window)"), end=source.indexOf("}(window));",start);
  const window={};
  vm.runInNewContext(source.slice(start,end+"}(window));".length),{window,Object,String,Number,Array,Math,RegExp},{filename:"settings-task0142"});
  return window.SignalAnalyserTask0142;
}

module.exports=async function(assert) {
  const root=path.resolve(__dirname,"../../../.."), settings=fs.readFileSync(path.join(root,"public/js/settings.js"),"utf8"), css=fs.readFileSync(path.join(root,"public/css/app.css"),"utf8"), h=task0142(settings);
  assert(h.enabledContract({applicable:true,busy:false}).minDisabled===false&&h.enabledContract({applicable:true,busy:false}).maxDisabled===false,"applicable automatic, slider and linked range endpoints must remain enabled");
  assert(h.enabledContract({applicable:false,busy:false}).minDisabled===true&&h.enabledContract({applicable:true,busy:true}).maxDisabled===true,"only true inapplicability or a pending settings mutation may disable endpoints");
  assert(h.enabledContract({}).ignoredDisableReasons.join(",")==="automatic,slider,linked","automatic/slider/link state must not be a disable reason");
  const both=h.projectPair({min:{valid:false,reason:"number"},max:{valid:false,reason:"domain"}});
  assert(both.min.ariaInvalid==="true"&&both.max.ariaInvalid==="true"&&both.message==="Введите число для минимума."&&both.messageBoundary==="min","both invalid endpoints must paint independently while the first message is minimum");
  const afterLeftFix=h.projectPair({min:{valid:true},max:{valid:false,reason:"domain"}});
  assert(afterLeftFix.min.ariaInvalid==="false"&&afterLeftFix.max.ariaInvalid==="true"&&afterLeftFix.message==="Максимум вне допустимого диапазона.","after a fixed minimum only the maximum remains red and becomes the local message");
  const order=h.projectPair({min:{valid:false,reason:"order"},max:{valid:false,reason:"order"}});
  assert(order.min.message==="Минимум должен быть меньше максимума."&&order.max.message==="Максимум должен быть больше минимума.","order failures must preserve distinct boundary semantics");
  assert(h.boundaryResult("min",{valid:false,reason:"finite"}).message==="Минимум должен быть конечным."&&h.boundaryResult("max",{valid:false,reason:"unit"}).message==="Максимум нельзя представить в выбранных единицах.","number, finite, unit and domain errors must use concise local messages");
  assert(h.boundaryResult("min",{valid:true}).ariaInvalid==="false"&&h.projectPair().hasError===false,"blank automatic endpoints must be a valid unpainted state");
  assert(/clearTimeout\(context\.timers\[item\.id\]\);\s*delete context\.timers\[item\.id\];[\s\S]*?draft\.error = validation && validation\.message/.test(settings)&&/if \(!item \|\| item\.pseudo \|\| rangeItem\(item\) \|\| item\.visible === false \|\| !context\.displayId \|\| !context\.drafts\[item\.id\] \|\| context\.drafts\[item\.id\]\.error\) return Promise\.resolve\(\);/.test(settings),"an invalid range cancels its local debounce, and a viewport range never reaches updateSetting");
  assert(/providerMessage=.*?error\.message[\s\S]*?\/ArgumentError\|TypeError\|MethodError\|Stacktrace/.test(settings)&&/"Не удалось сохранить черновик\."/.test(settings),"raw server ArgumentError text must be replaced with a sanitized save failure");
  assert(/aria-invalid='"\+projected\.min\.ariaInvalid\+"'[\s\S]*?aria-invalid='"\+projected\.max\.ariaInvalid\+"'/.test(settings)&&/class='settings-field-row"\+\(invalid \? isRange \? " has-range-error"/.test(settings),"each range endpoint must own its aria-invalid state instead of a pair error state");
  assert(/range-control \{[\s\S]*?border-color: transparent;/.test(css)&&/\.control\[aria-invalid="true"\][\s\S]*?border: 2px solid var\(--danger\)/.test(css)&&!/has-range-error[^}]*border:\s*2px/.test(css),"red borders must belong to invalid inputs only, never the row, wrapper or pair");
  const app=fs.readFileSync(path.join(root,"public/js/app.js"),"utf8");
  assert(/function settingsRangeDomains\(draft\)[\s\S]*?screenRangeDomain\([\s\S]*?domains\["persistence\.density_limits"\]=\[0, 100\]/.test(app)&&/settings\.setRangeDomains\(settingsRangeDomains\(draft\)\)/.test(app)&&/settings\.setRangeDomains\(settingsRangeDomains\(screenDraftFor\(display\)\)\)/.test(app),"active Area and Screen settings must project their own full-domain range validation");
};
