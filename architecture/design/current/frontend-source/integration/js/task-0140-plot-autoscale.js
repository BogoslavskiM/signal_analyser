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

  function finiteRange(value) {
    if (!Array.isArray(value) || value.length !== 2) return null;
    var start=Number(value[0]),finish=Number(value[1]);
    return Number.isFinite(start) && Number.isFinite(finish) && start !== finish ? [start,finish] : null;
  }

  function axisType(source,rendered) {
    var value=String(source && source.type || rendered && rendered.type || "linear").toLowerCase();
    return value === "log" ? "log" : "linear";
  }

  function captureAxis(semantic,source,rendered) {
    source=source || {};
    rendered=rendered || {};
    var providerRange=finiteRange(source.range);
    var automaticRange=finiteRange(rendered.range);
    return {
      semantic:semantic,
      type:axisType(source,rendered),
      mode:providerRange ? "provider_default" : automaticRange ? "automatic_full_domain" : "autorange",
      range:providerRange || automaticRange
    };
  }

  function capture(options) {
    options=options || {};
    var plotType=cleanType(options.plotType);
    if (!plotType) return null;
    var source=options.sourceLayout || {},rendered=options.fullLayout || {},axes={};
    Object.keys(PLOT_AXES[plotType]).forEach(function (axisName) {
      axes[axisName]=captureAxis(PLOT_AXES[plotType][axisName],source[axisName],rendered[axisName]);
    });
    var sourceSlider=source.xaxis && source.xaxis.rangeslider || {};
    var renderedSlider=rendered.xaxis && rendered.xaxis.rangeslider || {};
    return {
      plotType:plotType,
      outputIdentity:String(options.outputIdentity == null ? "" : options.outputIdentity),
      axes:axes,
      rangeSliderVisible:sourceSlider.visible === true || renderedSlider.visible === true
    };
  }

  function axisUpdate(update,axisName,axis) {
    if (axis.range) {
      update[axisName+".range[0]"]=axis.range[0];
      update[axisName+".range[1]"]=axis.range[1];
      update[axisName+".autorange"]=false;
    } else update[axisName+".autorange"]=true;
  }

  function relayout(snapshot) {
    if (!snapshot || !PLOT_AXES[snapshot.plotType]) return null;
    var update={autosize:true};
    Object.keys(snapshot.axes || {}).forEach(function (axisName) {
      axisUpdate(update,axisName,snapshot.axes[axisName]);
    });
    if (snapshot.rangeSliderVisible && snapshot.axes && snapshot.axes.xaxis) {
      var xaxis=snapshot.axes.xaxis;
      if (xaxis.range) {
        update["xaxis.rangeslider.range"]=xaxis.range.slice();
        update["xaxis.rangeslider.autorange"]=false;
      } else update["xaxis.rangeslider.autorange"]=true;
    }
    return update;
  }

  window.SignalAnalyserPlotAutoscale={
    plotTypes:Object.keys(PLOT_AXES),
    axesByPlotType:PLOT_AXES,
    capture:capture,
    relayout:relayout,
    contract:{
      trigger:"double-click on the clicked ready Plotly graph surface",
      baseline:"capture after each accepted current Plotly.react; provider explicit range wins, otherwise rendered automatic full-domain range",
      logSemantics:"captured Plotly log-axis ranges remain Plotly coordinates; never linearly reproject, clamp or infer them from raw samples",
      isolation:"relayout only the clicked pane; do not propagate linked axes, publish settings, change main signal or request backend/DSP",
      heatmapColor:"spectrogram power and persistence density color ranges remain unchanged"
    }
  };
}(window));
