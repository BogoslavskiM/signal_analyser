(function registerSignalAnalyserTask0142(window) {
  "use strict";

  var MESSAGES = {
    min: {
      number:"Введите число для минимума.",
      finite:"Минимум должен быть конечным.",
      domain:"Минимум вне допустимого диапазона.",
      order:"Минимум должен быть меньше максимума.",
      unit:"Минимум нельзя представить в выбранных единицах."
    },
    max: {
      number:"Введите число для максимума.",
      finite:"Максимум должен быть конечным.",
      domain:"Максимум вне допустимого диапазона.",
      order:"Максимум должен быть больше минимума.",
      unit:"Максимум нельзя представить в выбранных единицах."
    }
  };

  function boundaryName(value) { return value === "max" ? "max" : "min"; }

  function boundaryResult(boundary, result) {
    boundary=boundaryName(boundary);
    result=result || { valid:true };
    var invalid=result.valid === false;
    var reason=invalid && MESSAGES[boundary][result.reason] ? result.reason : invalid ? "number" : "";
    return {
      boundary:boundary,
      invalid:invalid,
      ariaInvalid:String(invalid),
      reason:reason,
      message:invalid ? MESSAGES[boundary][reason] : ""
    };
  }

  function projectPair(results) {
    results=results || {};
    var minimum=boundaryResult("min", results.min);
    var maximum=boundaryResult("max", results.max);
    var first=minimum.invalid ? minimum : maximum.invalid ? maximum : null;
    return {
      min:minimum,
      max:maximum,
      message:first ? first.message : "",
      messageBoundary:first ? first.boundary : "",
      hasError:!!first,
      pairBorder:false,
      rowBorder:false
    };
  }

  function endpointDisabled(state) {
    state=state || {};
    return state.applicable === false || state.busy === true;
  }

  function enabledContract(state) {
    state=state || {};
    return {
      minDisabled:endpointDisabled(state),
      maxDisabled:endpointDisabled(state),
      ignoredDisableReasons:["automatic", "slider", "linked"]
    };
  }

  window.SignalAnalyserTask0142 = {
    messages:MESSAGES,
    boundaryResult:boundaryResult,
    projectPair:projectPair,
    endpointDisabled:endpointDisabled,
    enabledContract:enabledContract,
    contract: {
      validationInput:"Existing production numeric/unit/domain/order validators return only {valid, reason}; raw provider/backend exception text is never accepted as a field message.",
      priority:"Both boundaries keep independent invalid state and red borders. One message is rendered: minimum first, otherwise maximum.",
      enabled:"Visible applicable range inputs stay editable in automatic mode and regardless of slider/link state; only true inapplicability or current settings busy state disables them.",
      blank:"An untouched blank endpoint remains valid automatic state and retains its placeholder."
    }
  };
}(window));
