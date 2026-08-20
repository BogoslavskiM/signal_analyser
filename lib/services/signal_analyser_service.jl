import Statistics

const SIGNAL_ANALYSER_VIEW_FIELDS = Set([
    "state_revision",
    "active_plot",
    "row_selected_signal",
    "analysis_signal",
    "selected_signal",
    "visible_signals",
    "measurement_kinds",
    "peaks_enabled",
])
const SIGNAL_ANALYSER_DISPLAY_OPERATIONS = Set(["create", "select", "close", "reorder"])
const SIGNAL_ANALYSER_DISPLAY_REQUEST_FIELDS = Dict(
    "create" => Set(["state_revision", "operation"]),
    "select" => Set(["state_revision", "operation", "display_id"]),
    "close" => Set(["state_revision", "operation", "display_id"]),
    "reorder" => Set(["state_revision", "operation", "order"]),
)
const SIGNAL_ANALYSER_LAYOUT_OPERATIONS = Set(["resize", "select_pane", "update_pane"])
const SIGNAL_ANALYSER_LAYOUT_REQUEST_FIELDS = Dict(
    "resize" => Set([
        "state_revision",
        "operation",
        "display_id",
        "version",
        "variant",
        "rows",
        "columns",
    ]),
    "select_pane" => Set([
        "state_revision",
        "operation",
        "display_id",
        "version",
        "pane_id",
    ]),
    "update_pane" => Set([
        "state_revision",
        "operation",
        "display_id",
        "version",
        "pane_id",
        "plot_type",
        "signal_bindings",
    ]),
)
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
const SIGNAL_PERSISTENCE_SETTINGS_FIELDS = Set(["leakage"])

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
        "id" => signal.id,
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

function signal_persistence_settings_payload(
    settings::SignalPersistenceSettings,
)::Dict{String,Any}
    Dict{String,Any}("leakage" => settings.leakage)
end

"""Serializer boundary for canonical and scale-specific Spectrogram presentation metadata."""
struct SignalSpectrogramPresentationSerializer end

signal_spectrogram_requested_power_limits_payload(
    ::SignalSpectrogramPresentationSerializer,
    ::AutomaticSignalSpectrogramPowerLimits,
) = nothing

function signal_spectrogram_requested_power_limits_payload(
    ::SignalSpectrogramPresentationSerializer,
    limits::ExplicitSignalSpectrogramPowerLimits,
)::Dict{String,Any}
    Dict{String,Any}(
        "min_db" => limits.min_db,
        "max_db" => limits.max_db,
        "units" => "dB",
    )
end

signal_spectrogram_power_limits_payload(
    limits::AutomaticSignalSpectrogramPowerLimits,
) = signal_spectrogram_requested_power_limits_payload(
    SignalSpectrogramPresentationSerializer(),
    limits,
)

function signal_spectrogram_power_limits_payload(
    limits::ExplicitSignalSpectrogramPowerLimits,
)::Dict{String,Any}
    signal_spectrogram_requested_power_limits_payload(
        SignalSpectrogramPresentationSerializer(),
        limits,
    )
end

signal_spectrogram_effective_power_limits_payload(
    ::SignalSpectrogramPresentationSerializer,
    ::Nothing,
) = nothing

function signal_spectrogram_effective_power_limits_payload(
    ::SignalSpectrogramPresentationSerializer,
    extent::SignalSpectrogramPowerExtent,
)::Dict{String,Any}
    Dict{String,Any}(
        "min_db" => extent.min_db,
        "max_db" => extent.max_db,
        "units" => "dB",
    )
end

signal_spectrogram_power_extent_payload(::Nothing) =
    signal_spectrogram_effective_power_limits_payload(
        SignalSpectrogramPresentationSerializer(),
        nothing,
    )

signal_spectrogram_power_extent_payload(extent::SignalSpectrogramPowerExtent) =
    signal_spectrogram_effective_power_limits_payload(
        SignalSpectrogramPresentationSerializer(),
        extent,
    )

signal_spectrogram_rendered_power_limits_payload(
    ::SignalSpectrogramPresentationSerializer,
    ::Nothing,
) = nothing

function signal_spectrogram_rendered_power_limits_payload(
    ::SignalSpectrogramPresentationSerializer,
    limits::SignalSpectrogramRenderedPowerLimits,
)::Dict{String,Any}
    Dict{String,Any}(
        "min" => limits.minimum,
        "max" => limits.maximum,
        "units" => limits.scale == DB_SPECTRUM_SCALE ? "dB" : "power",
    )
end

signal_spectrogram_rendered_power_limits_payload(::Nothing) =
    signal_spectrogram_rendered_power_limits_payload(
        SignalSpectrogramPresentationSerializer(),
        nothing,
    )

signal_spectrogram_rendered_power_limits_payload(
    limits::SignalSpectrogramRenderedPowerLimits,
) = signal_spectrogram_rendered_power_limits_payload(
    SignalSpectrogramPresentationSerializer(),
    limits,
)

function signal_spectrogram_power_limits_metadata(
    serializer::SignalSpectrogramPresentationSerializer,
    plan::SignalSpectrogramPresentationPlan,
)::Dict{String,Any}
    resolution = plan.power_limits
    Dict{String,Any}(
        "mode" => resolution.requested isa AutomaticSignalSpectrogramPowerLimits ?
            "auto" : "explicit",
        "requested" => signal_spectrogram_requested_power_limits_payload(
            serializer,
            resolution.requested,
        ),
        "effective" => signal_spectrogram_effective_power_limits_payload(
            serializer,
            resolution.effective,
        ),
        "rendered" => signal_spectrogram_rendered_power_limits_payload(
            serializer,
            plan.rendered_limits,
        ),
    )
end

signal_spectrogram_power_limits_metadata(
    plan::SignalSpectrogramPresentationPlan,
)::Dict{String,Any} = signal_spectrogram_power_limits_metadata(
    SignalSpectrogramPresentationSerializer(),
    plan,
)

function signal_spectrogram_power_limits_metadata(
    resolution::SignalSpectrogramPowerLimitsResolution,
)::Dict{String,Any}
    extent = resolution.effective
    rendered = if extent === nothing
        nothing
    elseif extent.min_db < extent.max_db
        SignalSpectrogramRenderedPowerLimits(extent.min_db, extent.max_db, DB_SPECTRUM_SCALE)
    else
        SignalSpectrogramRenderedPowerLimits(extent.min_db - 1.0, extent.max_db + 1.0, DB_SPECTRUM_SCALE)
    end
    signal_spectrogram_power_limits_metadata(SignalSpectrogramPresentationPlan(
        zeros(Float64, 0, 0),
        DB_SPECTRUM_SCALE,
        resolution,
        rendered,
    ))
end

function signal_spectrogram_power_limits_metadata(
    settings::SignalSpectrogramSettings,
    data::SignalSpectrogramData,
    scale::SignalSpectrumScale,
)::Dict{String,Any}
    plan = signal_spectrogram_presentation_plan(
        SignalSpectrogramPresentationPlanner(),
        data,
        SignalSpectrogramPresentationSettings(scale, settings.power_limits),
    )
    signal_spectrogram_power_limits_metadata(plan)
end


signal_spectrogram_power_limits_metadata(
    settings::SignalSpectrogramSettings,
    data::SignalSpectrogramData,
)::Dict{String,Any} = signal_spectrogram_power_limits_metadata(
    settings,
    data,
    DB_SPECTRUM_SCALE,
)

"""Serializer boundary for canonical and renderer-ready Persistence density metadata."""
struct SignalPersistencePresentationSerializer end

signal_persistence_requested_density_limits_payload(
    ::SignalPersistencePresentationSerializer,
    ::AutomaticSignalPersistenceDensityLimits,
) = nothing

function signal_persistence_requested_density_limits_payload(
    ::SignalPersistencePresentationSerializer,
    limits::ExplicitSignalPersistenceDensityLimits,
)::Dict{String,Any}
    Dict{String,Any}(
        "min" => limits.minimum,
        "max" => limits.maximum,
        "units" => "percent",
    )
end

signal_persistence_effective_density_limits_payload(
    ::SignalPersistencePresentationSerializer,
    ::Nothing,
) = nothing

function signal_persistence_effective_density_limits_payload(
    ::SignalPersistencePresentationSerializer,
    limits::SignalPersistenceDensityExtent,
)::Dict{String,Any}
    Dict{String,Any}(
        "min" => limits.minimum,
        "max" => limits.maximum,
        "units" => "percent",
    )
end

signal_persistence_rendered_density_limits_payload(
    ::SignalPersistencePresentationSerializer,
    ::Nothing,
) = nothing

function signal_persistence_rendered_density_limits_payload(
    ::SignalPersistencePresentationSerializer,
    limits::SignalPersistenceRenderedDensityLimits,
)::Dict{String,Any}
    Dict{String,Any}(
        "min" => limits.minimum,
        "max" => limits.maximum,
        "units" => "percent",
    )
end

function signal_persistence_density_limits_metadata(
    serializer::SignalPersistencePresentationSerializer,
    plan::SignalPersistencePresentationPlan,
)::Dict{String,Any}
    resolution = plan.density_limits
    Dict{String,Any}(
        "mode" => resolution.requested isa AutomaticSignalPersistenceDensityLimits ?
            "auto" : "explicit",
        "requested" => signal_persistence_requested_density_limits_payload(
            serializer,
            resolution.requested,
        ),
        "effective" => signal_persistence_effective_density_limits_payload(
            serializer,
            resolution.effective,
        ),
        "rendered" => signal_persistence_rendered_density_limits_payload(
            serializer,
            plan.rendered_limits,
        ),
    )
end

signal_persistence_density_limits_metadata(
    plan::SignalPersistencePresentationPlan,
)::Dict{String,Any} = signal_persistence_density_limits_metadata(
    SignalPersistencePresentationSerializer(),
    plan,
)

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
    spectrogram_scale::SignalSpectrumScale = DB_SPECTRUM_SCALE,
    persistence_density_limits::Union{Nothing,SignalSettingRange} = nothing,
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
            "color_label" => spectrogram_scale == DB_SPECTRUM_SCALE ? "Мощность, дБ" : "Мощность",
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
                spectrogram_scale,
            ),
        ),
        "persistence" => signal_analyser_persistence_plot(
            SignalPersistenceData(ONE_SIDED_SPECTRUM),
            persistence_density_limits,
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
    ;
    materialize_missing::Bool = true,
    materialize_signal_names::Vector{String} = signal_names,
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
        elseif !materialize_missing || !(name in materialize_signal_names)
            continue
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
    materialize_missing::Bool = true,
)::Dict{SignalSpectrogramCacheKey,SignalSpectrogramData}
    prepared = Dict{SignalSpectrogramCacheKey,SignalSpectrogramData}()
    signal === nothing && return prepared
    key = signal_spectrogram_cache_key(signal, display.spectrogram_settings)
    if !refresh && haskey(state.spectrogram_cache, key)
        prepared[key] = state.spectrogram_cache[key]
    elseif materialize_missing
        prepared[key] = signal_spectrogram_data(
            state.spectrogram_service,
            signal,
            display.spectrogram_settings,
        )
    end
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

@enum SignalAnalyserPersistencePreparationMode begin
    DEFER_PERSISTENCE_PREPARATION
    REQUIRE_PERSISTENCE_PREPARATION
end

"""Service policy deciding whether Persistence belongs in a prospective Display payload."""
struct SignalAnalyserPersistencePreparationPlan
    mode::SignalAnalyserPersistencePreparationMode

    function SignalAnalyserPersistencePreparationPlan(
        display::SignalAnalyserDisplayState,
        signal::Union{Nothing,AnalysedSignal},
    )
        required = display.active_plot == PERSISTENCE_PLOT &&
            signal !== nothing && length(signal.values) >= 2
        new(required ? REQUIRE_PERSISTENCE_PREPARATION : DEFER_PERSISTENCE_PREPARATION)
    end
end

signal_analyser_persistence_required(plan::SignalAnalyserPersistencePreparationPlan)::Bool =
    plan.mode == REQUIRE_PERSISTENCE_PREPARATION

function signal_analyser_prepared_persistences(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    signal::Union{Nothing,AnalysedSignal},
    ;
    materialize_missing::Bool = true,
)::Dict{SignalPersistenceCacheKey,SignalPersistenceData}
    prepared = Dict{SignalPersistenceCacheKey,SignalPersistenceData}()
    plan = SignalAnalyserPersistencePreparationPlan(display, signal)
    signal_analyser_persistence_required(plan) || return prepared
    signal === nothing && return prepared
    key = signal_persistence_cache_key(signal, display.persistence_settings)
    if haskey(state.persistence_cache, key)
        prepared[key] = state.persistence_cache[key]
    elseif materialize_missing
        prepared[key] = signal_persistence_data(
            state.persistence_service,
            signal,
            display.persistence_settings,
        )
    end
    prepared
end

function signal_analyser_publish_prepared_persistences!(
    state::SignalAnalyserState,
    prepared::Dict{SignalPersistenceCacheKey,SignalPersistenceData},
)
    for (key, data) in prepared
        state.persistence_cache[key] = data
    end
    nothing
end

"""A fully rendered Display payload whose cache writes have not been published yet."""
struct SignalAnalyserPreparedDisplayPlots
    plots::Dict{String,Any}
    plot_payload::Dict{String,Any}
    plot_cache::Dict{String,Dict{String,Any}}
    spectrum_cache::Dict{SignalSpectrumCacheKey,SignalSpectrumData}
    spectrogram_cache::Dict{SignalSpectrogramCacheKey,SignalSpectrogramData}
    persistence_cache::Dict{SignalPersistenceCacheKey,SignalPersistenceData}
end

function signal_analyser_prepared_spectrum_data(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    signal::AnalysedSignal,
    prepared::Dict{SignalSpectrumCacheKey,SignalSpectrumData},
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
    get(prepared, key, SignalSpectrumData(signal_spectrum_topology(signal)))
end

function signal_analyser_prepare_display_plots(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    signal::AnalysedSignal,
    visible_names::Vector{String},
    ;
    materialize_missing_spectra::Bool = true,
    materialize_missing_spectrogram::Bool = true,
    materialize_missing_persistence::Bool = true,
    materialize_spectrum_signal_names::Vector{String} = visible_names,
    refresh_spectrogram::Bool = false,
)::SignalAnalyserPreparedDisplayPlots
    signal.name in visible_names || throw(ArgumentError(
        "Analysis source должен входить в состав видимых сигналов Display",
    ))
    prepared_plots = signal_analyser_prepared_plots(state, visible_names)
    prepared_spectra = signal_analyser_prepared_spectra(
        state,
        display,
        visible_names,
        materialize_missing = materialize_missing_spectra,
        materialize_signal_names = materialize_spectrum_signal_names,
    )
    prepared_spectrograms = signal_analyser_prepared_spectrograms(
        state,
        display,
        signal,
        refresh = refresh_spectrogram,
        materialize_missing = materialize_missing_spectrogram,
    )
    prepared_persistences = signal_analyser_prepared_persistences(
        state,
        display,
        signal,
        materialize_missing = materialize_missing_persistence,
    )

    selected_plots = copy(prepared_plots[signal.name])
    selected_spectrum = signal_analyser_prepared_spectrum_data(
        state,
        display,
        signal,
        prepared_spectra,
    )
    spectrogram_key = signal_spectrogram_cache_key(signal, display.spectrogram_settings)
    selected_spectrogram = get(
        prepared_spectrograms,
        spectrogram_key,
        SignalSpectrogramData(signal_spectrum_topology(signal)),
    )
    persistence_key = signal_persistence_cache_key(signal, display.persistence_settings)
    selected_persistence = get(
        prepared_persistences,
        persistence_key,
        SignalPersistenceData(signal_spectrum_topology(signal)),
    )
    selected_plots["spectrum"] = signal_analyser_spectrum_plot(
        selected_spectrum,
        display.spectrum_settings,
    )
    selected_plots["spectrogram"] = signal_analyser_spectrogram_plot(
        selected_spectrogram,
        display.spectrogram_settings,
        signal,
        display.stored_settings.spectrogram.scale,
    )
    selected_plots["persistence"] = signal_analyser_persistence_plot(
        selected_persistence,
        display.stored_settings.persistence.density_limits,
    )

    time_traces = Dict{String,Any}[]
    spectrum_traces = Dict{String,Any}[]
    for visible_signal in state.signals
        visible_signal.name in visible_names || continue
        spectrum_data = signal_analyser_prepared_spectrum_data(
            state,
            display,
            visible_signal,
            prepared_spectra,
        )
        spectrum_plot = signal_analyser_spectrum_plot(
            spectrum_data,
            display.spectrum_settings,
        )
        append!(time_traces, signal_analyser_time_traces_for_payload(visible_signal))
        push!(
            spectrum_traces,
            signal_analyser_plot_for_payload(spectrum_plot, visible_signal),
        )
    end
    plot_payload = Dict{String,Any}(
        "selected_signal" => signal.name,
        "visible_signals" => visible_names,
        "time_traces" => time_traces,
        "spectrum_traces" => spectrum_traces,
        "spectrogram" => signal_analyser_plot_for_payload(
            selected_plots["spectrogram"],
            signal,
        ),
        "persistence" => signal_analyser_plot_for_payload(
            selected_plots["persistence"],
            signal,
        ),
    )
    SignalAnalyserPreparedDisplayPlots(
        selected_plots,
        plot_payload,
        prepared_plots,
        prepared_spectra,
        prepared_spectrograms,
        prepared_persistences,
    )
end

function signal_analyser_prepare_display_plots(
    ::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    ::Nothing,
    visible_names::Vector{String};
    materialize_missing_spectra::Bool = true,
    materialize_missing_spectrogram::Bool = true,
    materialize_missing_persistence::Bool = true,
    materialize_spectrum_signal_names::Vector{String} = String[],
    refresh_spectrogram::Bool = false,
)::SignalAnalyserPreparedDisplayPlots
    isempty(visible_names) || throw(ArgumentError(
        "Пустой analysis source допустим только для пустого Display",
    ))
    plots = signal_analyser_empty_plots(
        display.spectrum_settings,
        display.spectrogram_settings,
        display.stored_settings.spectrogram.scale,
        display.stored_settings.persistence.density_limits,
    )
    spectrogram = copy(plots["spectrogram"])
    spectrogram["signal"] = nothing
    spectrogram["name"] = ""
    spectrogram["color"] = ""
    persistence = copy(plots["persistence"])
    persistence["signal"] = nothing
    persistence["name"] = ""
    persistence["color"] = ""
    plot_payload = Dict{String,Any}(
        "selected_signal" => nothing,
        "visible_signals" => String[],
        "time_traces" => Dict{String,Any}[],
        "spectrum_traces" => Dict{String,Any}[],
        "spectrogram" => spectrogram,
        "persistence" => persistence,
    )
    SignalAnalyserPreparedDisplayPlots(
        plots,
        plot_payload,
        Dict{String,Dict{String,Any}}(),
        Dict{SignalSpectrumCacheKey,SignalSpectrumData}(),
        Dict{SignalSpectrogramCacheKey,SignalSpectrogramData}(),
        Dict{SignalPersistenceCacheKey,SignalPersistenceData}(),
    )
end

function signal_analyser_publish_display_plots!(
    state::SignalAnalyserState,
    prepared::SignalAnalyserPreparedDisplayPlots,
)
    signal_analyser_publish_prepared_plots!(state, prepared.plot_cache)
    signal_analyser_publish_prepared_spectra!(state, prepared.spectrum_cache)
    signal_analyser_publish_prepared_spectrograms!(state, prepared.spectrogram_cache)
    signal_analyser_publish_prepared_persistences!(state, prepared.persistence_cache)
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

function signal_analyser_cached_persistence_data!(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    signal::AnalysedSignal,
)::SignalPersistenceData
    plan = SignalAnalyserPersistencePreparationPlan(display, signal)
    signal_analyser_persistence_required(plan) ||
        return SignalPersistenceData(signal_spectrum_topology(signal))
    key = signal_persistence_cache_key(signal, display.persistence_settings)
    if haskey(state.persistence_cache, key)
        return state.persistence_cache[key]
    end
    get!(state.persistence_cache, key) do
        signal_persistence_data(state.persistence_service, signal, display.persistence_settings)
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
    prepared = signal_analyser_prepare_display_plots(
        state,
        display,
        signal,
        [signal.name],
        materialize_missing_spectra = materialize_missing_spectra,
        materialize_missing_spectrogram = materialize_missing_spectrogram,
    )
    signal_analyser_publish_display_plots!(state, prepared)
    prepared.plots
end

function signal_analyser_visible_signal_names(state::SignalAnalyserState)::Vector{String}
    [signal.name for signal in state.signals if signal.visible]
end

function signal_analyser_inventory_ordered_names(
    state::SignalAnalyserState,
    signal_names::AbstractVector{<:AbstractString},
)::Vector{String}
    requested_names = Set(String.(signal_names))
    ordered_names = String[
        signal.name for signal in state.signals if signal.name in requested_names
    ]
    length(ordered_names) == length(signal_names) || throw(ArgumentError(
        "Signal membership ссылается на неизвестный или повторяющийся сигнал",
    ))
    ordered_names
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

function signal_analyser_layout_by_display_id(
    state::SignalAnalyserState,
    display_id::AbstractString,
)::SignalDisplayLayoutState
    layout = get(state.display_layouts, String(display_id), nothing)
    layout === nothing && throw(ArgumentError("Layout Display не найден: $display_id"))
    layout
end

const SignalAnalyserPaneRendererData = Union{
    Vector{Dict{String,Any}},
    Dict{String,Any},
}

"""Derived renderer output for one authoritative pane; never persisted in session state."""
struct SignalAnalyserPaneOutput
    pane_id::String
    plot_type::SignalAnalyserPlot
    signal_bindings::Vector{String}
    analysis_signal::Union{Nothing,String}
    isready::Bool
    success::Bool
    error::String
    data::SignalAnalyserPaneRendererData
    peaks::Union{Nothing,SignalPeaksSnapshot}
end

SignalAnalyserPaneOutput(
    pane_id::String,
    plot_type::SignalAnalyserPlot,
    signal_bindings::Vector{String},
    analysis_signal::Union{Nothing,String},
    isready::Bool,
    success::Bool,
    error::String,
    data::SignalAnalyserPaneRendererData,
) = SignalAnalyserPaneOutput(
    pane_id,
    plot_type,
    signal_bindings,
    analysis_signal,
    isready,
    success,
    error,
    data,
    nothing,
)

function signal_analyser_display_for_pane(
    display::SignalAnalyserDisplayState,
    pane::SignalDisplayPaneState,
)::SignalAnalyserDisplayState
    SignalAnalyserDisplayState(
        display.id,
        display.name,
        pane.plot_type,
        pane.membership,
        pane.analysis_source,
        pane.time_limits,
        pane.measurement_selection,
        pane.spectrum_settings,
        pane.spectrogram_settings,
        pane.persistence_settings,
        pane.stored_settings,
        pane.peaks_enabled,
    )
end

function signal_analyser_ordered_trace_data(
    traces::Vector{Dict{String,Any}},
    signal_bindings::Vector{String},
)::Vector{Dict{String,Any}}
    traces_by_signal = Dict{String,Vector{Dict{String,Any}}}()
    for trace in traces
        push!(
            get!(traces_by_signal, String(trace["signal"])) do
                Dict{String,Any}[]
            end,
            trace,
        )
    end
    ordered = Dict{String,Any}[]
    for name in signal_bindings
        append!(ordered, get(traces_by_signal, name, Dict{String,Any}[]))
    end
    ordered
end

function signal_analyser_minmax_normalized_values(
    values::Vector{Float64},
)::Vector{Float64}
    isempty(values) && return Float64[]
    minimum_value, maximum_value = extrema(values)
    span = maximum_value - minimum_value
    span > 0.0 ? (values .- minimum_value) ./ span : zeros(Float64, length(values))
end

function signal_analyser_normalized_time_trace(
    trace::Dict{String,Any},
)::Dict{String,Any}
    normalized = copy(trace)
    normalized["y"] = signal_analyser_minmax_normalized_values(
        Float64.(get(trace, "y", Float64[])),
    )
    normalized
end

function signal_analyser_pane_renderer_data(
    prepared::SignalAnalyserPreparedDisplayPlots,
    pane::SignalDisplayPaneState,
    signal_bindings::Vector{String},
)::SignalAnalyserPaneRendererData
    plot_type = pane.plot_type
    if plot_type == TIME_PLOT
        traces = signal_analyser_ordered_trace_data(
            prepared.plot_payload["time_traces"]::Vector{Dict{String,Any}},
            signal_bindings,
        )
        return pane.stored_settings.time.normalize_y ?
            Dict{String,Any}[signal_analyser_normalized_time_trace(trace) for trace in traces] :
            traces
    elseif plot_type == SPECTRUM_PLOT
        traces = signal_analyser_ordered_trace_data(
            prepared.plot_payload["spectrum_traces"]::Vector{Dict{String,Any}},
            signal_bindings,
        )
        frequency_scale = SIGNAL_SPECTRUM_FREQUENCY_SCALE_NAMES[
            pane.spectrum_settings.frequency_scale
        ]
        for trace in traces
            trace["frequency_scale"] = frequency_scale
        end
        return traces
    elseif plot_type == SPECTROGRAM_PLOT
        return prepared.plot_payload["spectrogram"]::Dict{String,Any}
    end
    prepared.plot_payload["persistence"]::Dict{String,Any}
end

function signal_analyser_pane_output_error(err)::String
    message = sprint(showerror, err)
    length(message) <= 240 ? message : string(first(message, 237), "...")
end

function signal_analyser_prepare_pane_output!(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    pane::SignalDisplayPaneState,
)::SignalAnalyserPaneOutput
    pane_display = signal_analyser_display_for_pane(display, pane)
    signal_bindings = signal_display_pane_members(pane)
    analysis_name = signal_display_pane_analysis_name(pane)
    # `analysis_name` is the persisted pane main signal used by the inspector.
    # Rendering is intentionally driven only by checkbox membership, so an
    # unbound main signal must never reappear on the graph.
    render_signal = isempty(signal_bindings) ? nothing :
        signal_by_name(state, first(signal_bindings))
    try
        prepared = signal_analyser_prepare_display_plots(
            state,
            pane_display,
            render_signal,
            signal_bindings,
            materialize_missing_spectra = pane.plot_type == SPECTRUM_PLOT,
            materialize_missing_spectrogram = pane.plot_type == SPECTROGRAM_PLOT,
            materialize_missing_persistence = pane.plot_type == PERSISTENCE_PLOT,
            materialize_spectrum_signal_names = signal_bindings,
        )
        data = signal_analyser_pane_renderer_data(
            prepared,
            pane,
            signal_bindings,
        )
        signal_analyser_publish_display_plots!(state, prepared)
        return SignalAnalyserPaneOutput(
            pane.id,
            pane.plot_type,
            signal_bindings,
            analysis_name,
            true,
            true,
            "",
            data,
        )
    catch err
        empty_prepared = signal_analyser_prepare_display_plots(
            state,
            pane_display,
            nothing,
            String[],
            materialize_missing_spectra = false,
            materialize_missing_spectrogram = false,
            materialize_missing_persistence = false,
        )
        return SignalAnalyserPaneOutput(
            pane.id,
            pane.plot_type,
            signal_bindings,
            analysis_name,
            true,
            false,
            signal_analyser_pane_output_error(err),
            signal_analyser_pane_renderer_data(
                empty_prepared,
                pane,
                String[],
            ),
        )
    end
end

function signal_analyser_pane_output_payload(
    output::SignalAnalyserPaneOutput,
)::Dict{String,Any}
    Dict{String,Any}(
        "pane_id" => output.pane_id,
        "plot_type" => signal_analyser_plot_name(output.plot_type),
        "signal_bindings" => output.signal_bindings,
        "analysis_signal" => output.analysis_signal,
        "output" => Dict{String,Any}(
            "isready" => output.isready,
            "success" => output.success,
            "error" => output.error,
            "data" => output.data,
        ),
    )
end

function signal_analyser_layout_outputs_payload(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    layout::SignalDisplayLayoutState,
)::Vector{Dict{String,Any}}
    display.id == state.active_display_id || return Dict{String,Any}[]
    active_pane = signal_display_active_pane(layout)
    Dict{String,Any}[
        signal_analyser_pane_output_payload(
            signal_analyser_prepare_pane_output!(state, display, active_pane),
        )
    ]
end

function signal_display_pane_payload(pane::SignalDisplayPaneState)::Dict{String,Any}
    Dict{String,Any}(
        "id" => pane.id,
        "name" => pane.name,
        "plot_type" => signal_analyser_plot_name(pane.plot_type),
        "signal_bindings" => signal_display_pane_members(pane),
        "analysis_signal" => signal_display_pane_analysis_name(pane),
        "peaks_settings" => signal_peaks_settings_payload(pane.peaks_settings),
    )
end

function signal_display_layout_payload(
    layout::SignalDisplayLayoutState,
)::Dict{String,Any}
    Dict{String,Any}(
        "version" => layout.version,
        "variant" => layout.variant,
        "rows" => layout.rows,
        "columns" => layout.columns,
        "active_pane_id" => layout.active_pane_id,
        "next_pane_number" => layout.next_pane_number,
        "panes" => Dict{String,Any}[
            signal_display_pane_payload(pane) for pane in layout.panes
        ],
    )
end

function signal_analyser_layout_entries_payload(
    state::SignalAnalyserState,
)::Vector{Dict{String,Any}}
    Dict{String,Any}[
        let layout = signal_analyser_layout_by_display_id(state, display.id)
            Dict{String,Any}(
                "display_id" => display.id,
                "layout" => signal_display_layout_payload(layout),
                "outputs" => signal_analyser_layout_outputs_payload(
                    state,
                    display,
                    layout,
                ),
            )
        end
        for display in state.displays
    ]
end

function signal_analyser_layouts_snapshot_from_state_unlocked(
    state::SignalAnalyserState,
    snapshot::Dict{String,Any},
)::Dict{String,Any}
    signal_analyser_validate_selection_layout_invariants(state)
    Dict{String,Any}(
        "ok" => true,
        "state_revision" => state.view.state_revision,
        "active_display_id" => state.active_display_id,
        "layouts" => signal_analyser_layout_entries_payload(state),
        "state" => snapshot,
    )
end

function signal_analyser_layouts_snapshot_unlocked(
    state::SignalAnalyserState,
)::Dict{String,Any}
    signal_analyser_layouts_snapshot_from_state_unlocked(
        state,
        signal_analyser_snapshot_unlocked(
            state,
            materialize_missing_spectra = false,
            materialize_missing_spectrogram = false,
            materialize_missing_persistence = false,
        ),
    )
end

function signal_analyser_layouts_snapshot(state::SignalAnalyserState)::Dict{String,Any}
    lock(state.lock) do
        signal_analyser_layouts_snapshot_unlocked(state)
    end
end

function signal_analyser_validate_selection_layout_invariants(
    state::SignalAnalyserState,
)::Nothing
    inventory = String[signal.name for signal in state.signals]
    allunique(inventory) || throw(ArgumentError(
        "Имена authoritative signals не должны повторяться",
    ))
    known_names = Set(inventory)
    state.row_selection.signal_name in known_names || throw(ArgumentError(
        "Row-selected signal отсутствует в authoritative signals",
    ))

    display_ids = String[display.id for display in state.displays]
    allunique(display_ids) || throw(ArgumentError(
        "Идентификаторы Display не должны повторяться",
    ))
    state.active_display_id in display_ids || throw(ArgumentError(
        "Active Display отсутствует в authoritative displays",
    ))
    Set(keys(state.display_layouts)) == Set(display_ids) || throw(ArgumentError(
        "Каждый Display должен иметь ровно один authoritative layout",
    ))

    for display in state.displays
        members = signal_analyser_display_members(display)
        members == signal_analyser_inventory_ordered_names(state, members) || throw(
            ArgumentError(
                "Visible signals Display $(display.id) не следуют authoritative inventory order",
            ),
        )
        analysis_name = signal_analyser_display_analysis_name(display)
        analysis_name === nothing || analysis_name in known_names || throw(ArgumentError(
            "Main signal Display $(display.id) отсутствует в authoritative inventory",
        ))

        layout = signal_analyser_layout_by_display_id(state, display.id)
        for pane in layout.panes
            pane_members = signal_display_pane_members(pane)
            signal_analyser_inventory_ordered_names(state, pane_members)
            pane_analysis = signal_display_pane_analysis_name(pane)
            pane_analysis === nothing || pane_analysis in known_names || throw(ArgumentError(
                "Main signal pane $(pane.id) отсутствует в authoritative inventory",
            ))
        end

        active_pane = signal_display_active_pane(layout)
        active_members = signal_display_pane_members(active_pane)
        Set(active_members) == Set(members) || throw(ArgumentError(
            "Bindings active pane не совпадают с membership Display $(display.id)",
        ))
        active_pane.plot_type == display.active_plot || throw(ArgumentError(
            "Plot type active pane не совпадает с Display $(display.id)",
        ))
        isequal(
            signal_display_pane_analysis_name(active_pane),
            signal_analyser_display_analysis_name(display),
        ) || throw(ArgumentError(
            "Main signal active pane не совпадает с Display $(display.id)",
        ))
    end

    active_display = signal_analyser_active_display(state)
    active_members = Set(signal_analyser_display_members(active_display))
    all(signal -> signal.visible == (signal.name in active_members), state.signals) || throw(
        ArgumentError("Visible flags signals не совпадают с active Display membership"),
    )
    state.view.active_plot == active_display.active_plot || throw(ArgumentError(
        "Active plot view не совпадает с active Display",
    ))
    isequal(
        state.view.selected_signal,
        signal_analyser_display_analysis_name(active_display),
    ) || throw(ArgumentError(
        "Selected signal view не совпадает с active Display analysis signal",
    ))
    nothing
end

function signal_analyser_display_for_layout(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    layout::SignalDisplayLayoutState,
)::SignalAnalyserDisplayState
    pane = signal_display_active_pane(layout)
    pane_members = signal_display_pane_members(pane)
    members = signal_analyser_inventory_ordered_names(state, pane_members)
    SignalAnalyserDisplayState(
        display.id,
        display.name,
        pane.plot_type,
        SignalDisplayMembership(members),
        pane.analysis_source,
        pane.time_limits,
        pane.measurement_selection,
        pane.spectrum_settings,
        pane.spectrogram_settings,
        pane.persistence_settings,
        pane.stored_settings,
        pane.peaks_enabled,
    )
end

function signal_analyser_new_pane_template(
    state::SignalAnalyserState,
    layout::SignalDisplayLayoutState,
)::SignalDisplayPaneState
    active_pane = signal_display_active_pane(layout)
    empty = signal_display_empty_pane(active_pane.id)
    link_time = any(pane -> pane.stored_settings.time.link_time, layout.panes)
    link_amplitude = any(pane -> pane.stored_settings.time.link_amplitude, layout.panes)
    link_frequency = any(pane -> pane.stored_settings.spectrum.link_frequency, layout.panes)
    link_magnitude = any(pane -> pane.stored_settings.spectrum.link_magnitude, layout.panes)
    time_source_index = findfirst(
        pane -> pane.stored_settings.time.link_time &&
            pane.plot_type in (TIME_PLOT, SPECTROGRAM_PLOT),
        layout.panes,
    )
    amplitude_source_index = findfirst(
        pane -> pane.stored_settings.time.link_amplitude && pane.plot_type == TIME_PLOT,
        layout.panes,
    )
    time_source = time_source_index === nothing ? nothing : layout.panes[time_source_index::Int]
    amplitude_source = amplitude_source_index === nothing ? nothing :
        layout.panes[amplitude_source_index::Int]
    spectrum_source_index = findfirst(
        pane -> pane.plot_type == SPECTRUM_PLOT &&
            (pane.stored_settings.spectrum.link_frequency ||
                pane.stored_settings.spectrum.link_magnitude),
        layout.panes,
    )
    spectrum_source = spectrum_source_index === nothing ? nothing :
        layout.panes[spectrum_source_index::Int]
    time_units = time_source === nothing ? empty.stored_settings.time.units :
        (time_source::SignalDisplayPaneState).plot_type == SPECTROGRAM_PLOT ?
            (time_source::SignalDisplayPaneState).stored_settings.spectrogram.time_units :
            (time_source::SignalDisplayPaneState).stored_settings.time.units
    y_limits = link_amplitude && amplitude_source !== nothing ?
        (amplitude_source::SignalDisplayPaneState).stored_settings.time.y_limits : nothing
    time_preferences = SignalTimePreferences(
        empty.stored_settings.time.normalize_y,
        empty.stored_settings.time.show_markers,
        time_units,
        y_limits,
        link_time,
        link_amplitude,
    )
    spectrogram = empty.stored_settings.spectrogram
    spectrogram_preferences = SignalSpectrogramPreferences(
        time_units,
        spectrogram.frequency_units,
        spectrogram.scale,
        spectrogram.time_resolution,
        spectrogram.reassign,
    )
    source_spectrum_preferences = spectrum_source === nothing ?
        empty.stored_settings.spectrum :
        (spectrum_source::SignalDisplayPaneState).stored_settings.spectrum
    spectrum_preferences = signal_settings_replace(
        empty.stored_settings.spectrum,
        frequency_units = link_frequency ? source_spectrum_preferences.frequency_units :
            empty.stored_settings.spectrum.frequency_units,
        y_limits = link_magnitude ? source_spectrum_preferences.y_limits : nothing,
        link_frequency = link_frequency,
        link_magnitude = link_magnitude,
    )
    stored = SignalDisplayStoredSettings(
        empty.stored_settings.display,
        time_preferences,
        spectrum_preferences,
        spectrogram_preferences,
        empty.stored_settings.persistence,
    )
    SignalDisplayPaneState(
        empty.id,
        empty.name,
        empty.plot_type,
        empty.membership,
        empty.analysis_source,
        nothing,
        empty.measurement_selection,
        link_frequency && spectrum_source !== nothing ?
            SignalSpectrumSettings(
                empty.spectrum_settings.scale,
                empty.spectrum_settings.frequency_scale,
                empty.spectrum_settings.leakage,
                (spectrum_source::SignalDisplayPaneState).spectrum_settings.frequency_limits,
            ) : empty.spectrum_settings,
        empty.spectrogram_settings,
        empty.persistence_settings,
        stored,
        empty.peaks_enabled,
        empty.peaks_settings,
    )
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
        "persistence_settings" => signal_persistence_settings_payload(display.persistence_settings),
        "peaks_enabled" => display.peaks_enabled,
    )
end

function signal_analyser_with_visibility(signal::AnalysedSignal, visible::Bool)::AnalysedSignal
    AnalysedSignal(
        signal.id,
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

function signal_analyser_time_component_payload(
    signal::AnalysedSignal,
    component::AbstractString,
    values::Vector{Float64},
)::Dict{String,Any}
    x, y = signal_analyser_bounded_line(signal_time_values(signal), values)
    component_name = String(component)
    Dict{String,Any}(
        "type" => "line",
        "x" => x,
        "y" => y,
        "x_label" => "Время, с",
        "y_label" => "Амплитуда",
        "signal" => signal.name,
        "component" => component_name,
        "name" => isempty(component_name) ? signal.name :
            "$(signal.name) ($(component_name == "real" ? "Real" : "Imaginary"))",
        "color" => signal.color,
    )
end

"""MATLAB-compatible Time presentation; raw signal values remain untouched."""
function signal_analyser_time_traces_for_payload(
    signal::AnalysedSignal,
)::Vector{Dict{String,Any}}
    if signal.is_complex
        return Dict{String,Any}[
            signal_analyser_time_component_payload(
                signal,
                "real",
                Float64.(real.(signal.values)),
            ),
            signal_analyser_time_component_payload(
                signal,
                "imaginary",
                Float64.(imag.(signal.values)),
            ),
        ]
    end
    Dict{String,Any}[
        signal_analyser_time_component_payload(
            signal,
            "",
            Float64.(real.(signal.values)),
        ),
    ]
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
        signal_analyser_cached_plots!(state, signal)
        spectrum_data = signal_analyser_cached_spectrum_data!(
            state,
            display,
            signal,
            materialize_missing = materialize_missing_spectra,
        )
        spectrum_plot = signal_analyser_spectrum_plot(spectrum_data, display.spectrum_settings)
        append!(time_traces, signal_analyser_time_traces_for_payload(signal))
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
        display.stored_settings.spectrogram.scale,
        display.stored_settings.persistence.density_limits,
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
    effective_max_s = min(limits.max_s, duration_s)

    first_position = findfirst(eachindex(ordinate)) do index
        time_s = (index - 1) / signal.sample_rate_hz
        limits.min_s <= time_s <= effective_max_s
    end
    last_position = findlast(eachindex(ordinate)) do index
        time_s = (index - 1) / signal.sample_rate_hz
        limits.min_s <= time_s <= effective_max_s
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

"""Reconciles persisted settings when a Display changes its analysis source."""
struct SignalAnalysisSourceReconciler end

struct ReconciledSignalAnalysisSettings
    spectrum::SignalSpectrumSettings
    spectrogram::SignalSpectrogramSettings
end

function signal_analyser_reconcile_carried_frequency_limits(
    ::SignalAnalysisSourceReconciler,
    settings::SignalSpectrumSettings,
    signal::AnalysedSignal,
)::SignalSpectrumSettings
    signal_spectrum_frequency_limits_valid_for_signal(settings.frequency_limits, signal) &&
        return settings
    signal_spectrum_with_frequency_limits(
        settings,
        AutomaticSignalSpectrumFrequencyLimits(),
    )
end

function signal_analyser_reconcile_carried_frequency_limits(
    ::SignalAnalysisSourceReconciler,
    settings::SignalSpectrogramSettings,
    signal::AnalysedSignal,
)::SignalSpectrogramSettings
    signal_spectrum_frequency_limits_valid_for_signal(settings.frequency_limits, signal) &&
        return settings
    signal_spectrogram_with_frequency_limits(
        settings,
        AutomaticSignalSpectrumFrequencyLimits(),
    )
end

function signal_analyser_reconcile_analysis_source(
    reconciler::SignalAnalysisSourceReconciler,
    spectrum_settings::SignalSpectrumSettings,
    spectrogram_settings::SignalSpectrogramSettings,
    prospective_members::AbstractVector{AnalysedSignal},
    prospective_source::AnalysedSignal,
)::ReconciledSignalAnalysisSettings
    if spectrum_settings.frequency_scale == LOG_SPECTRUM_FREQUENCY_SCALE &&
        any(signal -> signal.is_complex, prospective_members)
        throw(SignalAnalysisSourceCompatibilityError(
            "spectrum_settings",
            "frequency_scale=log недоступен, пока Display содержит комплексный сигнал",
        ))
    end
    ReconciledSignalAnalysisSettings(
        signal_analyser_reconcile_carried_frequency_limits(
            reconciler,
            spectrum_settings,
            prospective_source,
        ),
        signal_analyser_reconcile_carried_frequency_limits(
            reconciler,
            spectrogram_settings,
            prospective_source,
        ),
    )
end

function signal_analyser_reconcile_analysis_source(
    reconciler::SignalAnalysisSourceReconciler,
    display::SignalAnalyserDisplayState,
    prospective_members::AbstractVector{AnalysedSignal},
    prospective_source::AnalysedSignal,
)::ReconciledSignalAnalysisSettings
    signal_analyser_reconcile_analysis_source(
        reconciler,
        display.spectrum_settings,
        display.spectrogram_settings,
        prospective_members,
        prospective_source,
    )
end

function signal_display_pane_reconfigured(
    state::SignalAnalyserState,
    pane::SignalDisplayPaneState,
    plot_type::SignalAnalyserPlot,
    signal_bindings::AbstractVector{<:AbstractString},
)::SignalDisplayPaneState
    membership = SignalDisplayMembership(signal_bindings)
    members = collect(membership.signal_names)
    current_analysis = signal_display_pane_analysis_name(pane)
    # Checkbox membership and main signal are independent.  update_pane only
    # changes graph bindings and therefore never promotes/demotes main signal.
    analysis_name = current_analysis
    analysis_signal = analysis_name === nothing ? nothing : signal_by_name(state, analysis_name)
    prospective_members = AnalysedSignal[signal_by_name(state, name) for name in members]
    reconciled_settings = analysis_signal === nothing ? ReconciledSignalAnalysisSettings(
        pane.spectrum_settings,
        pane.spectrogram_settings,
    ) : signal_analyser_reconcile_analysis_source(
        SignalAnalysisSourceReconciler(),
        pane.spectrum_settings,
        pane.spectrogram_settings,
        prospective_members,
        analysis_signal,
    )
    time_limits = if analysis_signal === nothing
        nothing
    elseif pane.stored_settings.time.link_time && pane.time_limits !== nothing
        pane.time_limits
    elseif current_analysis == analysis_name && pane.time_limits !== nothing &&
        (pane.time_limits::SignalTimeLimits).max_s <= signal_duration_s(analysis_signal) &&
        signal_time_limits_are_valid(
            state.measurements_service,
            analysis_signal,
            pane.time_limits,
        )
        pane.time_limits
    else
        signal_full_time_limits(state.measurements_service, analysis_signal)
    end
    SignalDisplayPaneState(
        pane.id,
        pane.name,
        plot_type,
        membership,
        signal_analysis_source(analysis_name),
        time_limits,
        pane.measurement_selection,
        reconciled_settings.spectrum,
        reconciled_settings.spectrogram,
        pane.persistence_settings,
        signal_settings_reconcile_stored_for_source(pane.stored_settings, analysis_signal),
        analysis_signal !== nothing && !isempty(members) &&
            plot_type in (TIME_PLOT, SPECTRUM_PLOT) && pane.peaks_enabled,
        pane.peaks_settings,
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

function signal_persistence_cache_key(
    signal::AnalysedSignal,
    settings::SignalPersistenceSettings,
)::SignalPersistenceCacheKey
    SignalPersistenceCacheKey(
        signal.name,
        signal.sample_rate_hz,
        length(signal.values),
        signal_spectrum_topology(signal),
        SIGNAL_PERSISTENCE_DEFAULT_NUM_POWER_BINS,
        settings.leakage,
    )
end

signal_persistence_cache_key(signal::AnalysedSignal)::SignalPersistenceCacheKey =
    signal_persistence_cache_key(signal, SignalPersistenceSettings())

function signal_persistence_query(
    signal::AnalysedSignal,
    settings::SignalPersistenceSettings,
)::SignalPersistenceQuery
    SignalPersistenceQuery(
        signal.name,
        signal.values,
        signal.sample_rate_hz,
        signal_spectrum_topology(signal),
        SIGNAL_PERSISTENCE_DEFAULT_NUM_POWER_BINS,
        settings.leakage,
    )
end

signal_persistence_query(signal::AnalysedSignal)::SignalPersistenceQuery =
    signal_persistence_query(signal, SignalPersistenceSettings())

function signal_persistence_calculate(
    provider::AbstractSignalPersistenceProvider,
    query::SignalPersistenceQuery,
)::SignalPersistenceData
    throw(MethodError(signal_persistence_calculate, (provider, query)))
end

function signal_persistence_calculate(
    ::EngeeDSPPersistenceProvider,
    query::SignalPersistenceQuery,
)::SignalPersistenceData
    samples = query.topology == ONE_SIDED_SPECTRUM ?
        Float64.(real.(query.values)) : copy(query.values)
    times = collect(0:(length(samples) - 1)) ./ query.sample_rate_hz
    occurrence, frequencies, power_levels = signal_analyser_pspectrum(
        samples,
        times,
        "persistence",
        "Leakage",
        query.leakage,
        "NumPowerBins",
        query.num_power_bins,
        "TwoSided",
        query.topology == CENTERED_TWO_SIDED_SPECTRUM,
    )
    occurrence isa AbstractMatrix || throw(ArgumentError(
        "Persistence provider должен вернуть двумерную матрицу встречаемости",
    ))
    SignalPersistenceData(
        vec(collect(frequencies)),
        vec(collect(power_levels)),
        occurrence,
        query.topology,
    )
end


function signal_persistence_calculate(
    service::SignalPersistenceService,
    query::SignalPersistenceQuery,
)::SignalPersistenceData
    length(query.values) < 2 && return SignalPersistenceData(query.topology)
    data = signal_persistence_calculate(service.provider, query)
    data.topology == query.topology || throw(ArgumentError(
        "Persistence provider вернул topology, не совпадающую с query",
    ))
    isempty(data.frequencies_hz) && throw(ArgumentError(
        "Persistence provider вернул пустую частотную ось для двух или более отсчётов",
    ))
    length(data.power_levels) == query.num_power_bins || throw(DimensionMismatch(
        "Persistence provider вернул $(length(data.power_levels)) power bins, " *
        "ожидалось $(query.num_power_bins)",
    ))

    domain = signal_spectrum_topology_limits(query.sample_rate_hz, query.topology)
    tolerance_hz = sqrt(eps(Float64)) * max(query.sample_rate_hz, 1.0)
    frequencies = data.frequencies_hz
    all(
        frequency -> domain.min_hz - tolerance_hz <= frequency <= domain.max_hz + tolerance_hz,
        frequencies,
    ) || throw(ArgumentError(
        "Persistence provider вернул частоты вне topology query",
    ))
    abs(first(frequencies) - domain.min_hz) <= tolerance_hz &&
        abs(last(frequencies) - domain.max_hz) <= tolerance_hz || throw(ArgumentError(
            "Persistence provider не вернул полный частотный домен topology query",
        ))
    data
end

function signal_persistence_data(
    service::SignalPersistenceService,
    signal::AnalysedSignal,
    settings::SignalPersistenceSettings,
)::SignalPersistenceData
    signal_persistence_calculate(service, signal_persistence_query(signal, settings))
end

signal_persistence_data(
    service::SignalPersistenceService,
    signal::AnalysedSignal,
)::SignalPersistenceData = signal_persistence_data(
    service,
    signal,
    SignalPersistenceSettings(),
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
            "Расчёт экстремумов недоступен: в runtime отсутствует пакет EngeeDSP",
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
            "Расчёт экстремумов недоступен: EngeeDSP.Functions не найден",
        ))
    end
    findpeaks = try
        getproperty(functions_module, :findpeaks)
    catch
        throw(SignalPeaksCapabilityError(
            "Расчёт экстремумов недоступен: EngeeDSP.Functions.findpeaks не найден",
        ))
    end
    findpeaks isa Function || throw(SignalPeaksCapabilityError(
        "Расчёт экстремумов недоступен: EngeeDSP.Functions.findpeaks не является функцией",
    ))
    mode = query.settings.mode
    if mode == MAXIMA_EXTREMA_MODE
        return signal_peaks_detect_direction(findpeaks, query, MAXIMUM_PEAK)
    elseif mode == MINIMA_EXTREMA_MODE
        return signal_peaks_detect_direction(findpeaks, query, MINIMUM_PEAK)
    end

    maxima = signal_peaks_detect_direction(findpeaks, query, MAXIMUM_PEAK)
    minima = signal_peaks_detect_direction(findpeaks, query, MINIMUM_PEAK)
    signal_peaks_merge_directions(maxima, minima, query.settings.number_of_peaks, length(query.values))
end

function signal_peaks_detect_direction(
    findpeaks::Function,
    query::SignalPeaksQuery,
    kind::SignalPeakKind,
)::SignalPeaksProviderResult
    settings = query.settings
    direction_values = kind == MAXIMUM_PEAK ? collect(query.values) : -collect(query.values)
    direction_cutoff = kind == MAXIMUM_PEAK ?
        settings.maximum_cutoff : settings.minimum_cutoff
    raw_result = Base.invokelatest(
        findpeaks,
        direction_values;
        NPeaks = settings.number_of_peaks,
        MinPeakHeight = direction_cutoff === nothing ? -Inf :
            (kind == MAXIMUM_PEAK ? direction_cutoff : -direction_cutoff),
        MinPeakDistance = settings.minimum_distance_samples,
        Threshold = settings.threshold,
        out = :data,
    )
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
    typed_locations = Int.(locations)
    raw_values = vec(collect(raw_result.Ypk))
    widths = vec(collect(raw_result.Wpk))
    prominences = vec(collect(raw_result.Ppk))
    directional = SignalPeaksProviderResult(
        raw_values,
        typed_locations,
        widths,
        prominences,
        fill(kind, length(typed_locations)),
        length(query.values),
    )
    SignalPeaksProviderResult(
        Float64[query.values[location] for location in directional.locations_1based],
        Int[directional.locations_1based...],
        Float64[directional.widths_samples...],
        Float64[directional.prominences...],
        SignalPeakKind[directional.kinds...],
        length(query.values),
    )
end

function signal_peaks_provider_candidates(
    result::SignalPeaksProviderResult,
)::Vector{SignalPeakProviderCandidate}
    SignalPeakProviderCandidate[
        SignalPeakProviderCandidate(
            result.kinds[index],
            result.peak_values[index],
            result.locations_1based[index],
            result.widths_samples[index],
            result.prominences[index],
        )
        for index in eachindex(result.peak_values)
    ]
end

function signal_peaks_merge_directions(
    maxima::SignalPeaksProviderResult,
    minima::SignalPeaksProviderResult,
    total_limit::Int,
    sample_count::Int,
)::SignalPeaksProviderResult
    all(kind -> kind == MAXIMUM_PEAK, maxima.kinds) || throw(ArgumentError(
        "Maxima provider result содержит неверный extrema kind",
    ))
    all(kind -> kind == MINIMUM_PEAK, minima.kinds) || throw(ArgumentError(
        "Minima provider result содержит неверный extrema kind",
    ))
    candidates = vcat(
        signal_peaks_provider_candidates(maxima),
        signal_peaks_provider_candidates(minima),
    )
    sort!(candidates; by = candidate -> (
        -candidate.prominence,
        candidate.location_1based,
        signal_peak_kind_order(candidate.kind),
    ))
    length(candidates) > total_limit && resize!(candidates, total_limit)
    sort!(candidates; by = candidate -> (
        candidate.location_1based,
        signal_peak_kind_order(candidate.kind),
    ))
    SignalPeaksProviderResult(
        Float64[candidate.value for candidate in candidates],
        Int[candidate.location_1based for candidate in candidates],
        Float64[candidate.width_samples for candidate in candidates],
        Float64[candidate.prominence for candidate in candidates],
        SignalPeakKind[candidate.kind for candidate in candidates],
        sample_count,
    )
end

function signal_peaks_snapshot(
    service::SignalPeaksService,
    state_revision::Int,
    display::SignalAnalyserDisplayState,
    signal::Union{Nothing,AnalysedSignal},
    ;
    materialize::Bool = false,
    settings::SignalPeaksSettings = SignalPeaksSettings(),
    visible_range::Union{Nothing,SignalTimePeaksVisibleRange} = nothing,
)::SignalPeaksSnapshot
    if signal === nothing
        display.peaks_enabled && throw(ArgumentError("Пустой Display не может иметь enabled Peaks"))
        return SignalPeaksSnapshot(
            false,
            settings.mode,
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
            settings.mode,
            state_revision,
            display.id,
            signal.name,
            ordinate_kind,
            units,
            SignalPeakItem[],
        )
    end
    display.active_plot == TIME_PLOT || throw(ArgumentError(
        "Для временного расчёта экстремумов требуется Time plot",
    ))
    limits = display.time_limits
    limits === nothing && throw(ArgumentError("Непустой Display должен иметь Time Limits"))
    if !materialize
        return SignalPeaksSnapshot(
            true,
            settings.mode,
            state_revision,
            display.id,
            signal.name,
            ordinate_kind,
            units,
            SignalPeakItem[],
        )
    end
    effective_limits = if visible_range === nothing
        limits
    else
        visible = visible_range::SignalTimePeaksVisibleRange
        minimum_value = max(limits.min_s, visible.min_s)
        maximum_value = min(limits.max_s, visible.max_s)
        if minimum_value >= maximum_value
            return SignalPeaksSnapshot(
                true,
                settings.mode,
                state_revision,
                display.id,
                signal.name,
                ordinate_kind,
                units,
                SignalPeakItem[],
            )
        end
        SignalTimeLimits(minimum_value, maximum_value)
    end
    roi = signal_ordinate_roi(service.ordinate_service, signal, effective_limits)
    if length(roi.values) < 3
        return SignalPeaksSnapshot(
            true,
            settings.mode,
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
        settings,
    )
    result = signal_peaks_detect(service.provider, query)
    length(result.peak_values) <= settings.number_of_peaks || throw(SignalPeaksCapabilityError(
        "Провайдер extrema превысил общий лимит number_of_peaks",
    ))
    items = SignalPeakItem[
        SignalPeakItem(
            result.kinds[index],
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
        settings.mode,
        state_revision,
        display.id,
        signal.name,
        ordinate_kind,
        units,
        items,
    )
end

function signal_spectrum_extrema_ordinate(
    data::SignalSpectrumData,
    scale::SignalSpectrumScale,
)::Vector{Float64}
    power = Float64[data.power...]
    scale == LINEAR_SPECTRUM_SCALE && return power
    values = Float64.(10 .* log10.(power))
    finite_values = filter(isfinite, values)
    isempty(finite_values) && return zeros(Float64, length(values))
    minimum_value, maximum_value = extrema(finite_values)
    floor_value = minimum_value - max(maximum_value - minimum_value, 1.0)
    Float64[isfinite(value) ? value : floor_value for value in values]
end

"""Calculate extrema over the exact raw Spectrum ordinate before renderer downsampling."""
function signal_spectrum_peaks_snapshot(
    state::SignalAnalyserState,
    state_revision::Int,
    display::SignalAnalyserDisplayState,
    signal::Union{Nothing,AnalysedSignal};
    materialize::Bool = false,
    settings::SignalPeaksSettings = SignalPeaksSettings(),
    visible_range::Union{Nothing,SignalSpectrumPeaksVisibleRange} = nothing,
)::SignalPeaksSnapshot
    units = signal_spectrum_peaks_units()
    if signal === nothing
        display.peaks_enabled && throw(ArgumentError("Пустой Spectrum Display не может иметь enabled Extrema"))
        return SignalPeaksSnapshot(
            false, settings.mode, state_revision, display.id, nothing, nothing,
            units, SignalPeakItem[],
        )
    end
    display.active_plot == SPECTRUM_PLOT || throw(ArgumentError(
        "Для спектрального расчёта экстремумов требуется Spectrum plot",
    ))
    if !display.peaks_enabled || !materialize
        return SignalPeaksSnapshot(
            display.peaks_enabled,
            settings.mode,
            state_revision,
            display.id,
            signal.name,
            MAGNITUDE_ORDINATE,
            units,
            SignalPeakItem[],
        )
    end
    data = signal_analyser_cached_spectrum_data!(
        state,
        display,
        signal;
        materialize_missing = true,
    )
    frequencies = Float64[data.frequencies_hz...]
    values = signal_spectrum_extrema_ordinate(data, display.spectrum_settings.scale)
    source_indices = if visible_range === nothing
        collect(eachindex(frequencies))
    else
        visible = visible_range::SignalSpectrumPeaksVisibleRange
        findall(frequency -> visible.min_hz <= frequency <= visible.max_hz, frequencies)
    end
    frequencies_in_range = frequencies[source_indices]
    values_in_range = values[source_indices]
    length(values_in_range) < 3 && return SignalPeaksSnapshot(
        true, settings.mode, state_revision, display.id, signal.name,
        MAGNITUDE_ORDINATE, units, SignalPeakItem[],
    )
    query = SignalPeaksQuery(
        state_revision,
        display.id,
        signal.name,
        MAGNITUDE_ORDINATE,
        values_in_range,
        1.0,
        0,
        settings,
    )
    result = signal_peaks_detect(state.peaks_service.provider, query)
    items = SignalPeakItem[
        SignalPeakItem(
            result.kinds[index],
            result.peak_values[index],
            SignalSpectrumPeakPosition(
                source_indices[result.locations_1based[index]],
                frequencies_in_range[result.locations_1based[index]],
            ),
            result.widths_samples[index],
            result.prominences[index],
        )
        for index in eachindex(result.peak_values)
    ]
    SignalPeaksSnapshot(
        true, settings.mode, state_revision, display.id, signal.name,
        MAGNITUDE_ORDINATE, units, items,
    )
end

"""Last-good Peaks result keyed by the provider-affecting passive state."""
struct SignalPeaksCacheEntry
    display_id::String
    signal_name::String
    time_limits::SignalTimeLimits
    snapshot::SignalPeaksSnapshot
end

function SignalPeaksCacheEntry(
    display::SignalAnalyserDisplayState,
    signal::AnalysedSignal,
    snapshot::SignalPeaksSnapshot,
)
    limits = display.time_limits
    limits === nothing && throw(ArgumentError(
        "Непустой Display Peaks cache должен иметь Time Limits",
    ))
    snapshot.enabled || throw(ArgumentError("Peaks cache принимает только enabled snapshot"))
    snapshot.display_id == display.id || throw(ArgumentError(
        "Display Peaks cache не совпадает с snapshot",
    ))
    snapshot.signal_name == signal.name || throw(ArgumentError(
        "Сигнал Peaks cache не совпадает с snapshot",
    ))
    SignalPeaksCacheEntry(display.id, signal.name, limits, snapshot)
end

signal_peaks_cache_field(display_id::AbstractString)::String =
    "\0signal-analyser-peaks::$(String(display_id))"

function signal_analyser_publish_peaks_cache!(
    prepared_plots::Dict{String,Dict{String,Any}},
    display::SignalAnalyserDisplayState,
    signal::AnalysedSignal,
    snapshot::SignalPeaksSnapshot,
)::Nothing
    plots = get!(prepared_plots, signal.name) do
        signal_analyser_base_plots(signal)
    end
    plots[signal_peaks_cache_field(display.id)] = SignalPeaksCacheEntry(
        display,
        signal,
        snapshot,
    )
    nothing
end

function signal_analyser_cached_peaks_snapshot(
    state::SignalAnalyserState,
    state_revision::Int,
    display::SignalAnalyserDisplayState,
    signal::Union{Nothing,AnalysedSignal},
)::SignalPeaksSnapshot
    layout = get(state.display_layouts, display.id, nothing)
    pane = layout === nothing ? nothing :
        signal_display_active_pane(layout::SignalDisplayLayoutState)
    settings = pane === nothing ? SignalPeaksSettings() :
        (pane::SignalDisplayPaneState).peaks_settings
    passive = display.active_plot == SPECTRUM_PLOT ?
        signal_spectrum_peaks_snapshot(
            state,
            state_revision,
            display,
            signal,
            settings = settings,
        ) :
        signal_peaks_snapshot(
            state.peaks_service,
            state_revision,
            display,
            signal,
            settings = settings,
        )
    (!display.peaks_enabled || signal === nothing) && return passive
    if layout !== nothing
        typed_pane = pane::SignalDisplayPaneState
        page_id = signal_analyser_output_page_id(display.id, typed_pane.id)
        revision = get(
            state.output_manager.peaks_page_calculation_revisions,
            page_id,
            -1,
        )
        if revision >= 0
            context = SignalAnalyserPeaksContextKey(
                display.id,
                typed_pane.id,
                typed_pane.plot_type,
                signal_display_pane_members(typed_pane),
                typed_pane.time_limits,
                typed_pane.plot_type == SPECTRUM_PLOT ? typed_pane.spectrum_settings : nothing,
                nothing,
                typed_pane.peaks_settings,
                revision,
            )
            if signal.name in context.signal_names
                cache_key = signal_analyser_peaks_cache_key(
                    display.id,
                    typed_pane.id,
                    signal.name,
                )
                cached_entry = get(state.output_manager.peaks_cache, cache_key, nothing)
                signal_context = SignalAnalyserPeaksSignalContextKey(context, signal.name)
                if cached_entry !== nothing &&
                    (cached_entry::SignalAnalyserPeaksCacheEntry).context == signal_context
                    snapshot = cached_entry.peaks
                    return SignalPeaksSnapshot(
                        true,
                        snapshot.mode,
                        state_revision,
                        display.id,
                        signal.name,
                        snapshot.ordinate,
                        snapshot.units,
                        SignalPeakItem[snapshot.items...],
                    )
                end
            end
        end
    end
    # The legacy per-signal cache predates typed Spectrum positions and is
    # keyed only by Time Limits.  It is therefore valid only for TIME; Spectrum
    # results are read exclusively from the pane/revision-aware cache above.
    display.active_plot == TIME_PLOT || return passive
    plots = get(state.plot_cache, signal.name, nothing)
    plots === nothing && return passive
    cached = get(plots, signal_peaks_cache_field(display.id), nothing)
    cached isa SignalPeaksCacheEntry || return passive
    entry = cached::SignalPeaksCacheEntry
    entry.display_id == display.id || return passive
    entry.signal_name == signal.name || return passive
    entry.time_limits == display.time_limits || return passive
    entry.snapshot.mode == passive.mode || return passive
    SignalPeaksSnapshot(
        true,
        entry.snapshot.mode,
        state_revision,
        display.id,
        signal.name,
        entry.snapshot.ordinate,
        entry.snapshot.units,
        SignalPeakItem[entry.snapshot.items...],
    )
end

function signal_peaks_table_snapshot(
    state_revision::Int,
    display::SignalAnalyserDisplayState,
    pane::SignalDisplayPaneState,
    signals::AbstractVector{SignalPeaksSnapshot},
    signal_colors::AbstractVector{<:AbstractString},
)::SignalPeaksTableSnapshot
    pane_display = signal_analyser_display_for_pane(display, pane)
    if !pane_display.peaks_enabled
        return SignalPeaksTableSnapshot(
            false,
            state_revision,
            display.id,
            pane.id,
            pane.peaks_settings,
            String[],
            SignalPeaksSnapshot[],
            SignalPeaksTableRow[],
        )
    end
    pane.plot_type in (TIME_PLOT, SPECTRUM_PLOT) || throw(ArgumentError(
        "Таблица экстремумов доступна только для TIME или SPECTRUM pane",
    ))
    snapshots = collect(signals)
    signal_names = String[snapshot.signal_name::String for snapshot in snapshots]
    signal_names == signal_display_pane_members(pane) || throw(ArgumentError(
        "Порядок сигналов Peaks table не совпадает с bindings pane",
    ))
    colors = String.(signal_colors)
    length(colors) == length(snapshots) || throw(DimensionMismatch(
        "Число цветов Peaks table должно совпадать с bindings pane",
    ))
    raw_rows = [
        (
            position_order = signal_peak_position_order(item.position),
            binding_index = binding_index,
            signal_name = signal_names[binding_index],
            signal_color = colors[binding_index],
            graph_number = graph_number,
            kind_order = signal_peak_kind_order(item.kind),
            peak = item,
        )
        for (binding_index, snapshot) in enumerate(snapshots)
        for (graph_number, item) in enumerate(snapshot.items)
    ]
    sort!(raw_rows; by = row -> (
        row.position_order...,
        row.binding_index,
        row.kind_order,
    ))
    rows = SignalPeaksTableRow[
        SignalPeaksTableRow(
            row_number,
            row.signal_name,
            row.signal_color,
            row.graph_number,
            row.peak,
        )
        for (row_number, row) in enumerate(raw_rows)
    ]
    SignalPeaksTableSnapshot(
        true,
        state_revision,
        display.id,
        pane.id,
        pane.peaks_settings,
        colors,
        snapshots,
        rows,
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

function signal_measurement_row_error_payload(
    state_revision::Int,
    signal::AnalysedSignal,
    limits::SignalTimeLimits,
    message::AbstractString,
)::Dict{String,Any}
    Dict{String,Any}(
        "state_revision" => state_revision,
        "signal_name" => signal.name,
        "ordinate" => signal_measurement_ordinate_name(signal_measurement_ordinate(signal)),
        "units" => Dict{String,Any}("value" => "1", "time" => "s"),
        "items" => Dict{String,Any}[],
        "time_limits" => signal_time_limits_payload(limits),
        "error" => String(message),
    )
end

function signal_analyser_measurement_rows_payload(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
)::Vector{Dict{String,Any}}
    layout = signal_analyser_layout_by_display_id(state, display.id)
    pane = signal_display_active_pane(layout)
    names = signal_analyser_inventory_ordered_names(state, signal_display_pane_members(pane))
    isempty(names) && return Dict{String,Any}[]
    requested_limits = pane.time_limits::SignalTimeLimits
    rows = Dict{String,Any}[]
    for name in names
        signal = signal_by_name(state, name)
        duration_s = signal_duration_s(signal)
        effective_min = max(0.0, requested_limits.min_s)
        effective_max = min(duration_s, requested_limits.max_s)
        if effective_min >= effective_max
            push!(rows, signal_measurement_row_error_payload(
                state.view.state_revision,
                signal,
                requested_limits,
                "В выбранной области нет отсчётов сигнала",
            ))
            continue
        end
        effective_limits = SignalTimeLimits(effective_min, effective_max)
        row = try
            signal_measurements_payload(signal_measurements_snapshot(
                state.measurements_service,
                state.view.state_revision,
                signal,
                effective_limits,
                pane.measurement_selection,
            ))
        catch err
            err isa ArgumentError || rethrow()
            signal_measurement_row_error_payload(
                state.view.state_revision,
                signal,
                effective_limits,
                sprint(showerror, err),
            )
        end
        row["time_limits"] = signal_time_limits_payload(effective_limits)
        haskey(row, "error") || (row["error"] = nothing)
        push!(rows, row)
    end
    rows
end

function signal_peak_item_payload(item::SignalPeakItem)::Dict{String,Any}
    time_position = item.position isa SignalTimePeakPosition ?
        item.position::SignalTimePeakPosition : nothing
    spectrum_position = item.position isa SignalSpectrumPeakPosition ?
        item.position::SignalSpectrumPeakPosition : nothing
    Dict{String,Any}(
        "id" => item.id,
        "type" => signal_peak_kind_name(item.kind),
        "value" => item.value,
        "position_kind" => time_position === nothing ? "frequency" : "time",
        "sample_index" => time_position === nothing ? nothing : time_position.sample_index,
        "time_s" => time_position === nothing ? nothing : time_position.time_s,
        "bin_index" => spectrum_position === nothing ? nothing : spectrum_position.bin_index,
        "frequency_hz" => spectrum_position === nothing ? nothing : spectrum_position.frequency_hz,
        "width_samples" => item.width_samples,
        "prominence" => item.prominence,
    )
end

function signal_peaks_payload(peaks::SignalPeaksSnapshot)::Dict{String,Any}
    Dict{String,Any}(
        "enabled" => peaks.enabled,
        "mode" => signal_extrema_mode_name(peaks.mode),
        "state_revision" => peaks.state_revision,
        "display_id" => peaks.display_id,
        "signal_name" => peaks.signal_name,
        "ordinate" => signal_measurement_ordinate_name(peaks.ordinate),
        "units" => Dict{String,Any}(
            "value" => peaks.units.value,
            "time" => peaks.units.time,
            "position" => peaks.units.time,
            "width" => peaks.units.width,
            "prominence" => peaks.units.prominence,
        ),
        "items" => Dict{String,Any}[signal_peak_item_payload(item) for item in peaks.items],
    )
end

function signal_peaks_settings_payload(
    settings::SignalPeaksSettings,
)::Dict{String,Any}
    Dict{String,Any}(
        "mode" => signal_extrema_mode_name(settings.mode),
        "number_of_peaks" => settings.number_of_peaks,
        "maximum_cutoff" => settings.maximum_cutoff,
        "minimum_cutoff" => settings.minimum_cutoff,
        "minimum_distance_samples" => settings.minimum_distance_samples,
        "threshold" => settings.threshold,
    )
end

function signal_peaks_settings_fields_payload(
    settings::SignalPeaksSettings,
)::Vector{Dict{String,Any}}
    count_label = if settings.mode == MAXIMA_EXTREMA_MODE
        "Количество максимумов"
    elseif settings.mode == MINIMA_EXTREMA_MODE
        "Количество минимумов"
    else
        "Количество экстремумов"
    end
    Dict{String,Any}[
        Dict{String,Any}(
            "id" => "mode",
            "label" => "Режим расчёта",
            "type" => "enum",
            "value" => signal_extrema_mode_name(settings.mode),
            "default_value" => "maxima",
            "required" => true,
            "nullable" => false,
            "minimum" => nothing,
            "maximum" => nothing,
            "step" => nothing,
            "units" => nothing,
            "options" => Dict{String,Any}[
                Dict{String,Any}("value" => "maxima", "label" => "Максимумы"),
                Dict{String,Any}("value" => "minima", "label" => "Минимумы"),
                Dict{String,Any}("value" => "all", "label" => "Все экстремумы"),
            ],
        ),
        Dict{String,Any}(
            "id" => "number_of_peaks",
            "label" => count_label,
            "type" => "integer",
            "value" => settings.number_of_peaks,
            "default_value" => 5,
            "required" => true,
            "nullable" => false,
            "minimum" => 1,
            "maximum" => SIGNAL_PEAKS_MAX_NUMBER_OF_PEAKS,
            "step" => 1,
            "units" => nothing,
        ),
        Dict{String,Any}(
            "id" => "maximum_cutoff",
            "label" => "Отсечка максимума",
            "type" => "number",
            "value" => settings.maximum_cutoff,
            "default_value" => nothing,
            "required" => true,
            "nullable" => true,
            "minimum" => nothing,
            "maximum" => nothing,
            "step" => nothing,
            "units" => nothing,
        ),
        Dict{String,Any}(
            "id" => "minimum_cutoff",
            "label" => "Отсечка минимума",
            "type" => "number",
            "value" => settings.minimum_cutoff,
            "default_value" => nothing,
            "required" => true,
            "nullable" => true,
            "minimum" => nothing,
            "maximum" => nothing,
            "step" => nothing,
            "units" => nothing,
        ),
        Dict{String,Any}(
            "id" => "minimum_distance_samples",
            "label" => "Минимальное расстояние, отсчёты",
            "type" => "integer",
            "value" => settings.minimum_distance_samples,
            "default_value" => 1,
            "required" => true,
            "nullable" => false,
            "minimum" => 1,
            "maximum" => nothing,
            "step" => 1,
            "units" => "samples",
        ),
        Dict{String,Any}(
            "id" => "threshold",
            "label" => "Порог",
            "type" => "number",
            "value" => settings.threshold,
            "default_value" => 0.0,
            "required" => true,
            "nullable" => false,
            "minimum" => 0.0,
            "maximum" => nothing,
            "step" => nothing,
            "units" => nothing,
        ),
    ]
end

struct SignalPeaksSettingsRequest
    state_revision::Int
    display_id::String
    pane_id::String
    settings::SignalPeaksSettings
end

"""Explicit user intent to schedule extrema calculation for the active pane."""
struct SignalPeaksCalculationRequest
    state_revision::Int
    display_id::String
    pane_id::String
    visible_range::Union{Nothing,SignalPeaksVisibleRange}
end

const SIGNAL_PEAKS_SETTINGS_REQUEST_FIELDS = Set([
    "state_revision",
    "display_id",
    "pane_id",
    "settings",
])
const SIGNAL_PEAKS_CALCULATION_REQUEST_FIELDS = Set([
    "state_revision",
    "display_id",
    "pane_id",
])
const SIGNAL_PEAKS_CALCULATION_REQUEST_OPTIONAL_FIELDS = Set(["visible_range"])
const SIGNAL_TIME_PEAKS_VISIBLE_RANGE_FIELDS = Set(["min_s", "max_s"])
const SIGNAL_SPECTRUM_PEAKS_VISIBLE_RANGE_FIELDS = Set(["min_hz", "max_hz"])
const SIGNAL_PEAKS_SETTINGS_VALUE_FIELDS = Set([
    "mode",
    "number_of_peaks",
    "maximum_cutoff",
    "minimum_cutoff",
    "minimum_distance_samples",
    "threshold",
])
const SIGNAL_PEAKS_SETTINGS_LEGACY_MODE_VALUE_FIELDS = Set([
    "mode",
    "number_of_peaks",
    "minimum_height",
    "minimum_distance_samples",
    "threshold",
])
const SIGNAL_PEAKS_SETTINGS_LEGACY_VALUE_FIELDS = Set([
    "number_of_peaks",
    "minimum_height",
    "minimum_distance_samples",
    "threshold",
])

function validate_signal_peaks_calculation_request(data)::SignalPeaksCalculationRequest
    data isa AbstractDict || throw(SignalAnalyserValidationError(
        "Некорректный запрос расчёта экстремумов",
        Dict("request" => "Требуется JSON-объект"),
    ))
    field_errors = Dict{String,String}()
    request_keys = signal_analyser_payload_keys(data)
    allowed_keys = union(
        SIGNAL_PEAKS_CALCULATION_REQUEST_FIELDS,
        SIGNAL_PEAKS_CALCULATION_REQUEST_OPTIONAL_FIELDS,
    )
    (issubset(SIGNAL_PEAKS_CALCULATION_REQUEST_FIELDS, request_keys) &&
        issubset(request_keys, allowed_keys)) || begin
        missing = sort!(collect(setdiff(SIGNAL_PEAKS_CALCULATION_REQUEST_FIELDS, request_keys)))
        unknown = sort!(collect(setdiff(request_keys, allowed_keys)))
        isempty(missing) || (field_errors["request"] = "Отсутствуют поля: $(join(missing, ", "))")
        isempty(unknown) || (field_errors["request"] = get(field_errors, "request", "") *
            (haskey(field_errors, "request") ? "; " : "") * "Неизвестные поля: $(join(unknown, ", "))")
    end
    revision_value = signal_analyser_payload_value(data, "state_revision")
    revision = if revision_value isa Integer && !(revision_value isa Bool)
        try
            Int(revision_value)
        catch err
            (err isa InexactError || err isa OverflowError) || rethrow()
            field_errors["state_revision"] = "Целое число вне диапазона Int"
            -1
        end
    else
        field_errors["state_revision"] = "Требуется неотрицательное целое число"
        -1
    end
    revision >= 0 || haskey(field_errors, "state_revision") ||
        (field_errors["state_revision"] = "Требуется неотрицательное целое число")
    display_value = signal_analyser_payload_value(data, "display_id")
    display_id = display_value isa AbstractString && !isempty(String(display_value)) ?
        String(display_value) : ""
    isempty(display_id) && (field_errors["display_id"] = "Требуется непустой идентификатор Display")
    pane_value = signal_analyser_payload_value(data, "pane_id")
    pane_id = pane_value isa AbstractString && !isempty(String(pane_value)) ? String(pane_value) : ""
    isempty(pane_id) && (field_errors["pane_id"] = "Требуется непустой идентификатор pane")

    visible_range = nothing
    if signal_analyser_payload_contains(data, "visible_range")
        range_value = signal_analyser_payload_value(data, "visible_range")
        if !(range_value isa AbstractDict)
            field_errors["visible_range"] = "Требуется JSON-объект canonical visible range"
        else
            range_keys = signal_analyser_payload_keys(range_value)
            range_kind = if range_keys == SIGNAL_TIME_PEAKS_VISIBLE_RANGE_FIELDS
                :time
            elseif range_keys == SIGNAL_SPECTRUM_PEAKS_VISIBLE_RANGE_FIELDS
                :spectrum
            else
                field_errors["visible_range"] =
                    "Допустимы ровно {min_s,max_s} или {min_hz,max_hz}"
                nothing
            end
            if range_kind !== nothing
                minimum_key, maximum_key = range_kind == :time ?
                    ("min_s", "max_s") : ("min_hz", "max_hz")
                minimum_raw = signal_analyser_payload_value(range_value, minimum_key)
                maximum_raw = signal_analyser_payload_value(range_value, maximum_key)
                if !(minimum_raw isa Real) || minimum_raw isa Bool ||
                    !(maximum_raw isa Real) || maximum_raw isa Bool
                    field_errors["visible_range"] =
                        "Границы canonical visible range должны быть числами"
                else
                    try
                        visible_range = range_kind == :time ?
                            SignalTimePeaksVisibleRange(minimum_raw, maximum_raw) :
                            SignalSpectrumPeaksVisibleRange(minimum_raw, maximum_raw)
                    catch err
                        err isa ArgumentError || rethrow()
                        field_errors["visible_range"] = sprint(showerror, err)
                    end
                end
            end
        end
    end
    isempty(field_errors) || throw(SignalAnalyserValidationError(
        "Некорректный запрос расчёта экстремумов",
        field_errors,
    ))
    SignalPeaksCalculationRequest(revision, display_id, pane_id, visible_range)
end

function validate_signal_peaks_settings_request(data)::SignalPeaksSettingsRequest
    field_errors = Dict{String,String}()
    if !(data isa AbstractDict)
        throw(SignalAnalyserValidationError(
            "Некорректные настройки экстремумов",
            Dict("request" => "Требуется JSON-объект"),
        ))
    end
    request_keys = signal_analyser_payload_keys(data)
    request_keys == SIGNAL_PEAKS_SETTINGS_REQUEST_FIELDS || begin
        missing = sort!(collect(setdiff(SIGNAL_PEAKS_SETTINGS_REQUEST_FIELDS, request_keys)))
        unknown = sort!(collect(setdiff(request_keys, SIGNAL_PEAKS_SETTINGS_REQUEST_FIELDS)))
        isempty(missing) || (field_errors["request"] = "Отсутствуют поля: $(join(missing, ", "))")
        isempty(unknown) || (field_errors["request"] = get(field_errors, "request", "") *
            (haskey(field_errors, "request") ? "; " : "") * "Неизвестные поля: $(join(unknown, ", "))")
    end

    revision_value = signal_analyser_payload_value(data, "state_revision")
    revision = if revision_value isa Integer && !(revision_value isa Bool)
        try
            Int(revision_value)
        catch err
            (err isa InexactError || err isa OverflowError) || rethrow()
            field_errors["state_revision"] = "Целое число вне диапазона Int"
            -1
        end
    else
        field_errors["state_revision"] = "Требуется неотрицательное целое число"
        -1
    end
    revision >= 0 || haskey(field_errors, "state_revision") ||
        (field_errors["state_revision"] = "Требуется неотрицательное целое число")

    display_value = signal_analyser_payload_value(data, "display_id")
    display_id = display_value isa AbstractString && !isempty(String(display_value)) ?
        String(display_value) : ""
    isempty(display_id) && (field_errors["display_id"] = "Требуется непустой идентификатор Display")
    pane_value = signal_analyser_payload_value(data, "pane_id")
    pane_id = pane_value isa AbstractString && !isempty(String(pane_value)) ? String(pane_value) : ""
    isempty(pane_id) && (field_errors["pane_id"] = "Требуется непустой идентификатор pane")

    settings_value = signal_analyser_payload_value(data, "settings")
    settings = SignalPeaksSettings()
    if !(settings_value isa AbstractDict)
        field_errors["settings"] = "Требуется JSON-объект"
    else
        settings_keys = signal_analyser_payload_keys(settings_value)
        is_current_settings = settings_keys == SIGNAL_PEAKS_SETTINGS_VALUE_FIELDS
        is_legacy_mode_settings = settings_keys == SIGNAL_PEAKS_SETTINGS_LEGACY_MODE_VALUE_FIELDS
        is_legacy_settings = settings_keys == SIGNAL_PEAKS_SETTINGS_LEGACY_VALUE_FIELDS
        if !is_current_settings && !is_legacy_mode_settings && !is_legacy_settings
            missing = sort!(collect(setdiff(SIGNAL_PEAKS_SETTINGS_VALUE_FIELDS, settings_keys)))
            unknown = sort!(collect(setdiff(settings_keys, SIGNAL_PEAKS_SETTINGS_VALUE_FIELDS)))
            isempty(missing) || (field_errors["settings"] = "Отсутствуют поля: $(join(missing, ", "))")
            isempty(unknown) || (field_errors["settings"] = get(field_errors, "settings", "") *
                (haskey(field_errors, "settings") ? "; " : "") * "Неизвестные поля: $(join(unknown, ", "))")
        end

        mode_value = signal_analyser_payload_contains(settings_value, "mode") ?
            signal_analyser_payload_value(settings_value, "mode") : "maxima"
        mode = if mode_value isa AbstractString &&
            haskey(SIGNAL_EXTREMA_MODES_BY_NAME, String(mode_value))
            SIGNAL_EXTREMA_MODES_BY_NAME[String(mode_value)]
        else
            field_errors["settings.mode"] = "Допустимо: maxima, minima, all"
            MAXIMA_EXTREMA_MODE
        end

        number_value = signal_analyser_payload_value(settings_value, "number_of_peaks")
        number_of_peaks = if number_value isa Integer && !(number_value isa Bool)
            try
                Int(number_value)
            catch err
                (err isa InexactError || err isa OverflowError) || rethrow()
                0
            end
        else
            0
        end
        1 <= number_of_peaks <= SIGNAL_PEAKS_MAX_NUMBER_OF_PEAKS ||
            (field_errors["settings.number_of_peaks"] =
                "Требуется целое число от 1 до $(SIGNAL_PEAKS_MAX_NUMBER_OF_PEAKS)")

        parse_cutoff = function (field_id::String)
            value = signal_analyser_payload_value(settings_value, field_id)
            cutoff = if value === nothing
                nothing
            elseif value isa Real && !(value isa Bool)
                try
                    Float64(value)
                catch err
                    (err isa InexactError || err isa OverflowError) || rethrow()
                    NaN
                end
            else
                NaN
            end
            (cutoff === nothing || isfinite(cutoff)) ||
                (field_errors["settings.$field_id"] = "Требуется конечное число или null")
            cutoff
        end
        maximum_cutoff, minimum_cutoff = if is_current_settings
            parse_cutoff("maximum_cutoff"), parse_cutoff("minimum_cutoff")
        else
            legacy_height = parse_cutoff("minimum_height")
            legacy_mode = mode == MINIMA_EXTREMA_MODE ?
                (nothing, legacy_height === nothing ? nothing : -legacy_height) :
                mode == ALL_EXTREMA_MODE ?
                    (legacy_height, legacy_height === nothing ? nothing : -legacy_height) :
                    (legacy_height, nothing)
            legacy_mode
        end

        distance_value = signal_analyser_payload_value(settings_value, "minimum_distance_samples")
        minimum_distance_samples = if distance_value isa Integer && !(distance_value isa Bool)
            try
                Int(distance_value)
            catch err
                (err isa InexactError || err isa OverflowError) || rethrow()
                0
            end
        else
            0
        end
        minimum_distance_samples >= 1 ||
            (field_errors["settings.minimum_distance_samples"] =
                "Требуется положительное целое число отсчётов")

        threshold_value = signal_analyser_payload_value(settings_value, "threshold")
        threshold = if threshold_value isa Real && !(threshold_value isa Bool)
            try
                Float64(threshold_value)
            catch err
                (err isa InexactError || err isa OverflowError) || rethrow()
                NaN
            end
        else
            NaN
        end
        isfinite(threshold) && threshold >= 0 ||
            (field_errors["settings.threshold"] = "Требуется неотрицательное конечное число")

        if !any(key -> startswith(key, "settings."), keys(field_errors)) &&
            !haskey(field_errors, "settings")
            settings = SignalPeaksSettings(
                mode,
                number_of_peaks,
                maximum_cutoff,
                minimum_cutoff,
                minimum_distance_samples,
                threshold,
            )
        end
    end

    isempty(field_errors) || throw(SignalAnalyserValidationError(
        "Некорректные настройки экстремумов",
        field_errors,
    ))
    SignalPeaksSettingsRequest(revision, display_id, pane_id, settings)
end

function apply_signal_peaks_settings!(
    state::SignalAnalyserState,
    data,
)::Dict{String,Any}
    lock(state.lock) do
        requested = validate_signal_peaks_settings_request(data)
        requested.state_revision == state.view.state_revision || throw(
            SignalAnalyserStaleStateError(requested.state_revision, state.view.state_revision),
        )
        signal_analyser_peaks_context_unlocked(state, requested.display_id, requested.pane_id)
        current_layout = signal_analyser_layout_by_display_id(state, requested.display_id)
        current_pane = signal_display_active_pane(current_layout)
        prospective_pane = signal_display_pane_with_peaks_settings(
            current_pane,
            requested.settings,
        )
        prospective_layout = signal_display_layout_replace_active_pane(
            current_layout,
            prospective_pane,
        )
        candidate = signal_analyser_clone_state_for_layout(state)
        candidate.display_layouts[requested.display_id] = prospective_layout
        candidate.view.state_revision += 1
        signal_analyser_publish_layout_candidate!(state, candidate; preserve_output_runtime = true)
        page_id = signal_analyser_output_page_id(requested.display_id, requested.pane_id)
        signal_analyser_invalidate_peaks_pages_unlocked!(state, String[page_id])
        settings_payload = signal_peaks_settings_payload(requested.settings)
        Dict{String,Any}(
            "ok" => true,
            "state_revision" => state.view.state_revision,
            "display_id" => requested.display_id,
            "pane_id" => requested.pane_id,
            "settings" => settings_payload,
            "settings_fields" => signal_peaks_settings_fields_payload(requested.settings),
            "state" => signal_analyser_state_lite_unlocked(state),
        )
    end
end

"""Validate explicit user intent, then schedule only the current active pane extrema."""
function calculate_signal_analyser_active_peaks!(
    state::SignalAnalyserState,
    data,
)::Dict{String,Any}
    requested = validate_signal_peaks_calculation_request(data)
    signal_analyser_calculate_active_peaks!(
        state,
        requested.display_id,
        requested.pane_id;
        expected_state_revision = requested.state_revision,
        visible_range = requested.visible_range,
    )
end

function signal_peaks_table_payload(
    table::SignalPeaksTableSnapshot,
)::Dict{String,Any}
    Dict{String,Any}(
        "enabled" => table.enabled,
        "state_revision" => table.state_revision,
        "display_id" => table.display_id,
        "pane_id" => table.pane_id,
        "mode" => signal_extrema_mode_name(table.settings.mode),
        "settings" => signal_peaks_settings_payload(table.settings),
        "settings_fields" => signal_peaks_settings_fields_payload(table.settings),
        "signals" => Dict{String,Any}[
            Dict{String,Any}(
                "signal_name" => snapshot.signal_name,
                "signal_color" => table.signal_colors[index],
                "mode" => signal_extrema_mode_name(snapshot.mode),
                "peak_count" => length(snapshot.items),
                "ordinate" => signal_measurement_ordinate_name(snapshot.ordinate),
                "units" => Dict{String,Any}(
                    "value" => snapshot.units.value,
                    "time" => snapshot.units.time,
                    "width" => snapshot.units.width,
                    "prominence" => snapshot.units.prominence,
                ),
            )
            for (index, snapshot) in enumerate(table.signals)
        ],
        "rows" => Dict{String,Any}[
            merge(
                signal_peak_item_payload(row.peak),
                Dict{String,Any}(
                    "row_number" => row.row_number,
                    "signal_name" => row.signal_name,
                    "signal_color" => row.signal_color,
                    "graph_number" => row.graph_number,
                ),
            )
            for row in table.rows
        ],
    )
end

function signal_analyser_snapshot_from_prepared_unlocked(
    state::SignalAnalyserState,
    measurements::SignalMeasurementsSnapshot,
    peaks::SignalPeaksSnapshot,
    prepared_display_plots::SignalAnalyserPreparedDisplayPlots,
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
    visible_names = signal_analyser_visible_signal_names(state)
    plots = prepared_display_plots.plots
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
        "persistence_settings" => signal_persistence_settings_payload(active_display.persistence_settings),
        "signals" => [signal_analyser_signal_payload(item) for item in state.signals],
        "plots" => plots,
        "plot_payload" => prepared_display_plots.plot_payload,
        "measurements" => signal_measurements_payload(measurements),
        "measurement_rows" => signal_analyser_measurement_rows_payload(state, active_display),
        "peaks" => signal_peaks_payload(peaks),
        "panel" => signal === nothing ?
            signal_analyser_empty_panel_payload(state.view.active_plot) :
            signal_analyser_panel_payload(state.view.active_plot, signal, plots),
    )
end

function signal_analyser_snapshot_unlocked(
    state::SignalAnalyserState,
    measurements::SignalMeasurementsSnapshot,
    peaks::SignalPeaksSnapshot,
    ;
    materialize_missing_spectra::Bool = false,
    materialize_missing_spectrogram::Bool = false,
    materialize_missing_persistence::Bool = false,
)::Dict{String,Any}
    active_display = signal_analyser_active_display(state)
    analysis_name = signal_analyser_display_analysis_name(active_display)
    signal = analysis_name === nothing ? nothing : signal_by_name(state, analysis_name)
    visible_names = signal_analyser_visible_signal_names(state)
    render_signal = isempty(visible_names) ? nothing :
        signal_by_name(state, first(visible_names))
    prepared_display_plots = signal_analyser_prepare_display_plots(
        state,
        active_display,
        render_signal,
        visible_names,
        materialize_missing_spectra = materialize_missing_spectra,
        materialize_missing_spectrogram = materialize_missing_spectrogram,
        materialize_missing_persistence = materialize_missing_persistence,
    )
    snapshot = signal_analyser_snapshot_from_prepared_unlocked(
        state,
        measurements,
        peaks,
        prepared_display_plots,
    )
    signal_analyser_publish_display_plots!(state, prepared_display_plots)
    snapshot
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
    persistence_settings::Bool
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
        prospective_display.persistence_settings != current_display.persistence_settings,
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
        changes.persistence_settings,
        changes.peaks_enabled,
    ))
end

function signal_analyser_view_changes_affect_output(
    changes::SignalAnalyserViewChanges,
)::Bool
    any((
        changes.active_plot,
        changes.membership,
        changes.analysis_source,
        changes.time_limits,
        changes.spectrum_settings,
        changes.spectrogram_settings,
        changes.persistence_settings,
    ))
end

function signal_analyser_view_changes_affect_peaks(
    changes::SignalAnalyserViewChanges,
)::Bool
    any((
        changes.active_plot,
        changes.membership,
        changes.analysis_source,
        changes.time_limits,
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
        changes.persistence_settings,
        changes.peaks_enabled,
    ))
end

function signal_analyser_only_persistence_settings_changed(
    changes::SignalAnalyserViewChanges,
)::Bool
    changes.persistence_settings && !any((
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

function signal_analyser_only_secondary_provider_settings_changed(
    changes::SignalAnalyserViewChanges,
)::Bool
    (changes.spectrogram_settings || changes.persistence_settings) && !any((
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

function signal_analyser_snapshot_unlocked(
    state::SignalAnalyserState;
    materialize_missing_spectra::Bool = false,
    materialize_missing_spectrogram::Bool = false,
    materialize_missing_persistence::Bool = false,
)::Dict{String,Any}
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
    peaks = signal_analyser_cached_peaks_snapshot(
        state,
        state.view.state_revision,
        display,
        signal,
    )
    signal_analyser_snapshot_unlocked(
        state,
        measurements,
        peaks,
        materialize_missing_spectra = materialize_missing_spectra,
        materialize_missing_spectrogram = materialize_missing_spectrogram,
        materialize_missing_persistence = materialize_missing_persistence,
    )
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

function signal_analyser_validate_persistence_settings!(
    field_errors::Dict{String,String},
    value,
)::Union{Nothing,SignalPersistenceSettings}
    if !(value isa AbstractDict)
        field_errors["persistence_settings"] = "Требуется объект {leakage}"
        return nothing
    end
    keys_set = signal_analyser_payload_keys(value)
    if length(value) != 1 || keys_set != SIGNAL_PERSISTENCE_SETTINGS_FIELDS
        missing = sort!(collect(setdiff(SIGNAL_PERSISTENCE_SETTINGS_FIELDS, keys_set)))
        unknown = sort!(collect(setdiff(keys_set, SIGNAL_PERSISTENCE_SETTINGS_FIELDS)))
        details = String[]
        isempty(missing) || push!(details, "отсутствуют: $(join(missing, ", "))")
        isempty(unknown) || push!(details, "неизвестны: $(join(unknown, ", "))")
        length(value) == 1 || push!(details, "требуется ровно одно поле")
        field_errors["persistence_settings"] =
            "Ожидалось только leakage ($(join(details, "; ")))"
        return nothing
    end

    leakage_value = signal_analyser_payload_value(value, "leakage")
    if !(leakage_value isa Real) || leakage_value isa Bool
        field_errors["persistence_settings"] =
            "leakage: требуется конечное JSON number от 0 до 1, но не Bool"
        return nothing
    end
    try
        SignalPersistenceSettings(leakage_value)
    catch err
        if err isa ArgumentError || err isa InexactError || err isa OverflowError
            field_errors["persistence_settings"] = sprint(showerror, err)
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
    source_reconciler = SignalAnalysisSourceReconciler()
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
    requested_analysis_name = explicit_analysis ? explicit_analysis_name : current_analysis_name

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
                    requested_spectrum_settings = signal_analyser_reconcile_carried_frequency_limits(
                        source_reconciler,
                        requested_spectrum_settings,
                        analysis_signal,
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
                    requested_spectrogram_settings = signal_analyser_reconcile_carried_frequency_limits(
                        source_reconciler,
                        requested_spectrogram_settings,
                        analysis_signal,
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
    if !haskey(field_errors, "spectrogram_settings")
        try
            SignalSpectrogramPresentationSettings(
                display.stored_settings.spectrogram.scale,
                requested_spectrogram_settings.power_limits,
            )
        catch err
            err isa ArgumentError || rethrow()
            field_errors["spectrogram_settings"] =
                "power_limits: $(sprint(showerror, err))"
        end
    end

    has_persistence_settings = signal_analyser_payload_contains(data, "persistence_settings")
    requested_persistence_settings = display.persistence_settings
    if has_persistence_settings
        validated_persistence_settings = signal_analyser_validate_persistence_settings!(
            field_errors,
            signal_analyser_payload_value(data, "persistence_settings"),
        )
        validated_persistence_settings === nothing ||
            (requested_persistence_settings = validated_persistence_settings)
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
    if isempty(visible_names) || requested_analysis_name === nothing
        requested_peaks_enabled = false
    elseif !(requested_plot in (TIME_PLOT, SPECTRUM_PLOT))
        if has_peaks_enabled && requested_peaks_enabled
            field_errors["peaks_enabled"] = "Экстремумы доступны только для Time или Spectrum plot"
        else
            requested_peaks_enabled = false
        end
    end

    isempty(field_errors) || throw(SignalAnalyserValidationError("Некорректный запрос отображения", field_errors))
    prospective_source_signal = requested_analysis_name === nothing ? nothing :
        signal_by_name(state, requested_analysis_name)
    requested_stored_settings = signal_settings_reconcile_stored_for_source(
        display.stored_settings,
        prospective_source_signal,
    )
    prospective_display = SignalAnalyserDisplayState(
        display.id,
        display.name,
        requested_plot,
        SignalDisplayMembership(visible_names),
        signal_analysis_source(requested_analysis_name),
        requested_time_limits,
        requested_measurement_selection,
        requested_spectrum_settings,
        requested_spectrogram_settings,
        requested_persistence_settings,
        requested_stored_settings,
        requested_peaks_enabled,
    )
    (
        revision = Int(revision_value),
        row_selection = GlobalSignalSelection(requested_row_selected_signal),
        display = prospective_display,
    )
end

function signal_analyser_prepare_view_snapshot_unlocked(
    state::SignalAnalyserState,
    ::SignalAnalyserDisplayState,
    prospective_display::SignalAnalyserDisplayState,
    ::SignalAnalyserViewChanges,
)::Dict{String,Any}
    prospective_members = signal_analyser_display_members(prospective_display)
    prospective_analysis_name = signal_analyser_display_analysis_name(prospective_display)
    prospective_signal = prospective_analysis_name === nothing ? nothing :
        signal_by_name(state, prospective_analysis_name)
    render_signal = isempty(prospective_members) ? nothing :
        signal_by_name(state, first(prospective_members))
    prepared_display_plots = signal_analyser_prepare_display_plots(
        state,
        prospective_display,
        render_signal,
        prospective_members,
        materialize_missing_spectra = false,
        materialize_missing_spectrogram = false,
        materialize_missing_persistence = false,
    )
    prepared_measurements = signal_measurements_snapshot(
        state.measurements_service,
        state.view.state_revision,
        prospective_signal,
        prospective_display.time_limits,
        prospective_display.measurement_selection,
    )
    prepared_peaks = signal_analyser_cached_peaks_snapshot(
        state,
        state.view.state_revision,
        prospective_display,
        prospective_signal,
    )
    snapshot = signal_analyser_snapshot_from_prepared_unlocked(
        state,
        prepared_measurements,
        prepared_peaks,
        prepared_display_plots,
    )
    signal_analyser_publish_display_plots!(state, prepared_display_plots)
    snapshot
end

function apply_signal_analyser_view!(
    state::SignalAnalyserState,
    data;
    lightweight::Bool = false,
)::Dict{String,Any}
    lock(state.lock) do
        requested = validate_signal_analyser_view_payload(state, data)
        requested.revision == state.view.state_revision || throw(SignalAnalyserStaleStateError(
            requested.revision,
            state.view.state_revision,
        ))

        display = signal_analyser_active_display(state)
        prospective_display = requested.display
        active_pane = signal_display_active_pane(
            signal_analyser_layout_by_display_id(state, display.id),
        )
        changes = SignalAnalyserViewChanges(
            state.row_selection,
            display,
            requested.row_selection,
            prospective_display,
        )
        prospective_pane = signal_display_pane_from_display(
            active_pane.id,
            prospective_display,
            active_pane.name,
        )
        if !changes.membership || !changes.analysis_source
            prospective_pane = SignalDisplayPaneState(
                prospective_pane.id,
                active_pane.name,
                prospective_pane.plot_type,
                changes.membership ? prospective_pane.membership : active_pane.membership,
                changes.analysis_source ? prospective_pane.analysis_source : active_pane.analysis_source,
                prospective_pane.time_limits,
                prospective_pane.measurement_selection,
                prospective_pane.spectrum_settings,
                prospective_pane.spectrogram_settings,
                prospective_pane.persistence_settings,
                prospective_pane.stored_settings,
                prospective_pane.peaks_enabled,
                active_pane.peaks_settings,
            )
        end
        prospective_pane = signal_display_pane_with_peaks_settings(
            prospective_pane,
            active_pane.peaks_settings,
        )
        prospective_layout = signal_display_layout_replace_active_pane(
            signal_analyser_layout_by_display_id(state, display.id),
            prospective_pane,
        )
        changed = signal_analyser_has_changes(changes)
        if !changed
            return lightweight ?
                signal_analyser_state_lite_unlocked(state) :
                signal_analyser_prepare_view_snapshot_unlocked(
                    state,
                    display,
                    prospective_display,
                    changes,
                )
        end

        candidate = signal_analyser_clone_state_for_layout(state)
        candidate_display = signal_analyser_active_display(candidate)
        signal_analyser_publish_display_state!(candidate_display, prospective_display)
        candidate.display_layouts[candidate_display.id] = prospective_layout
        signal_analyser_publish_row_selection!(candidate, requested.row_selection)
        signal_analyser_sync_active_display!(candidate, candidate_display)
        candidate.view.state_revision += 1
        output_changed = signal_analyser_view_changes_affect_output(changes)
        output_changed && signal_analyser_invalidate_active_output_unlocked!(candidate)
        !output_changed && signal_analyser_view_changes_affect_peaks(changes) &&
            signal_analyser_invalidate_active_peaks_unlocked!(candidate)
        snapshot = if lightweight
            signal_analyser_state_lite_unlocked(candidate)
        else
            signal_analyser_prepare_view_snapshot_unlocked(
                candidate,
                display,
                candidate_display,
                changes,
            )
        end
        signal_analyser_publish_layout_candidate!(state, candidate)
        snapshot
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
    operation_value = signal_analyser_payload_value(data, "operation")
    operation = if operation_value isa AbstractString && String(operation_value) in SIGNAL_ANALYSER_DISPLAY_OPERATIONS
        String(operation_value)
    else
        field_errors["operation"] = "Допустимо: create, select, close, reorder"
        nothing
    end
    expected_fields = operation === nothing ?
        Set(["state_revision", "operation"]) :
        SIGNAL_ANALYSER_DISPLAY_REQUEST_FIELDS[operation]
    actual_fields = signal_analyser_payload_keys(data)
    if actual_fields != expected_fields
        missing = sort!(collect(setdiff(expected_fields, actual_fields)))
        unknown = sort!(collect(setdiff(actual_fields, expected_fields)))
        details = String[]
        isempty(missing) || push!(details, "отсутствуют: $(join(missing, ", "))")
        isempty(unknown) || push!(details, "неизвестны: $(join(unknown, ", "))")
        field_errors["body"] = "Ожидался точный набор полей ($(join(details, "; ")))"
    end

    revision_value = signal_analyser_payload_value(data, "state_revision")
    revision = if revision_value isa Integer && !(revision_value isa Bool) && revision_value >= 0
        try
            Int(revision_value)
        catch err
            (err isa InexactError || err isa OverflowError) || rethrow()
            field_errors["state_revision"] = "Требуется целое число в диапазоне Int"
            nothing
        end
    else
        field_errors["state_revision"] = "Требуется неотрицательное целое число"
        nothing
    end

    display_id_value = signal_analyser_payload_value(data, "display_id")
    display_id = nothing
    if operation == "select" || operation == "close"
        if !(display_id_value isa AbstractString) || isempty(String(display_id_value))
            field_errors["display_id"] = "Требуется непустой идентификатор Display"
        else
            display_id = String(display_id_value)
            any(display -> display.id == display_id, state.displays) ||
                (field_errors["display_id"] = "Неизвестный идентификатор Display")
        end
        operation == "close" && length(state.displays) == 1 &&
            (field_errors["operation"] = "Нужно оставить хотя бы один Display")
    end

    requested_order = String[]
    if operation == "reorder"
        order_value = signal_analyser_payload_value(data, "order")
        if order_value isa AbstractVector
            for (index, value) in enumerate(order_value)
                if !(value isa AbstractString) || isempty(String(value))
                    field_errors["order"] = "Элемент order $index должен быть непустой строкой"
                    break
                end
                push!(requested_order, String(value))
            end
            if !haskey(field_errors, "order")
                current_order = [display.id for display in state.displays]
                duplicate_ids = sort!(unique([
                    id for id in requested_order if count(==(id), requested_order) > 1
                ]))
                unknown_ids = sort!(collect(setdiff(Set(requested_order), Set(current_order))))
                missing_ids = [id for id in current_order if !(id in requested_order)]
                order_errors = String[]
                isempty(duplicate_ids) || push!(
                    order_errors,
                    "Повторяющиеся идентификаторы Display: $(join(duplicate_ids, ", "))",
                )
                isempty(unknown_ids) || push!(
                    order_errors,
                    "Неизвестные идентификаторы Display: $(join(unknown_ids, ", "))",
                )
                isempty(missing_ids) || push!(
                    order_errors,
                    "Отсутствующие идентификаторы Display: $(join(missing_ids, ", "))",
                )
                isempty(order_errors) || (field_errors["order"] = join(order_errors, "; "))
            end
        else
            field_errors["order"] = "Требуется массив идентификаторов Display"
        end
    end

    isempty(field_errors) || throw(SignalAnalyserValidationError("Некорректный запрос Display", field_errors))
    (
        revision = revision::Int,
        operation = operation::String,
        display_id = display_id,
        order = requested_order,
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

function apply_signal_analyser_display!(
    state::SignalAnalyserState,
    data;
    lightweight::Bool = false,
)::Dict{String,Any}
    lock(state.lock) do
        requested = validate_signal_analyser_display_payload(state, data)
        requested.revision == state.view.state_revision || throw(SignalAnalyserStaleStateError(
            requested.revision,
            state.view.state_revision,
        ))

        if requested.operation == "reorder" &&
            requested.order == [display.id for display in state.displays]
            return lightweight ?
                signal_analyser_state_lite_unlocked(state) :
                signal_analyser_snapshot_unlocked(state)
        elseif requested.operation == "select" &&
            requested.display_id == state.active_display_id
            return lightweight ?
                signal_analyser_state_lite_unlocked(state) :
                signal_analyser_snapshot_unlocked(state)
        end

        candidate = signal_analyser_clone_state_for_layout(state)
        if requested.operation == "reorder"
            displays_by_id = Dict(display.id => display for display in candidate.displays)
            candidate.displays = SignalAnalyserDisplayState[
                displays_by_id[display_id] for display_id in requested.order
            ]
            candidate.view.state_revision += 1
        elseif requested.operation == "create"
            display_number = candidate.next_display_number
            display = SignalAnalyserDisplayState(
                "display-$display_number",
                "Экран $display_number",
                TIME_PLOT,
                SignalDisplayMembership(String[]),
                NoSignalAnalysisSource(),
                nothing,
                false,
            )
            push!(candidate.displays, display)
            candidate.display_layouts[display.id] = signal_display_default_layout(display)
            candidate.next_display_number += 1
            signal_analyser_sync_active_display!(candidate, display)
            candidate.view.state_revision += 1
            signal_analyser_invalidate_active_output_unlocked!(candidate)
        elseif requested.operation == "select"
            display = signal_analyser_display_by_id(candidate, requested.display_id)
            signal_analyser_sync_active_display!(candidate, display)
            candidate.view.state_revision += 1
            signal_analyser_invalidate_active_output_unlocked!(candidate)
        else
            close_index = findfirst(
                display -> display.id == requested.display_id,
                candidate.displays,
            )::Int
            closing_active_display = requested.display_id == candidate.active_display_id
            remaining_displays = [
                display for display in candidate.displays
                if display.id != requested.display_id
            ]
            next_active_display = if closing_active_display
                remaining_displays[max(1, close_index - 1)]
            else
                signal_analyser_active_display(candidate)
            end
            candidate.displays = remaining_displays
            delete!(candidate.display_layouts, requested.display_id)
            closing_active_display &&
                signal_analyser_sync_active_display!(candidate, next_active_display)
            candidate.view.state_revision += 1
            if closing_active_display
                signal_analyser_invalidate_active_output_unlocked!(candidate)
            else
                signal_analyser_sync_output_pages_unlocked!(candidate)
            end
        end

        snapshot = lightweight ?
            signal_analyser_state_lite_unlocked(candidate) :
            signal_analyser_snapshot_unlocked(candidate)
        signal_analyser_publish_layout_candidate!(state, candidate)
        snapshot
    end
end

function signal_analyser_clone_display(
    display::SignalAnalyserDisplayState,
)::SignalAnalyserDisplayState
    SignalAnalyserDisplayState(
        display.id,
        display.name,
        display.active_plot,
        display.membership,
        display.analysis_source,
        display.time_limits,
        display.measurement_selection,
        display.spectrum_settings,
        display.spectrogram_settings,
        display.persistence_settings,
        display.stored_settings,
        display.peaks_enabled,
    )
end

function signal_analyser_clone_state_for_layout(
    state::SignalAnalyserState,
)::SignalAnalyserState
    typeof(state)(
        copy(state.signals),
        SignalAnalyserViewState(
            state.view.state_revision,
            state.view.active_plot,
            state.view.selected_signal,
        ),
        state.row_selection,
        SignalAnalyserDisplayState[
            signal_analyser_clone_display(display) for display in state.displays
        ],
        state.active_display_id,
        state.next_display_number,
        Dict(
            display_id => copy(layout)
            for (display_id, layout) in state.display_layouts
        ),
        deepcopy(state.plot_cache),
        copy(state.spectrum_cache),
        copy(state.spectrogram_cache),
        copy(state.persistence_cache),
        state.measurements_service,
        state.peaks_service,
        state.spectrum_service,
        state.spectrogram_service,
        state.persistence_service,
        signal_analyser_clone_calculation_manager(state.output_manager),
        ReentrantLock(),
    )
end

function signal_analyser_publish_layout_candidate!(
    state::SignalAnalyserState,
    candidate::SignalAnalyserState,
    ;
    preserve_output_runtime::Bool = false,
)::Nothing
    preserve_output_runtime || signal_analyser_cancel_active_output_unlocked!(state)
    state.signals = candidate.signals
    state.view = candidate.view
    state.row_selection = candidate.row_selection
    state.displays = candidate.displays
    state.active_display_id = candidate.active_display_id
    state.next_display_number = candidate.next_display_number
    state.display_layouts = candidate.display_layouts
    state.plot_cache = candidate.plot_cache
    state.spectrum_cache = candidate.spectrum_cache
    state.spectrogram_cache = candidate.spectrogram_cache
    state.persistence_cache = candidate.persistence_cache
    if preserve_output_runtime
        signal_analyser_sync_output_pages_unlocked!(state)
    else
        state.output_manager = candidate.output_manager
    end
    nothing
end

function signal_analyser_replace_display!(
    state::SignalAnalyserState,
    prospective::SignalAnalyserDisplayState,
)::Nothing
    index = findfirst(display -> display.id == prospective.id, state.displays)
    index === nothing && throw(ArgumentError("Display не найден: $(prospective.id)"))
    state.displays[index] = prospective
    nothing
end

function validate_signal_analyser_layout_payload(
    state::SignalAnalyserState,
    data,
)::NamedTuple
    data isa AbstractDict || throw(SignalAnalyserValidationError(
        "Некорректный запрос Layout",
        Dict("body" => "Ожидался JSON-объект"),
    ))
    field_errors = Dict{String,String}()
    operation_value = signal_analyser_payload_value(data, "operation")
    operation = if operation_value isa AbstractString &&
        String(operation_value) in SIGNAL_ANALYSER_LAYOUT_OPERATIONS
        String(operation_value)
    else
        field_errors["operation"] = "Допустимо: resize, select_pane, update_pane"
        nothing
    end
    expected_fields = operation === nothing ?
        Set(["state_revision", "operation", "display_id", "version"]) :
        SIGNAL_ANALYSER_LAYOUT_REQUEST_FIELDS[operation]
    actual_fields = signal_analyser_payload_keys(data)
    if actual_fields != expected_fields
        missing = sort!(collect(setdiff(expected_fields, actual_fields)))
        unknown = sort!(collect(setdiff(actual_fields, expected_fields)))
        details = String[]
        isempty(missing) || push!(details, "отсутствуют: $(join(missing, ", "))")
        isempty(unknown) || push!(details, "неизвестны: $(join(unknown, ", "))")
        field_errors["body"] = "Ожидался точный набор полей ($(join(details, "; ")))"
    end

    revision_value = signal_analyser_payload_value(data, "state_revision")
    revision = if revision_value isa Integer && !(revision_value isa Bool) && revision_value >= 0
        try
            Int(revision_value)
        catch err
            (err isa InexactError || err isa OverflowError) || rethrow()
            field_errors["state_revision"] = "Требуется целое число в диапазоне Int"
            nothing
        end
    else
        field_errors["state_revision"] = "Требуется неотрицательное целое число"
        nothing
    end

    display_value = signal_analyser_payload_value(data, "display_id")
    display_id = if display_value isa AbstractString && !isempty(String(display_value))
        String(display_value)
    else
        field_errors["display_id"] = "Требуется непустой идентификатор Display"
        nothing
    end
    if display_id !== nothing && !any(display -> display.id == display_id, state.displays)
        field_errors["display_id"] = "Неизвестный идентификатор Display"
    end

    version_value = signal_analyser_payload_value(data, "version")
    if !(version_value isa Integer) || version_value isa Bool ||
        version_value != SIGNAL_DISPLAY_LAYOUT_VERSION
        field_errors["version"] = "Поддерживается только layout version 1"
    end

    layout = display_id === nothing || haskey(field_errors, "display_id") ? nothing :
        signal_analyser_layout_by_display_id(state, display_id)
    prospective_layout = layout
    if operation == "resize"
        rows_value = signal_analyser_payload_value(data, "rows")
        columns_value = signal_analyser_payload_value(data, "columns")
        rows = rows_value isa Integer && !(rows_value isa Bool) ? try
            Int(rows_value)
        catch err
            (err isa InexactError || err isa OverflowError) || rethrow()
            0
        end : 0
        columns = columns_value isa Integer && !(columns_value isa Bool) ? try
            Int(columns_value)
        catch err
            (err isa InexactError || err isa OverflowError) || rethrow()
            0
        end : 0
        SIGNAL_DISPLAY_LAYOUT_MIN_DIMENSION <= rows <= SIGNAL_DISPLAY_LAYOUT_MAX_DIMENSION ||
            (field_errors["rows"] =
                "Требуется целое число от $(SIGNAL_DISPLAY_LAYOUT_MIN_DIMENSION) " *
                "до $(SIGNAL_DISPLAY_LAYOUT_MAX_DIMENSION)")
        SIGNAL_DISPLAY_LAYOUT_MIN_DIMENSION <= columns <= SIGNAL_DISPLAY_LAYOUT_MAX_DIMENSION ||
            (field_errors["columns"] =
                "Требуется целое число от $(SIGNAL_DISPLAY_LAYOUT_MIN_DIMENSION) " *
                "до $(SIGNAL_DISPLAY_LAYOUT_MAX_DIMENSION)")
        variant_value = signal_analyser_payload_value(data, "variant")
        expected_variant = signal_display_layout_variant(rows, columns)
        variant_value isa AbstractString && String(variant_value) == expected_variant ||
            (field_errors["variant"] = "Требуется canonical variant $expected_variant")
        if layout !== nothing && !haskey(field_errors, "rows") &&
            !haskey(field_errors, "columns") && !haskey(field_errors, "variant")
            prospective_layout = signal_display_layout_resize(
                layout,
                rows,
                columns,
                signal_analyser_new_pane_template(state, layout),
            )
        end
    elseif operation == "select_pane" || operation == "update_pane"
        pane_value = signal_analyser_payload_value(data, "pane_id")
        pane_id = if pane_value isa AbstractString &&
            occursin(SIGNAL_DISPLAY_PANE_ID_REGEX, String(pane_value))
            String(pane_value)
        else
            field_errors["pane_id"] = "Требуется идентификатор pane-N"
            nothing
        end
        if layout !== nothing && pane_id !== nothing &&
            !any(pane -> pane.id == pane_id, layout.panes)
            field_errors["pane_id"] = "Неизвестный идентификатор pane"
        end
        if operation == "select_pane" && layout !== nothing &&
            pane_id !== nothing && !haskey(field_errors, "pane_id")
            prospective_layout = signal_display_layout_select_pane(layout, pane_id)
        elseif operation == "update_pane"
            plot_value = signal_analyser_payload_value(data, "plot_type")
            plot_type = if plot_value isa AbstractString &&
                haskey(SIGNAL_ANALYSER_PLOTS_BY_NAME, String(plot_value))
                SIGNAL_ANALYSER_PLOTS_BY_NAME[String(plot_value)]
            else
                field_errors["plot_type"] =
                    "Допустимо: time, spectrum, spectrogram, persistence"
                nothing
            end
            bindings_value = signal_analyser_payload_value(data, "signal_bindings")
            bindings = String[]
            if bindings_value isa AbstractVector
                known_names = Set(signal.name for signal in state.signals)
                for (index, value) in enumerate(bindings_value)
                    if !(value isa AbstractString) || isempty(String(value))
                        field_errors["signal_bindings"] =
                            "Binding $index должен быть непустой строкой"
                        break
                    end
                    name = String(value)
                    if !(name in known_names)
                        field_errors["signal_bindings"] = "Неизвестный сигнал: $name"
                        break
                    end
                    push!(bindings, name)
                end
                allunique(bindings) || (field_errors["signal_bindings"] =
                    "Signal bindings не должны повторяться")
            else
                field_errors["signal_bindings"] = "Требуется массив имён сигналов"
            end
            if layout !== nothing && pane_id !== nothing && plot_type !== nothing &&
                !haskey(field_errors, "pane_id") &&
                !haskey(field_errors, "signal_bindings")
                pane_index = findfirst(pane -> pane.id == pane_id, layout.panes)::Int
                replacement = try
                    signal_display_pane_reconfigured(
                        state,
                        layout.panes[pane_index],
                        plot_type,
                        bindings,
                    )
                catch err
                    if err isa SignalAnalysisSourceCompatibilityError
                        field_errors[err.field] = sprint(showerror, err)
                        nothing
                    else
                        rethrow()
                    end
                end
                replacement === nothing || (prospective_layout =
                    signal_display_layout_replace_pane(layout, replacement))
            end
        end
    end

    isempty(field_errors) || throw(SignalAnalyserValidationError(
        "Некорректный запрос Layout",
        field_errors,
    ))
    (
        revision = revision::Int,
        display_id = display_id::String,
        operation = operation::String,
        layout = prospective_layout::SignalDisplayLayoutState,
    )
end

function apply_signal_analyser_layout!(
    state::SignalAnalyserState,
    data;
    lightweight::Bool = false,
)::Dict{String,Any}
    lock(state.lock) do
        requested = validate_signal_analyser_layout_payload(state, data)
        requested.revision == state.view.state_revision || throw(
            SignalAnalyserStaleStateError(requested.revision, state.view.state_revision),
        )
        current_layout = signal_analyser_layout_by_display_id(state, requested.display_id)
        layout_changed = requested.layout != current_layout
        current_panes = Dict(pane.id => pane for pane in current_layout.panes)
        affected_output_pages = String[
            signal_analyser_output_page_id(requested.display_id, pane.id)
            for pane in requested.layout.panes
            if !haskey(current_panes, pane.id) || current_panes[pane.id] != pane
        ]
        candidate = signal_analyser_clone_state_for_layout(state)
        display = signal_analyser_display_by_id(candidate, requested.display_id)
        candidate.display_layouts[requested.display_id] = requested.layout
        prospective_display = try
            signal_analyser_display_for_layout(candidate, display, requested.layout)
        catch err
            if err isa SignalAnalysisSourceCompatibilityError
                throw(SignalAnalyserValidationError(
                    "Некорректный запрос Layout",
                    Dict(err.field => sprint(showerror, err)),
                ))
            end
            rethrow()
        end
        projection_changes = SignalAnalyserViewChanges(
            candidate.row_selection,
            display,
            candidate.row_selection,
            prospective_display,
        )
        changed = layout_changed || signal_analyser_has_changes(projection_changes)
        if changed
            signal_analyser_replace_display!(candidate, prospective_display)
            if candidate.active_display_id == requested.display_id
                signal_analyser_sync_active_display!(candidate, prospective_display)
            end
            candidate.view.state_revision += 1
        end
        if changed
            signal_analyser_publish_layout_candidate!(
                state,
                candidate;
                preserve_output_runtime = true,
            )
            isempty(affected_output_pages) || signal_analyser_invalidate_output_pages_unlocked!(
                state,
                affected_output_pages,
            )
        end
        lightweight ?
            signal_analyser_layouts_lite_snapshot_unlocked(state) :
            signal_analyser_layouts_snapshot_unlocked(state)
    end
end

include(joinpath(@__DIR__, "signal_output_service.jl"))
include(joinpath(@__DIR__, "..", "adapters", "engee_workspace_variable_provider.jl"))
include(joinpath(@__DIR__, "..", "adapters", "engee_workspace_signal_source.jl"))
include(joinpath(@__DIR__, "..", "adapters", "engee_signal_operation_provider.jl"))
include(joinpath(@__DIR__, "workspace_catalog_service.jl"))
include(joinpath(@__DIR__, "signal_settings_service.jl"))
include(joinpath(@__DIR__, "signal_inventory_service.jl"))
include(joinpath(@__DIR__, "workspace_batch_import_service.jl"))
