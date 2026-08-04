(function registerSignalAnalyserApi(window) {
  "use strict";

  function ApiError(message, status, payload) {
    this.name = "ApiError";
    this.message = message;
    this.status = status || 0;
    this.payload = payload || null;
  }
  ApiError.prototype = Object.create(Error.prototype);
  ApiError.prototype.constructor = ApiError;

  function request(path, options) {
    return window.fetch(path, Object.assign({ headers: { Accept: "application/json" } }, options || {}))
      .then(function (response) {
        return response.json().catch(function () { return null; }).then(function (payload) {
          if (!response.ok) {
            throw new ApiError(
              (payload && (payload.error || payload.message)) || "Ошибка запроса: " + response.status,
              response.status,
              payload
            );
          }
          return payload;
        });
      });
  }

  window.SignalAnalyserApi = {
    getState: function () { return request("./api/state"); },
    workspaceVariables: function () { return request("./api/workspace/variables", { headers: { Accept: "application/json", "Cache-Control": "no-cache" }, cache: "no-store" }); },
    view: function (payload) {
      return request("./api/view", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    displays: function (payload) {
      return request("./api/displays", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    layouts: function (payload) {
      return request("./api/layouts", payload ? {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      } : { headers: { Accept: "application/json", "Cache-Control": "no-cache" }, cache: "no-store" });
    },
    signals: function (payload) {
      return request("./api/signals", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    settings: function (displayId) {
      return request("./api/settings?display_id=" + encodeURIComponent(displayId));
    },
    updateSetting: function (payload) {
      return request("./api/settings", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    session: function () { return request("./api/session", { headers: { Accept: "application/json", "Cache-Control": "no-cache" }, cache: "no-store" }); },
    importSession: function (payload) {
      return request("./api/session", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
  };
})(window);
