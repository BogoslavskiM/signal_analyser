(function registerCursorTrimSignal(window) {
  "use strict";

  var SELECTORS={
    action:"[data-testid='pane-trim-signal']",
    layer:"[data-testid='signal-trim-layer']",
    dialog:"[data-testid='signal-trim-dialog']",
    form:"[data-signal-trim-form]",
    name:"[data-signal-trim-name]",
    overwrite:"[data-signal-trim-overwrite]",
    submit:"[data-signal-trim-submit]",
    cancel:"[data-signal-trim-cancel]",
    close:"[data-signal-trim-close]",
    status:"[data-signal-trim-status]"
  };
  function finite(value) { return Number.isFinite(Number(value)); }
  function clean(value) { return String(value == null ? "" : value).trim(); }
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g,function (character) { return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[character]; }); }
  function normalizeType(value) { value=String(value || "").toLowerCase(); return /^(time|time-domain|врем)/.test(value) ? "time" : value; }
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
  function eligibility(context) {
    var range=canonicalSeconds(context),signal=context && context.mainSignal;
    return !!context && normalizeType(context.plotType) === "time" && context.cursorSnapshot && context.cursorSnapshot.mode === "dual" &&
      !!signal && clean(signal.id || signal.signal_id) !== "" && !!range;
  }
  function actionMarkup() {
    return "<button class='pane-action icon-button' type='button' data-testid='pane-trim-signal' data-pane-trim-signal data-pane-trim-eligible='true' aria-label='Обрезать сигнал по курсорам' title='Обрезать сигнал по курсорам'><img src='./icons/function.svg' alt=''></button>";
  }
  function projectAction(button,context) {
    var visible=eligibility(context);
    if (!button) return visible;
    button.hidden=!visible;
    button.disabled=false;
    button.setAttribute("aria-hidden",String(!visible));
    button.dataset.paneTrimEligible=String(visible);
    return visible;
  }
  function validateName(value) {
    var name=clean(value);
    if (!name) return {valid:false,reason:"required",message:"Введите имя нового сигнала."};
    if (name.length > 128) return {valid:false,reason:"too_long",message:"Имя сигнала не должно превышать 128 символов."};
    return {valid:true,value:name};
  }
  function fieldMarkup(context) {
    var signal=context.mainSignal,range=interval(context.cursorSnapshot),unit=clean(context.xUnit),source=clean(signal.name || signal.signal_name || signal.id || signal.signal_id);
    var intervalText=String(range.start)+" – "+String(range.end)+(unit ? " "+unit : "");
    return "<div class='settings-field-row'><label class='settings-label'>Исходный сигнал</label><input type='text' readonly autocomplete='off' value='"+escapeHtml(source)+"'></div>"+
      "<div class='settings-field-row'><label class='settings-label'>Интервал курсоров</label><input type='text' readonly autocomplete='off' value='"+escapeHtml(intervalText)+"'></div>"+
      "<div class='settings-field-row'><label class='settings-label' for='signal-trim-name'>Имя нового сигнала</label><input id='signal-trim-name' type='text' autocomplete='off' spellcheck='false' autocapitalize='off' autocorrect='off' data-signal-trim-name aria-required='true'></div>"+
      "<label class='operation-overwrite-row'><input type='checkbox' data-signal-trim-overwrite><span>Затирать сигнал с таким именем</span></label>"+
      "<div class='operation-status' role='alert' aria-live='assertive' data-signal-trim-status hidden></div>";
  }
  function payload(context,name,overwrite) {
    var range=canonicalSeconds(context),signal=context && context.mainSignal || {},revision=Number(context && (context.stateRevision != null ? context.stateRevision : context.state_revision));
    var validName=validateName(name);
    if (!eligibility(context) || !range) throw new Error("ineligible");
    if (!validName.valid) throw new Error(validName.reason);
    if (!Number.isSafeInteger(revision) || revision < 0) throw new Error("state_revision");
    return {
      state_revision:revision,
      source_signal_id:signal.id || signal.signal_id,
      min_s:range.min_s,
      max_s:range.max_s,
      target_name:validName.value,
      overwrite:!!overwrite
    };
  }
  function typedError(error) {
    var status=Number(error && (error.status || error.statusCode));
    if (status === 409) return "Сигнал с таким именем уже существует или данные изменились. Обновите имя и повторите.";
    if (status === 404) return "Исходный сигнал больше недоступен.";
    if (status === 422) return "В выбранном интервале нет доступных отсчётов.";
    if (status === 400) return "Проверьте имя и интервал курсоров.";
    return "Не удалось создать обрезанный сигнал. Повторите попытку.";
  }
  function createController(options) {
    options=options || {};
    var attempt=0,busy=false,context=null,opener=null;
    function open(nextContext,button) {
      if (!eligibility(nextContext)) return false;
      context=nextContext; opener=button || null;
      if (typeof options.mount === "function") options.mount(fieldMarkup(context),{selectors:SELECTORS,initialFocus:SELECTORS.name,returnFocus:opener});
      return true;
    }
    function close() { if (busy) return false; if (typeof options.close === "function") options.close({restoreFocus:opener}); context=null; return true; }
    function submit(name,overwrite) {
      var valid=validateName(name);
      if (!valid.valid) { if (typeof options.error === "function") options.error(valid.message,{field:SELECTORS.name}); return Promise.resolve({ok:false,validation:valid}); }
      var token=++attempt; busy=true;
      if (typeof options.setBusy === "function") options.setBusy(true,{stableControls:true,ariaBusy:true,blockClose:true});
      return Promise.resolve(options.createSignal(payload(context,valid.value,overwrite))).then(function (created) {
        if (token !== attempt) return {ok:false,stale:true};
        busy=false; if (typeof options.acceptSignal === "function") options.acceptSignal(created,{appendOrRefreshSignals:true});
        if (typeof options.setBusy === "function") options.setBusy(false,{stableControls:true});
        if (typeof options.close === "function") options.close({restoreFocus:null,success:true}); context=null;
        return {ok:true,signal:created};
      },function (error) {
        if (token !== attempt) return {ok:false,stale:true};
        busy=false; if (typeof options.setBusy === "function") options.setBusy(false,{stableControls:true});
        var message=typedError(error); if (typeof options.error === "function") options.error(message,{field:null});
        return {ok:false,error:message};
      });
    }
    function destroy() {
      attempt+=1; busy=false; context=null;
      if (typeof options.setBusy === "function") options.setBusy(false,{stableControls:true,cleanup:true});
      if (typeof options.close === "function") options.close({restoreFocus:null,cleanup:true});
      opener=null;
    }
    return {open:open,close:close,submit:submit,isBusy:function () { return busy; },invalidate:function () { attempt+=1; },destroy:destroy};
  }

  window.SignalAnalyserCursorTrimSignal={
    selectors:SELECTORS,
    eligibility:eligibility,
    interval:interval,
    canonicalSeconds:canonicalSeconds,
    validateName:validateName,
    actionMarkup:actionMarkup,
    projectAction:projectAction,
    fieldMarkup:fieldMarkup,
    payload:payload,
    typedError:typedError,
    createController:createController,
    contract:{
      placement:"Existing compact pane-header action immediately before the plot-type selector/overflow; hidden rather than reserved whenever ineligible.",
      eligibility:"Time pane only, cursor mode dual, valid active-pane main signal and exactly two finite snapped cursor X values.",
      semantics:"Frontend sends sorted cursor bounds converted to canonical seconds. Backend validates/clamps the interval, takes inclusive samples, retains source sample rate/data type, rebases returned signal time origin to zero and never mutates the source.",
      modal:"Reuse the Signal operation dialog geometry, overwrite checkbox and busy continuity; focus new-name on open, trap focus, Escape/Cancel/close only while idle, restore opener on cancel/error close.",
      provider:"POST /api/signals/crop exact payload {state_revision,source_signal_id,min_s,max_s,target_name,overwrite} through the existing revision-safe signal mutation queue; accept the returned signal/inventory before closing success.",
      cleanup:"On pane removal/type change/main-signal loss/mode drop, hide the action; on owner removal call destroy() to invalidate stale submit, clear busy UI and detach the cursor subscription."
    }
  };
}(window));
