(function bootstrapPrototypeBridge(window) {
  "use strict";
  var lifecycle=window.SignalAnalyserBootstrapLoading, api=window.SignalAnalyserApi, settings=window.SignalAnalyserSettings;
  if (!lifecycle || !api || !settings) return;
  var token=lifecycle.begin(), getState=api.getState, loadSettings=settings.load;
  api.getState=function () { return getState.apply(api,arguments).then(function (value) { lifecycle.acceptInitialState(token); return value; }); };
  settings.load=function () { return loadSettings.apply(settings,arguments).then(function (value) { lifecycle.acceptActiveSettings(token); window.requestAnimationFrame(function () { lifecycle.commitInitialRender(token); }); return value; }); };
  window.addEventListener("signal-analyser:bootstrap-retry",function (event) {
    token=event.detail.token;
    api.getState().then(function () { return settings.load(); }).catch(function () { lifecycle.fail(token,"request"); });
  });
}(window));
