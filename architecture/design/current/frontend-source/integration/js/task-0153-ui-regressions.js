(function registerSignalAnalyserTask0153(window) {
  "use strict";

  var AREA_RANGES = {
    time: [
      { fieldId:"time.x_limits", axis:"time", label:"Пределы времени", unitField:"time.units" },
      { fieldId:"time.y_limits", axis:"amplitude", label:"Пределы амплитуды" }
    ],
    spectrum: [
      { fieldId:"spectrum.frequency_limits", axis:"frequency", label:"Пределы частоты", unitField:"spectrum.frequency_units" },
      { fieldId:"spectrum.y_limits", axis:"magnitude", label:"Пределы магнитуды" }
    ],
    spectrogram: [
      { fieldId:"time.x_limits", axis:"time", label:"Пределы времени", unitField:"spectrogram.time_units" },
      { fieldId:"spectrogram.frequency_limits", axis:"frequency", label:"Пределы частоты", unitField:"spectrogram.frequency_units" },
      { fieldId:"spectrogram.power_limits", axis:"power", label:"Пределы мощности" }
    ],
    persistence: [
      { fieldId:"persistence.frequency_limits", axis:"frequency", label:"Пределы частоты", unitField:"persistence.frequency_units" },
      { fieldId:"persistence.power_limits", axis:"power", label:"Пределы мощности" },
      { fieldId:"persistence.density_limits", axis:"density", label:"Пределы плотности" }
    ]
  };

  function cleanType(value) {
    value=String(value == null ? "" : value).toLowerCase();
    if (/spectrogram|спектрограмм/.test(value)) return "spectrogram";
    if (/persistence|персистент/.test(value)) return "persistence";
    if (/spectrum|спектр/.test(value)) return "spectrum";
    if (/time|временн/.test(value)) return "time";
    return "";
  }

  function areaRanges(plotType) {
    return (AREA_RANGES[cleanType(plotType)] || []).map(function (item) {
      return Object.assign({}, item, {
        scope:"area",
        sliderComponent:"screen-range-slider",
        sliderRequired:true,
        linkedVisibilityIndependent:true,
        emptyEndpoints:"independent_auto_until_that_endpoint_is_touched"
      });
    });
  }

  function closest(target, selector) {
    return target && typeof target.closest === "function" ? target.closest(selector) : null;
  }

  function doubleClickIntent(target, plotHost) {
    if (closest(target, "[data-screen-range-slider], .settings-field-row[data-range-boundary-validation]")) return "settings_range_reset";
    var inPlotSlider=closest(target, ".rangeslider-container, [data-amplitude-slider]");
    if (inPlotSlider && (!plotHost || typeof plotHost.contains !== "function" || plotHost.contains(inPlotSlider))) return "in_plot_slider_reset";
    var plotSurface=closest(target, ".nsewdrag, .plotly, .plot-container, .svg-container");
    if (plotHost && (target === plotHost || plotSurface && plotHost.contains(plotSurface))) return "plot_autoscale";
    return "ignore";
  }

  function plotDoubleClickProjection(state) {
    var visibility=paneSliderProjection(state,{kind:"graph_autoscale"});
    return Object.assign({},visibility,{
      action:"plot_autoscale",
      trueAutorange:true,
      paneMenuMutation:false,
      settingsPageMutation:false,
      backendMutation:false
    });
  }

  function paneSliderProjection(state,event) {
    state=state || {}; event=event || {};
    var xVisible=!!state.xRangeSliderVisible,yVisible=!!state.yRangeSliderVisible;
    var explicit=event.kind === "explicit_slider_toggle";
    if (explicit && event.axis === "x") xVisible=!!event.checked;
    if (explicit && event.axis === "y") yVisible=!!event.checked;
    return {
      xRangeSliderVisible:xVisible,
      yRangeSliderVisible:yVisible,
      mountHorizontalPaneSlider:xVisible,
      mountVerticalPaneSlider:yVisible,
      sliderVisibilityMutation:explicit,
      visibilityOwner:"explicit_pane_tool_or_matching_checkbox"
    };
  }

  function settingsRangeProjection(state,phase) {
    var projection=paneSliderProjection(state,{kind:"settings_range_"+String(phase || "edit")});
    return Object.assign({},projection,{
      action:phase === "apply" ? "settings_apply" : "settings_numeric_edit",
      viewportProjectionMutation:true,
      rangeValueMutation:true,
      backendMutation:false
    });
  }

  function settingsTabIntent(page, state) {
    state=state || {};
    var available=state.available !== false;
    return {
      accepted:available,
      page:available ? String(page || "") : String(state.currentPage || ""),
      backgroundApplyContinues:!!state.applying,
      blockedByApply:false,
      activationToken:Number(state.activationToken || 0) + (available ? 1 : 0)
    };
  }

  function decorateFooter(root) {
    if (!root || typeof root.querySelectorAll !== "function") return 0;
    var nodes=root.querySelectorAll("[data-testid='signal-values-action'], [data-testid='extrema-values']");
    Array.prototype.forEach.call(nodes,function (node) {
      node.classList.add("button-primary");
      node.dataset.footerActionStyle="primary";
    });
    return nodes.length;
  }

  window.SignalAnalyserTask0153={
    areaRanges:areaRanges,
    doubleClickIntent:doubleClickIntent,
    plotDoubleClickProjection:plotDoubleClickProjection,
    paneSliderProjection:paneSliderProjection,
    settingsRangeProjection:settingsRangeProjection,
    settingsTabIntent:settingsTabIntent,
    decorateFooter:decorateFooter,
    contract:{
      doubleClick:"A double-click on the ready graph surface performs true X/Y autoscale only. It never enables, opens or hides the in-plot time/frequency/amplitude slider, never opens the pane menu and never changes Settings page. Double-click on an already visible in-plot slider remains that slider's local reset; settings range-row double-click remains that field's local Auto reset.",
      paneSliderVisibility:"Horizontal and vertical pane sliders mount only from their explicit pane menu tool or the matching explicit Area checkbox. Settings numeric edit, Apply, Plotly relayout and graph autoscale preserve the existing visibility intent and cannot infer, enable or mount either pane slider.",
      tab:"Every visible Settings tab, including Экран, activates synchronously by pointer or keyboard even while a prior settings autosave/apply is pending. The prior request may finish in the background, but its late render must be ignored unless its page activation token is still current.",
      areaRanges:"Every applicable range row in Область → Диапазоны is followed by exactly one mounted dual-thumb slider. Linked-axis state changes propagation only and never hides Time/Frequency/Magnitude/Power/Density controls or their sliders.",
      footer:"Значения and Рассчитать are canonical Primary MD blue actions in the shared settings footer, with the existing 32px geometry and normal disabled state."
    }
  };
}(window));
