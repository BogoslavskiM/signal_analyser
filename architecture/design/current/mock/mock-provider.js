(function () {
  "use strict";
  window.SignalAnalyserProvider = {
    getState: function () {
      return Promise.resolve({
        activeDisplayId: "display-1",
        activePaneId: "pane-spectrum",
        nextDisplayOrdinal: 4,
        settingsPage: "signal",
        inspectorPage: "signals",
        dynamicSamplesOpen: false,
        dirty: false,
        displays: [
          { id: "display-1", name: "Экран 1", panes: [
            { id: "pane-spectrum", name: "Спектр приёмника", type: "spectrum", frequencySlider: true, magnitudeSlider: true },
            { id: "pane-time", name: "Импульс во времени", type: "time", frequencySlider: false, magnitudeSlider: false }
          ] },
          { id: "display-3", name: "ВЧ-контроль", panes: [] }
        ],
        links: { time: false, amplitude: false, spectrumFrequency: true, spectrumMagnitude: false },
        signal: { name: "radarPulse", color: "#2166df", sampleRate: "1000000", samples: 400000, duration: "399,999 мс", minimum: "−0,984", maximum: "1,000", rms: "0,516", mean: "0,008", type: "Вещественный" },
        signals: [
          { name: "radarPulse", color: "#2166df", sampleRate: "1 МГц", count: "400 000", duration: "399,999 мс", type: "Вещественный" },
          { name: "echoComplex", color: "#e1262e", sampleRate: "1 МГц", count: "348 000", duration: "347,999 мс", type: "Комплексный" },
          { name: "noiseFloor", color: "#1a8f58", sampleRate: "1 МГц", count: "400 000", duration: "399,999 мс", type: "Вещественный" }
        ],
        extrema: [
          { n: 1, signal: "radarPulse", color: "#2166df", type: "Максимум", value: "−3,18 dB", position: "184,2 кГц", marker: "▲ 1" },
          { n: 2, signal: "radarPulse", color: "#2166df", type: "Максимум", value: "−18,42 dB", position: "368,4 кГц", marker: "▲ 2" },
          { n: 3, signal: "echoComplex", color: "#e1262e", type: "Максимум", value: "−24,10 dB", position: "552,7 кГц", marker: "▲ 3" }
        ],
        sampleRows: [
          ["0", "0 нс", "0", "0", "0"],
          ["1", "1 000 нс", "0,309017", "0,309017", "0,095492"],
          ["2", "2 000 нс", "0,587785", "0,587785", "0,345492"],
          ["3", "3 000 нс", "0,809017", "0,809017", "0,654508"],
          ["4", "4 000 нс", "0,951057", "0,951057", "0,904508"],
          ["5", "5 000 нс", "1", "1", "1"],
          ["6", "6 000 нс", "0,951057", "0,951057", "0,904508"]
        ]
      });
    },
    onApply: function () { return new Promise(function (resolve) { window.setTimeout(resolve, 260); }); },
    onOperation: function (payload) { return new Promise(function (resolve, reject) { window.setTimeout(function () { if (payload && /missing_variable/.test(payload.body || "")) reject(new Error("Engee: имя missing_variable не определено.")); else resolve(); }, 620); }); }
  };
}());
