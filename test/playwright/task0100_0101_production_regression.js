"use strict";

// Foreground production regression for TASK-0100/TASK-0101.  It intentionally
// owns only the temporary Display it creates and leaves all pre-existing state
// byte-for-byte intact.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright-core");

const target = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/";
const revision = "5bf4f95e4ca2db2da7bb0ce4f76f2858b54c9e02";
const out = path.resolve(__dirname, "artifacts/TASK-0101-DROPDOWNS-LOADERS");
const prototype = `file://${path.resolve(__dirname, "../../architecture/design/TASK-0080-explicit-apply-flow/prototype/index.html")}`;
const report = { id:"HND-TASK-0100-0101", e2e_mode:"new_functionality_regression", target, expected_revision:revision, design_version:17, applied_skills:["e2e/e2e-workflow","e2e/visual-analysis"], browser_channel:"chrome", headless:false, browser_visibility:"foreground", worker_count:1, checks:[], errors:[], screenshots:[], opened_tab_count:0, closed_tab_count:0, network:[] };
const ok = (name, pass, data={}) => report.checks.push({name, status:pass ? "passed" : "failed", data});
const activate = p => p.bringToFront().then(() => { try { execFileSync("osascript", ["-e", 'tell application "Google Chrome" to activate']); } catch (_) {} });
const save = () => { fs.mkdirSync(out,{recursive:true}); fs.writeFileSync(path.join(out,"report.json"),JSON.stringify(report,null,2)+"\n"); };
const norm = s => ({active:s.active_display_id, displays:(s.displays||[]).map(x=>({id:x.id,name:x.name})), layouts:(s.layouts||[]).map(x=>({display_id:x.display_id,layout:x.layout}))});
const state = p => p.evaluate(async()=> (await fetch("./api/state-lite",{cache:"no-store"})).json());
const sleep = ms => new Promise(r=>setTimeout(r,ms));
async function screenshot(p,name){const f=path.join(out,name);await p.screenshot({path:f,fullPage:true});report.screenshots.push(name);}
async function probePrototype(p) {
  await activate(p); await p.setViewportSize({width:1024,height:768}); await p.goto(prototype,{waitUntil:"load"});
  await p.waitForFunction(()=>!!window.__TASK0080_DESIGN__);
  const trigger=p.locator("[data-select-key='plot:pane-time']"); await trigger.click();
  const search=p.locator("[data-select-search]"); await search.fill("персист");
  ok("prototype pane menu search",(await p.getByRole("option").allInnerTexts()).join("|")==="Спектр персистентности");
  await screenshot(p,"prototype-v17-pane-search-1024x768.png"); await p.keyboard.press("Escape");
  await p.setViewportSize({width:1440,height:900});
  for(const key of ["field:display.plot_type","field:time.units"]){const x=p.locator(`[data-select-key='${key}']`); await x.click(); ok(`prototype ${key} popup`,await p.locator("[data-design-id='select-menu']").isVisible()); await p.keyboard.press("Escape");}
  await p.locator("[data-settings-page='peaks']").click(); await p.locator("[data-select-key='peaks:mode']").click(); await screenshot(p,"prototype-v17-extrema-menu-1440x900.png"); await p.keyboard.press("Escape");
}
async function menuAudit(p, trigger, key) {
  const before=report.network.length;
  await trigger.scrollIntoViewIfNeeded(); await trigger.click();
  const menu=p.locator("[data-testid='value-selector-menu']"); const search=p.locator("[data-testid='value-selector-search']");
  await menu.waitFor({state:"visible",timeout:15000});
  const data=await p.evaluate(({key})=>{const t=document.querySelector(`[data-testid='value-selector-trigger'][data-selector-key='${CSS.escape(key)}']`)||document.activeElement;const m=document.querySelector("[data-testid='value-selector-menu']"),s=document.querySelector("[data-testid='value-selector-search']"),sel=m&&m.querySelector("[aria-selected='true']");const b=x=>x&&x.getBoundingClientRect();const cs=x=>x&&getComputedStyle(x);return{trigger:b(t),menu:b(m),triggerStyle:t&&{height:cs(t).height,border:cs(t).borderWidth,radius:cs(t).borderRadius,bg:cs(t).backgroundColor},menuStyle:m&&{bg:cs(m).backgroundColor,maxHeight:cs(m).maxHeight,position:cs(m).position},focus:document.activeElement===s,search:!!s,selected:sel&&{text:sel.textContent.trim(),bg:cs(sel).backgroundColor,check:!!sel.querySelector(".value-selector-check,.select-option-check,[data-selector-check]")},viewport:{w:innerWidth,h:innerHeight}}},{key});
  const geo=data.menu&&data.menu.width>=244&&data.menu.left>=7&&data.menu.top>=7&&data.menu.right<=data.viewport.w+1&&data.menu.bottom<=data.viewport.h+1;
  ok(`${key}: framed trigger, white clamped searchable popup`,!!data.search&&data.focus&&data.menuStyle.bg==="rgb(255, 255, 255)"&&geo,data);
  const first=menu.locator("[role='option']:not([aria-disabled='true'])").first(); if(await first.count()){await first.hover(); const hover=await first.evaluate(x=>getComputedStyle(x).backgroundColor);ok(`${key}: gray hover`,hover==="rgb(245, 245, 245)",{hover});}
  await search.fill("__not_found__"); ok(`${key}: no-match`,await menu.getByText("Ничего не найдено",{exact:true}).isVisible().catch(()=>false)); await search.fill(""); await p.keyboard.press("End"); await p.keyboard.press("Escape");
  ok(`${key}: close restores trigger focus`,await trigger.evaluate(x=>document.activeElement===x).catch(()=>false));
  const writes=report.network.slice(before).filter(x=>x.method!=="GET"&&/\/api\/(layouts|outputs|settings|peaks)/.test(x.url)); ok(`${key}: open/search/cancel makes no writes`,writes.length===0,{writes});
}
async function selectType(p,label){const t=p.locator("[data-testid='pane-plot-type-trigger']").first();await t.click();const s=p.locator("[data-testid='value-selector-search']");await s.fill(label);await p.getByRole("option",{name:label,exact:true}).click();}
async function production(p) {
  await activate(p); await p.setViewportSize({width:1440,height:900}); await p.goto(target,{waitUntil:"domcontentloaded",timeout:120000}); await p.getByTestId("app-shell").waitFor({state:"visible",timeout:180000});
  const status=await p.evaluate(async()=>{const r=await fetch("./api/status",{cache:"no-store"});return{code:r.status,body:await r.json()}}); ok("production exact ready revision",status.code===200&&status.body.ready&&status.body.runtime_revision===revision,status); if(!(status.body.ready&&status.body.runtime_revision===revision))throw Error("revision gate: "+JSON.stringify(status));
  report.baseline=norm(await state(p)); const ids=report.baseline.displays.map(x=>x.id);
  const w=p.waitForResponse(r=>/\/api\/displays(?:\?|$)/.test(r.url())&&r.request().method()==="POST",{timeout:60000}); await p.getByTestId("add-display").click(); ok("temporary Display created",(await w).status()===200);
  const created=(await state(p)).displays.map(x=>x.id).filter(x=>!ids.includes(x)); if(created.length!==1)throw Error("unsafe Display identity "+JSON.stringify(created)); report.created_display_id=created[0];
  const pane=await p.locator("[data-testid^='pane-plot-type-trigger']").first(); await menuAudit(p,pane,"pane.plot_type");
  const types=["Временная область","Спектр","Спектрограмма","Спектр персистентности"];
  for(const type of types){await selectType(p,type); await sleep(100); const triggers=p.locator("[data-testid='value-selector-trigger']:visible"); const count=await triggers.count(); ok(`${type}: has visible unified settings selectors`,count>0,{count}); for(let i=0;i<Math.min(count,8);i++){await menuAudit(p,triggers.nth(i),`${type}#${i}`);}}
  const extrema=p.getByTestId("settings-tab-peaks");await extrema.click(); const ext=p.getByTestId("extrema-mode-trigger");await menuAudit(p,ext,"extrema.mode");
  // loader contract: bind a pre-existing signal in isolated pane, retain spinner through several parent UI renders.
  await p.getByTestId("inspector-tab-signals").click(); const sig=await p.locator("input[data-visible-signal]").first(); if(await sig.count()){await sig.check(); const spinner=p.locator("[data-testid^='pane-loader-'] .spinner,.plot-initial-loading .spinner").first();await spinner.waitFor({state:"visible",timeout:30000});const snapshot=await spinner.evaluate(x=>{window.__task0100=x;return{w:getComputedStyle(x).width,h:getComputedStyle(x).height,b:getComputedStyle(x).borderTopWidth,a:getComputedStyle(x).animationDuration,t:getComputedStyle(x).animationTimingFunction,i:getComputedStyle(x).animationIterationCount}});const samples=[];for(let i=0;i<9;i++){samples.push(await spinner.evaluate(x=>{const m=getComputedStyle(x).transform;const q=m==="none"?0:new DOMMatrixReadOnly(m);return(Math.atan2(q.b||0,q.a||1)*180/Math.PI+360)%360}));if(i<8)await p.waitForTimeout(110);}const quads=new Set(samples.map(a=>Math.floor(a/90))).size;const stable=await spinner.evaluate(x=>x===window.__task0100&&x.isConnected);ok("graph loader stable identity/full linear cycle",stable&&snapshot.w==="28px"&&snapshot.h==="28px"&&snapshot.b==="3px"&&snapshot.a==="0.8s"&&snapshot.t==="linear"&&snapshot.i==="infinite"&&quads===4,{snapshot,samples,quads,stable});await screenshot(p,"production-loader-pending.png");}
}
(async()=>{let browser,context,proto,prod;try{fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({channel:"chrome",headless:false,args:["--allow-file-access-from-files"]});context=browser.contexts()[0]||await browser.newContext();report.preexisting_page_urls=context.pages().map(x=>x.url());proto=await context.newPage();report.opened_tab_count++;await probePrototype(proto);prod=await context.newPage();report.opened_tab_count++;prod.on("request",r=>{if(/\/api\//.test(r.url()))report.network.push({method:r.method(),url:r.url()})});await production(prod);}catch(e){report.errors.push(String(e&&e.stack||e));}finally{if(prod&&!prod.isClosed()&&report.created_display_id){try{await activate(prod);const now=await state(prod);if(now.displays.some(x=>x.id===report.created_display_id)){if(now.active_display_id!==report.created_display_id)await prod.getByTestId(`display-tab-${report.created_display_id}`).click();const w=prod.waitForResponse(r=>/\/api\/displays(?:\?|$)/.test(r.url())&&r.request().method()==="POST",{timeout:60000});await prod.getByTestId(`display-close-${report.created_display_id}`).click();ok("temporary Display removed",(await w).status()===200);await prod.waitForFunction(id=>!document.querySelector(`[data-testid='display-tab-${CSS.escape(id)}']`),report.created_display_id,{timeout:60000});}const final=norm(await state(prod));report.restoration={baseline_exact:JSON.stringify(final)===JSON.stringify(report.baseline),final};ok("pre-existing state restored byte-for-byte",report.restoration.baseline_exact);}catch(e){report.errors.push("restoration: "+String(e&&e.stack||e));}}for(const p of [proto,prod])if(p&&!p.isClosed()){try{await p.close();report.closed_tab_count++;}catch(e){report.errors.push("close: "+e)}}report.tab_cleanup_status=report.opened_tab_count===report.closed_tab_count?"passed":"failed";save();if(browser)await browser.close();console.log(JSON.stringify({checks:report.checks.length,failed:report.checks.filter(x=>x.status==="failed").length,errors:report.errors,cleanup:report.tab_cleanup_status}));if(report.errors.length||report.checks.some(x=>x.status==="failed"))process.exitCode=1;}})();
