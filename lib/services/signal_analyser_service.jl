const SIGNAL_ANALYSER_VIEW_FIELDS = Set(["state_revision", "active_plot", "selected_signal", "visible_signals"])

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

function signal_analyser_snapshot_unlocked(state::SignalAnalyserState)::Dict{String,Any}
    signal = signal_by_name(state, state.view.selected_signal)
    plots = signal_analyser_cached_plots!(state, signal)
    visible_names = signal_analyser_visible_signal_names(state)
    Dict{String,Any}(
        "state_revision" => state.view.state_revision,
        "active_plot" => signal_analyser_plot_name(state.view.active_plot),
        "selected_signal" => state.view.selected_signal,
        "visible_signals" => visible_names,
        "signals" => [signal_analyser_signal_payload(item) for item in state.signals],
        "plots" => plots,
        "plot_payload" => signal_analyser_multi_trace_payload(state, signal, visible_names),
        "panel" => signal_analyser_panel_payload(state.view.active_plot, signal, plots),
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
    if isempty(value)
        field_errors["visible_signals"] = "Нужно оставить видимым хотя бы один сигнал"
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

function validate_signal_analyser_view_payload(
    state::SignalAnalyserState,
    data,
)::NamedTuple
    data isa AbstractDict || throw(SignalAnalyserValidationError(
        "Тело запроса должно быть JSON-объектом",
        Dict("body" => "Ожидался JSON-объект"),
    ))

    field_errors = Dict{String,String}()
    unknown_fields = setdiff(signal_analyser_payload_keys(data), SIGNAL_ANALYSER_VIEW_FIELDS)
    isempty(unknown_fields) || (field_errors["body"] = "Неизвестные поля: $(join(sort!(collect(unknown_fields)), ", "))")

    revision_value = signal_analyser_payload_value(data, "state_revision")
    revision_value isa Integer && !(revision_value isa Bool) || (field_errors["state_revision"] = "Требуется целое число")

    has_active_plot = signal_analyser_payload_contains(data, "active_plot")
    active_plot_value = signal_analyser_payload_value(data, "active_plot")
    requested_plot = state.view.active_plot
    if has_active_plot
        if active_plot_value isa AbstractString && haskey(SIGNAL_ANALYSER_PLOTS_BY_NAME, String(active_plot_value))
            requested_plot = SIGNAL_ANALYSER_PLOTS_BY_NAME[String(active_plot_value)]
        else
            field_errors["active_plot"] = "Допустимо: time, spectrum, spectrogram, persistence"
        end
    end

    has_selected_signal = signal_analyser_payload_contains(data, "selected_signal")
    selected_signal_value = signal_analyser_payload_value(data, "selected_signal")
    requested_signal = state.view.selected_signal
    if has_selected_signal
        if selected_signal_value isa AbstractString && any(signal -> signal.name == selected_signal_value, state.signals)
            requested_signal = String(selected_signal_value)
        else
            field_errors["selected_signal"] = "Неизвестное имя сигнала"
        end
    end

    has_visible_signals = signal_analyser_payload_contains(data, "visible_signals")
    visible_names = signal_analyser_visible_signal_names(state)
    if has_visible_signals
        validated_visible_names = signal_analyser_validate_visible_signals!(
            field_errors,
            state,
            signal_analyser_payload_value(data, "visible_signals"),
        )
        validated_visible_names === nothing || (visible_names = validated_visible_names)
    end

    isempty(field_errors) || throw(SignalAnalyserValidationError("Некорректный запрос отображения", field_errors))
    requested_signal in visible_names || (requested_signal = first(visible_names))
    (
        revision = Int(revision_value),
        active_plot = requested_plot,
        selected_signal = requested_signal,
        visible_signals = visible_names,
    )
end

function apply_signal_analyser_view!(state::SignalAnalyserState, data)::Dict{String,Any}
    lock(state.lock) do
        requested = validate_signal_analyser_view_payload(state, data)
        requested.revision == state.view.state_revision || throw(SignalAnalyserStaleStateError(
            requested.revision,
            state.view.state_revision,
        ))

        current_visible = signal_analyser_visible_signal_names(state)
        changed = requested.active_plot != state.view.active_plot ||
            requested.selected_signal != state.view.selected_signal ||
            requested.visible_signals != current_visible

        # Build every payload affected by the request before publishing the
        # mutation so a runtime DSP failure cannot leave state half-applied.
        prepared_plots = signal_analyser_prepared_plots(
            state,
            unique(vcat(requested.visible_signals, [requested.selected_signal])),
        )
        if changed
            visible_set = Set(requested.visible_signals)
            state.signals = [
                signal_analyser_with_visibility(signal, signal.name in visible_set)
                for signal in state.signals
            ]
            signal_analyser_publish_prepared_plots!(state, prepared_plots)
            state.view.active_plot = requested.active_plot
            state.view.selected_signal = requested.selected_signal
            state.view.state_revision += 1
        else
            signal_analyser_publish_prepared_plots!(state, prepared_plots)
        end
        signal_analyser_snapshot_unlocked(state)
    end
end
