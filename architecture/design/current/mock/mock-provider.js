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
        mainSignalName: "radarPulse",
        dirty: false,
        displays: [
          { id: "display-1", name: "Экран 1", panes: [
            { id: "pane-spectrum", name: "Спектр приёмника", type: "spectrum", frequencySlider: true, magnitudeSlider: true },
            { id: "pane-time", name: "Импульс во времени", type: "time", frequencySlider: false, magnitudeSlider: false }
          ] },
          { id: "display-3", name: "ВЧ-контроль", panes: [] }
        ],
        links: { time: false, amplitude: false, spectrumFrequency: true, spectrumMagnitude: false },
        signal: { name: "radarPulse", color: "#2563eb", sampleRate: "1000000", samples: 400000, duration: "399,999 мс", regionStart: "0 мс", regionEnd: "399,999 мс", minimum: "−0,984", minimumTime: "291,503 мс", maximum: "1,000", maximumTime: "386,230 мс", rms: "0,516", mean: "0,008", median: "0,006", peakToPeak: "1,984", type: "Вещественный" },
        signals: [
          { name: "radarPulse", color: "#2563eb", sampleRate: "1 МГц", count: "400 000", duration: "399,999 мс", type: "Вещественный", visible:true },
          { name: "echoComplex", color: "#dc2626", sampleRate: "1 МГц", count: "348 000", duration: "347,999 мс", type: "Комплексный", visible:true },
          { name: "noiseFloor", color: "#16a34a", sampleRate: "1 МГц", count: "400 000", duration: "399,999 мс", type: "Вещественный", visible:false }
        ],
        extrema: [
          { n: 1, signal: "radarPulse", color: "#2563eb", type: "Максимум", value: "−3,18 dB", position: "184,2 кГц", marker: "▲ 1" },
          { n: 2, signal: "radarPulse", color: "#2563eb", type: "Максимум", value: "−18,42 dB", position: "368,4 кГц", marker: "▲ 2" },
          { n: 3, signal: "echoComplex", color: "#dc2626", type: "Максимум", value: "−24,10 dB", position: "552,7 кГц", marker: "▲ 3" }
        ],
        samplePage: { start_offset:0, end_offset:12, next_cursor:12, total:400000 },
        sampleColumnVisibility: { magnitude:true, square:true, square_root:true, signed_square_root_magnitude:true },
        sampleRows: [
          {sample_index:"0",time:"0 нс",value:"0",magnitude:"0",square:"0",square_root:"0",signed_square_root_magnitude:"0"},
          {sample_index:"1",time:"1 000 нс",value:"0,309017",magnitude:"0,309017",square:"0,095492",square_root:"0,555893",signed_square_root_magnitude:"0,555893"},
          {sample_index:"2",time:"2 000 нс",value:"0,587785",magnitude:"0,587785",square:"0,345492",square_root:"0,766671",signed_square_root_magnitude:"0,766671"},
          {sample_index:"3",time:"3 000 нс",value:"0,809017",magnitude:"0,809017",square:"0,654508",square_root:"0,899454",signed_square_root_magnitude:"0,899454"},
          {sample_index:"4",time:"4 000 нс",value:"0,951057",magnitude:"0,951057",square:"0,904508",square_root:"0,975221",signed_square_root_magnitude:"0,975221"},
          {sample_index:"5",time:"5 000 нс",value:"1",magnitude:"1",square:"1",square_root:"1",signed_square_root_magnitude:"1"},
          {sample_index:"6",time:"6 000 нс",value:"0,951057",magnitude:"0,951057",square:"0,904508",square_root:"0,975221",signed_square_root_magnitude:"0,975221"},
          {sample_index:"7",time:"7 000 нс",value:"0,809017",magnitude:"0,809017",square:"0,654508",square_root:"0,899454",signed_square_root_magnitude:"0,899454"},
          {sample_index:"8",time:"8 000 нс",value:"0,587785",magnitude:"0,587785",square:"0,345492",square_root:"0,766671",signed_square_root_magnitude:"0,766671"},
          {sample_index:"9",time:"9 000 нс",value:"0,309017",magnitude:"0,309017",square:"0,095492",square_root:"0,555893",signed_square_root_magnitude:"0,555893"},
          {sample_index:"10",time:"10 000 нс",value:"0",magnitude:"0",square:"0",square_root:"0",signed_square_root_magnitude:"0"},
          {sample_index:"11",time:"11 000 нс",value:"−0,309017",magnitude:"0,309017",square:"0,095492",square_root:"0 + 0,555893i",signed_square_root_magnitude:"−0,555893"}
        ]
      });
    },
    onApply: function () { return new Promise(function (resolve) { window.setTimeout(resolve, 260); }); },
    onOperation: function (payload) { return new Promise(function (resolve, reject) { window.setTimeout(function () { if (payload && /missing_variable/.test(payload.body || "")) reject(new Error("Engee: имя missing_variable не определено.")); else resolve(); }, 620); }); }
  };
}());
