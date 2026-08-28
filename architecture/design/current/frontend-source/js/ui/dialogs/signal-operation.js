(function registerSignalOperationDialog(window,document) {
  "use strict";
  var preprocess=window.SignalAnalyserPreprocessOperation;
  var dialogState=null;

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g,function (character) {
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[character];
    });
  }
  function selectedLabel(options,value) {
    var selected=(options || []).filter(function (item) { return item.value === value; })[0];
    return selected ? selected.label : "";
  }
  function statusMarkup() {
    if (dialogState.status === "busy") return "<div class='operation-status status-note info operation-progress' role='status'><img src='"+window.SignalAnalyserUIBase+"/icons/Spinner.svg' alt=''><span>Выполняется преобразование и проверка результата…</span></div>";
    if (dialogState.status === "success") return "<div class='operation-status status-note success' role='status'><strong>Сигнал создан.</strong> Результат прошёл проверку и добавлен одной операцией.</div>";
    return "";
  }
  function selectMarkup(field,busy,error) {
    return "<select class='signal-operation-control' data-operation-parameter='"+esc(field.id)+"' data-testid='"+esc(field.testid)+"' aria-invalid='"+String(!!error)+"'"+(busy || field.disabled ? " disabled" : "")+">"+
      (field.options || []).map(function (item) { return "<option value='"+esc(item.value)+"'"+(item.value === field.value ? " selected" : "")+">"+esc(item.label)+"</option>"; }).join("")+"</select>";
  }
  function fieldMarkup(field,error,busy) {
    var control="",value=field.value == null ? "" : field.value;
    if (field.type === "select") control=selectMarkup(field,busy,error);
    else if (field.type === "textarea") control="<textarea class='signal-operation-control' data-operation-parameter='"+esc(field.id)+"' data-testid='"+esc(field.testid)+"' aria-invalid='"+String(!!error)+"' placeholder='Введите выражение' spellcheck='false'"+(busy ? " disabled" : "")+">"+esc(value)+"</textarea>";
    else control="<input class='signal-operation-control' type='text' inputmode='"+(field.type === "number" ? "decimal" : "text")+"' value='"+esc(value)+"' data-operation-parameter='"+esc(field.id)+"' data-testid='"+esc(field.testid)+"' aria-invalid='"+String(!!error)+"'"+(field.placeholder ? " placeholder='"+esc(field.placeholder)+"'" : "")+(busy ? " disabled" : "")+" autocomplete='off' spellcheck='false' autocapitalize='off' autocorrect='off'>";
    return "<div class='signal-operation-row"+(error ? " has-error" : "")+"' data-signal-operation-field='"+esc(field.id)+"'>"+
      "<label>"+esc(window.SignalAnalyserOperationLiveValidation.label(field))+"</label><div class='signal-operation-control-wrap'>"+control+"</div>"+
      (error ? "<p class='signal-operation-field-message' role='alert'>"+esc(error)+"</p>" : field.hint ? "<p class='signal-operation-field-hint'>"+esc(field.hint)+"</p>" : "")+"</div>";
  }
  function render() {
    var form=document.querySelector("[data-operation-form]"),dialog=document.querySelector("[data-testid='signal-operation-dialog']");
    if (!form || !dialogState || !preprocess) return;
    var busy=dialogState.status === "busy",state=dialogState.operationState;
    var options=preprocess.operationOptions(),current=options.filter(function (item) { return item.value === state.operation; })[0] || options[0];
    var operationSelect=window.SignalAnalyserValueSelect.markup({
      key:"signal-operation-type",value:state.operation,label:current.label.replace(/ — недоступно$/,""),options:options,
      testId:"signal-operation-select",ariaLabel:"Операция",disabled:busy,buttonTrigger:true,
      onSelect:function (value) { dialogState.operationState=preprocess.switchOperation(state,value); dialogState.status="idle"; dialogState.validation=null; render(); }
    });
    var validation=dialogState.validation || preprocess.validate(state);
    dialogState.validation=validation;
    var fields=preprocess.schema(state);
    form.innerHTML="<div class='signal-operation-form' data-operation-section='preprocess'>"+
      "<div class='signal-operation-row'><span class='signal-operation-label'>Исходный сигнал</span><input class='signal-operation-control' data-testid='signal-operation-source' value='"+esc(state.source.name)+"' readonly></div>"+
      "<div class='signal-operation-row'><span class='signal-operation-label'>Операция</span><div>"+operationSelect+"</div></div>"+
      "<div class='signal-operation-parameter-list'>"+fields.map(function (field) { return fieldMarkup(field,validation.errors[field.id],busy); }).join("")+"</div>"+
      (!validation.availability.available ? "<div class='signal-operation-availability' role='status'>"+esc(validation.availability.message)+"</div>" : "")+
      (fields.some(function (field) { return field.nullableAuto; }) ? "<p class='signal-operation-auto-note'>Пустое поле со значением «Авто» передаётся как автоматический параметр, а не как ноль.</p>" : "")+
      "<div class='signal-operation-row"+(validation.errors.target_name ? " has-error" : "")+"'><label for='operation-name'>Имя нового сигнала</label><input id='operation-name' class='signal-operation-control' data-operation-name value='"+esc(state.targetName)+"' aria-invalid='"+String(!!validation.errors.target_name)+"'"+(busy ? " disabled" : "")+" autocomplete='off' spellcheck='false' autocapitalize='off' autocorrect='off'>"+(validation.errors.target_name ? "<p class='signal-operation-field-message' role='alert'>"+esc(validation.errors.target_name)+"</p>" : "")+"</div>"+
      "<div class='signal-operation-row signal-operation-overwrite-row'><span class='signal-operation-label'></span><label class='checkbox-field'><input type='checkbox' data-operation-overwrite"+(state.overwrite ? " checked" : "")+(busy ? " disabled" : "")+"><span>Затирать сигнал с таким именем</span></label></div>"+statusMarkup()+"</div>";
    dialog.dataset.operationSection="preprocess";
    window.SignalAnalyserValueSelect.reconcile();
    var submit=document.querySelector("[data-operation-submit]");
    submit.disabled=busy || dialogState.status === "success" || !validation.valid;
    submit.setAttribute("aria-busy",String(busy));
    document.querySelector("[data-dialog-cancel]").disabled=busy;
    document.querySelector("[data-dialog-close]").disabled=busy;
  }
  function open(source,options) {
    var sourceObject=typeof source === "object" ? source : {id:String(source || ""),name:String(source || ""),samplingKind:"uniform",sampleRateHz:1000000,sampleCount:400000,complex:false};
    dialogState={operationState:preprocess.createState(sourceObject),status:"idle",validation:null};
    document.querySelector("[data-testid='signal-operation-layer']").hidden=false;
    render();
    document.querySelector("[data-testid='signal-operation-select']").focus();
  }
  function close() {
    if (!dialogState || dialogState.status === "busy") return false;
    window.SignalAnalyserValueSelect.close(false);
    document.querySelector("[data-testid='signal-operation-layer']").hidden=true;
    return true;
  }
  function click(target,provider) {
    if (target.closest("[data-dialog-close], [data-dialog-cancel]")) return close(),true;
    if (target.closest("[data-operation-submit]")) {
      var validation=preprocess.validate(dialogState.operationState);
      dialogState.validation=validation;
      if (!validation.valid) { render(); var invalid=document.querySelector(".signal-operation-row.has-error input, .signal-operation-row.has-error select, .signal-operation-row.has-error textarea"); if (invalid) invalid.focus(); return true; }
      var payload=preprocess.payload(dialogState.operationState);
      dialogState.status="busy"; render();
      Promise.resolve().then(function () { return provider.onOperation ? provider.onOperation(payload) : null; }).then(function () { dialogState.status="success"; render(); }).catch(function (error) {
        window.SignalAnalyserOperationErrorDialog.open(error,{submit:document.querySelector("[data-operation-submit]"),endBusy:function () { dialogState.status="idle"; render(); }});
      });
      return true;
    }
    return false;
  }
  function change(target) {
    if (!dialogState || !target) return false;
    var parameter=target.closest && target.closest("[data-operation-parameter]");
    if (parameter) { dialogState.operationState=preprocess.updateParameter(dialogState.operationState,parameter.dataset.operationParameter,parameter.value); dialogState.validation=null; render(); return true; }
    var overwrite=target.closest && target.closest("[data-operation-overwrite]");
    if (overwrite) { dialogState.operationState.overwrite=overwrite.checked; dialogState.validation=preprocess.validate(dialogState.operationState); window.SignalAnalyserOperationLiveValidation.project(document.querySelector("[data-operation-form]"),dialogState.operationState,dialogState.validation,false); return true; }
    return false;
  }
  function input(target) {
    if (!dialogState || !target) return false;
    var parameter=target.closest && target.closest("[data-operation-parameter]");
    if (parameter) { dialogState.operationState=preprocess.updateParameter(dialogState.operationState,parameter.dataset.operationParameter,parameter.value); dialogState.validation=preprocess.validate(dialogState.operationState); window.SignalAnalyserOperationLiveValidation.project(document.querySelector("[data-operation-form]"),dialogState.operationState,dialogState.validation,false); return true; }
    if (target.matches && target.matches("[data-operation-name]")) { dialogState.operationState.targetName=target.value; dialogState.operationState.nameDirty=true; dialogState.validation=preprocess.validate(dialogState.operationState); window.SignalAnalyserOperationLiveValidation.project(document.querySelector("[data-operation-form]"),dialogState.operationState,dialogState.validation,false); return true; }
    return false;
  }

  window.SignalAnalyserDialogs=window.SignalAnalyserDialogs || {};
  window.SignalAnalyserDialogs.signalOperation={open:open,close:close,click:click,change:change,input:input,render:render,state:function () { return dialogState; }};
  document.addEventListener("change",function (event) { change(event.target); },true);
  document.addEventListener("input",function (event) { input(event.target); },true);
}(window,document));
