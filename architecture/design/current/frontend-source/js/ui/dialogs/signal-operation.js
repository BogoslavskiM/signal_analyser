(function () {
  "use strict";
  var dialogState = { source: "", operation: "abs", status: "idle", message: "" };
  var operations = [
    ["abs", "Модуль"],
    ["square", "Квадрат"],
    ["sqrt", "Корень"],
    ["signed-sqrt", "Корень из модуля × знак"],
    ["multiply", "Умножить"],
    ["fft", "FFT"],
    ["custom", "Пользовательское"]
  ];
  function label() { return (operations.find(function (item) { return item[0] === dialogState.operation; }) || operations[0])[1]; }
  function statusMarkup() {
    if (dialogState.status === "busy") return "<div class='operation-status status-note info operation-progress' role='status'><img src='" + window.SignalAnalyserUIBase + "/icons/Spinner.svg' alt=''><span>Выполняется преобразование и проверка результата…</span></div>";
    if (dialogState.status === "error") return "<div class='operation-status status-note error' role='alert'><strong>Операция не выполнена.</strong><br>" + dialogState.message + "</div>";
    if (dialogState.status === "success") return "<div class='operation-status status-note success' role='status'><strong>Сигнал создан.</strong> Результат прошёл проверку и добавлен одной операцией.</div>";
    return "";
  }
  function render() {
    var form = document.querySelector("[data-operation-form]");
    if (!form) return;
    var custom = dialogState.operation === "custom";
    var multiply = dialogState.operation === "multiply";
    var operationSelect = window.SignalAnalyserValueSelect.markup({
      key:"signal-operation-type",
      value:dialogState.operation,
      label:label(),
      options:operations.map(function (item) { return { value:item[0], label:item[1] }; }),
      testId:"signal-operation-select",
      ariaLabel:"Операция",
      onSelect:function (value) { dialogState.operation=value; dialogState.status="idle"; dialogState.message=""; render(); }
    });
    form.innerHTML = "<div class='operation-form'>" +
      "<div class='dialog-row'><span class='dialog-label'>Исходный сигнал</span><input class='field' value='" + dialogState.source + "' readonly></div>" +
      "<div class='dialog-row'><label>Операция</label><div>" + operationSelect + "</div></div>" +
      (multiply ? "<div class='dialog-row'><label for='operation-factor'>Множитель</label><input id='operation-factor' class='field' type='text' inputmode='decimal' value='2'></div>" : "") +
      (custom ? "<div class='dialog-row code-editor-row'><label for='operation-code'>Тело операции</label><textarea id='operation-code' class='code-editor' data-operation-code spellcheck='false'>init_signal .* 2</textarea></div><p class='operation-body-help'>Код выполняется в Engee. Входной сигнал доступен как <code>init_signal</code>; результатом должно быть выражение, возвращающее новый вектор.</p>" : "") +
      "<div class='dialog-row'><label for='operation-name'>Имя нового сигнала</label><input id='operation-name' class='field' data-operation-name value='" + dialogState.source + "_" + dialogState.operation.replace("signed-sqrt", "signed_sqrt") + "'></div>" +
      "<div class='dialog-row'><span class='dialog-label'></span><label class='checkbox-field'><input type='checkbox' data-operation-overwrite><span>Затирать сигнал с таким именем</span></label></div>" + statusMarkup() + "</div>";
    window.SignalAnalyserValueSelect.reconcile();
    var busy = dialogState.status === "busy";
    document.querySelector("[data-operation-submit]").disabled = busy || dialogState.status === "success";
    document.querySelector("[data-dialog-cancel]").disabled = busy;
    document.querySelector("[data-dialog-close]").disabled = busy;
  }
  function open(source) {
    dialogState = { source: source, operation: "abs", status: "idle", message: "" };
    document.querySelector("[data-testid='signal-operation-layer']").hidden = false;
    render();
    document.querySelector("[data-testid='signal-operation-select-input']").focus();
  }
  function close() {
    if (dialogState.status === "busy") return;
    window.SignalAnalyserValueSelect.close(false);
    document.querySelector("[data-testid='signal-operation-layer']").hidden = true;
  }
  function click(target, provider) {
    if (target.closest("[data-dialog-close], [data-dialog-cancel]")) return close(), true;
    if (target.closest("[data-operation-submit]")) {
      var code = document.querySelector("[data-operation-code]");
      var name = document.querySelector("[data-operation-name]");
      var overwrite = document.querySelector("[data-operation-overwrite]");
      var factor = document.querySelector("#operation-factor");
      var payload = { operation:dialogState.operation, source:dialogState.source, body:code ? code.value : "", target_name:name ? name.value : "", overwrite:!!(overwrite && overwrite.checked), multiplier:factor ? factor.value : null };
      dialogState.status = "busy"; dialogState.message = ""; render();
      Promise.resolve().then(function () { return provider.onOperation ? provider.onOperation(payload) : null; }).then(function () { dialogState.status = "success"; render(); }).catch(function (error) { dialogState.status="error"; dialogState.message=(error && error.message) || "Engee вернул ошибку выполнения."; render(); });
      return true;
    }
    return false;
  }
  window.SignalAnalyserDialogs = window.SignalAnalyserDialogs || {};
  window.SignalAnalyserDialogs.signalOperation = { open: open, close: close, click: click, render: render, state: dialogState };
  document.addEventListener("click", function (event) {
    var trigger = event.target.closest && event.target.closest("[data-signal-operation]");
    if (!trigger) return;
    event.preventDefault();
    event.stopPropagation();
    open(trigger.dataset.signalOperation);
  }, true);
}());
