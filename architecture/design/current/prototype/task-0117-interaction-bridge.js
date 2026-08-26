(function (window, document) {
  "use strict";

  var intent = window.SignalAnalyserTask0117;
  var api = window.SignalAnalyserApi;
  var pending = false;

  function snapshotOf(response) {
    return response && response.state ? response.state : response;
  }

  function activeContext(snapshot) {
    var displayId = snapshot && snapshot.active_display_id;
    var layoutEntry = (snapshot && snapshot.layouts || []).find(function (entry) {
      return entry.display_id === displayId;
    });
    var layout = layoutEntry && layoutEntry.layout;
    var pane = layout && (layout.panes || []).find(function (item) {
      return item.id === layout.active_pane_id;
    });
    return { displayId: displayId, pane: pane };
  }

  function publish(snapshot) {
    document.dispatchEvent(new CustomEvent("native-session-imported", { detail: snapshot }));
  }

  function updateMembership(snapshot, signalName, checked) {
    var context = activeContext(snapshot);
    var pane = context.pane;
    if (!pane) return Promise.resolve(snapshot);
    var bindings = Array.isArray(pane.signal_bindings) ? pane.signal_bindings.slice() : [];
    var index = bindings.indexOf(signalName);
    if (checked && index < 0) bindings.push(signalName);
    if (!checked && index >= 0) bindings.splice(index, 1);
    if ((checked && index >= 0) || (!checked && index < 0)) return Promise.resolve(snapshot);
    return api.layouts({
      state_revision: snapshot.state_revision,
      display_id: context.displayId,
      version: 1,
      operation: "update_pane",
      pane_id: pane.id,
      plot_type: pane.plot_type,
      signal_bindings: bindings
    }).then(snapshotOf);
  }

  function selectMain(snapshot, signalName) {
    var current = snapshot && (snapshot.row_selected_signal || snapshot.selected_signal || snapshot.analysis_signal);
    if (current === signalName) return Promise.resolve(snapshot);
    return api.view({
      state_revision: snapshot.state_revision,
      row_selected_signal: signalName
    }).then(snapshotOf);
  }

  function run(action) {
    if (pending || !action || !action.signalName) return;
    pending = true;
    api.getState().then(snapshotOf).then(function (snapshot) {
      if (action.source === "row") {
        return updateMembership(snapshot, action.signalName, action.ensureVisible)
          .then(function (next) { return selectMain(next, action.signalName); });
      }
      return updateMembership(snapshot, action.signalName, action.visible);
    }).then(publish).finally(function () { pending = false; });
  }

  document.addEventListener("click", function (event) {
    var target = event.target;
    if (!target || target.closest("input,button,a,select,textarea,[contenteditable],.signal-row-actions,.modebar")) return;
    var row = target.closest("[data-signal-row]");
    if (!row) return;
    var checkbox = row.querySelector("[data-visible-signal]");
    if (!checkbox || checkbox.disabled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    run(intent.rowClick(checkbox.dataset.visibleSignal));
  }, true);

  document.addEventListener("change", function (event) {
    var checkbox = event.target && event.target.closest("[data-visible-signal]");
    if (!checkbox || checkbox.disabled) return;
    event.stopImmediatePropagation();
    run(intent.checkboxChange(checkbox.dataset.visibleSignal, checkbox.checked));
  }, true);
}(window, document));
