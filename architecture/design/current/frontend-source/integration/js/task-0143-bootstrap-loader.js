(function registerSignalAnalyserBootstrapLoading(window, document) {
  "use strict";

  var DEFAULT_TIMEOUT_MS=20000;
  var sequence=0;
  var current=null;
  var timer=null;
  var retryBound=false;

  function query(selector) { return document.querySelector(selector); }
  function hostNodes() {
    var host=query(".app-status"), shell=query("[data-testid='app-shell']"), loading=query("[data-testid='app-loading']"), error=query("[data-testid='app-error']"), retry=query("[data-retry]");
    if (!host || !shell || !loading || !error || !retry) return null;
    var spinner=loading.querySelector(".app-bootstrap-spinner");
    if (!spinner) {
      spinner=document.createElement("span");
      spinner.className="app-bootstrap-spinner";
      spinner.dataset.testid="app-bootstrap-spinner";
      spinner.setAttribute("aria-hidden","true");
      loading.insertBefore(spinner,loading.firstChild);
    }
    loading.setAttribute("aria-live","polite");
    loading.setAttribute("aria-atomic","true");
    error.setAttribute("aria-live","assertive");
    error.setAttribute("aria-atomic","true");
    return {host:host,shell:shell,loading:loading,error:error,retry:retry};
  }
  function matches(token) { return !!current && String(token || "") === current.token; }
  function setShellBlocked(nodes,blocked,busy) {
    nodes.shell.inert=!!blocked;
    if (busy) nodes.shell.setAttribute("aria-busy","true");
    else nodes.shell.removeAttribute("aria-busy");
  }
  function project(phase) {
    var nodes=hostNodes();
    if (!nodes) return false;
    var active=phase === "loading" || phase === "error";
    nodes.host.hidden=!active;
    nodes.host.dataset.bootstrapActive=String(active);
    nodes.host.dataset.bootstrapPhase=phase;
    nodes.loading.hidden=phase !== "loading";
    nodes.error.hidden=phase !== "error";
    setShellBlocked(nodes,active,phase === "loading");
    var loadingText=nodes.loading.querySelector("[data-loading-text]");
    if (loadingText) loadingText.textContent="Загрузка данных…";
    var errorText=nodes.error.querySelector("[data-error-text]");
    if (errorText) errorText.textContent="Не удалось загрузить данные анализатора. Проверьте соединение и повторите попытку.";
    if (phase === "error" && window.requestAnimationFrame) window.requestAnimationFrame(function () { if (!nodes.retry.hidden && nodes.retry.isConnected) nodes.retry.focus(); });
    return true;
  }
  function clearTimer() { if (timer != null) window.clearTimeout(timer); timer=null; }
  function finishIfReady(token) {
    if (!matches(token) || !current.stateAccepted || !current.settingsAccepted || !current.renderCommitted) return false;
    clearTimer();
    current.phase="ready";
    project("ready");
    return true;
  }
  function milestone(token,name) {
    if (!matches(token) || current.phase !== "loading") return false;
    current[name]=true;
    finishIfReady(token);
    return true;
  }
  function fail(token,reason) {
    if (!matches(token) || current.phase !== "loading") return false;
    clearTimer();
    current.phase="error";
    current.failure=reason === "timeout" ? "timeout" : "request";
    project("error");
    return true;
  }
  function begin(options) {
    clearTimer();
    sequence+=1;
    current={token:"bootstrap-"+String(sequence),phase:"loading",stateAccepted:false,settingsAccepted:false,renderCommitted:false,failure:""};
    project("loading");
    var timeout=Number(options && options.timeoutMs);
    if (!Number.isFinite(timeout) || timeout <= 0) timeout=DEFAULT_TIMEOUT_MS;
    var token=current.token;
    timer=window.setTimeout(function () { fail(token,"timeout"); },timeout);
    return token;
  }
  function retry() {
    var token=begin();
    var detail={token:token};
    if (typeof window.CustomEvent === "function") window.dispatchEvent(new window.CustomEvent("signal-analyser:bootstrap-retry",{detail:detail}));
    return token;
  }
  function bindRetry() {
    if (retryBound) return;
    var nodes=hostNodes();
    if (!nodes) return;
    nodes.retry.addEventListener("click",retry);
    retryBound=true;
  }
  function state() {
    return current ? {token:current.token,phase:current.phase,stateAccepted:current.stateAccepted,settingsAccepted:current.settingsAccepted,renderCommitted:current.renderCommitted,failure:current.failure} : null;
  }

  bindRetry();
  window.SignalAnalyserBootstrapLoading={
    begin:begin,
    acceptInitialState:function (token) { return milestone(token,"stateAccepted"); },
    acceptActiveSettings:function (token) { return milestone(token,"settingsAccepted"); },
    commitInitialRender:function (token) { return milestone(token,"renderCommitted"); },
    fail:fail,
    retry:retry,
    state:state,
    DEFAULT_TIMEOUT_MS:DEFAULT_TIMEOUT_MS,
    requiredMilestones:["accepted-state-lite-with-signals-displays-layout","accepted-active-display-settings","committed-initial-render"],
    excludedFromBarrier:["pane-outputs","signal-summary","signal-samples","measurements","extrema"],
    sanitizedError:"Не удалось загрузить данные анализатора. Проверьте соединение и повторите попытку."
  };
}(window,document));
