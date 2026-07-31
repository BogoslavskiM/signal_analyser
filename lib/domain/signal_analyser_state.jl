@enum SignalAnalyserPlot begin
    TIME_PLOT
    SPECTRUM_PLOT
    SPECTROGRAM_PLOT
    PERSISTENCE_PLOT
end

const SIGNAL_ANALYSER_PLOT_NAMES = Dict(
    TIME_PLOT => "time",
    SPECTRUM_PLOT => "spectrum",
    SPECTROGRAM_PLOT => "spectrogram",
    PERSISTENCE_PLOT => "persistence",
)
const SIGNAL_ANALYSER_PLOTS_BY_NAME = Dict(value => key for (key, value) in SIGNAL_ANALYSER_PLOT_NAMES)

struct AnalysedSignal
    name::String
    color::String
    sample_rate_hz::Float64
    values::Vector{ComplexF64}
    is_complex::Bool
    visible::Bool
end

@enum SignalMeasurementOrdinate begin
    REAL_ORDINATE
    MAGNITUDE_ORDINATE
end

@enum SignalMeasurementKind begin
    MINIMUM_MEASUREMENT
    MAXIMUM_MEASUREMENT
    MEAN_MEASUREMENT
end

const SIGNAL_MEASUREMENT_ORDINATE_NAMES = Dict(
    REAL_ORDINATE => "real",
    MAGNITUDE_ORDINATE => "magnitude",
)

const SIGNAL_MEASUREMENT_ITEM_METADATA = Dict(
    MINIMUM_MEASUREMENT => (id = "minimum", label = "Минимум"),
    MAXIMUM_MEASUREMENT => (id = "maximum", label = "Максимум"),
    MEAN_MEASUREMENT => (id = "mean", label = "Среднее"),
)

struct SignalMeasurementPosition
    sample_index::Int
    time_s::Float64

    function SignalMeasurementPosition(sample_index::Int, time_s::Real)
        sample_index >= 0 || throw(ArgumentError("Индекс отсчёта измерения не может быть отрицательным"))
        isfinite(time_s) && time_s >= 0 || throw(ArgumentError(
            "Время измерения должно быть неотрицательным конечным числом",
        ))
        new(sample_index, Float64(time_s))
    end
end

struct SignalMeasurementItem
    kind::SignalMeasurementKind
    value::Float64
    position::Union{Nothing,SignalMeasurementPosition}

    function SignalMeasurementItem(
        kind::SignalMeasurementKind,
        value::Real,
        position::Union{Nothing,SignalMeasurementPosition},
    )
        isfinite(value) || throw(ArgumentError("Значение измерения должно быть конечным числом"))
        if kind == MEAN_MEASUREMENT
            position === nothing || throw(ArgumentError("Среднее значение не имеет позиции отсчёта"))
        else
            position === nothing && throw(ArgumentError("Экстремум должен иметь позицию отсчёта"))
        end
        new(kind, Float64(value), position)
    end
end

struct SignalMeasurementUnits
    value::String
    time::String

    function SignalMeasurementUnits(value::AbstractString, time::AbstractString)
        isempty(value) && throw(ArgumentError("Единица значения измерения не может быть пустой"))
        isempty(time) && throw(ArgumentError("Единица времени измерения не может быть пустой"))
        new(String(value), String(time))
    end
end

struct SignalMeasurementsSnapshot
    state_revision::Int
    signal_name::String
    ordinate::SignalMeasurementOrdinate
    units::SignalMeasurementUnits
    items::NTuple{3,SignalMeasurementItem}

    function SignalMeasurementsSnapshot(
        state_revision::Int,
        signal_name::AbstractString,
        ordinate::SignalMeasurementOrdinate,
        units::SignalMeasurementUnits,
        items::NTuple{3,SignalMeasurementItem},
    )
        state_revision >= 0 || throw(ArgumentError("Ревизия snapshot не может быть отрицательной"))
        isempty(signal_name) && throw(ArgumentError("Имя сигнала snapshot не может быть пустым"))
        kinds = map(item -> item.kind, items)
        kinds == (MINIMUM_MEASUREMENT, MAXIMUM_MEASUREMENT, MEAN_MEASUREMENT) || throw(ArgumentError(
            "Измерения snapshot должны идти в порядке minimum, maximum, mean",
        ))
        new(state_revision, String(signal_name), ordinate, units, items)
    end
end

"""Stateless domain service that derives raw-sample measurements."""
struct SignalMeasurementsService end

signal_measurement_ordinate_name(ordinate::SignalMeasurementOrdinate)::String =
    SIGNAL_MEASUREMENT_ORDINATE_NAMES[ordinate]
signal_measurement_metadata(kind::SignalMeasurementKind) = SIGNAL_MEASUREMENT_ITEM_METADATA[kind]

mutable struct SignalAnalyserViewState
    state_revision::Int
    active_plot::SignalAnalyserPlot
    selected_signal::String
end

mutable struct SignalAnalyserDisplayState
    id::String
    name::String
    active_plot::SignalAnalyserPlot
    selected_signal::String
    visible_signals::Vector{String}
end

mutable struct SignalAnalyserState
    signals::Vector{AnalysedSignal}
    view::SignalAnalyserViewState
    displays::Vector{SignalAnalyserDisplayState}
    active_display_id::String
    next_display_number::Int
    plot_cache::Dict{String,Dict{String,Any}}
    measurements_service::SignalMeasurementsService
    lock::ReentrantLock
end

function SignalAnalyserState(
    signals::Vector{AnalysedSignal},
    view::SignalAnalyserViewState,
    plot_cache::Dict{String,Dict{String,Any}},
    lock::ReentrantLock,
)
    visible_signals = [signal.name for signal in signals if signal.visible]
    display = SignalAnalyserDisplayState(
        "display-1",
        "Display 1",
        view.active_plot,
        view.selected_signal,
        visible_signals,
    )
    SignalAnalyserState(
        signals,
        view,
        SignalAnalyserDisplayState[display],
        display.id,
        2,
        plot_cache,
        SignalMeasurementsService(),
        lock,
    )
end

struct SignalAnalyserValidationError <: Exception
    message::String
    fields::Dict{String,String}
end

Base.showerror(io::IO, err::SignalAnalyserValidationError) = print(io, err.message)

struct SignalAnalyserStaleStateError <: Exception
    expected_revision::Int
    actual_revision::Int
end

function Base.showerror(io::IO, err::SignalAnalyserStaleStateError)
    print(io, "Состояние устарело: ожидалась ревизия $(err.expected_revision), текущая ревизия $(err.actual_revision)")
end

signal_analyser_plot_name(plot::SignalAnalyserPlot)::String = SIGNAL_ANALYSER_PLOT_NAMES[plot]
signal_data_type(signal::AnalysedSignal)::String = signal.is_complex ? "Комплексный" : "Вещественный"

function signal_analyser_plot(value::AbstractString)::SignalAnalyserPlot
    haskey(SIGNAL_ANALYSER_PLOTS_BY_NAME, value) || throw(ArgumentError("Неизвестный тип графика: $value"))
    SIGNAL_ANALYSER_PLOTS_BY_NAME[String(value)]
end

function signal_duration_s(signal::AnalysedSignal)::Float64
    isempty(signal.values) && return 0.0
    (length(signal.values) - 1) / signal.sample_rate_hz
end

function signal_time_values(signal::AnalysedSignal)::Vector{Float64}
    collect(0:(length(signal.values) - 1)) ./ signal.sample_rate_hz
end

function default_signal_catalog()::Vector{AnalysedSignal}
    sample_rate_hz = 2048.0
    sample_count = 512
    time = collect(0:(sample_count - 1)) ./ sample_rate_hz

    harmonic = @. 0.82 * sin(2pi * 180.0 * time) + 0.28 * sin(2pi * 420.0 * time + 0.35)
    chirp_phase = @. 2pi * (90.0 * time + 0.5 * 1100.0 * time^2)
    complex_chirp = @. cis(chirp_phase) + 0.22 * cis(2pi * 510.0 * time)

    AnalysedSignal[
        AnalysedSignal(
            "Гармонический сигнал",
            "#2563eb",
            sample_rate_hz,
            ComplexF64.(harmonic),
            false,
            true,
        ),
        AnalysedSignal(
            "Комплексный ЛЧМ-сигнал",
            "#dc2626",
            sample_rate_hz,
            ComplexF64.(complex_chirp),
            true,
            true,
        ),
    ]
end

function default_signal_analyser_state()::SignalAnalyserState
    signals = default_signal_catalog()
    SignalAnalyserState(
        signals,
        SignalAnalyserViewState(0, TIME_PLOT, first(signals).name),
        Dict{String,Dict{String,Any}}(),
        ReentrantLock(),
    )
end

function signal_by_name(state::SignalAnalyserState, name::AbstractString)::AnalysedSignal
    index = findfirst(signal -> signal.name == name, state.signals)
    index === nothing && throw(ArgumentError("Сигнал не найден: $name"))
    state.signals[index]
end
