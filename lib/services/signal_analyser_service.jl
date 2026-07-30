const SIGNAL_ANALYSER_VIEW_FIELDS = Set(["state_revision", "active_plot", "selected_signal"])

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

function signal_analyser_snapshot_unlocked(state::SignalAnalyserState)::Dict{String,Any}
    signal = signal_by_name(state, state.view.selected_signal)
    plots = signal_analyser_cached_plots!(state, signal)
    Dict{String,Any}(
        "state_revision" => state.view.state_revision,
        "active_plot" => signal_analyser_plot_name(state.view.active_plot),
        "selected_signal" => state.view.selected_signal,
        "signals" => [signal_analyser_signal_payload(item) for item in state.signals],
        "plots" => plots,
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

    isempty(field_errors) || throw(SignalAnalyserValidationError("Некорректный запрос отображения", field_errors))
    (
        revision = Int(revision_value),
        active_plot = requested_plot,
        selected_signal = requested_signal,
    )
end

function apply_signal_analyser_view!(state::SignalAnalyserState, data)::Dict{String,Any}
    lock(state.lock) do
        requested = validate_signal_analyser_view_payload(state, data)
        requested.revision == state.view.state_revision || throw(SignalAnalyserStaleStateError(
            requested.revision,
            state.view.state_revision,
        ))

        changed = requested.active_plot != state.view.active_plot || requested.selected_signal != state.view.selected_signal
        # Build the requested signal payload before publishing the mutation so a
        # runtime DSP failure cannot leave view state and revision half-applied.
        signal_analyser_cached_plots!(state, signal_by_name(state, requested.selected_signal))
        if changed
            state.view.active_plot = requested.active_plot
            state.view.selected_signal = requested.selected_signal
            state.view.state_revision += 1
        end
        signal_analyser_snapshot_unlocked(state)
    end
end
