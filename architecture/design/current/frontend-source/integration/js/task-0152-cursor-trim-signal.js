(function registerCursorTrimSignal(window) {
  "use strict";

  var SELECTORS={
    action:"[data-testid='pane-trim-signal']",
    layer:"[data-testid='signal-trim-layer']",
    dialog:"[data-testid='signal-trim-dialog']",
    form:"[data-signal-trim-form]",
    source:"[data-signal-trim-source]",
    interval:"[data-signal-trim-interval]",
    name:"[data-signal-trim-name]",
    overwriteRow:"[data-signal-trim-overwrite-row]",
    overwrite:"[data-signal-trim-overwrite]",
    submit:"[data-signal-trim-submit]",
    cancel:"[data-signal-trim-cancel]",
    close:"[data-signal-trim-close]",
    status:"[data-signal-trim-status]"
  };
  function finite(value) { return Number.isFinite(Number(value)); }
  function clean(value) { return String(value == null ? "" : value).trim(); }
  function normalized(value) { var text=clean(value); return typeof text.normalize === "function" ? text.normalize("NFC") : text; }
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g,function (character) { return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[character]; }); }
  function normalizeType(value) { value=String(value || "").toLowerCase(); return /^(time|time-domain|врем)/.test(value) ? "time" : value; }
  function signalId(signal) { return clean(signal && (signal.id || signal.signal_id)); }
  function signalName(signal) { return clean(signal && (signal.name || signal.signal_name || signalId(signal))); }
  function interval(snapshot) {
    var values=snapshot && Array.isArray(snapshot.values) ? snapshot.values : [];
    if (values.length !== 2 || !finite(values[0]) || !finite(values[1])) return null;
    return {start:Number(Math.min(values[0],values[1])),end:Number(Math.max(values[0],values[1])),inclusive:true};
  }
  function secondsScale(unit) {
    var value=clean(unit).toLowerCase().replace(/μ/g,"µ");
    if (value === "s" || value === "sec" || value === "с") return 1;
    if (value === "ms" || value === "мс") return 1e-3;
    if (value === "us" || value === "µs" || value === "мкс") return 1e-6;
    if (value === "ns" || value === "нс") return 1e-9;
    return null;
  }
  function canonicalSeconds(context) {
    var range=interval(context && context.cursorSnapshot),convert=context && context.toCanonicalSeconds;
    if (!range) return null;
    var start,end;
    if (typeof convert === "function") { start=Number(convert(range.start)); end=Number(convert(range.end)); }
    else { var scale=secondsScale(context && context.xUnit); if (scale == null || !finite(scale)) return null; start=range.start*scale; end=range.end*scale; }
    if (!finite(start) || !finite(end)) return null;
    return {min_s:Math.min(start,end),max_s:Math.max(start,end)};
  }
  function eligibleSignals(context) {
    var supplied=context && (context.eligibleSignals || context.visibleSignals || context.paneSignals),main=context && context.mainSignal;
    var list=Array.isArray(supplied) ? supplied.slice() : main ? [main] : [];
    var seen=Object.create(null);
    return list.filter(function (signal) {
      var id=signalId(signal);
      if (!id || seen[id] || signal && signal.trimEligible === false) return false;
      seen[id]=true;
      return true;
    });
  }
  function inventorySignals(context) {
    var supplied=context && (context.signalInventory || context.allSignals);
    return Array.isArray(supplied) ? supplied : eligibleSignals(context);
  }
  function sourceById(context,id) { return eligibleSignals(context).find(function (signal) { return signalId(signal) === clean(id); }) || null; }
  function eligibility(context) {
    var mainId=signalId(context && context.mainSignal),sources=eligibleSignals(context);
    return !!context && normalizeType(context.plotType) === "time" && context.cursorSnapshot && context.cursorSnapshot.mode === "dual" &&
      !!mainId && sources.some(function (signal) { return signalId(signal) === mainId; }) && !!canonicalSeconds(context);
  }
  function actionMarkup() {
    return "<button class='pane-action button pane-trim-action' type='button' data-testid='pane-trim-signal' data-pane-trim-signal data-pane-control-cluster-cell='start' data-pane-trim-eligible='true' aria-label='Обрезать сигнал по курсорам'>Обрезать</button>";
  }
  function projectAction(button,context) {
    var visible=eligibility(context);
    if (!button) return visible;
    button.hidden=!visible;
    button.disabled=!!(context && context.trimBusy);
    button.setAttribute("aria-hidden",String(!visible));
    button.dataset.paneTrimEligible=String(visible);
    return visible;
  }
  function nameTaken(context,value,sourceId) {
    var wanted=normalized(value);
    if (!wanted) return false;
    return inventorySignals(context).some(function (signal) { return normalized(signalName(signal)) === wanted && signalId(signal) !== clean(sourceId); });
  }
  function suggestedName(context,source) {
    var base=signalName(source)+"_фрагмент",candidate=base,index=2;
    while (nameTaken(context,candidate,signalId(source))) { candidate=base+"_"+index; index+=1; }
    return candidate;
  }
  function validateName(value) {
    var name=clean(value);
    if (!name) return {valid:false,reason:"required",message:"Введите имя нового сигнала."};
    if (Array.from(name).length > 128) return {valid:false,reason:"too_long",message:"Имя сигнала не должно превышать 128 символов."};
    return {valid:true,value:name};
  }
  function initialDraft(context) {
    var sources=eligibleSignals(context),mainId=signalId(context && context.mainSignal);
    var source=sources.find(function (item) { return signalId(item) === mainId; }) || sources[0] || null;
    return {sourceId:signalId(source),name:source ? suggestedName(context,source) : "",nameDirty:false,overwrite:false};
  }
  function validateDraft(context,draft,busy) {
    var source=sourceById(context,draft && draft.sourceId),name=validateName(draft && draft.name),range=canonicalSeconds(context);
    var conflict=!!source && name.valid && nameTaken(context,name.value,signalId(source));
    var reason=!source ? "source" : !range ? "interval" : !name.valid ? name.reason : conflict && !(draft && draft.overwrite) ? "conflict" : busy ? "busy" : "";
    var message=reason === "source" ? "Выберите доступный исходный сигнал." : reason === "interval" ? "Интервал курсоров недоступен." : reason === "conflict" ? "Сигнал с таким именем уже существует. Разрешите замену или измените имя." : !name.valid ? name.message : "";
    return {valid:!reason,reason:reason,message:message,source:source,name:name.valid ? name.value : "",range:range,conflict:conflict};
  }
  function intervalText(context) {
    var range=interval(context && context.cursorSnapshot),unit=clean(context && context.xUnit);
    return range ? String(range.start)+" – "+String(range.end)+(unit ? " "+unit : "") : "Недоступно";
  }
  function fieldMarkup(context,draft,busy) {
    draft=draft || initialDraft(context);
    var validation=validateDraft(context,draft,!!busy),sources=eligibleSignals(context);
    var options=sources.map(function (signal) { var id=signalId(signal); return "<option value='"+escapeHtml(id)+"'"+(id === draft.sourceId ? " selected" : "")+">"+escapeHtml(signalName(signal))+"</option>"; }).join("");
    return "<div class='signal-trim-form'>"+
      "<div class='signal-trim-row'><label for='signal-trim-source'>Исходный сигнал</label><span class='signal-trim-select select-trigger-arrow'><select id='signal-trim-source' data-signal-trim-source"+(busy ? " disabled" : "")+">"+options+"</select></span></div>"+
      "<div class='signal-trim-row'><span class='signal-trim-label'>Интервал курсоров</span><output class='signal-trim-readonly' data-signal-trim-interval>"+escapeHtml(intervalText(context))+"</output></div>"+
      "<div class='signal-trim-row signal-trim-row-with-message'><label for='signal-trim-name'>Имя нового сигнала</label><div><input id='signal-trim-name' type='text' value='"+escapeHtml(draft.name)+"' autocomplete='off' spellcheck='false' autocapitalize='off' autocorrect='off' data-signal-trim-name aria-required='true' aria-invalid='"+String(validation.reason === "required" || validation.reason === "too_long" || validation.reason === "conflict")+"'"+(busy ? " disabled" : "")+"><p class='signal-trim-field-message' data-signal-trim-name-message"+(validation.message && validation.reason !== "source" && validation.reason !== "interval" ? "" : " hidden")+">"+escapeHtml(validation.message)+"</p></div></div>"+
      "<div class='signal-trim-overwrite-row' data-signal-trim-overwrite-row"+(validation.conflict ? "" : " hidden")+"><span></span><label class='checkbox-control'><input type='checkbox' data-signal-trim-overwrite"+(draft.overwrite ? " checked" : "")+(busy ? " disabled" : "")+"><span>Заменить сигнал с таким именем</span></label></div>"+
      "<div class='operation-status' role='alert' aria-live='assertive' data-signal-trim-status hidden></div>"+
      "</div>";
  }
  function payload(context,draft) {
    var validation=validateDraft(context,draft,false),revision=Number(context && (context.stateRevision != null ? context.stateRevision : context.state_revision));
    if (!validation.valid) throw new Error(validation.reason);
    if (!Number.isSafeInteger(revision) || revision < 0) throw new Error("state_revision");
    return {state_revision:revision,source_signal_id:signalId(validation.source),min_s:validation.range.min_s,max_s:validation.range.max_s,target_name:validation.name,overwrite:!!draft.overwrite};
  }
  function typedError(error) {
    var status=Number(error && (error.status || error.statusCode));
    if (status === 409) return "Сигнал с таким именем уже существует или данные изменились. Проверьте имя и повторите.";
    if (status === 404) return "Выбранный исходный сигнал больше недоступен.";
    if (status === 422) return "В интервале между курсорами нет доступных отсчётов.";
    if (status === 400) return "Проверьте исходный сигнал, имя и интервал курсоров.";
    return "Не удалось создать фрагмент сигнала. Повторите попытку.";
  }
  function createController(options) {
    options=options || {};
    var attempt=0,busy=false,context=null,opener=null,draft=null;
    function sync(meta) {
      var validation=validateDraft(context,draft,busy);
      if (typeof options.sync === "function") options.sync({draft:Object.assign({},draft),validation:validation,markup:fieldMarkup(context,draft,busy),submitDisabled:!validation.valid},{selectors:SELECTORS,meta:meta || {}});
      return validation;
    }
    function open(nextContext,button) {
      if (!eligibility(nextContext)) return false;
      context=nextContext; opener=button || null; draft=initialDraft(context);
      if (typeof options.mount === "function") options.mount(fieldMarkup(context,draft,false),{selectors:SELECTORS,initialFocus:SELECTORS.name,returnFocus:opener,submitDisabled:!validateDraft(context,draft,false).valid});
      return true;
    }
    function close() { if (busy) return false; if (typeof options.close === "function") options.close({restoreFocus:opener}); context=null; draft=null; return true; }
    function selectSource(id) {
      if (busy || !sourceById(context,id)) return sync({rejected:true});
      draft.sourceId=clean(id); draft.overwrite=false;
      if (!draft.nameDirty) draft.name=suggestedName(context,sourceById(context,id));
      return sync({sourceChanged:true,preserveTypedName:draft.nameDirty});
    }
    function editName(value) { if (!busy) { draft.name=String(value == null ? "" : value); draft.nameDirty=true; draft.overwrite=false; } return sync({nameEdited:true}); }
    function setOverwrite(value) { if (!busy) draft.overwrite=!!value; return sync({overwriteChanged:true}); }
    function submit() {
      var validation=validateDraft(context,draft,busy);
      if (!validation.valid) { if (typeof options.error === "function") options.error(validation.message,{field:validation.reason === "source" ? SELECTORS.source : validation.reason === "interval" ? SELECTORS.interval : SELECTORS.name}); return Promise.resolve({ok:false,validation:validation}); }
      var token=++attempt; busy=true; sync({busyStarted:true});
      if (typeof options.setBusy === "function") options.setBusy(true,{stableControls:true,ariaBusy:true,blockClose:true});
      return Promise.resolve(options.createSignal(payload(context,draft))).then(function (created) {
        if (token !== attempt) return {ok:false,stale:true};
        busy=false; if (typeof options.acceptSignal === "function") options.acceptSignal(created,{appendOrRefreshSignals:true});
        if (typeof options.setBusy === "function") options.setBusy(false,{stableControls:true});
        if (typeof options.close === "function") options.close({restoreFocus:null,success:true}); context=null; draft=null;
        return {ok:true,signal:created};
      },function (error) {
        if (token !== attempt) return {ok:false,stale:true};
        busy=false; if (typeof options.setBusy === "function") options.setBusy(false,{stableControls:true});
        sync({busyEnded:true});
        var message=typedError(error); if (typeof options.error === "function") options.error(message,{field:null});
        return {ok:false,error:message};
      });
    }
    function destroy() {
      attempt+=1; busy=false; context=null; draft=null;
      if (typeof options.setBusy === "function") options.setBusy(false,{stableControls:true,cleanup:true});
      if (typeof options.close === "function") options.close({restoreFocus:null,cleanup:true});
      opener=null;
    }
    return {open:open,close:close,selectSource:selectSource,editName:editName,setOverwrite:setOverwrite,submit:submit,snapshot:function () { return {busy:busy,draft:draft && Object.assign({},draft),validation:draft && validateDraft(context,draft,busy)}; },isBusy:function () { return busy; },invalidate:function () { attempt+=1; },destroy:destroy};
  }

  window.SignalAnalyserCursorTrimSignal={
    selectors:SELECTORS,
    eligibility:eligibility,
    eligibleSignals:eligibleSignals,
    interval:interval,
    canonicalSeconds:canonicalSeconds,
    suggestedName:suggestedName,
    validateName:validateName,
    validateDraft:validateDraft,
    initialDraft:initialDraft,
    actionMarkup:actionMarkup,
    projectAction:projectAction,
    fieldMarkup:fieldMarkup,
    payload:payload,
    typedError:typedError,
    createController:createController,
    contract:{
      placement:"Canonical text-only Secondary MD pane-header button Обрезать immediately before the plot-type selector/overflow; no unrelated function icon and no tooltip required.",
      eligibility:"Time pane only, cursor mode dual, current main signal included in eligible active-pane sources and exactly two finite snapped cursor X values.",
      source:"Standard 32px dropdown contains only eligible active-Time-pane signals and initially selects current main_signal; payload source_signal_id always comes from the current selection.",
      name:"Unicode is preserved. Initial suggestion is <source>_фрагмент with the lowest available _N suffix; source changes update it only while nameDirty is false.",
      interval:"One read-only contextual output shows sorted cursor bounds in current units; no manual range fields.",
      overwrite:"Conditional canonical checkbox appears only on an inventory name conflict; unchecked conflict disables submit.",
      modal:"Canonical 480px Engee modal; focus suggested new-name on open, trap focus, dropdown uses native keyboard semantics, Escape closes dropdown before idle modal, backdrop never closes, busy blocks Close/Escape/Cancel.",
      provider:"POST /api/signals/crop exact payload {state_revision,source_signal_id,min_s,max_s,target_name,overwrite} through the existing revision-safe signal mutation queue; accept the returned signal/inventory before closing success.",
      cleanup:"On pane removal/type change/main-signal loss/mode drop, hide the action; on owner removal call destroy() to invalidate stale submit, clear busy UI and detach the cursor subscription."
    }
  };
}(window));
