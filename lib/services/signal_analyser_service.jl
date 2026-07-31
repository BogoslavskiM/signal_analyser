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
    "peaks_enabled",
])
const SIGNAL_ANALYSER_DISPLAY_FIELDS = Set(["state_revision", "operation", "display_id"])
const SIGNAL_ANALYSER_DISPLAY_OPERATIONS = Set(["create", "select", "close"])
const SIGNAL_TIME_LIMIT_FIELDS = Set(["min_s", "max_s", "units"])

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
            signal_analyser_panel_field("method", "Метод оценки", "text", "Welch"),
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

function signal_analyser_empty_plots()::Dict{String,Any}
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
            "y_label" => "Мощность, дБ",
            "method" => "welch",
        ),
        "spectrogram" => Dict{String,Any}(
            "type" => "heatmap",
            "x" => Float64[],
            "y" => Float64[],
            "z" => Vector{Vector{Float64}}(),
            "x_label" => "Время, с",
            "y_label" => "Частота, Гц",
            "color_label" => "Мощность, дБ",
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
        signal_analyser_plots(signal)
    end
end

function signal_analyser_prepared_plots(state::SignalAnalyserState, signal_names::Vector{String})::Dict{String,Dict{String,Any}}
    prepared = Dict{String,Dict{String,Any}}()
    for name in signal_names
        if haskey(state.plot_cache, name)
            prepared[name] = state.plot_cache[name]
        else
            prepared[name] = signal_analyser_plots(signal_by_name(state, name))
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
    selected_signal::AnalysedSignal,
    visible_names::Vector{String},
)::Dict{String,Any}
    time_traces = Dict{String,Any}[]
    spectrum_traces = Dict{String,Any}[]
    for signal in state.signals
        signal.name in visible_names || continue
        plots = signal_analyser_cached_plots!(state, signal)
        push!(time_traces, signal_analyser_plot_for_payload(plots["time"], signal))
        push!(spectrum_traces, signal_analyser_plot_for_payload(plots["spectrum"], signal))
    end

    selected_plots = signal_analyser_cached_plots!(state, selected_signal)
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
    ::SignalAnalyserState,
    ::Nothing,
    visible_names::Vector{String},
)::Dict{String,Any}
    isempty(visible_names) || throw(ArgumentError("Пустой analysis source допустим только для пустого Display"))
    plots = signal_analyser_empty_plots()
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
    SignalOrdinateRoi(
        ordinate_kind,
        @view(ordinate[first_position:last_position]),
        first_position - 1,
        signal.sample_rate_hz,
    )
end

signal_ordinate_roi(
    service::SignalMeasurementsService,
    signal::AnalysedSignal,
    limits::SignalTimeLimits,
) = signal_ordinate_roi(service.roi_service, signal, limits)

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
    plots = signal === nothing ? signal_analyser_empty_plots() : signal_analyser_cached_plots!(state, signal)
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
        "signals" => [signal_analyser_signal_payload(item) for item in state.signals],
        "plots" => plots,
        "plot_payload" => signal_analyser_multi_trace_payload(state, signal, visible_names),
        "measurements" => signal_measurements_payload(measurements),
        "peaks" => signal_peaks_payload(peaks),
        "panel" => signal === nothing ?
            signal_analyser_empty_panel_payload(state.view.active_plot) :
            signal_analyser_panel_payload(state.view.active_plot, signal, plots),
    )
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
        changed = requested.row_selection.signal_name != state.row_selection.signal_name ||
            prospective_display.active_plot != display.active_plot ||
            prospective_display.membership.signal_names != display.membership.signal_names ||
            !isequal(prospective_analysis_name, signal_analyser_display_analysis_name(display)) ||
            !isequal(prospective_display.time_limits, display.time_limits) ||
            prospective_display.measurement_selection != display.measurement_selection ||
            prospective_display.peaks_enabled != display.peaks_enabled

        # Build every payload affected by the request before publishing the
        # mutation so a runtime DSP failure cannot leave state half-applied.
        prepared_plots = signal_analyser_prepared_plots(
            state,
            prospective_members,
        )
        next_revision = state.view.state_revision + (changed ? 1 : 0)
        prospective_signal = prospective_analysis_name === nothing ? nothing :
            signal_by_name(state, prospective_analysis_name)
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
            signal_analyser_publish_display_state!(display, prospective_display)
            signal_analyser_publish_row_selection!(state, requested.row_selection)
            signal_analyser_sync_active_display!(state, display)
            state.view.state_revision += 1
        else
            signal_analyser_publish_prepared_plots!(state, prepared_plots)
        end
        signal_analyser_snapshot_unlocked(state, prepared_measurements, prepared_peaks)
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
            state.displays = remaining_displays
            closing_active_display && signal_analyser_sync_active_display!(state, next_active_display)
            state.view.state_revision += 1
        end

        signal_analyser_snapshot_unlocked(state, prepared_measurements, prepared_peaks)
    end
end
