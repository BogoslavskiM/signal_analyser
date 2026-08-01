import Statistics

const SIGNAL_ANALYSER_VIEW_FIELDS = Set([
    "state_revision",
    "active_plot",
    "row_selected_signal",
    "analysis_signal",
    "selected_signal",
    "visible_signals",
    "time_limits",
    "measurement_kinds",
    "spectrum_settings",
    "spectrogram_settings",
    "peaks_enabled",
])
const SIGNAL_ANALYSER_DISPLAY_FIELDS = Set(["state_revision", "operation", "display_id"])
const SIGNAL_ANALYSER_DISPLAY_OPERATIONS = Set(["create", "select", "close"])
const SIGNAL_TIME_LIMIT_FIELDS = Set(["min_s", "max_s", "units"])
const SIGNAL_SPECTRUM_SETTINGS_FIELDS = Set([
    "scale",
    "frequency_scale",
    "leakage",
    "frequency_limits",
])
const SIGNAL_SPECTRUM_FREQUENCY_LIMIT_FIELDS = Set(["min_hz", "max_hz", "units"])
const SIGNAL_SPECTROGRAM_SETTINGS_FIELDS = Set([
    "overlap_percent",
    "leakage",
    "frequency_limits",
    "frequency_scale",
    "power_limits",
])
const SIGNAL_SPECTROGRAM_POWER_LIMIT_FIELDS = Set(["min_db", "max_db", "units"])

const SIGNAL_SPECTRUM_SCALE_NAMES = Dict(
    DB_SPECTRUM_SCALE => "db",
    LINEAR_SPECTRUM_SCALE => "linear",
)
const SIGNAL_SPECTRUM_SCALES_BY_NAME = Dict(
    value => key for (key, value) in SIGNAL_SPECTRUM_SCALE_NAMES
)
const SIGNAL_SPECTRUM_FREQUENCY_SCALE_NAMES = Dict(
    LINEAR_SPECTRUM_FREQUENCY_SCALE => "linear",
    LOG_SPECTRUM_FREQUENCY_SCALE => "log",
)
const SIGNAL_SPECTRUM_FREQUENCY_SCALES_BY_NAME = Dict(
    value => key for (key, value) in SIGNAL_SPECTRUM_FREQUENCY_SCALE_NAMES
)
const SIGNAL_SPECTROGRAM_FREQUENCY_SCALE_NAMES = Dict(
    LINEAR_SPECTROGRAM_FREQUENCY_SCALE => "linear",
    LOG_SPECTROGRAM_FREQUENCY_SCALE => "log",
)
const SIGNAL_SPECTROGRAM_FREQUENCY_SCALES_BY_NAME = Dict(
    value => key for (key, value) in SIGNAL_SPECTROGRAM_FREQUENCY_SCALE_NAMES
)

function signal_analyser_signal_payload(signal::AnalysedSignal)::Dict{String,Any}
    Dict{String,Any}(
        "name" => signal.name,
        "color" => signal.color,
        "sample_rate_hz" => signal.sample_rate_hz,
        "sample_count" => length(signal.values),
        "duration_s" => signal_duration_s(signal),
        "data_type" => signal_data_type(signal),
        "visible" => signal.visible,
    )
end

function signal_time_limits_payload(limits::SignalTimeLimits)::Dict{String,Any}
    Dict{String,Any}(
        "min_s" => limits.min_s,
        "max_s" => limits.max_s,
        "units" => "s",
    )
end

signal_time_limits_payload(::Nothing) = nothing

signal_spectrum_frequency_limits_payload(
    ::AutomaticSignalSpectrumFrequencyLimits,
) = nothing

function signal_spectrum_frequency_limits_payload(
    limits::ExplicitSignalSpectrumFrequencyLimits,
)::Dict{String,Any}
    Dict{String,Any}(
        "min_hz" => limits.min_hz,
        "max_hz" => limits.max_hz,
        "units" => "Hz",
    )
end

function signal_spectrum_frequency_limits_metadata(
    settings::SignalSpectrumSettings,
    data::SignalSpectrumData,
)::Dict{String,Any}
    requested = signal_spectrum_frequency_limits_payload(settings.frequency_limits)
    effective = isempty(data.frequencies_hz) ? nothing :
        signal_spectrum_frequency_limits_payload(ExplicitSignalSpectrumFrequencyLimits(
            first(data.frequencies_hz),
            last(data.frequencies_hz),
        ))
    Dict{String,Any}(
        "mode" => settings.frequency_limits isa AutomaticSignalSpectrumFrequencyLimits ?
            "auto" : "explicit",
        "requested" => requested,
        "effective" => effective,
    )
end

function signal_spectrum_settings_payload(
    settings::SignalSpectrumSettings,
)::Dict{String,Any}
    Dict{String,Any}(
        "scale" => SIGNAL_SPECTRUM_SCALE_NAMES[settings.scale],
        "frequency_scale" => SIGNAL_SPECTRUM_FREQUENCY_SCALE_NAMES[settings.frequency_scale],
        "leakage" => settings.leakage,
        "frequency_limits" => signal_spectrum_frequency_limits_payload(settings.frequency_limits),
    )
end

function signal_spectrogram_settings_payload(
    settings::SignalSpectrogramSettings,
)::Dict{String,Any}
    Dict{String,Any}(
        "overlap_percent" => settings.overlap_percent,
        "leakage" => settings.leakage,
        "frequency_limits" => signal_spectrum_frequency_limits_payload(settings.frequency_limits),
        "frequency_scale" => SIGNAL_SPECTROGRAM_FREQUENCY_SCALE_NAMES[settings.frequency_scale],
        "power_limits" => signal_spectrogram_power_limits_payload(settings.power_limits),
    )
end

signal_spectrogram_power_limits_payload(
    ::AutomaticSignalSpectrogramPowerLimits,
) = nothing

function signal_spectrogram_power_limits_payload(
    limits::ExplicitSignalSpectrogramPowerLimits,
)::Dict{String,Any}
    Dict{String,Any}(
        "min_db" => limits.min_db,
        "max_db" => limits.max_db,
        "units" => "dB",
    )
end

signal_spectrogram_power_extent_payload(::Nothing) = nothing

function signal_spectrogram_power_extent_payload(
    extent::SignalSpectrogramPowerExtent,
)::Dict{String,Any}
    Dict{String,Any}(
        "min_db" => extent.min_db,
        "max_db" => extent.max_db,
        "units" => "dB",
    )
end

function signal_spectrogram_power_limits_metadata(
    resolution::SignalSpectrogramPowerLimitsResolution,
)::Dict{String,Any}
    Dict{String,Any}(
        "mode" => resolution.requested isa AutomaticSignalSpectrogramPowerLimits ?
            "auto" : "explicit",
        "requested" => signal_spectrogram_power_limits_payload(resolution.requested),
        "effective" => signal_spectrogram_power_extent_payload(resolution.effective),
    )
end

function signal_spectrogram_power_limits_metadata(
    settings::SignalSpectrogramSettings,
    data::SignalSpectrogramData,
)::Dict{String,Any}
    projection = SignalSpectrogramPowerProjection(data)
    signal_spectrogram_power_limits_metadata(SignalSpectrogramPowerLimitsResolution(
        settings.power_limits,
        projection,
    ))
end

function signal_spectrogram_frequency_scale_metadata(
    settings::SignalSpectrogramSettings,
    topology::SignalSpectrumTopology,
)::Dict{String,Any}
    effective = signal_spectrogram_effective_frequency_scale(settings, topology)
    available = signal_spectrogram_available_frequency_scales(topology)
    Dict{String,Any}(
        "requested" => SIGNAL_SPECTROGRAM_FREQUENCY_SCALE_NAMES[settings.frequency_scale],
        "effective" => SIGNAL_SPECTROGRAM_FREQUENCY_SCALE_NAMES[effective],
        "available" => [SIGNAL_SPECTROGRAM_FREQUENCY_SCALE_NAMES[scale] for scale in available],
    )
end

signal_spectrogram_frequency_scale_metadata(
    settings::SignalSpectrogramSettings,
    signal::AnalysedSignal,
) = signal_spectrogram_frequency_scale_metadata(settings, signal_spectrum_topology(signal))

signal_spectrogram_frequency_scale_metadata(
    settings::SignalSpectrogramSettings,
    data::SignalSpectrogramData,
) = signal_spectrogram_frequency_scale_metadata(settings, data.topology)

function signal_spectrogram_frequency_scale_metadata(
    settings::SignalSpectrogramSettings,
    ::Nothing,
)::Dict{String,Any}
    Dict{String,Any}(
        "requested" => SIGNAL_SPECTROGRAM_FREQUENCY_SCALE_NAMES[settings.frequency_scale],
        "effective" => nothing,
        "available" => String[],
    )
end

function signal_spectrogram_frequency_limits_metadata(
    settings::SignalSpectrogramSettings,
    signal::AnalysedSignal,
)::Dict{String,Any}
    requested = signal_spectrum_frequency_limits_payload(settings.frequency_limits)
    effective_limits = settings.frequency_limits isa AutomaticSignalSpectrumFrequencyLimits ?
        signal_spectrum_topology_limits(signal) : settings.frequency_limits
    Dict{String,Any}(
        "mode" => settings.frequency_limits isa AutomaticSignalSpectrumFrequencyLimits ?
            "auto" : "explicit",
        "requested" => requested,
        "effective" => signal_spectrum_frequency_limits_payload(effective_limits),
    )
end

function signal_spectrogram_frequency_limits_metadata(
    settings::SignalSpectrogramSettings,
    ::Nothing,
)::Dict{String,Any}
    Dict{String,Any}(
        "mode" => settings.frequency_limits isa AutomaticSignalSpectrumFrequencyLimits ?
            "auto" : "explicit",
        "requested" => signal_spectrum_frequency_limits_payload(settings.frequency_limits),
        "effective" => nothing,
    )
end

function signal_spectrogram_frequency_limits_metadata(
    settings::SignalSpectrogramSettings,
    data::SignalSpectrogramData,
)::Dict{String,Any}
    effective = isempty(data.frequencies_hz) ? nothing :
        signal_spectrum_frequency_limits_payload(ExplicitSignalSpectrumFrequencyLimits(
            first(data.frequencies_hz),
            last(data.frequencies_hz),
        ))
    Dict{String,Any}(
        "mode" => settings.frequency_limits isa AutomaticSignalSpectrumFrequencyLimits ?
            "auto" : "explicit",
        "requested" => signal_spectrum_frequency_limits_payload(settings.frequency_limits),
        "effective" => effective,
    )
end

function signal_measurement_selection_payload(
    selection::SignalMeasurementSelection,
)::Vector{String}
    [signal_measurement_metadata(kind).id for kind in selection.kinds]
end

function signal_analyser_panel_field(
    id::AbstractString,
    label::AbstractString,
    type::AbstractString,
    value,
    unit::AbstractString = "",
)::Dict{String,Any}
    Dict{String,Any}(
        "id" => String(id),
        "label" => String(label),
        "type" => String(type),
        "value" => value,
        "unit" => String(unit),
        "readonly" => true,
    )
end

function signal_analyser_panel_payload(
    active_plot::SignalAnalyserPlot,
    signal::AnalysedSignal,
    plots::Dict{String,Any},
)::Dict{String,Any}
    plot_name = signal_analyser_plot_name(active_plot)
    title = if active_plot == TIME_PLOT
        "Время"
    elseif active_plot == SPECTRUM_PLOT
        "Спектр"
    elseif active_plot == SPECTROGRAM_PLOT
        "Спектрограмма"
    else
        "Спектр персистентности"
    end
    fields = if active_plot == TIME_PLOT
        [
            signal_analyser_panel_field("sample_rate_hz", "Частота дискретизации", "number", signal.sample_rate_hz, "Гц"),
            signal_analyser_panel_field("sample_count", "Количество отсчётов", "integer", length(signal.values)),
            signal_analyser_panel_field("duration_s", "Длительность", "number", signal_duration_s(signal), "с"),
            signal_analyser_panel_field("data_type", "Тип данных", "text", signal_data_type(signal)),
        ]
    elseif active_plot == SPECTRUM_PLOT
        [
            signal_analyser_panel_field("method", "Метод оценки", "text", "pspectrum"),
            signal_analyser_panel_field("frequency_points", "Частотных отсчётов", "integer", length(plots["spectrum"]["x"])),
            signal_analyser_panel_field("frequency_span_hz", "Полоса частот", "number", signal.sample_rate_hz, "Гц"),
        ]
    elseif active_plot == SPECTROGRAM_PLOT
        [
            signal_analyser_panel_field("time_bins", "Временных интервалов", "integer", length(plots["spectrogram"]["x"])),
            signal_analyser_panel_field("frequency_bins", "Частотных интервалов", "integer", length(plots["spectrogram"]["y"])),
            signal_analyser_panel_field("representation", "Представление", "text", "Спектрограмма"),
        ]
    else
        [
            signal_analyser_panel_field("frequency_bins", "Частотных интервалов", "integer", length(plots["persistence"]["x"])),
            signal_analyser_panel_field("power_bins", "Интервалов мощности", "integer", length(plots["persistence"]["y"])),
            signal_analyser_panel_field("representation", "Представление", "text", "Персистентность"),
        ]
    end

    Dict{String,Any}(
        "title" => title,
        "active_plot" => plot_name,
        "fields" => fields,
    )
end

function signal_analyser_empty_plots(
    spectrum_settings::SignalSpectrumSettings = SignalSpectrumSettings(),
    spectrogram_settings::SignalSpectrogramSettings = SignalSpectrogramSettings(),
)::Dict{String,Any}
    Dict{String,Any}(
        "time" => Dict{String,Any}(
            "type" => "line",
            "x" => Float64[],
            "y" => Float64[],
            "x_label" => "Время, с",
            "y_label" => "Амплитуда",
        ),
        "spectrum" => Dict{String,Any}(
            "type" => "line",
            "x" => Float64[],
            "y" => Float64[],
            "x_label" => "Частота, Гц",
            "y_label" => spectrum_settings.scale == DB_SPECTRUM_SCALE ? "Мощность, дБ" : "Мощность",
            "method" => "pspectrum",
            "frequency_limits" => signal_spectrum_frequency_limits_metadata(
                spectrum_settings,
                SignalSpectrumData(ONE_SIDED_SPECTRUM),
            ),
        ),
        "spectrogram" => Dict{String,Any}(
            "type" => "heatmap",
            "x" => Float64[],
            "y" => Float64[],
            "z" => Vector{Vector{Float64}}(),
            "x_label" => "Время, с",
            "y_label" => "Частота, Гц",
            "color_label" => "Мощность, дБ",
            "frequency_limits" => signal_spectrogram_frequency_limits_metadata(
                spectrogram_settings,
                nothing,
            ),
            "frequency_scale" => signal_spectrogram_frequency_scale_metadata(
                spectrogram_settings,
                nothing,
            ),
            "power_limits" => signal_spectrogram_power_limits_metadata(
                spectrogram_settings,
                SignalSpectrogramData(ONE_SIDED_SPECTRUM),
            ),
        ),
        "persistence" => Dict{String,Any}(
            "type" => "heatmap",
            "x" => Float64[],
            "y" => Float64[],
            "z" => Vector{Vector{Float64}}(),
            "x_label" => "Частота, Гц",
            "y_label" => "Мощность, дБ",
            "color_label" => "Встречаемость, %",
        ),
    )
end

function signal_analyser_empty_panel_payload(active_plot::SignalAnalyserPlot)::Dict{String,Any}
    title = if active_plot == TIME_PLOT
        "Время"
    elseif active_plot == SPECTRUM_PLOT
        "Спектр"
    elseif active_plot == SPECTROGRAM_PLOT
        "Спектрограмма"
    else
        "Спектр персистентности"
    end
    Dict{String,Any}(
        "title" => title,
        "active_plot" => signal_analyser_plot_name(active_plot),
        "fields" => Dict{String,Any}[],
    )
end

function signal_analyser_cached_plots!(state::SignalAnalyserState, signal::AnalysedSignal)::Dict{String,Any}
    get!(state.plot_cache, signal.name) do
        signal_analyser_base_plots(signal)
    end
end

function signal_analyser_prepared_plots(state::SignalAnalyserState, signal_names::Vector{String})::Dict{String,Dict{String,Any}}
    prepared = Dict{String,Dict{String,Any}}()
    for name in signal_names
        if haskey(state.plot_cache, name)
            prepared[name] = state.plot_cache[name]
        else
            prepared[name] = signal_analyser_base_plots(signal_by_name(state, name))
        end
    end
    prepared
end

function signal_analyser_publish_prepared_plots!(
    state::SignalAnalyserState,
    prepared::Dict{String,Dict{String,Any}},
)
    for (name, plots) in prepared
        state.plot_cache[name] = plots
    end
    nothing
end

function signal_analyser_prepared_spectra(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    signal_names::Vector{String},
)::Dict{SignalSpectrumCacheKey,SignalSpectrumData}
    isempty(signal_names) && return Dict{SignalSpectrumCacheKey,SignalSpectrumData}()
    limits = display.time_limits
    limits === nothing && throw(ArgumentError("Непустой Display должен иметь Time Limits"))
    prepared = Dict{SignalSpectrumCacheKey,SignalSpectrumData}()
    for name in signal_names
        signal = signal_by_name(state, name)
        frequency_limits = signal_spectrum_effective_frequency_limits(
            display.spectrum_settings.frequency_limits,
            signal,
        )
        frequency_limits === nothing && continue
        sample_range = signal_spectrum_sample_range(
            state.spectrum_service,
            state.measurements_service.roi_service,
            signal,
            limits,
        )
        sample_range === nothing && continue
        key = signal_spectrum_cache_key(
            signal,
            sample_range,
            display.spectrum_settings,
            frequency_limits,
        )
        if haskey(state.spectrum_cache, key)
            prepared[key] = state.spectrum_cache[key]
        elseif length(sample_range) == 1
            prepared[key] = SignalSpectrumData(signal_spectrum_topology(signal))
        else
            query = signal_spectrum_query(
                signal,
                sample_range,
                display.spectrum_settings,
                frequency_limits,
            )
            prepared[key] = signal_spectrum_calculate(state.spectrum_service, query)
        end
    end
    prepared
end

function signal_analyser_publish_prepared_spectra!(
    state::SignalAnalyserState,
    prepared::Dict{SignalSpectrumCacheKey,SignalSpectrumData},
)
    for (key, data) in prepared
        state.spectrum_cache[key] = data
    end
    nothing
end

function signal_analyser_prepared_spectrograms(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    signal::Union{Nothing,AnalysedSignal},
    ;
    refresh::Bool = false,
)::Dict{SignalSpectrogramCacheKey,SignalSpectrogramData}
    prepared = Dict{SignalSpectrogramCacheKey,SignalSpectrogramData}()
    signal === nothing && return prepared
    key = signal_spectrogram_cache_key(signal, display.spectrogram_settings)
    prepared[key] = !refresh && haskey(state.spectrogram_cache, key) ?
        state.spectrogram_cache[key] :
        signal_spectrogram_data(state.spectrogram_service, signal, display.spectrogram_settings)
    prepared
end

function signal_analyser_publish_prepared_spectrograms!(
    state::SignalAnalyserState,
    prepared::Dict{SignalSpectrogramCacheKey,SignalSpectrogramData},
)
    for (key, data) in prepared
        state.spectrogram_cache[key] = data
    end
    nothing
end

function signal_analyser_cached_spectrum_data!(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    signal::AnalysedSignal,
    ;
    materialize_missing::Bool = true,
)::SignalSpectrumData
    limits = display.time_limits
    limits === nothing && throw(ArgumentError("Непустой Display должен иметь Time Limits"))
    frequency_limits = signal_spectrum_effective_frequency_limits(
        display.spectrum_settings.frequency_limits,
        signal,
    )
    frequency_limits === nothing && return SignalSpectrumData(signal_spectrum_topology(signal))
    sample_range = signal_spectrum_sample_range(
        state.spectrum_service,
        state.measurements_service.roi_service,
        signal,
        limits,
    )
    sample_range === nothing && return SignalSpectrumData(signal_spectrum_topology(signal))
    key = signal_spectrum_cache_key(
        signal,
        sample_range,
        display.spectrum_settings,
        frequency_limits,
    )
    if haskey(state.spectrum_cache, key)
        return state.spectrum_cache[key]
    end
    materialize_missing || return SignalSpectrumData(signal_spectrum_topology(signal))
    get!(state.spectrum_cache, key) do
        length(sample_range) == 1 && return SignalSpectrumData(signal_spectrum_topology(signal))
        query = signal_spectrum_query(
            signal,
            sample_range,
            display.spectrum_settings,
            frequency_limits,
        )
        signal_spectrum_calculate(state.spectrum_service, query)
    end
end

function signal_analyser_cached_spectrogram_data!(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    signal::AnalysedSignal,
    ;
    materialize_missing::Bool = true,
)::SignalSpectrogramData
    key = signal_spectrogram_cache_key(signal, display.spectrogram_settings)
    if haskey(state.spectrogram_cache, key)
        return state.spectrogram_cache[key]
    end
    materialize_missing || return SignalSpectrogramData(signal_spectrum_topology(signal))
    get!(state.spectrogram_cache, key) do
        signal_spectrogram_data(state.spectrogram_service, signal, display.spectrogram_settings)
    end
end

function signal_analyser_plots_for_display!(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    signal::AnalysedSignal,
    ;
    materialize_missing_spectra::Bool = true,
    materialize_missing_spectrogram::Bool = true,
)::Dict{String,Any}
    plots = copy(signal_analyser_cached_plots!(state, signal))
    spectrum_data = signal_analyser_cached_spectrum_data!(
        state,
        display,
        signal,
        materialize_missing = materialize_missing_spectra,
    )
    spectrogram_data = signal_analyser_cached_spectrogram_data!(
        state,
        display,
        signal,
        materialize_missing = materialize_missing_spectrogram,
    )
    plots["spectrum"] = signal_analyser_spectrum_plot(spectrum_data, display.spectrum_settings)
    plots["spectrogram"] = signal_analyser_spectrogram_plot(
        spectrogram_data,
        display.spectrogram_settings,
        signal,
    )
    plots
end

function signal_analyser_visible_signal_names(state::SignalAnalyserState)::Vector{String}
    [signal.name for signal in state.signals if signal.visible]
end

function signal_analyser_display_by_id(
    state::SignalAnalyserState,
    display_id::AbstractString,
)::SignalAnalyserDisplayState
    index = findfirst(display -> display.id == display_id, state.displays)
    index === nothing && throw(ArgumentError("Display не найден: $display_id"))
    state.displays[index]
end

function signal_analyser_active_display(state::SignalAnalyserState)::SignalAnalyserDisplayState
    signal_analyser_display_by_id(state, state.active_display_id)
end

function signal_analyser_display_payload(display::SignalAnalyserDisplayState)::Dict{String,Any}
    analysis_name = signal_analyser_display_analysis_name(display)
    Dict{String,Any}(
        "id" => display.id,
        "name" => display.name,
        "active_plot" => signal_analyser_plot_name(display.active_plot),
        "selected_signal" => analysis_name,
        "analysis_signal" => analysis_name,
        "visible_signals" => signal_analyser_display_members(display),
        "time_limits" => signal_time_limits_payload(display.time_limits),
        "measurement_kinds" => signal_measurement_selection_payload(display.measurement_selection),
        "spectrum_settings" => signal_spectrum_settings_payload(display.spectrum_settings),
        "spectrogram_settings" => signal_spectrogram_settings_payload(display.spectrogram_settings),
        "peaks_enabled" => display.peaks_enabled,
    )
end

function signal_analyser_with_visibility(signal::AnalysedSignal, visible::Bool)::AnalysedSignal
    AnalysedSignal(
        signal.name,
        signal.color,
        signal.sample_rate_hz,
        signal.values,
        signal.is_complex,
        visible,
    )
end

function signal_analyser_sync_active_display!(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
)
    visible_set = Set(display.membership.signal_names)
    signals = [
        signal_analyser_with_visibility(signal, signal.name in visible_set)
        for signal in state.signals
    ]
    state.signals = signals
    state.active_display_id = display.id
    state.view.active_plot = display.active_plot
    state.view.selected_signal = signal_analyser_display_analysis_name(display)
    nothing
end

function signal_analyser_plot_for_payload(
    plot::Dict{String,Any},
    signal::AnalysedSignal,
)::Dict{String,Any}
    payload = copy(plot)
    payload["signal"] = signal.name
    payload["name"] = signal.name
    payload["color"] = signal.color
    payload
end

function signal_analyser_multi_trace_payload(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    selected_signal::AnalysedSignal,
    visible_names::Vector{String},
    selected_plots::Dict{String,Any},
    ;
    materialize_missing_spectra::Bool = true,
    materialize_missing_spectrogram::Bool = true,
)::Dict{String,Any}
    time_traces = Dict{String,Any}[]
    spectrum_traces = Dict{String,Any}[]
    for signal in state.signals
        signal.name in visible_names || continue
        base_plots = signal_analyser_cached_plots!(state, signal)
        spectrum_data = signal_analyser_cached_spectrum_data!(
            state,
            display,
            signal,
            materialize_missing = materialize_missing_spectra,
        )
        spectrum_plot = signal_analyser_spectrum_plot(spectrum_data, display.spectrum_settings)
        push!(time_traces, signal_analyser_plot_for_payload(base_plots["time"], signal))
        push!(spectrum_traces, signal_analyser_plot_for_payload(spectrum_plot, signal))
    end

    Dict{String,Any}(
        "selected_signal" => selected_signal.name,
        "visible_signals" => visible_names,
        "time_traces" => time_traces,
        "spectrum_traces" => spectrum_traces,
        "spectrogram" => signal_analyser_plot_for_payload(selected_plots["spectrogram"], selected_signal),
        "persistence" => signal_analyser_plot_for_payload(selected_plots["persistence"], selected_signal),
    )
end

function signal_analyser_multi_trace_payload(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    selected_signal::AnalysedSignal,
    visible_names::Vector{String},
    ;
    materialize_missing_spectra::Bool = true,
    materialize_missing_spectrogram::Bool = true,
)::Dict{String,Any}
    selected_plots = signal_analyser_plots_for_display!(
        state,
        display,
        selected_signal,
        materialize_missing_spectra = materialize_missing_spectra,
        materialize_missing_spectrogram = materialize_missing_spectrogram,
    )
    signal_analyser_multi_trace_payload(
        state,
        display,
        selected_signal,
        visible_names,
        selected_plots,
        materialize_missing_spectra = materialize_missing_spectra,
        materialize_missing_spectrogram = materialize_missing_spectrogram,
    )
end

function signal_analyser_multi_trace_payload(
    ::SignalAnalyserState,
    ::SignalAnalyserDisplayState,
    ::Nothing,
    visible_names::Vector{String},
    plots::Dict{String,Any},
    ;
    materialize_missing_spectra::Bool = true,
    materialize_missing_spectrogram::Bool = true,
)::Dict{String,Any}
    isempty(visible_names) || throw(ArgumentError("Пустой analysis source допустим только для пустого Display"))
    spectrogram = copy(plots["spectrogram"])
    spectrogram["signal"] = nothing
    spectrogram["name"] = ""
    spectrogram["color"] = ""
    persistence = copy(plots["persistence"])
    persistence["signal"] = nothing
    persistence["name"] = ""
    persistence["color"] = ""
    Dict{String,Any}(
        "selected_signal" => nothing,
        "visible_signals" => String[],
        "time_traces" => Dict{String,Any}[],
        "spectrum_traces" => Dict{String,Any}[],
        "spectrogram" => spectrogram,
        "persistence" => persistence,
    )
end

function signal_analyser_multi_trace_payload(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    signal::Nothing,
    visible_names::Vector{String},
    ;
    materialize_missing_spectra::Bool = true,
    materialize_missing_spectrogram::Bool = true,
)::Dict{String,Any}
    plots = signal_analyser_empty_plots(
        display.spectrum_settings,
        display.spectrogram_settings,
    )
    signal_analyser_multi_trace_payload(
        state,
        display,
        signal,
        visible_names,
        plots,
        materialize_missing_spectra = materialize_missing_spectra,
        materialize_missing_spectrogram = materialize_missing_spectrogram,
    )
end

function signal_measurement_ordinates(
    ::SignalTimeRoiService,
    signal::AnalysedSignal,
)::Tuple{SignalMeasurementOrdinate,Vector{Float64}}
    ordinate_kind = signal_measurement_ordinate(signal)
    ordinate = ordinate_kind == MAGNITUDE_ORDINATE ? Float64.(abs.(signal.values)) : Float64.(real.(signal.values))
    isempty(ordinate) && throw(ArgumentError("Сигнал не содержит отсчётов"))
    all(isfinite, ordinate) || throw(ArgumentError("Сигнал содержит нечисловые отсчёты"))
    isfinite(signal.sample_rate_hz) && signal.sample_rate_hz > 0 || throw(ArgumentError(
        "Частота дискретизации сигнала должна быть положительным конечным числом",
    ))
    ordinate_kind, ordinate
end

signal_measurement_ordinate(signal::AnalysedSignal)::SignalMeasurementOrdinate =
    signal.is_complex ? MAGNITUDE_ORDINATE : REAL_ORDINATE

signal_measurement_ordinates(service::SignalMeasurementsService, signal::AnalysedSignal) =
    signal_measurement_ordinates(service.roi_service, signal)

function signal_full_time_limits(
    service::SignalTimeRoiService,
    signal::AnalysedSignal,
)::SignalTimeLimits
    signal_measurement_ordinates(service, signal)
    duration_s = signal_duration_s(signal)
    isfinite(duration_s) && duration_s > 0 || throw(ArgumentError(
        "Полный диапазон сигнала должен иметь положительную конечную длительность",
    ))
    SignalTimeLimits(0.0, duration_s)
end

signal_full_time_limits(service::SignalMeasurementsService, signal::AnalysedSignal) =
    signal_full_time_limits(service.roi_service, signal)

function signal_ordinate_roi(
    service::SignalTimeRoiService,
    signal::AnalysedSignal,
    limits::SignalTimeLimits,
)::SignalOrdinateRoi
    ordinate_kind, ordinate = signal_measurement_ordinates(service, signal)
    sample_range = signal_time_sample_range(service, signal, limits)
    SignalOrdinateRoi(
        ordinate_kind,
        @view(ordinate[sample_range.first_index:sample_range.last_index]),
        sample_range.first_index - 1,
        signal.sample_rate_hz,
    )
end

function signal_time_sample_range(
    service::SignalTimeRoiService,
    signal::AnalysedSignal,
    limits::SignalTimeLimits,
)::SignalTimeSampleRange
    _, ordinate = signal_measurement_ordinates(service, signal)
    duration_s = signal_duration_s(signal)
    limits.min_s >= 0.0 || throw(ArgumentError("Минимальная Time Limit не может быть отрицательной"))
    limits.max_s <= duration_s || throw(ArgumentError(
        "Максимальная Time Limit превышает длительность analysis source",
    ))

    first_position = findfirst(eachindex(ordinate)) do index
        time_s = (index - 1) / signal.sample_rate_hz
        limits.min_s <= time_s <= limits.max_s
    end
    last_position = findlast(eachindex(ordinate)) do index
        time_s = (index - 1) / signal.sample_rate_hz
        limits.min_s <= time_s <= limits.max_s
    end
    first_position === nothing && throw(ArgumentError("Time Limits не содержат ни одного отсчёта"))
    last_position === nothing && throw(ArgumentError("Time Limits не содержат ни одного отсчёта"))
    first_position <= last_position || throw(ArgumentError("Time Limits не содержат ни одного отсчёта"))
    SignalTimeSampleRange(first_position, last_position)
end

signal_ordinate_roi(
    service::SignalMeasurementsService,
    signal::AnalysedSignal,
    limits::SignalTimeLimits,
) = signal_ordinate_roi(service.roi_service, signal, limits)

signal_time_sample_range(
    service::SignalMeasurementsService,
    signal::AnalysedSignal,
    limits::SignalTimeLimits,
) = signal_time_sample_range(service.roi_service, signal, limits)

signal_spectrum_topology(signal::AnalysedSignal)::SignalSpectrumTopology =
    signal.is_complex ? CENTERED_TWO_SIDED_SPECTRUM : ONE_SIDED_SPECTRUM

function signal_spectrum_topology_limits(
    sample_rate_hz::Real,
    topology::SignalSpectrumTopology,
)::ExplicitSignalSpectrumFrequencyLimits
    sample_rate_hz isa Bool && throw(ArgumentError(
        "Частота дискретизации сигнала должна быть числом, но не Bool",
    ))
    sample_rate_value = Float64(sample_rate_hz)
    isfinite(sample_rate_value) && sample_rate_value > 0 || throw(ArgumentError(
        "Частота дискретизации сигнала должна быть положительным конечным числом",
    ))
    nyquist_hz = sample_rate_value / 2
    topology == CENTERED_TWO_SIDED_SPECTRUM ?
        ExplicitSignalSpectrumFrequencyLimits(-nyquist_hz, nyquist_hz) :
        ExplicitSignalSpectrumFrequencyLimits(0.0, nyquist_hz)
end

signal_spectrum_topology_limits(signal::AnalysedSignal)::ExplicitSignalSpectrumFrequencyLimits =
    signal_spectrum_topology_limits(
        signal.sample_rate_hz,
        signal_spectrum_topology(signal),
    )

signal_spectrum_frequency_limits_valid(
    ::AutomaticSignalSpectrumFrequencyLimits,
    ::Real,
    ::SignalSpectrumTopology,
) = true

function signal_spectrum_frequency_limits_valid(
    limits::ExplicitSignalSpectrumFrequencyLimits,
    sample_rate_hz::Real,
    topology::SignalSpectrumTopology,
)::Bool
    domain = signal_spectrum_topology_limits(sample_rate_hz, topology)
    domain.min_hz <= limits.min_hz && limits.max_hz <= domain.max_hz
end

signal_spectrum_frequency_limits_valid_for_signal(
    limits::AbstractSignalSpectrumFrequencyLimits,
    signal::AnalysedSignal,
) = signal_spectrum_frequency_limits_valid(
    limits,
    signal.sample_rate_hz,
    signal_spectrum_topology(signal),
)

signal_spectrum_effective_frequency_limits(
    ::AutomaticSignalSpectrumFrequencyLimits,
    ::AnalysedSignal,
) = AutomaticSignalSpectrumFrequencyLimits()

function signal_spectrum_effective_frequency_limits(
    requested::ExplicitSignalSpectrumFrequencyLimits,
    signal::AnalysedSignal,
)::Union{Nothing,ExplicitSignalSpectrumFrequencyLimits}
    domain = signal_spectrum_topology_limits(signal)
    minimum_frequency = max(requested.min_hz, domain.min_hz)
    maximum_frequency = min(requested.max_hz, domain.max_hz)
    minimum_frequency < maximum_frequency || return nothing
    ExplicitSignalSpectrumFrequencyLimits(minimum_frequency, maximum_frequency)
end

function signal_spectrum_with_frequency_limits(
    settings::SignalSpectrumSettings,
    frequency_limits::AbstractSignalSpectrumFrequencyLimits,
)::SignalSpectrumSettings
    SignalSpectrumSettings(
        settings.scale,
        settings.frequency_scale,
        settings.leakage,
        frequency_limits,
    )
end

function signal_spectrogram_with_frequency_limits(
    settings::SignalSpectrogramSettings,
    frequency_limits::AbstractSignalSpectrumFrequencyLimits,
)::SignalSpectrogramSettings
    SignalSpectrogramSettings(
        settings.overlap_percent,
        settings.leakage,
        frequency_limits,
        settings.frequency_scale,
        settings.power_limits,
    )
end

"""Intersect a Display Time ROI with one visible signal without resampling it."""
function signal_spectrum_sample_range(
    ::SignalSpectrumService,
    ::SignalTimeRoiService,
    signal::AnalysedSignal,
    limits::SignalTimeLimits,
)::Union{Nothing,SignalTimeSampleRange}
    isempty(signal.values) && throw(ArgumentError("Сигнал не содержит отсчётов"))
    isfinite(signal.sample_rate_hz) && signal.sample_rate_hz > 0 || throw(ArgumentError(
        "Частота дискретизации сигнала должна быть положительным конечным числом",
    ))
    limits.min_s >= 0.0 || throw(ArgumentError("Минимальная Time Limit не может быть отрицательной"))
    first_position = findfirst(eachindex(signal.values)) do index
        limits.min_s <= (index - 1) / signal.sample_rate_hz <= limits.max_s
    end
    first_position === nothing && return nothing
    last_position = findlast(eachindex(signal.values)) do index
        limits.min_s <= (index - 1) / signal.sample_rate_hz <= limits.max_s
    end
    last_position === nothing && return nothing
    SignalTimeSampleRange(first_position, last_position)
end

function signal_spectrum_cache_key(
    signal::AnalysedSignal,
    sample_range::SignalTimeSampleRange,
    settings::SignalSpectrumSettings,
    frequency_limits::AbstractSignalSpectrumFrequencyLimits = settings.frequency_limits,
)::SignalSpectrumCacheKey
    SignalSpectrumCacheKey(
        signal.name,
        signal.sample_rate_hz,
        sample_range,
        settings.leakage,
        signal_spectrum_topology(signal),
        frequency_limits,
    )
end

function signal_spectrum_query(
    signal::AnalysedSignal,
    sample_range::SignalTimeSampleRange,
    settings::SignalSpectrumSettings,
    frequency_limits::AbstractSignalSpectrumFrequencyLimits = settings.frequency_limits,
)::SignalSpectrumQuery
    SignalSpectrumQuery(
        signal.name,
        @view(signal.values[sample_range.first_index:sample_range.last_index]),
        signal.sample_rate_hz,
        sample_range,
        settings.leakage,
        signal_spectrum_topology(signal),
        frequency_limits,
    )
end

function signal_spectrum_calculate(
    provider::AbstractSignalSpectrumProvider,
    query::SignalSpectrumQuery,
)::SignalSpectrumData
    throw(MethodError(signal_spectrum_calculate, (provider, query)))
end

signal_spectrum_frequency_limits_options(
    ::AutomaticSignalSpectrumFrequencyLimits,
) = Any[]

function signal_spectrum_frequency_limits_options(
    limits::ExplicitSignalSpectrumFrequencyLimits,
)
    Any["FrequencyLimits", [limits.min_hz, limits.max_hz]]
end

function signal_spectrum_calculate(
    ::EngeeDSPSpectrumProvider,
    query::SignalSpectrumQuery,
)::SignalSpectrumData
    samples = query.topology == ONE_SIDED_SPECTRUM ?
        Float64.(real.(query.values)) : copy(query.values)
    times = collect(0:(length(samples) - 1)) ./ query.sample_rate_hz
    options = Any[
        "Leakage",
        query.leakage,
        "TwoSided",
        query.topology == CENTERED_TWO_SIDED_SPECTRUM,
    ]
    append!(options, signal_spectrum_frequency_limits_options(query.frequency_limits))
    power, frequencies, _ = signal_analyser_pspectrum(
        samples,
        times,
        "power",
        options...,
    )
    provider_power = Float64.(vec(collect(power)))
    provider_frequencies = Float64.(vec(collect(frequencies)))
    SignalSpectrumData(provider_frequencies, provider_power, query.topology)
end

function signal_spectrum_calculate(
    service::SignalSpectrumService,
    query::SignalSpectrumQuery,
)::SignalSpectrumData
    data = signal_spectrum_calculate(service.provider, query)
    data.topology == query.topology || throw(ArgumentError(
        "Spectrum provider вернул topology, не совпадающую с query",
    ))
    isempty(data.frequencies_hz) && throw(ArgumentError(
        "Spectrum provider вернул пустой результат для ROI из двух или более отсчётов",
    ))
    frequencies = data.frequencies_hz
    issorted(frequencies) || throw(ArgumentError(
        "Spectrum provider вернул неупорядоченную частотную ось",
    ))
    nyquist_hz = query.sample_rate_hz / 2
    tolerance_hz = sqrt(eps(Float64)) * max(query.sample_rate_hz, 1.0)
    all(frequency -> -nyquist_hz - tolerance_hz <= frequency <= nyquist_hz + tolerance_hz, frequencies) ||
        throw(ArgumentError("Spectrum provider вернул частоты вне Nyquist-диапазона"))
    if query.frequency_limits isa ExplicitSignalSpectrumFrequencyLimits
        limits = query.frequency_limits::ExplicitSignalSpectrumFrequencyLimits
        all(
            frequency -> limits.min_hz - tolerance_hz <= frequency <= limits.max_hz + tolerance_hz,
            frequencies,
        ) || throw(ArgumentError(
            "Spectrum provider вернул частоты вне effective Frequency Limits",
        ))
        abs(first(frequencies) - limits.min_hz) <= tolerance_hz &&
            abs(last(frequencies) - limits.max_hz) <= tolerance_hz || throw(ArgumentError(
                "Spectrum provider не сохранил effective Frequency Limits",
            ))
    elseif query.topology == ONE_SIDED_SPECTRUM
        all(frequency -> frequency >= -tolerance_hz, frequencies) || throw(ArgumentError(
            "Spectrum provider вернул отрицательные частоты для one-sided query",
        ))
    else
        any(frequency -> frequency < 0.0, frequencies) &&
            any(frequency -> frequency >= 0.0, frequencies) || throw(ArgumentError(
                "Spectrum provider не вернул centered two-sided частотную ось",
            ))
    end
    data
end

function signal_spectrum_data(
    service::SignalSpectrumService,
    signal::AnalysedSignal,
    limits::SignalTimeLimits,
    settings::SignalSpectrumSettings,
)::SignalSpectrumData
    frequency_limits = signal_spectrum_effective_frequency_limits(
        settings.frequency_limits,
        signal,
    )
    frequency_limits === nothing && return SignalSpectrumData(signal_spectrum_topology(signal))
    sample_range = signal_time_sample_range(SignalTimeRoiService(), signal, limits)
    length(sample_range) == 1 && return SignalSpectrumData(signal_spectrum_topology(signal))
    signal_spectrum_calculate(
        service,
        signal_spectrum_query(signal, sample_range, settings, frequency_limits),
    )
end

function signal_spectrogram_cache_key(
    signal::AnalysedSignal,
    settings::SignalSpectrogramSettings,
)::SignalSpectrogramCacheKey
    SignalSpectrogramCacheKey(
        signal.name,
        signal.sample_rate_hz,
        length(signal.values),
        signal_spectrum_topology(signal),
        settings.overlap_percent,
        settings.leakage,
        settings.frequency_limits,
    )
end

signal_spectrogram_cache_key(signal::AnalysedSignal)::SignalSpectrogramCacheKey =
    signal_spectrogram_cache_key(signal, SignalSpectrogramSettings())

function signal_spectrogram_query(
    signal::AnalysedSignal,
    settings::SignalSpectrogramSettings,
)::SignalSpectrogramQuery
    SignalSpectrogramQuery(
        signal.name,
        signal.values,
        signal.sample_rate_hz,
        signal_spectrum_topology(signal),
        settings.overlap_percent,
        settings.leakage,
        settings.frequency_limits,
    )
end

signal_spectrogram_query(signal::AnalysedSignal)::SignalSpectrogramQuery =
    signal_spectrogram_query(signal, SignalSpectrogramSettings())

function signal_spectrogram_calculate(
    provider::AbstractSignalSpectrogramProvider,
    query::SignalSpectrogramQuery,
)::SignalSpectrogramData
    throw(MethodError(signal_spectrogram_calculate, (provider, query)))
end

function signal_spectrogram_calculate(
    ::EngeeDSPSpectrogramProvider,
    query::SignalSpectrogramQuery,
)::SignalSpectrogramData
    samples = query.topology == ONE_SIDED_SPECTRUM ?
        Float64.(real.(query.values)) : copy(query.values)
    times = collect(0:(length(samples) - 1)) ./ query.sample_rate_hz
    options = Any[
        "Leakage",
        query.leakage,
        "OverlapPercent",
        query.overlap_percent,
        "TwoSided",
        query.topology == CENTERED_TWO_SIDED_SPECTRUM,
    ]
    append!(options, signal_spectrum_frequency_limits_options(query.frequency_limits))
    power, frequencies, segment_centers = signal_analyser_pspectrum(
        samples,
        times,
        "spectrogram",
        options...,
    )
    power isa AbstractMatrix || throw(ArgumentError(
        "Spectrogram provider должен вернуть двумерную матрицу мощности",
    ))
    SignalSpectrogramData(
        vec(collect(frequencies)),
        vec(collect(segment_centers)),
        power,
        query.topology,
    )
end

function signal_spectrogram_calculate(
    service::SignalSpectrogramService,
    query::SignalSpectrogramQuery,
)::SignalSpectrogramData
    signal_spectrum_frequency_limits_valid(
        query.frequency_limits,
        query.sample_rate_hz,
        query.topology,
    ) || throw(ArgumentError(
        "Frequency Limits Spectrogram должны целиком лежать в topology query",
    ))
    data = signal_spectrogram_calculate(service.provider, query)
    data.topology == query.topology || throw(ArgumentError(
        "Spectrogram provider вернул topology, не совпадающую с query",
    ))
    isempty(data.frequencies_hz) && throw(ArgumentError(
        "Spectrogram provider вернул пустую частотную ось для двух или более отсчётов",
    ))
    isempty(data.segment_centers_s) && throw(ArgumentError(
        "Spectrogram provider вернул пустую временную ось для двух или более отсчётов",
    ))

    duration_s = (length(query.values) - 1) / query.sample_rate_hz
    time_tolerance_s = sqrt(eps(Float64)) * max(duration_s, 1 / query.sample_rate_hz, 1.0)
    latest_segment_center_s = duration_s + 0.5 / query.sample_rate_hz
    all(
        center -> -time_tolerance_s <= center <= latest_segment_center_s + time_tolerance_s,
        data.segment_centers_s,
    ) || throw(ArgumentError(
        "Spectrogram provider вернул центры сегментов вне временного домена сигнала",
    ))

    nyquist_hz = query.sample_rate_hz / 2
    frequency_tolerance_hz = sqrt(eps(Float64)) * max(query.sample_rate_hz, 1.0)
    frequencies = data.frequencies_hz
    if query.frequency_limits isa ExplicitSignalSpectrumFrequencyLimits
        limits = query.frequency_limits::ExplicitSignalSpectrumFrequencyLimits
        length(frequencies) >= 2 && all(>(0.0), diff(collect(frequencies))) || throw(ArgumentError(
            "Spectrogram provider не вернул строго возрастающую explicit частотную ось",
        ))
        all(
            frequency -> limits.min_hz - frequency_tolerance_hz <= frequency <=
                limits.max_hz + frequency_tolerance_hz,
            frequencies,
        ) || throw(ArgumentError(
            "Spectrogram provider вернул частоты вне explicit Frequency Limits",
        ))
        abs(first(frequencies) - limits.min_hz) <= frequency_tolerance_hz &&
            abs(last(frequencies) - limits.max_hz) <= frequency_tolerance_hz ||
            throw(ArgumentError(
                "Spectrogram provider не сохранил explicit Frequency Limits",
            ))
    elseif query.topology == ONE_SIDED_SPECTRUM
        all(
            frequency -> -frequency_tolerance_hz <= frequency <= nyquist_hz + frequency_tolerance_hz,
            frequencies,
        ) || throw(ArgumentError(
            "Spectrogram provider вернул частоты вне one-sided Nyquist-диапазона",
        ))
        abs(first(frequencies)) <= frequency_tolerance_hz &&
            abs(last(frequencies) - nyquist_hz) <= frequency_tolerance_hz ||
            throw(ArgumentError(
                "Spectrogram provider не вернул полный one-sided Nyquist-диапазон",
            ))
    else
        all(
            frequency -> -nyquist_hz - frequency_tolerance_hz <= frequency <= nyquist_hz + frequency_tolerance_hz,
            frequencies,
        ) || throw(ArgumentError(
            "Spectrogram provider вернул частоты вне centered Nyquist-диапазона",
        ))
        abs(first(frequencies) + nyquist_hz) <= frequency_tolerance_hz &&
            abs(last(frequencies) - nyquist_hz) <= frequency_tolerance_hz ||
            throw(ArgumentError(
                "Spectrogram provider не вернул полный centered Nyquist-диапазон",
            ))
    end
    data
end

function signal_spectrogram_data(
    service::SignalSpectrogramService,
    signal::AnalysedSignal,
    settings::SignalSpectrogramSettings,
)::SignalSpectrogramData
    topology = signal_spectrum_topology(signal)
    signal_spectrum_frequency_limits_valid_for_signal(
        settings.frequency_limits,
        signal,
    ) || throw(ArgumentError(
        "Frequency Limits Spectrogram должны целиком лежать в topology analysis source",
    ))
    length(signal.values) < 2 && return SignalSpectrogramData(topology)
    signal_spectrogram_calculate(service, signal_spectrogram_query(signal, settings))
end


signal_spectrogram_data(
    service::SignalSpectrogramService,
    signal::AnalysedSignal,
)::SignalSpectrogramData = signal_spectrogram_data(
    service,
    signal,
    SignalSpectrogramSettings(),
)

function signal_time_limits_are_valid(
    service::SignalMeasurementsService,
    signal::AnalysedSignal,
    limits::SignalTimeLimits,
)::Bool
    try
        signal_ordinate_roi(service, signal, limits)
        true
    catch err
        err isa ArgumentError || rethrow()
        false
    end
end

function signal_measurements_snapshot(
    service::SignalMeasurementsService,
    state_revision::Int,
    signal::AnalysedSignal,
    limits::SignalTimeLimits,
    selection::SignalMeasurementSelection,
)::SignalMeasurementsSnapshot
    if isempty(selection.kinds)
        return SignalMeasurementsSnapshot(
            state_revision,
            signal.name,
            signal_measurement_ordinate(signal),
            SignalMeasurementUnits("1", "s"),
            (),
        )
    end

    roi = signal_ordinate_roi(service, signal, limits)
    ordinate = collect(roi.values)
    needs_extrema = signal_measurement_selected(selection, MINIMUM_MEASUREMENT) ||
        signal_measurement_selected(selection, MAXIMUM_MEASUREMENT) ||
        signal_measurement_selected(selection, PEAK_TO_PEAK_MEASUREMENT)
    minimum_index = needs_extrema ? argmin(ordinate) : nothing
    maximum_index = needs_extrema ? argmax(ordinate) : nothing
    mean_value = signal_measurement_selected(selection, MEAN_MEASUREMENT) ?
        Statistics.mean(ordinate) : nothing
    rms_value = signal_measurement_selected(selection, RMS_MEASUREMENT) ?
        signal_measurement_rms(service, ordinate) : nothing
    peak_to_peak_value = signal_measurement_selected(selection, PEAK_TO_PEAK_MEASUREMENT) ?
        ordinate[maximum_index::Int] - ordinate[minimum_index::Int] : nothing
    median_value = signal_measurement_selected(selection, MEDIAN_MEASUREMENT) ?
        Statistics.median!(ordinate) : nothing

    items = SignalMeasurementItem[]
    for kind in selection.kinds
        if kind == MINIMUM_MEASUREMENT || kind == MAXIMUM_MEASUREMENT
            ordinate_index = kind == MINIMUM_MEASUREMENT ? minimum_index::Int : maximum_index::Int
            sample_index = roi.sample_offset + ordinate_index - 1
            push!(
                items,
                SignalMeasurementItem(
                    kind,
                    roi.values[ordinate_index],
                    SignalMeasurementPosition(
                        sample_index,
                        sample_index / roi.sample_rate_hz,
                    ),
                ),
            )
        elseif kind == MEAN_MEASUREMENT
            push!(items, SignalMeasurementItem(kind, mean_value::Float64, nothing))
        elseif kind == MEDIAN_MEASUREMENT
            push!(items, SignalMeasurementItem(kind, median_value::Float64, nothing))
        elseif kind == PEAK_TO_PEAK_MEASUREMENT
            push!(items, SignalMeasurementItem(kind, peak_to_peak_value::Float64, nothing))
        elseif kind == RMS_MEASUREMENT
            push!(items, SignalMeasurementItem(kind, rms_value::Float64, nothing))
        else
            throw(ArgumentError("Неподдерживаемый вид измерения"))
        end
    end

    SignalMeasurementsSnapshot(
        state_revision,
        signal.name,
        roi.ordinate,
        SignalMeasurementUnits("1", "s"),
        Tuple(items),
    )
end

function signal_measurement_rms(
    ::SignalMeasurementsService,
    ordinate::AbstractVector{<:Real},
)::Float64
    scale = maximum(abs, ordinate)
    scale == 0.0 && return 0.0
    scale * sqrt(Statistics.mean(value -> abs2(value / scale), ordinate))
end

function signal_measurements_snapshot(
    service::SignalMeasurementsService,
    state_revision::Int,
    signal::AnalysedSignal,
    limits::SignalTimeLimits,
)::SignalMeasurementsSnapshot
    signal_measurements_snapshot(
        service,
        state_revision,
        signal,
        limits,
        SignalMeasurementSelection(),
    )
end


function signal_measurements_snapshot(
    service::SignalMeasurementsService,
    state_revision::Int,
    signal::AnalysedSignal,
    selection::SignalMeasurementSelection,
)::SignalMeasurementsSnapshot
    signal_measurements_snapshot(
        service,
        state_revision,
        signal,
        signal_full_time_limits(service, signal),
        selection,
    )
end

function signal_measurements_snapshot(
    service::SignalMeasurementsService,
    state_revision::Int,
    signal::AnalysedSignal,
)::SignalMeasurementsSnapshot
    signal_measurements_snapshot(
        service,
        state_revision,
        signal,
        signal_full_time_limits(service, signal),
    )
end

function signal_measurements_snapshot(
    ::SignalMeasurementsService,
    state_revision::Int,
    ::Nothing,
    ::SignalMeasurementSelection,
)::SignalMeasurementsSnapshot
    SignalMeasurementsSnapshot(
        state_revision,
        nothing,
        nothing,
        SignalMeasurementUnits("1", "s"),
        (),
    )
end

function signal_measurements_snapshot(
    service::SignalMeasurementsService,
    state_revision::Int,
    signal::Nothing,
)::SignalMeasurementsSnapshot
    signal_measurements_snapshot(service, state_revision, signal, SignalMeasurementSelection())
end


function signal_measurements_snapshot(
    service::SignalMeasurementsService,
    state_revision::Int,
    signal::Nothing,
    limits::Nothing,
    selection::SignalMeasurementSelection,
)::SignalMeasurementsSnapshot
    signal_measurements_snapshot(service, state_revision, signal, selection)
end

function signal_measurements_snapshot(
    service::SignalMeasurementsService,
    state_revision::Int,
    signal::Nothing,
    limits::Nothing,
)::SignalMeasurementsSnapshot
    signal_measurements_snapshot(service, state_revision, signal, limits, SignalMeasurementSelection())
end

function signal_peaks_detect(
    provider::AbstractPeaksProvider,
    query::SignalPeaksQuery,
)::SignalPeaksProviderResult
    throw(MethodError(signal_peaks_detect, (provider, query)))
end

function signal_peaks_engee_dsp_module(::EngeeDSPPeaksProvider)
    try
        Base.require(@__MODULE__, :EngeeDSP)
    catch
        throw(SignalPeaksCapabilityError(
            "Поиск пиков недоступен: в runtime отсутствует пакет EngeeDSP",
        ))
    end
end

function signal_peaks_detect(
    provider::EngeeDSPPeaksProvider,
    query::SignalPeaksQuery,
)::SignalPeaksProviderResult
    engee_dsp = signal_peaks_engee_dsp_module(provider)
    functions_module = try
        getproperty(engee_dsp, :Functions)
    catch
        throw(SignalPeaksCapabilityError(
            "Поиск пиков недоступен: EngeeDSP.Functions не найден",
        ))
    end
    findpeaks = try
        getproperty(functions_module, :findpeaks)
    catch
        throw(SignalPeaksCapabilityError(
            "Поиск пиков недоступен: EngeeDSP.Functions.findpeaks не найден",
        ))
    end
    raw_result = Base.invokelatest(findpeaks, collect(query.values); out = :data)
    raw_result isa NamedTuple || throw(SignalPeaksCapabilityError(
        "EngeeDSP.Functions.findpeaks вернул неожидаемый тип результата",
    ))
    keys(raw_result) == (:Ypk, :Xpk, :Wpk, :Ppk) || throw(SignalPeaksCapabilityError(
        "EngeeDSP.Functions.findpeaks вернул неожидаемую форму результата",
    ))
    locations = vec(collect(raw_result.Xpk))
    all(location -> location isa Integer && !(location isa Bool), locations) || throw(
        SignalPeaksCapabilityError("EngeeDSP.Functions.findpeaks вернул нецелые default locations Xpk"),
    )
    SignalPeaksProviderResult(
        vec(collect(raw_result.Ypk)),
        Int.(locations),
        vec(collect(raw_result.Wpk)),
        vec(collect(raw_result.Ppk)),
        length(query.values),
    )
end

function signal_peaks_snapshot(
    service::SignalPeaksService,
    state_revision::Int,
    display::SignalAnalyserDisplayState,
    signal::Union{Nothing,AnalysedSignal},
)::SignalPeaksSnapshot
    if signal === nothing
        display.peaks_enabled && throw(ArgumentError("Пустой Display не может иметь enabled Peaks"))
        return SignalPeaksSnapshot(
            false,
            state_revision,
            display.id,
            nothing,
            nothing,
            SignalPeaksUnits(),
            SignalPeakItem[],
        )
    end
    ordinate_kind = signal.is_complex ? MAGNITUDE_ORDINATE : REAL_ORDINATE
    units = SignalPeaksUnits()
    if !display.peaks_enabled
        return SignalPeaksSnapshot(
            false,
            state_revision,
            display.id,
            signal.name,
            ordinate_kind,
            units,
            SignalPeakItem[],
        )
    end
    display.active_plot == TIME_PLOT || throw(ArgumentError(
        "Поиск пиков доступен только для Time plot",
    ))
    limits = display.time_limits
    limits === nothing && throw(ArgumentError("Непустой Display должен иметь Time Limits"))
    roi = signal_ordinate_roi(service.ordinate_service, signal, limits)
    if length(roi.values) < 3
        return SignalPeaksSnapshot(
            true,
            state_revision,
            display.id,
            signal.name,
            roi.ordinate,
            units,
            SignalPeakItem[],
        )
    end
    query = SignalPeaksQuery(
        state_revision,
        display.id,
        signal.name,
        roi.ordinate,
        collect(roi.values),
        roi.sample_rate_hz,
        roi.sample_offset,
    )
    result = signal_peaks_detect(service.provider, query)
    items = SignalPeakItem[
        SignalPeakItem(
            result.peak_values[index],
            query.sample_offset + result.locations_1based[index] - 1,
            (query.sample_offset + result.locations_1based[index] - 1) / query.sample_rate_hz,
            result.widths_samples[index],
            result.prominences[index],
        )
        for index in eachindex(result.peak_values)
    ]
    SignalPeaksSnapshot(
        true,
        state_revision,
        display.id,
        signal.name,
        ordinate_kind,
        units,
        items,
    )
end

function signal_measurement_item_payload(item::SignalMeasurementItem)::Dict{String,Any}
    metadata = signal_measurement_metadata(item.kind)
    Dict{String,Any}(
        "id" => metadata.id,
        "label" => metadata.label,
        "value" => item.value,
        "time_s" => item.position === nothing ? nothing : item.position.time_s,
        "sample_index" => item.position === nothing ? nothing : item.position.sample_index,
    )
end

function signal_measurements_payload(measurements::SignalMeasurementsSnapshot)::Dict{String,Any}
    Dict{String,Any}(
        "state_revision" => measurements.state_revision,
        "signal_name" => measurements.signal_name,
        "ordinate" => signal_measurement_ordinate_name(measurements.ordinate),
        "units" => Dict{String,Any}(
            "value" => measurements.units.value,
            "time" => measurements.units.time,
        ),
        "items" => Dict{String,Any}[signal_measurement_item_payload(item) for item in measurements.items],
    )
end

function signal_peak_item_payload(item::SignalPeakItem)::Dict{String,Any}
    Dict{String,Any}(
        "id" => item.id,
        "value" => item.value,
        "sample_index" => item.sample_index,
        "time_s" => item.time_s,
        "width_samples" => item.width_samples,
        "prominence" => item.prominence,
    )
end

function signal_peaks_payload(peaks::SignalPeaksSnapshot)::Dict{String,Any}
    Dict{String,Any}(
        "enabled" => peaks.enabled,
        "state_revision" => peaks.state_revision,
        "display_id" => peaks.display_id,
        "signal_name" => peaks.signal_name,
        "ordinate" => signal_measurement_ordinate_name(peaks.ordinate),
        "units" => Dict{String,Any}(
            "value" => peaks.units.value,
            "time" => peaks.units.time,
            "width" => peaks.units.width,
            "prominence" => peaks.units.prominence,
        ),
        "items" => Dict{String,Any}[signal_peak_item_payload(item) for item in peaks.items],
    )
end

function signal_analyser_snapshot_unlocked(
    state::SignalAnalyserState,
    measurements::SignalMeasurementsSnapshot,
    peaks::SignalPeaksSnapshot,
    ;
    materialize_missing_spectra::Bool = true,
    materialize_missing_spectrogram::Bool = true,
)::Dict{String,Any}
    active_display = signal_analyser_active_display(state)
    analysis_name = signal_analyser_display_analysis_name(active_display)
    signal = analysis_name === nothing ? nothing : signal_by_name(state, analysis_name)
    measurements.state_revision == state.view.state_revision || throw(ArgumentError(
        "Ревизия measurements не совпадает с ревизией state snapshot",
    ))
    measurements.signal_name == analysis_name || throw(ArgumentError(
        "Сигнал measurements не совпадает с analysis source state snapshot",
    ))
    expected_measurement_kinds = analysis_name === nothing ? () : active_display.measurement_selection.kinds
    Tuple(item.kind for item in measurements.items) == expected_measurement_kinds || throw(ArgumentError(
        "Состав measurements не совпадает с preference active Display",
    ))
    peaks.state_revision == state.view.state_revision || throw(ArgumentError(
        "Ревизия peaks не совпадает с ревизией state snapshot",
    ))
    peaks.display_id == active_display.id || throw(ArgumentError(
        "Display peaks не совпадает с active Display state snapshot",
    ))
    peaks.signal_name == analysis_name || throw(ArgumentError(
        "Сигнал peaks не совпадает с analysis source state snapshot",
    ))
    peaks.enabled == active_display.peaks_enabled || throw(ArgumentError(
        "Статус peaks не совпадает с active Display state snapshot",
    ))
    if active_display.spectrum_settings.frequency_scale == LOG_SPECTRUM_FREQUENCY_SCALE &&
        any(item -> item.is_complex && item.name in active_display.membership.signal_names, state.signals)
        throw(ArgumentError(
            "Log frequency scale недоступна для Display с комплексным сигналом",
        ))
    end
    plots = signal === nothing ?
        signal_analyser_empty_plots(
            active_display.spectrum_settings,
            active_display.spectrogram_settings,
        ) :
        signal_analyser_plots_for_display!(
            state,
            active_display,
            signal,
            materialize_missing_spectra = materialize_missing_spectra,
            materialize_missing_spectrogram = materialize_missing_spectrogram,
        )
    visible_names = signal_analyser_visible_signal_names(state)
    Dict{String,Any}(
        "state_revision" => state.view.state_revision,
        "active_display_id" => state.active_display_id,
        "displays" => [signal_analyser_display_payload(display) for display in state.displays],
        "active_plot" => signal_analyser_plot_name(state.view.active_plot),
        "row_selected_signal" => state.row_selection.signal_name,
        "analysis_signal" => analysis_name,
        "selected_signal" => analysis_name,
        "visible_signals" => visible_names,
        "time_limits" => signal_time_limits_payload(active_display.time_limits),
        "measurement_kinds" => signal_measurement_selection_payload(active_display.measurement_selection),
        "spectrum_settings" => signal_spectrum_settings_payload(active_display.spectrum_settings),
        "spectrogram_settings" => signal_spectrogram_settings_payload(active_display.spectrogram_settings),
        "signals" => [signal_analyser_signal_payload(item) for item in state.signals],
        "plots" => plots,
        "plot_payload" => signal_analyser_multi_trace_payload(
            state,
            active_display,
            signal,
            visible_names,
            plots,
            materialize_missing_spectra = materialize_missing_spectra,
            materialize_missing_spectrogram = materialize_missing_spectrogram,
        ),
        "measurements" => signal_measurements_payload(measurements),
        "peaks" => signal_peaks_payload(peaks),
        "panel" => signal === nothing ?
            signal_analyser_empty_panel_payload(state.view.active_plot) :
            signal_analyser_panel_payload(state.view.active_plot, signal, plots),
    )
end

"""Typed semantic diff used to plan atomic View mutation preparation."""
struct SignalAnalyserViewChanges
    row_selection::Bool
    active_plot::Bool
    membership::Bool
    analysis_source::Bool
    time_limits::Bool
    measurement_selection::Bool
    spectrum_settings::Bool
    spectrogram_settings::Bool
    peaks_enabled::Bool
end

function SignalAnalyserViewChanges(
    current_row_selection::GlobalSignalSelection,
    current_display::SignalAnalyserDisplayState,
    prospective_row_selection::GlobalSignalSelection,
    prospective_display::SignalAnalyserDisplayState,
)
    SignalAnalyserViewChanges(
        prospective_row_selection.signal_name != current_row_selection.signal_name,
        prospective_display.active_plot != current_display.active_plot,
        prospective_display.membership.signal_names != current_display.membership.signal_names,
        !isequal(
            signal_analyser_display_analysis_name(prospective_display),
            signal_analyser_display_analysis_name(current_display),
        ),
        !isequal(prospective_display.time_limits, current_display.time_limits),
        prospective_display.measurement_selection != current_display.measurement_selection,
        prospective_display.spectrum_settings != current_display.spectrum_settings,
        prospective_display.spectrogram_settings != current_display.spectrogram_settings,
        prospective_display.peaks_enabled != current_display.peaks_enabled,
    )
end

function signal_analyser_has_changes(changes::SignalAnalyserViewChanges)::Bool
    any((
        changes.row_selection,
        changes.active_plot,
        changes.membership,
        changes.analysis_source,
        changes.time_limits,
        changes.measurement_selection,
        changes.spectrum_settings,
        changes.spectrogram_settings,
        changes.peaks_enabled,
    ))
end

function signal_analyser_only_spectrogram_settings_changed(
    changes::SignalAnalyserViewChanges,
)::Bool
    changes.spectrogram_settings && !any((
        changes.row_selection,
        changes.active_plot,
        changes.membership,
        changes.analysis_source,
        changes.time_limits,
        changes.measurement_selection,
        changes.spectrum_settings,
        changes.peaks_enabled,
    ))
end

function signal_analyser_snapshot_unlocked(state::SignalAnalyserState)::Dict{String,Any}
    display = signal_analyser_active_display(state)
    analysis_name = signal_analyser_display_analysis_name(display)
    signal = analysis_name === nothing ? nothing : signal_by_name(state, analysis_name)
    measurements = signal_measurements_snapshot(
        state.measurements_service,
        state.view.state_revision,
        signal,
        display.time_limits,
        display.measurement_selection,
    )
    peaks = signal_peaks_snapshot(
        state.peaks_service,
        state.view.state_revision,
        display,
        signal,
    )
    signal_analyser_snapshot_unlocked(state, measurements, peaks)
end

function signal_analyser_snapshot(state::SignalAnalyserState)::Dict{String,Any}
    lock(state.lock) do
        signal_analyser_snapshot_unlocked(state)
    end
end

function signal_analyser_payload_value(data::AbstractDict, key::AbstractString)
    haskey(data, key) && return data[key]
    symbol_key = Symbol(key)
    haskey(data, symbol_key) && return data[symbol_key]
    nothing
end

function signal_analyser_payload_contains(data::AbstractDict, key::AbstractString)::Bool
    haskey(data, key) || haskey(data, Symbol(key))
end

function signal_analyser_payload_keys(data::AbstractDict)::Set{String}
    Set(string(key) for key in keys(data))
end

function signal_analyser_validate_visible_signals!(
    field_errors::Dict{String,String},
    state::SignalAnalyserState,
    value,
)::Union{Nothing,Vector{String}}
    if !(value isa AbstractVector)
        field_errors["visible_signals"] = "Требуется массив имён сигналов"
        return nothing
    end
    requested_names = String[]
    seen = Set{String}()
    for item in value
        if !(item isa AbstractString)
            field_errors["visible_signals"] = "Каждый элемент должен быть строкой"
            return nothing
        end
        name = String(item)
        if name in seen
            field_errors["visible_signals"] = "Имена сигналов не должны повторяться"
            return nothing
        end
        push!(seen, name)
        push!(requested_names, name)
    end

    known_names = Set(signal.name for signal in state.signals)
    unknown_names = sort!(setdiff(requested_names, collect(known_names)))
    if !isempty(unknown_names)
        field_errors["visible_signals"] = "Неизвестные сигналы: $(join(unknown_names, ", "))"
        return nothing
    end

    [signal.name for signal in state.signals if signal.name in seen]
end

function signal_analyser_validate_time_limits!(
    field_errors::Dict{String,String},
    value,
)::Union{Nothing,SignalTimeLimits}
    value === nothing && return nothing
    if !(value isa AbstractDict)
        field_errors["time_limits"] = "Требуется null или объект {min_s, max_s, units}"
        return nothing
    end
    keys_set = signal_analyser_payload_keys(value)
    if keys_set != SIGNAL_TIME_LIMIT_FIELDS
        missing = sort!(collect(setdiff(SIGNAL_TIME_LIMIT_FIELDS, keys_set)))
        unknown = sort!(collect(setdiff(keys_set, SIGNAL_TIME_LIMIT_FIELDS)))
        details = String[]
        isempty(missing) || push!(details, "отсутствуют: $(join(missing, ", "))")
        isempty(unknown) || push!(details, "неизвестны: $(join(unknown, ", "))")
        field_errors["time_limits"] = "Ожидались только min_s, max_s, units ($(join(details, "; ")))"
        return nothing
    end

    minimum_value = signal_analyser_payload_value(value, "min_s")
    maximum_value = signal_analyser_payload_value(value, "max_s")
    units_value = signal_analyser_payload_value(value, "units")
    if !(minimum_value isa Real) || minimum_value isa Bool ||
        !(maximum_value isa Real) || maximum_value isa Bool
        field_errors["time_limits"] = "min_s и max_s должны быть конечными числами"
        return nothing
    end
    if units_value != "s"
        field_errors["time_limits"] = "Поддерживаются только units=s"
        return nothing
    end
    try
        SignalTimeLimits(minimum_value, maximum_value)
    catch err
        if err isa ArgumentError || err isa InexactError || err isa OverflowError
            field_errors["time_limits"] = sprint(showerror, err)
            return nothing
        end
        rethrow()
    end
end

function signal_analyser_validate_spectrum_frequency_limits!(
    field_errors::Dict{String,String},
    value,
)::Union{Nothing,AbstractSignalSpectrumFrequencyLimits}
    value === nothing && return AutomaticSignalSpectrumFrequencyLimits()
    if !(value isa AbstractDict)
        field_errors["spectrum_settings"] =
            "frequency_limits: требуется null или объект {min_hz, max_hz, units}"
        return nothing
    end
    keys_set = signal_analyser_payload_keys(value)
    if keys_set != SIGNAL_SPECTRUM_FREQUENCY_LIMIT_FIELDS
        missing = sort!(collect(setdiff(SIGNAL_SPECTRUM_FREQUENCY_LIMIT_FIELDS, keys_set)))
        unknown = sort!(collect(setdiff(keys_set, SIGNAL_SPECTRUM_FREQUENCY_LIMIT_FIELDS)))
        details = String[]
        isempty(missing) || push!(details, "отсутствуют: $(join(missing, ", "))")
        isempty(unknown) || push!(details, "неизвестны: $(join(unknown, ", "))")
        field_errors["spectrum_settings"] =
            "frequency_limits: ожидались только min_hz, max_hz, units ($(join(details, "; ")))"
        return nothing
    end

    minimum_value = signal_analyser_payload_value(value, "min_hz")
    maximum_value = signal_analyser_payload_value(value, "max_hz")
    units_value = signal_analyser_payload_value(value, "units")
    if !(minimum_value isa Real) || minimum_value isa Bool ||
        !(maximum_value isa Real) || maximum_value isa Bool
        field_errors["spectrum_settings"] =
            "frequency_limits: min_hz и max_hz должны быть конечными JSON numbers, но не Bool"
        return nothing
    end
    if units_value != "Hz"
        field_errors["spectrum_settings"] = "frequency_limits: поддерживаются только units=Hz"
        return nothing
    end
    try
        ExplicitSignalSpectrumFrequencyLimits(minimum_value, maximum_value)
    catch err
        if err isa ArgumentError || err isa InexactError || err isa OverflowError
            field_errors["spectrum_settings"] = sprint(showerror, err)
            return nothing
        end
        rethrow()
    end
end

function signal_analyser_validate_spectrogram_frequency_limits!(
    field_errors::Dict{String,String},
    value,
)::Union{Nothing,AbstractSignalSpectrumFrequencyLimits}
    value === nothing && return AutomaticSignalSpectrumFrequencyLimits()
    if !(value isa AbstractDict)
        field_errors["spectrogram_settings"] =
            "frequency_limits: требуется null или объект {min_hz, max_hz, units}"
        return nothing
    end
    keys_set = signal_analyser_payload_keys(value)
    if length(value) != 3 || keys_set != SIGNAL_SPECTRUM_FREQUENCY_LIMIT_FIELDS
        missing = sort!(collect(setdiff(SIGNAL_SPECTRUM_FREQUENCY_LIMIT_FIELDS, keys_set)))
        unknown = sort!(collect(setdiff(keys_set, SIGNAL_SPECTRUM_FREQUENCY_LIMIT_FIELDS)))
        details = String[]
        isempty(missing) || push!(details, "отсутствуют: $(join(missing, ", "))")
        isempty(unknown) || push!(details, "неизвестны: $(join(unknown, ", "))")
        length(value) == 3 || push!(details, "требуется ровно три поля")
        field_errors["spectrogram_settings"] =
            "frequency_limits: ожидались только min_hz, max_hz, units ($(join(details, "; ")))"
        return nothing
    end

    minimum_value = signal_analyser_payload_value(value, "min_hz")
    maximum_value = signal_analyser_payload_value(value, "max_hz")
    units_value = signal_analyser_payload_value(value, "units")
    if !(minimum_value isa Real) || minimum_value isa Bool ||
        !(maximum_value isa Real) || maximum_value isa Bool
        field_errors["spectrogram_settings"] =
            "frequency_limits: min_hz и max_hz должны быть конечными JSON numbers, но не Bool"
        return nothing
    end
    if units_value != "Hz"
        field_errors["spectrogram_settings"] =
            "frequency_limits: поддерживаются только units=Hz"
        return nothing
    end
    try
        ExplicitSignalSpectrumFrequencyLimits(minimum_value, maximum_value)
    catch err
        if err isa ArgumentError || err isa InexactError || err isa OverflowError
            field_errors["spectrogram_settings"] = sprint(showerror, err)
            return nothing
        end
        rethrow()
    end
end

function signal_analyser_validate_spectrogram_power_limits!(
    field_errors::Dict{String,String},
    value,
)::Union{Nothing,AbstractSignalSpectrogramPowerLimits}
    value === nothing && return AutomaticSignalSpectrogramPowerLimits()
    if !(value isa AbstractDict)
        field_errors["spectrogram_settings"] =
            "power_limits: требуется null или объект {min_db, max_db, units}"
        return nothing
    end
    keys_set = signal_analyser_payload_keys(value)
    if length(value) != 3 || keys_set != SIGNAL_SPECTROGRAM_POWER_LIMIT_FIELDS
        missing = sort!(collect(setdiff(SIGNAL_SPECTROGRAM_POWER_LIMIT_FIELDS, keys_set)))
        unknown = sort!(collect(setdiff(keys_set, SIGNAL_SPECTROGRAM_POWER_LIMIT_FIELDS)))
        details = String[]
        isempty(missing) || push!(details, "отсутствуют: $(join(missing, ", "))")
        isempty(unknown) || push!(details, "неизвестны: $(join(unknown, ", "))")
        length(value) == 3 || push!(details, "требуется ровно три поля")
        field_errors["spectrogram_settings"] =
            "power_limits: ожидались только min_db, max_db, units ($(join(details, "; ")))"
        return nothing
    end

    minimum_value = signal_analyser_payload_value(value, "min_db")
    maximum_value = signal_analyser_payload_value(value, "max_db")
    units_value = signal_analyser_payload_value(value, "units")
    if !(minimum_value isa Real) || minimum_value isa Bool ||
        !(maximum_value isa Real) || maximum_value isa Bool
        field_errors["spectrogram_settings"] =
            "power_limits: min_db и max_db должны быть конечными JSON numbers, но не Bool"
        return nothing
    end
    if units_value != "dB"
        field_errors["spectrogram_settings"] =
            "power_limits: поддерживаются только units=dB"
        return nothing
    end
    try
        ExplicitSignalSpectrogramPowerLimits(minimum_value, maximum_value)
    catch err
        if err isa ArgumentError || err isa InexactError || err isa OverflowError
            field_errors["spectrogram_settings"] = sprint(showerror, err)
            return nothing
        end
        rethrow()
    end
end

function signal_analyser_validate_spectrum_settings!(
    field_errors::Dict{String,String},
    value,
)::Union{Nothing,SignalSpectrumSettings}
    if !(value isa AbstractDict)
        field_errors["spectrum_settings"] =
            "Требуется объект {scale, frequency_scale, leakage, frequency_limits}"
        return nothing
    end
    keys_set = signal_analyser_payload_keys(value)
    if keys_set != SIGNAL_SPECTRUM_SETTINGS_FIELDS
        missing = sort!(collect(setdiff(SIGNAL_SPECTRUM_SETTINGS_FIELDS, keys_set)))
        unknown = sort!(collect(setdiff(keys_set, SIGNAL_SPECTRUM_SETTINGS_FIELDS)))
        details = String[]
        isempty(missing) || push!(details, "отсутствуют: $(join(missing, ", "))")
        isempty(unknown) || push!(details, "неизвестны: $(join(unknown, ", "))")
        field_errors["spectrum_settings"] =
            "Ожидались только scale, frequency_scale, leakage, frequency_limits ($(join(details, "; ")))"
        return nothing
    end

    scale_value = signal_analyser_payload_value(value, "scale")
    frequency_scale_value = signal_analyser_payload_value(value, "frequency_scale")
    leakage_value = signal_analyser_payload_value(value, "leakage")
    frequency_limits_value = signal_analyser_payload_value(value, "frequency_limits")
    if !(scale_value isa AbstractString) ||
        !haskey(SIGNAL_SPECTRUM_SCALES_BY_NAME, String(scale_value))
        field_errors["spectrum_settings"] = "scale: допустимо db или linear"
        return nothing
    end
    if !(frequency_scale_value isa AbstractString) ||
        !haskey(SIGNAL_SPECTRUM_FREQUENCY_SCALES_BY_NAME, String(frequency_scale_value))
        field_errors["spectrum_settings"] = "frequency_scale: допустимо linear или log"
        return nothing
    end
    if !(leakage_value isa Real) || leakage_value isa Bool
        field_errors["spectrum_settings"] = "leakage: требуется конечное число от 0 до 1"
        return nothing
    end
    frequency_limits = signal_analyser_validate_spectrum_frequency_limits!(
        field_errors,
        frequency_limits_value,
    )
    frequency_limits === nothing && return nothing
    try
        SignalSpectrumSettings(
            SIGNAL_SPECTRUM_SCALES_BY_NAME[String(scale_value)],
            SIGNAL_SPECTRUM_FREQUENCY_SCALES_BY_NAME[String(frequency_scale_value)],
            leakage_value,
            frequency_limits,
        )
    catch err
        if err isa ArgumentError || err isa InexactError || err isa OverflowError
            field_errors["spectrum_settings"] = sprint(showerror, err)
            return nothing
        end
        rethrow()
    end
end

function signal_analyser_validate_spectrogram_settings!(
    field_errors::Dict{String,String},
    value,
)::Union{Nothing,SignalSpectrogramSettings}
    if !(value isa AbstractDict)
        field_errors["spectrogram_settings"] =
            "Требуется объект {overlap_percent, leakage, frequency_limits, frequency_scale, power_limits}"
        return nothing
    end
    keys_set = signal_analyser_payload_keys(value)
    if length(value) != 5 || keys_set != SIGNAL_SPECTROGRAM_SETTINGS_FIELDS
        missing = sort!(collect(setdiff(SIGNAL_SPECTROGRAM_SETTINGS_FIELDS, keys_set)))
        unknown = sort!(collect(setdiff(keys_set, SIGNAL_SPECTROGRAM_SETTINGS_FIELDS)))
        details = String[]
        isempty(missing) || push!(details, "отсутствуют: $(join(missing, ", "))")
        isempty(unknown) || push!(details, "неизвестны: $(join(unknown, ", "))")
        length(value) == 5 || push!(details, "требуется ровно пять полей")
        field_errors["spectrogram_settings"] =
            "Ожидались только overlap_percent, leakage, frequency_limits, frequency_scale и power_limits ($(join(details, "; ")))"
        return nothing
    end

    overlap_value = signal_analyser_payload_value(value, "overlap_percent")
    if !(overlap_value isa Real) || overlap_value isa Bool
        field_errors["spectrogram_settings"] =
            "overlap_percent: требуется конечное JSON number от 0 до 75, но не Bool"
        return nothing
    end
    leakage_value = signal_analyser_payload_value(value, "leakage")
    if !(leakage_value isa Real) || leakage_value isa Bool
        field_errors["spectrogram_settings"] =
            "leakage: требуется конечное JSON number от 0 до 1, но не Bool"
        return nothing
    end
    frequency_limits = signal_analyser_validate_spectrogram_frequency_limits!(
        field_errors,
        signal_analyser_payload_value(value, "frequency_limits"),
    )
    frequency_limits === nothing && return nothing
    frequency_scale_value = signal_analyser_payload_value(value, "frequency_scale")
    if !(frequency_scale_value isa AbstractString) ||
        !haskey(SIGNAL_SPECTROGRAM_FREQUENCY_SCALES_BY_NAME, String(frequency_scale_value))
        field_errors["spectrogram_settings"] =
            "frequency_scale: допустимо только lowercase linear или log"
        return nothing
    end
    power_limits = signal_analyser_validate_spectrogram_power_limits!(
        field_errors,
        signal_analyser_payload_value(value, "power_limits"),
    )
    power_limits === nothing && return nothing
    try
        SignalSpectrogramSettings(
            overlap_value,
            leakage_value,
            frequency_limits,
            SIGNAL_SPECTROGRAM_FREQUENCY_SCALES_BY_NAME[String(frequency_scale_value)],
            power_limits,
        )
    catch err
        if err isa ArgumentError || err isa InexactError || err isa OverflowError
            field_errors["spectrogram_settings"] = sprint(showerror, err)
            return nothing
        end
        rethrow()
    end
end

function signal_analyser_validate_measurement_kinds!(
    field_errors::Dict{String,String},
    value,
)::Union{Nothing,SignalMeasurementSelection}
    if !(value isa AbstractVector)
        field_errors["measurement_kinds"] = "Требуется массив идентификаторов измерений"
        return nothing
    end

    requested_kinds = SignalMeasurementKind[]
    seen_ids = Set{String}()
    for item in value
        if !(item isa AbstractString)
            field_errors["measurement_kinds"] = "Все идентификаторы измерений должны быть строками"
            return nothing
        end
        item_id = String(item)
        if item_id in seen_ids
            field_errors["measurement_kinds"] = "Идентификаторы измерений не должны повторяться"
            return nothing
        end
        push!(seen_ids, item_id)
        kind_index = findfirst(SIGNAL_MEASUREMENT_CANONICAL_KINDS) do kind
            signal_measurement_metadata(kind).id == item_id
        end
        if kind_index === nothing
            valid_ids = [
                signal_measurement_metadata(kind).id
                for kind in SIGNAL_MEASUREMENT_CANONICAL_KINDS
            ]
            field_errors["measurement_kinds"] = "Допустимо: $(join(valid_ids, ", "))"
            return nothing
        end
        push!(requested_kinds, SIGNAL_MEASUREMENT_CANONICAL_KINDS[kind_index])
    end
    SignalMeasurementSelection(requested_kinds)
end

function validate_signal_analyser_view_payload(
    state::SignalAnalyserState,
    data,
)::NamedTuple
    data isa AbstractDict || throw(SignalAnalyserValidationError(
        "Тело запроса должно быть JSON-объектом",
        Dict("body" => "Ожидался JSON-объект"),
    ))

    display = signal_analyser_active_display(state)
    field_errors = Dict{String,String}()
    unknown_fields = setdiff(signal_analyser_payload_keys(data), SIGNAL_ANALYSER_VIEW_FIELDS)
    isempty(unknown_fields) || (field_errors["body"] = "Неизвестные поля: $(join(sort!(collect(unknown_fields)), ", "))")

    revision_value = signal_analyser_payload_value(data, "state_revision")
    revision_value isa Integer && !(revision_value isa Bool) || (field_errors["state_revision"] = "Требуется целое число")

    has_active_plot = signal_analyser_payload_contains(data, "active_plot")
    active_plot_value = signal_analyser_payload_value(data, "active_plot")
    requested_plot = display.active_plot
    if has_active_plot
        if active_plot_value isa AbstractString && haskey(SIGNAL_ANALYSER_PLOTS_BY_NAME, String(active_plot_value))
            requested_plot = SIGNAL_ANALYSER_PLOTS_BY_NAME[String(active_plot_value)]
        else
            field_errors["active_plot"] = "Допустимо: time, spectrum, spectrogram, persistence"
        end
    end

    known_names = Set(signal.name for signal in state.signals)

    has_row_selected_signal = signal_analyser_payload_contains(data, "row_selected_signal")
    row_selected_signal_value = signal_analyser_payload_value(data, "row_selected_signal")
    requested_row_selected_signal = state.row_selection.signal_name
    if has_row_selected_signal
        if row_selected_signal_value isa AbstractString && String(row_selected_signal_value) in known_names
            requested_row_selected_signal = String(row_selected_signal_value)
        else
            field_errors["row_selected_signal"] = "Неизвестное имя сигнала"
        end
    end

    has_analysis_signal = signal_analyser_payload_contains(data, "analysis_signal")
    analysis_signal_value = signal_analyser_payload_value(data, "analysis_signal")
    validated_analysis_signal = nothing
    if has_analysis_signal
        if analysis_signal_value === nothing
            validated_analysis_signal = nothing
        elseif analysis_signal_value isa AbstractString && String(analysis_signal_value) in known_names
            validated_analysis_signal = String(analysis_signal_value)
        else
            field_errors["analysis_signal"] = "Требуется null или имя сигнала из inventory"
        end
    end

    has_selected_signal = signal_analyser_payload_contains(data, "selected_signal")
    selected_signal_value = signal_analyser_payload_value(data, "selected_signal")
    validated_selected_signal = nothing
    if has_selected_signal
        if selected_signal_value === nothing
            validated_selected_signal = nothing
        elseif selected_signal_value isa AbstractString && String(selected_signal_value) in known_names
            validated_selected_signal = String(selected_signal_value)
        else
            field_errors["selected_signal"] = "Требуется null или имя сигнала из inventory"
        end
    end
    if has_analysis_signal && has_selected_signal && !isequal(validated_analysis_signal, validated_selected_signal)
        field_errors["analysis_signal"] = "analysis_signal и selected_signal должны совпадать"
        field_errors["selected_signal"] = "selected_signal и analysis_signal должны совпадать"
    end

    has_visible_signals = signal_analyser_payload_contains(data, "visible_signals")
    visible_names = signal_analyser_display_members(display)
    if has_visible_signals
        validated_visible_names = signal_analyser_validate_visible_signals!(
            field_errors,
            state,
            signal_analyser_payload_value(data, "visible_signals"),
        )
        validated_visible_names === nothing || (visible_names = validated_visible_names)
    end


    explicit_analysis = has_analysis_signal || has_selected_signal
    explicit_analysis_name = has_analysis_signal ? validated_analysis_signal : validated_selected_signal
    current_analysis_name = signal_analyser_display_analysis_name(display)
    requested_analysis_name = if isempty(visible_names)
        explicit_analysis && explicit_analysis_name !== nothing && (field_errors["analysis_signal"] = "Пустой Display не имеет analysis source")
        nothing
    elseif explicit_analysis
        if explicit_analysis_name === nothing
            field_errors["analysis_signal"] = "Analysis source может быть null только у пустого Display"
            current_analysis_name in visible_names ? current_analysis_name : first(visible_names)
        elseif !(explicit_analysis_name in visible_names)
            field_errors["analysis_signal"] = "Analysis source должен входить в membership Display"
            current_analysis_name in visible_names ? current_analysis_name : first(visible_names)
        else
            explicit_analysis_name
        end
    elseif current_analysis_name in visible_names
        current_analysis_name
    else
        first(visible_names)
    end

    has_time_limits = signal_analyser_payload_contains(data, "time_limits")
    time_limits_value = signal_analyser_payload_value(data, "time_limits")
    validated_time_limits = has_time_limits ?
        signal_analyser_validate_time_limits!(field_errors, time_limits_value) : nothing
    source_changed = current_analysis_name != requested_analysis_name
    carried_time_limits = has_time_limits && if time_limits_value === nothing
        display.time_limits === nothing
    else
        validated_time_limits !== nothing && validated_time_limits == display.time_limits
    end
    requested_time_limits = if requested_analysis_name === nothing
        if has_time_limits && time_limits_value !== nothing && !(source_changed && carried_time_limits) &&
            !haskey(field_errors, "time_limits")
            field_errors["time_limits"] = "Пустой Display должен иметь time_limits=null"
        end
        nothing
    else
        prospective_signal = signal_by_name(state, requested_analysis_name)
        if has_time_limits && source_changed && carried_time_limits
            if display.time_limits !== nothing && signal_time_limits_are_valid(
                state.measurements_service,
                prospective_signal,
                display.time_limits,
            )
                display.time_limits
            else
                signal_full_time_limits(state.measurements_service, prospective_signal)
            end
        elseif has_time_limits
            if time_limits_value === nothing
                field_errors["time_limits"] = "Непустой Display должен иметь Time Limits"
                nothing
            elseif validated_time_limits === nothing
                nothing
            else
                try
                    signal_ordinate_roi(
                        state.measurements_service,
                        prospective_signal,
                        validated_time_limits,
                    )
                    validated_time_limits
                catch err
                    if err isa ArgumentError
                        field_errors["time_limits"] = sprint(showerror, err)
                        nothing
                    else
                        rethrow()
                    end
                end
            end
        elseif current_analysis_name == requested_analysis_name && display.time_limits !== nothing
            display.time_limits
        elseif display.time_limits !== nothing && signal_time_limits_are_valid(
            state.measurements_service,
            prospective_signal,
            display.time_limits,
        )
            display.time_limits
        else
            signal_full_time_limits(state.measurements_service, prospective_signal)
        end
    end

    has_measurement_kinds = signal_analyser_payload_contains(data, "measurement_kinds")
    requested_measurement_selection = display.measurement_selection
    if has_measurement_kinds
        validated_measurement_selection = signal_analyser_validate_measurement_kinds!(
            field_errors,
            signal_analyser_payload_value(data, "measurement_kinds"),
        )
        validated_measurement_selection === nothing ||
            (requested_measurement_selection = validated_measurement_selection)
    end

    has_spectrum_settings = signal_analyser_payload_contains(data, "spectrum_settings")
    requested_spectrum_settings = display.spectrum_settings
    if has_spectrum_settings
        validated_spectrum_settings = signal_analyser_validate_spectrum_settings!(
            field_errors,
            signal_analyser_payload_value(data, "spectrum_settings"),
        )
        validated_spectrum_settings === nothing ||
            (requested_spectrum_settings = validated_spectrum_settings)
    end
    if !haskey(field_errors, "spectrum_settings")
        requested_frequency_limits = requested_spectrum_settings.frequency_limits
        current_frequency_limits = display.spectrum_settings.frequency_limits
        if requested_analysis_name === nothing
            if requested_frequency_limits isa ExplicitSignalSpectrumFrequencyLimits &&
                requested_frequency_limits != current_frequency_limits
                field_errors["spectrum_settings"] =
                    "frequency_limits: явный интервал требует analysis source"
            end
        else
            analysis_signal = signal_by_name(state, requested_analysis_name)
            if requested_frequency_limits isa ExplicitSignalSpectrumFrequencyLimits &&
                !signal_spectrum_frequency_limits_valid_for_signal(
                    requested_frequency_limits,
                    analysis_signal,
                )
                frequency_limits_carried = requested_frequency_limits == current_frequency_limits
                if source_changed && frequency_limits_carried
                    requested_spectrum_settings = signal_spectrum_with_frequency_limits(
                        requested_spectrum_settings,
                        AutomaticSignalSpectrumFrequencyLimits(),
                    )
                else
                    domain = signal_spectrum_topology_limits(analysis_signal)
                    field_errors["spectrum_settings"] =
                        "frequency_limits: интервал должен целиком лежать в " *
                        "[$(domain.min_hz), $(domain.max_hz)] Hz analysis source"
                end
            end
        end
    end
    if requested_spectrum_settings.frequency_scale == LOG_SPECTRUM_FREQUENCY_SCALE &&
        any(signal -> signal.is_complex && signal.name in visible_names, state.signals)
        field_errors["spectrum_settings"] =
            "frequency_scale=log недоступен, пока Display содержит комплексный сигнал"
    end

    has_spectrogram_settings = signal_analyser_payload_contains(data, "spectrogram_settings")
    requested_spectrogram_settings = display.spectrogram_settings
    if has_spectrogram_settings
        validated_spectrogram_settings = signal_analyser_validate_spectrogram_settings!(
            field_errors,
            signal_analyser_payload_value(data, "spectrogram_settings"),
        )
        validated_spectrogram_settings === nothing ||
            (requested_spectrogram_settings = validated_spectrogram_settings)
    end
    if !haskey(field_errors, "spectrogram_settings")
        requested_frequency_limits = requested_spectrogram_settings.frequency_limits
        current_frequency_limits = display.spectrogram_settings.frequency_limits
        if requested_analysis_name === nothing
            if requested_frequency_limits isa ExplicitSignalSpectrumFrequencyLimits &&
                requested_frequency_limits != current_frequency_limits
                field_errors["spectrogram_settings"] =
                    "frequency_limits: явный интервал требует analysis source"
            end
        else
            analysis_signal = signal_by_name(state, requested_analysis_name)
            if requested_frequency_limits isa ExplicitSignalSpectrumFrequencyLimits &&
                !signal_spectrum_frequency_limits_valid_for_signal(
                    requested_frequency_limits,
                    analysis_signal,
                )
                frequency_limits_carried = requested_frequency_limits == current_frequency_limits
                if source_changed && frequency_limits_carried
                    requested_spectrogram_settings = signal_spectrogram_with_frequency_limits(
                        requested_spectrogram_settings,
                        AutomaticSignalSpectrumFrequencyLimits(),
                    )
                else
                    domain = signal_spectrum_topology_limits(analysis_signal)
                    field_errors["spectrogram_settings"] =
                        "frequency_limits: интервал должен целиком лежать в " *
                        "[$(domain.min_hz), $(domain.max_hz)] Hz analysis source"
                end
            end
        end
    end

    has_peaks_enabled = signal_analyser_payload_contains(data, "peaks_enabled")
    peaks_enabled_value = signal_analyser_payload_value(data, "peaks_enabled")
    requested_peaks_enabled = display.peaks_enabled
    if has_peaks_enabled
        if peaks_enabled_value isa Bool
            requested_peaks_enabled = peaks_enabled_value
        else
            field_errors["peaks_enabled"] = "Требуется boolean"
        end
    end
    if isempty(visible_names)
        requested_peaks_enabled = false
    elseif requested_plot != TIME_PLOT
        if has_peaks_enabled && requested_peaks_enabled
            field_errors["peaks_enabled"] = "Поиск пиков доступен только для Time plot"
        else
            requested_peaks_enabled = false
        end
    end

    isempty(field_errors) || throw(SignalAnalyserValidationError("Некорректный запрос отображения", field_errors))
    prospective_display = SignalAnalyserDisplayState(
        display.id,
        display.name,
        requested_plot,
        requested_analysis_name,
        visible_names,
        requested_time_limits,
        requested_measurement_selection,
        requested_spectrum_settings,
        requested_spectrogram_settings,
        requested_peaks_enabled,
    )
    (
        revision = Int(revision_value),
        row_selection = GlobalSignalSelection(requested_row_selected_signal),
        display = prospective_display,
    )
end

function apply_signal_analyser_view!(state::SignalAnalyserState, data)::Dict{String,Any}
    lock(state.lock) do
        requested = validate_signal_analyser_view_payload(state, data)
        requested.revision == state.view.state_revision || throw(SignalAnalyserStaleStateError(
            requested.revision,
            state.view.state_revision,
        ))

        display = signal_analyser_active_display(state)
        prospective_display = requested.display
        prospective_members = signal_analyser_display_members(prospective_display)
        prospective_analysis_name = signal_analyser_display_analysis_name(prospective_display)
        changes = SignalAnalyserViewChanges(
            state.row_selection,
            display,
            requested.row_selection,
            prospective_display,
        )
        changed = signal_analyser_has_changes(changes)
        spectrogram_settings_only = signal_analyser_only_spectrogram_settings_changed(changes)
        spectrogram_presentation_only = spectrogram_settings_only &&
            signal_spectrogram_provider_settings_equal(
                display.spectrogram_settings,
                prospective_display.spectrogram_settings,
            )
        prepare_spectrum = changed && !spectrogram_settings_only
        prepare_spectrogram = changed && !spectrogram_presentation_only

        # Build every payload affected by the request before publishing the
        # mutation so a runtime DSP failure cannot leave state half-applied.
        prepared_plots = signal_analyser_prepared_plots(
            state,
            prospective_members,
        )
        prepared_spectra = prepare_spectrum ?
            signal_analyser_prepared_spectra(
                state,
                prospective_display,
                prospective_members,
            ) :
            Dict{SignalSpectrumCacheKey,SignalSpectrumData}()
        next_revision = state.view.state_revision + (changed ? 1 : 0)
        prospective_signal = prospective_analysis_name === nothing ? nothing :
            signal_by_name(state, prospective_analysis_name)
        prepared_spectrograms = prepare_spectrogram ?
            signal_analyser_prepared_spectrograms(
                state,
                prospective_display,
                prospective_signal,
                refresh = isempty(signal_analyser_display_members(display)) && !isempty(prospective_members),
            ) :
            Dict{SignalSpectrogramCacheKey,SignalSpectrogramData}()
        prepared_measurements = signal_measurements_snapshot(
            state.measurements_service,
            next_revision,
            prospective_signal,
            prospective_display.time_limits,
            prospective_display.measurement_selection,
        )
        prepared_peaks = signal_peaks_snapshot(
            state.peaks_service,
            next_revision,
            prospective_display,
            prospective_signal,
        )
        if changed
            signal_analyser_publish_prepared_plots!(state, prepared_plots)
            prepare_spectrum &&
                signal_analyser_publish_prepared_spectra!(state, prepared_spectra)
            prepare_spectrogram &&
                signal_analyser_publish_prepared_spectrograms!(state, prepared_spectrograms)
            signal_analyser_publish_display_state!(display, prospective_display)
            signal_analyser_publish_row_selection!(state, requested.row_selection)
            signal_analyser_sync_active_display!(state, display)
            state.view.state_revision += 1
        else
            signal_analyser_publish_prepared_plots!(state, prepared_plots)
        end
        signal_analyser_snapshot_unlocked(
            state,
            prepared_measurements,
            prepared_peaks,
            materialize_missing_spectra = prepare_spectrum,
            materialize_missing_spectrogram = prepare_spectrogram,
        )
    end
end

function validate_signal_analyser_display_payload(
    state::SignalAnalyserState,
    data,
)::NamedTuple
    data isa AbstractDict || throw(SignalAnalyserValidationError(
        "Тело запроса должно быть JSON-объектом",
        Dict("body" => "Ожидался JSON-объект"),
    ))

    field_errors = Dict{String,String}()
    unknown_fields = setdiff(signal_analyser_payload_keys(data), SIGNAL_ANALYSER_DISPLAY_FIELDS)
    isempty(unknown_fields) || (field_errors["body"] = "Неизвестные поля: $(join(sort!(collect(unknown_fields)), ", "))")

    revision_value = signal_analyser_payload_value(data, "state_revision")
    revision_value isa Integer && !(revision_value isa Bool) || (field_errors["state_revision"] = "Требуется целое число")

    operation_value = signal_analyser_payload_value(data, "operation")
    operation = if operation_value isa AbstractString && String(operation_value) in SIGNAL_ANALYSER_DISPLAY_OPERATIONS
        String(operation_value)
    else
        field_errors["operation"] = "Допустимо: create, select, close"
        nothing
    end

    has_display_id = signal_analyser_payload_contains(data, "display_id")
    display_id_value = signal_analyser_payload_value(data, "display_id")
    display_id = nothing
    if operation == "create"
        has_display_id && (field_errors["display_id"] = "Поле не допускается для create")
    elseif operation == "select" || operation == "close"
        if !has_display_id || !(display_id_value isa AbstractString) || isempty(String(display_id_value))
            field_errors["display_id"] = "Требуется непустой идентификатор Display"
        else
            display_id = String(display_id_value)
            any(display -> display.id == display_id, state.displays) ||
                (field_errors["display_id"] = "Неизвестный идентификатор Display")
        end
        operation == "close" && length(state.displays) == 1 &&
            (field_errors["operation"] = "Нужно оставить хотя бы один Display")
    end

    isempty(field_errors) || throw(SignalAnalyserValidationError("Некорректный запрос Display", field_errors))
    (
        revision = Int(revision_value),
        operation = operation::String,
        display_id = display_id,
    )
end

function signal_analyser_display_plot_names(display::SignalAnalyserDisplayState)::Vector{String}
    signal_analyser_display_members(display)
end

function signal_analyser_display_analysis_signal(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
)::Union{Nothing,AnalysedSignal}
    analysis_name = signal_analyser_display_analysis_name(display)
    analysis_name === nothing ? nothing : signal_by_name(state, analysis_name)
end

function apply_signal_analyser_display!(state::SignalAnalyserState, data)::Dict{String,Any}
    lock(state.lock) do
        requested = validate_signal_analyser_display_payload(state, data)
        requested.revision == state.view.state_revision || throw(SignalAnalyserStaleStateError(
            requested.revision,
            state.view.state_revision,
        ))

        if requested.operation == "create"
            display_number = state.next_display_number
            analysis_signal = first(state.signals)
            display = SignalAnalyserDisplayState(
                "display-$display_number",
                "Display $display_number",
                TIME_PLOT,
                analysis_signal.name,
                [signal.name for signal in state.signals],
                signal_full_time_limits(state.measurements_service, analysis_signal),
                false,
            )
            prepared_plots = signal_analyser_prepared_plots(
                state,
                signal_analyser_display_plot_names(display),
            )
            prepared_spectra = signal_analyser_prepared_spectra(
                state,
                display,
                signal_analyser_display_plot_names(display),
            )
            prepared_spectrograms = signal_analyser_prepared_spectrograms(
                state,
                display,
                analysis_signal,
            )
            prepared_measurements = signal_measurements_snapshot(
                state.measurements_service,
                state.view.state_revision + 1,
                signal_analyser_display_analysis_signal(state, display),
                display.time_limits,
                display.measurement_selection,
            )
            prepared_peaks = signal_peaks_snapshot(
                state.peaks_service,
                state.view.state_revision + 1,
                display,
                signal_analyser_display_analysis_signal(state, display),
            )
            signal_analyser_publish_prepared_plots!(state, prepared_plots)
            signal_analyser_publish_prepared_spectra!(state, prepared_spectra)
            signal_analyser_publish_prepared_spectrograms!(state, prepared_spectrograms)
            push!(state.displays, display)
            state.next_display_number += 1
            signal_analyser_sync_active_display!(state, display)
            state.view.state_revision += 1
        elseif requested.operation == "select"
            display = signal_analyser_display_by_id(state, requested.display_id)
            if display.id != state.active_display_id
                prepared_plots = signal_analyser_prepared_plots(
                    state,
                    signal_analyser_display_plot_names(display),
                )
                prepared_spectra = signal_analyser_prepared_spectra(
                    state,
                    display,
                    signal_analyser_display_plot_names(display),
                )
                prepared_spectrograms = signal_analyser_prepared_spectrograms(
                    state,
                    display,
                    signal_analyser_display_analysis_signal(state, display),
                )
                prepared_measurements = signal_measurements_snapshot(
                    state.measurements_service,
                    state.view.state_revision + 1,
                    signal_analyser_display_analysis_signal(state, display),
                    display.time_limits,
                    display.measurement_selection,
                )
                prepared_peaks = signal_peaks_snapshot(
                    state.peaks_service,
                    state.view.state_revision + 1,
                    display,
                    signal_analyser_display_analysis_signal(state, display),
                )
                signal_analyser_publish_prepared_plots!(state, prepared_plots)
                signal_analyser_publish_prepared_spectra!(state, prepared_spectra)
                signal_analyser_publish_prepared_spectrograms!(state, prepared_spectrograms)
                signal_analyser_sync_active_display!(state, display)
                state.view.state_revision += 1
            else
                prepared_measurements = signal_measurements_snapshot(
                    state.measurements_service,
                    state.view.state_revision,
                    signal_analyser_display_analysis_signal(state, display),
                    display.time_limits,
                    display.measurement_selection,
                )
                prepared_peaks = signal_peaks_snapshot(
                    state.peaks_service,
                    state.view.state_revision,
                    display,
                    signal_analyser_display_analysis_signal(state, display),
                )
            end
        else
            close_index = findfirst(display -> display.id == requested.display_id, state.displays)::Int
            closing_active_display = requested.display_id == state.active_display_id
            remaining_displays = [
                display for display in state.displays
                if display.id != requested.display_id
            ]
            next_active_display = if closing_active_display
                remaining_displays[max(1, close_index - 1)]
            else
                signal_analyser_active_display(state)
            end
            prepared_plots = signal_analyser_prepared_plots(
                state,
                signal_analyser_display_plot_names(next_active_display),
            )
            prepared_spectra = signal_analyser_prepared_spectra(
                state,
                next_active_display,
                signal_analyser_display_plot_names(next_active_display),
            )
            prepared_spectrograms = signal_analyser_prepared_spectrograms(
                state,
                next_active_display,
                signal_analyser_display_analysis_signal(state, next_active_display),
            )
            prepared_measurements = signal_measurements_snapshot(
                state.measurements_service,
                state.view.state_revision + 1,
                signal_analyser_display_analysis_signal(state, next_active_display),
                next_active_display.time_limits,
                next_active_display.measurement_selection,
            )
            prepared_peaks = signal_peaks_snapshot(
                state.peaks_service,
                state.view.state_revision + 1,
                next_active_display,
                signal_analyser_display_analysis_signal(state, next_active_display),
            )
            signal_analyser_publish_prepared_plots!(state, prepared_plots)
            signal_analyser_publish_prepared_spectra!(state, prepared_spectra)
            signal_analyser_publish_prepared_spectrograms!(state, prepared_spectrograms)
            state.displays = remaining_displays
            closing_active_display && signal_analyser_sync_active_display!(state, next_active_display)
            state.view.state_revision += 1
        end

        signal_analyser_snapshot_unlocked(state, prepared_measurements, prepared_peaks)
    end
end
