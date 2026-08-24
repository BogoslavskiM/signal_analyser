(function registerPlotAutoscaleContract(window) {
  "use strict";

  var PLOT_AXES={
    time:{xaxis:"time",yaxis:"amplitude"},
    spectrum:{xaxis:"frequency",yaxis:"magnitude"},
    spectrogram:{xaxis:"time",yaxis:"frequency"},
    persistence:{xaxis:"frequency",yaxis:"power"}
  };

  function cleanType(value) {
    value=String(value == null ? "" : value).toLowerCase();
    return PLOT_AXES[value] ? value : "";
  }

  function capture(options) {
    options=options || {};
    var plotType=cleanType(options.plotType);
    if (!plotType) return null;
    var source=options.sourceLayout || {},rendered=options.fullLayout || {},axes={};
    Object.keys(PLOT_AXES[plotType]).forEach(function (axisName) { axes[axisName]={semantic:PLOT_AXES[plotType][axisName]}; });
    var sourceSlider=source.xaxis && source.xaxis.rangeslider || {};
    var renderedSlider=rendered.xaxis && rendered.xaxis.rangeslider || {};
    return {
      plotType:plotType,
      outputIdentity:String(options.outputIdentity == null ? "" : options.outputIdentity),
      axes:axes,
      rangeSliderVisible:sourceSlider.visible === true || renderedSlider.visible === true
    };
  }

  function relayout(snapshot) {
    if (!snapshot || !PLOT_AXES[snapshot.plotType]) return null;
    var update={autosize:true};
    Object.keys(snapshot.axes || {}).forEach(function (axisName) { update[axisName+".autorange"]=true; });
    if (snapshot.rangeSliderVisible && snapshot.axes && snapshot.axes.xaxis) update["xaxis.rangeslider.autorange"]=true;
    return update;
  }

  window.SignalAnalyserPlotAutoscale={
    plotTypes:Object.keys(PLOT_AXES),
    axesByPlotType:PLOT_AXES,
    capture:capture,
    relayout:relayout,
    contract:{
      trigger:"double-click on the clicked ready Plotly graph surface",
      baseline:"ignore every mirrored/provider numeric range and request true Plotly autorange/full domain for both spatial axes",
      logSemantics:"Plotly owns autorange for current linear/log axes; never linearly infer the reset range from numeric mirrors or raw samples",
      isolation:"autorange the clicked pane then reuse existing enabled frontend link propagation for eligible axes; clear/reproject viewport mirrors; do not publish settings, change main signal or request backend/DSP",
      heatmapColor:"spectrogram power and persistence density color ranges remain unchanged"
    }
  };
}(window));
