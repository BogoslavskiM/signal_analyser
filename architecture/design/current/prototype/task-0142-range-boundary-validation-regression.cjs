const fs=require("fs");
const path=require("path");
const vm=require("vm");
const root=path.resolve(__dirname,"..");
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,"frontend-source/integration/js/task-0142-range-boundary-validation.js"),"utf8"),context);
const h=context.window.SignalAnalyserTask0142;
const css=fs.readFileSync(path.join(root,"frontend-source/integration/css/task-0142-range-boundary-validation.css"),"utf8");
const results=[];
function check(id,fn){try{results.push({id,passed:true,detail:fn()});}catch(error){results.push({id,passed:false,error:error.message});}}
function ok(value,message){if(!value)throw new Error(message);}

check("81-applicable-auto-fields-enabled",()=>{
  const automatic=h.enabledContract({applicable:true,busy:false,automatic:true,slider:false,linked:true});
  ok(!automatic.minDisabled&&!automatic.maxDisabled,"automatic/link state disabled inputs");
  const busy=h.enabledContract({applicable:true,busy:true});
  ok(busy.minDisabled&&busy.maxDisabled,"busy did not disable inputs");
  return {automatic,busy};
});
check("82-independent-boundary-borders",()=>{
  const pair=h.projectPair({min:{valid:false,reason:"number"},max:{valid:false,reason:"finite"}});
  ok(pair.min.invalid&&pair.max.invalid,"both invalid states must survive");
  ok(pair.pairBorder===false&&pair.rowBorder===false,"pair/row border forbidden");
  ok(/aria-invalid=\"true\"/.test(css)&&/border:\s*2px solid var\(--danger\)/.test(css),"per-input red border missing");
  return pair;
});
check("83-left-message-priority",()=>{
  const both=h.projectPair({min:{valid:false,reason:"domain"},max:{valid:false,reason:"unit"}});
  ok(both.messageBoundary==="min"&&both.message==="Минимум вне допустимого диапазона.","left message must win");
  const right=h.projectPair({min:{valid:true},max:{valid:false,reason:"unit"}});
  ok(right.messageBoundary==="max"&&right.message==="Максимум нельзя представить в выбранных единицах.","right message must follow fixed left");
  return {both,right};
});
check("84-local-reason-copy",()=>{
  ["number","finite","domain","order","unit"].forEach(reason=>{
    ok(h.messages.min[reason]&&h.messages.max[reason],"missing "+reason);
    ok(!/ArgumentError|Settings Signal Analyser|Engee|backend/i.test(h.messages.min[reason]+h.messages.max[reason]),"internal copy leaked");
  });
  return h.messages;
});
check("85-blank-auto-contract",()=>{
  ok(/blank endpoint remains valid automatic/.test(h.contract.blank),"blank auto contract missing");
  return h.contract.blank;
});

const output={design_version:46,method:"bounded source/contract regression; existing field/error tokens reused; no new screenshot",passed:results.filter(item=>item.passed).length,failed:results.filter(item=>!item.passed).length,results};
fs.writeFileSync(path.join(root,"evidence/interaction-regression-v46-task0142.json"),JSON.stringify(output,null,2)+"\n");
process.stdout.write(JSON.stringify(output,null,2));
if(output.failed)process.exitCode=1;
