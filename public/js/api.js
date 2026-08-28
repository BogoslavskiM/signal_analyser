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

  function binaryRequest(path, options) {
    return window.fetch(path, Object.assign({ headers: { Accept: "application/vnd.engee.signal-analyser-package+zip" } }, options || {}))
      .then(function (response) {
        if (!response.ok) {
          return response.json().catch(function () { return null; }).then(function (payload) {
            throw new ApiError((payload && payload.error && payload.error.message) || (payload && payload.message) || "Ошибка запроса: " + response.status, response.status, payload);
          });
        }
        return response.blob().then(function (blob) {
          return { blob: blob, contentType: response.headers.get("Content-Type") || "application/vnd.engee.signal-analyser-package+zip", filename: response.headers.get("Content-Disposition") || "" };
        });
      });
  }

  window.SignalAnalyserApi = {
    getState: function () { return request("./api/state-lite", { headers: { Accept: "application/json", "Cache-Control": "no-cache" }, cache: "no-store" }); },
    getFullState: function () { return request("./api/state", { headers: { Accept: "application/json", "Cache-Control": "no-cache" }, cache: "no-store" }); },
    activeOutput: function (displayId, paneId) {
      return request("./api/outputs/active?display_id=" + encodeURIComponent(displayId) + "&pane_id=" + encodeURIComponent(paneId), { headers: { Accept: "application/json", "Cache-Control": "no-cache" }, cache: "no-store" });
    },
    activePeaks: function (displayId, paneId) {
      return request("./api/peaks/active?display_id=" + encodeURIComponent(displayId) + "&pane_id=" + encodeURIComponent(paneId), { headers: { Accept: "application/json", "Cache-Control": "no-cache" }, cache: "no-store" });
    },
    calculateActivePeaks: function (payload) {
      return request("./api/peaks/active", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    panePeaks: function (displayId, paneId) {
      return request("./api/peaks/pane?display_id=" + encodeURIComponent(displayId) + "&pane_id=" + encodeURIComponent(paneId), { headers: { Accept: "application/json", "Cache-Control": "no-cache" }, cache: "no-store" });
    },
    calculatePanePeaks: function (payload) {
      return request("./api/peaks/pane", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    clearPanePeaks: function (payload) {
      return request("./api/peaks/pane/clear", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    updatePeaksSettings: function (payload) {
      return request("./api/peaks/settings", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    workspaceVariables: function () {
      return request("./api/workspace/variables", {
        headers: { Accept: "application/json", "Cache-Control": "no-store", Pragma: "no-cache" },
        cache: "no-store"
      });
    },
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
    updateSignalMetadata: function (payload) {
      return request("./api/signals", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    signalSummary: function (signalId, paneId) {
      var query = paneId ? "?pane_id=" + encodeURIComponent(paneId) : "";
      return request("./api/signals/" + encodeURIComponent(signalId) + "/summary" + query, { headers: { Accept: "application/json", "Cache-Control": "no-cache" }, cache: "no-store" });
    },
    signalSamples: function (signalId, cursor, limit) {
      var query = "?limit=" + encodeURIComponent(Math.min(500, Math.max(1, Number(limit) || 200)));
      if (cursor) query += "&cursor=" + encodeURIComponent(cursor);
      return request("./api/signals/" + encodeURIComponent(signalId) + "/samples" + query, { headers: { Accept: "application/json", "Cache-Control": "no-cache" }, cache: "no-store" });
    },
    deriveSignal: function (payload) {
      return request("./api/signals/derive", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    cropSignal: function (payload) {
      return request("./api/signals/crop", {
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
    applySettings: function (payload) {
      return request("./api/settings/apply", {
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
    exportPackage: function () { return binaryRequest("./api/session/package", { cache: "no-store" }); },
    nativeSaveOptions: function () { return request("./api/save/options", { cache: "no-store" }); },
    nativeFileBrowser: function (payload) { return request("./api/file-browser/list", { method:"POST", headers:{ Accept:"application/json", "Content-Type":"application/json" }, body:JSON.stringify(payload) }); },
    nativeFileBrowserAction: function (payload) { return request("./api/file-browser/action", { method:"POST", headers:{ Accept:"application/json", "Content-Type":"application/json" }, body:JSON.stringify(payload) }); },
    nativeSave: function (payload) { return request("./api/save", { method:"POST", headers:{ Accept:"application/json", "Content-Type":"application/json" }, body:JSON.stringify(payload) }); },
    nativeImportSession: function (payload) { return request("./api/import/session", { method:"POST", headers:{ Accept:"application/json", "Content-Type":"application/json" }, body:JSON.stringify(payload) }); },
    validatePackage: function (payload, signal) {
      return request("./api/session/package/validate", { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: signal });
    },
    importPackage: function (payload) {
      return request("./api/session/package/import", { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    },
    packageWorkspacePreflight: function (payload, signal) {
      return request("./api/session/package/workspace-preflight", { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: signal });
    },
  };
})(window);
