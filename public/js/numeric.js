(function registerSignalAnalyserNumeric(window) {
  "use strict";

  var DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
  var INTEGER = /^[+-]?\d+$/;

  function errorFor(raw) {
    var value = String(raw == null ? "" : raw);
    if (value.indexOf(",") >= 0) return "Используйте точку как десятичный разделитель.";
    if (/\s/.test(value)) return "Введите число без пробелов.";
    if (/[eE]/.test(value)) return "Экспоненциальная запись не поддерживается.";
    if (/^(?:[+-]?(?:Inf(?:inity)?|NaN))$/i.test(value)) return "Специальные числовые значения не поддерживаются.";
    return "Введите корректное число.";
  }

  function parse(raw, kind, options) {
    var value = String(raw == null ? "" : raw);
    var permitted = options && options.tokens;
    if (permitted && Object.prototype.hasOwnProperty.call(permitted, value)) {
      return { valid:true, value:permitted[value], token:value, error:"" };
    }
    var pattern = kind === "integer" ? INTEGER : DECIMAL;
    if (!pattern.test(value)) return { valid:false, value:null, error:errorFor(value) };
    var parsed = Number(value);
    if (!Number.isFinite(parsed) || (kind === "integer" && !Number.isSafeInteger(parsed))) {
      return { valid:false, value:null, error:kind === "integer" ? "Введите целое число допустимого размера." : "Введите конечное число." };
    }
    return { valid:true, value:parsed, error:"" };
  }

  window.SignalAnalyserNumeric = { parse:parse, errorFor:errorFor };
})(window);
