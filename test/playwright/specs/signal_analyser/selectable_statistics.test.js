"use strict";
const { openAppPage, testIdSelector } = require("../../support/app_page");
const { endpointMatches, responseJson, waitForApi, waitForSettled } = require("../../support/signal_analyser_page");
const IDS = ["minimum", "maximum", "mean", "median", "peak_to_peak", "rms"];
const DEFAULTS = IDS.slice(0, 3);
const T = 30000;
function option(page, c, id) { return page.locator(testIdSelector(`${c.app.testIds.statisticsOptionPrefix}${id}`)); }
function shell(page, c) { return page.locator(testIdSelector(c.app.testIds.shell)); }
async function mutate(page, c, input, checked, label) {
  const before = Number(await shell(page, c).getAttribute("data-state-revision")); const requests = [];
  const on = r => { if (endpointMatches({ request: () => r, url: () => r.url() }, c.app.api.view, "POST")) requests.push(r); };
  page.on("request", on); try { const responseP = waitForApi(page, c, c.app.api.view, "POST"); await input.setChecked(checked, { timeout:T }); const response = await responseP; if (!response.ok() || requests.length !== 1) throw new Error(`${label} must make exactly one successful view mutation`); const state = await responseJson(response,label); if (state.state_revision !== before + 1) throw new Error(`${label} must increment revision once`); return state; } finally { page.off("request",on); }
}
async function testSelectable({appUrl,assert,config,log,page,step,useCurrentPage}) {
  let original=[]; let originalDisplay=""; let created=""; let originalRows=[]; let originalRoi=null; let originalSource="";
  try {
    await step("open Statistics settings and bottom Measurements locally", async()=>{
      await openAppPage(page,{appUrl,config,log,useCurrentPage});
      const action=page.locator(testIdSelector(config.app.testIds.signalStatisticsAction)); await action.click();
      assert(await page.locator(testIdSelector(config.app.testIds.statisticsSettingsTab)).getAttribute("aria-selected")==="true","Signal statistics must open Measurements settings");
      assert(await page.locator(testIdSelector(config.app.testIds.measurements.measurementsTab)).getAttribute("aria-selected")==="true","Signal statistics must open bottom Measurements output");
      original=await Promise.all(IDS.map(async id=>await option(page,config,id).isChecked()));
      assert(JSON.stringify(IDS.filter((_,i)=>original[i]))===JSON.stringify(DEFAULTS),"default statistic kinds/order must be Minimum Maximum Mean");
      originalDisplay=await shell(page,config).getAttribute("data-active-display-id");
      originalRows=(await require("../../support/signal_analyser_page").signalRowsState(page,config)).filter(row=>row.checked);
      originalSource=(await require("../../support/signal_analyser_page").signalRowsState(page,config)).find(row=>row.rowSelected).name;
      originalRoi={min:await page.locator(testIdSelector(config.app.testIds.timeMinInput)).inputValue(),max:await page.locator(testIdSelector(config.app.testIds.timeMaxInput)).inputValue()};
    });
    await step("canonical selection drives returned rows and equal state is no-op", async()=>{
      const state=await mutate(page,config,option(page,config,"median"),true,"enable Median");
      assert(JSON.stringify(state.measurement_kinds)===JSON.stringify(["minimum","maximum","mean","median"]),"root canonical measurement_kinds must preserve defined order");
      const active=(state.displays||[]).find(d=>d.id===state.active_display_id);
      assert(active&&JSON.stringify(active.measurement_kinds)===JSON.stringify(state.measurement_kinds),"active Display must expose same canonical selection");
      const rows=page.locator(`[data-testid^=${JSON.stringify("measurement-row-")}]`); assert(await rows.count()===4,"bottom rows must exactly match selected kinds");
      const min=page.locator(testIdSelector(config.app.testIds.timeMinInput)); const max=page.locator(testIdSelector(config.app.testIds.timeMaxInput)); const lo=Number(await min.inputValue()); const hi=Number(await max.inputValue());
      await min.fill(String(lo+(hi-lo)*0.2)); await max.fill(String(lo+(hi-lo)*0.8)); const roiP=waitForApi(page,config,config.app.api.view,"POST"); await max.press("Enter"); const roi=await responseJson(await roiP,"statistics ROI recompute"); await waitForSettled(page,config);
      assert(roi.measurements.state_revision===roi.state_revision && roi.measurements.items.length===4,"ROI mutation must recompute selected authoritative Statistics rows");
      const revision=roi.state_revision; await option(page,config,"median").setChecked(true); await page.waitForTimeout(80); assert(Number(await shell(page,config).getAttribute("data-state-revision"))===revision,"equal selection must be no-op");
    });
    await step("A/B and Clear/re-add retain page-local selection", async()=>{
      const createP=waitForApi(page,config,config.app.api.displays,"POST"); await page.locator(testIdSelector(config.app.testIds.addDisplay)).click(); await createP; await waitForSettled(page,config); created=await shell(page,config).getAttribute("data-active-display-id");
      assert(await option(page,config,"median").isChecked()===false,"new Display must retain defaults independently");
      const selectP=waitForApi(page,config,config.app.api.displays,"POST"); await page.locator(testIdSelector(`display-tab-${originalDisplay}`)).click(); await selectP; await waitForSettled(page,config);
      assert(await option(page,config,"median").isChecked(),"returning to Display A restores its selected kinds");
      const clearP=waitForApi(page,config,config.app.api.view,"POST"); await page.locator(testIdSelector(config.app.testIds.displayOverflowTrigger)).click(); await page.locator(testIdSelector(config.app.testIds.clearDisplayAction)).click(); const cleared=await responseJson(await clearP,"clear statistics"); await waitForSettled(page,config);
      assert(JSON.stringify(cleared.measurement_kinds)===JSON.stringify(["minimum","maximum","mean","median"]),"Clear must preserve selected statistics preference");
      assert(await option(page,config,"median").isDisabled(),"empty Display must disable statistics controls");
      assert(cleared.measurements && cleared.measurements.signal_name===null && cleared.measurements.ordinate===null && cleared.measurements.items.length===0,"Clear must publish typed empty Measurements output");
      const member=originalRows[0]; const readdP=waitForApi(page,config,config.app.api.view,"POST"); await page.locator(testIdSelector(member.checkboxTestId)).setChecked(true); const readded=await responseJson(await readdP,"re-add statistics"); await waitForSettled(page,config);
      assert(JSON.stringify(readded.measurement_kinds)===JSON.stringify(cleared.measurement_kinds) && readded.measurements.items.length===4,"first re-add must recompute preserved selected statistics");
    });
  } finally { try{if(created){const p=waitForApi(page,config,config.app.api.displays,"POST");await page.locator(testIdSelector(`display-tab-${created}`)).click();await p;const closeP=waitForApi(page,config,config.app.api.displays,"POST");await page.locator(testIdSelector(`close-display-${created}`)).click();await closeP;await waitForSettled(page,config);}}catch(e){log(`cleanup statistics Display: ${e.message}`);} try { if(originalDisplay){if(await shell(page,config).getAttribute("data-active-display-id")!==originalDisplay){const p=waitForApi(page,config,config.app.api.displays,"POST");await page.locator(testIdSelector(`display-tab-${originalDisplay}`)).click();await p;await waitForSettled(page,config);} for(const [index,id] of IDS.entries())if((await option(page,config,id).isChecked())!==original[index])await mutate(page,config,option(page,config,id),original[index],`cleanup ${id}`); const current=(await require("../../support/signal_analyser_page").signalRowsState(page,config));for(const row of current){const expected=originalRows.some(item=>item.id===row.id);if(row.checked!==expected){const p=waitForApi(page,config,config.app.api.view,"POST");await page.locator(testIdSelector(row.checkboxTestId)).setChecked(expected);await p;await waitForSettled(page,config);}} const selected=(await require("../../support/signal_analyser_page").signalRowsState(page,config)).find(row=>row.rowSelected);if(originalSource&&(!selected||selected.name!==originalSource)){const target=(await require("../../support/signal_analyser_page").signalRowsState(page,config)).find(row=>row.name===originalSource);const p=waitForApi(page,config,config.app.api.view,"POST");await page.locator(testIdSelector(target.id)).click();await p;await waitForSettled(page,config);} if(originalRoi){const min=page.locator(testIdSelector(config.app.testIds.timeMinInput));const max=page.locator(testIdSelector(config.app.testIds.timeMaxInput));await min.fill(originalRoi.min);await max.fill(originalRoi.max);const p=waitForApi(page,config,config.app.api.view,"POST");await max.press("Enter");await p;await waitForSettled(page,config);} } }catch(e){log(`cleanup statistics state: ${e.message}`);} }
}
testSelectable.requiredFeatures=["frontend-state-management","signal-analyser-displays","measurements-statistics","clear-display","selectable-statistics"];
module.exports=testSelectable;
