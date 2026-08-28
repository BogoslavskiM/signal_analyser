include(joinpath(@__DIR__, "workspace_catalog.jl"))
include(joinpath(@__DIR__, "signal_inventory.jl"))

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
    id::String
    name::String
    color::String
    sample_rate_hz::Float64
    values::Vector{ComplexF64}
    is_complex::Bool
    visible::Bool

    function AnalysedSignal(
        id::AbstractString,
        name::AbstractString,
        color::AbstractString,
        sample_rate_hz::Real,
        values::AbstractVector{<:Number},
        is_complex::Bool,
        visible::Bool,
    )
        signal_id = String(id)
        isempty(strip(signal_id)) && throw(ArgumentError("Signal id не может быть пустым"))
        signal_name = String(name)
        isempty(strip(signal_name)) && throw(ArgumentError("Имя сигнала не может быть пустым"))
        signal_color = String(color)
        isempty(strip(signal_color)) && throw(ArgumentError("Цвет сигнала не может быть пустым"))
        rate = Float64(sample_rate_hz)
        isfinite(rate) && rate > 0 || throw(ArgumentError(
            "Частота дискретизации должна быть положительной и конечной",
        ))
        samples = ComplexF64.(values)
        !isempty(samples) || throw(ArgumentError("Сигнал должен содержать хотя бы один отсчёт"))
        all(value -> !isinf(real(value)) && !isinf(imag(value)), samples) || throw(
            ArgumentError("Отсчёты сигнала не должны содержать бесконечные значения"),
        )
        !is_complex && any(value -> !iszero(imag(value)), samples) && throw(ArgumentError(
            "Вещественный сигнал не может содержать комплексные отсчёты",
        ))
        new(signal_id, signal_name, signal_color, rate, samples, is_complex, visible)
    end
end

signal_analyser_new_signal_id()::String = "signal-$(lowercase(string(UUIDs.uuid4())))"

AnalysedSignal(
    name::AbstractString,
    color::AbstractString,
    sample_rate_hz::Real,
    values::AbstractVector{<:Number},
    is_complex::Bool,
    visible::Bool,
) = AnalysedSignal(
    signal_analyser_new_signal_id(),
    name,
    color,
    sample_rate_hz,
    values,
    is_complex,
    visible,
)

"""Authoritative per-Display Time region in seconds."""
struct SignalTimeLimits
    min_s::Float64
    max_s::Float64

    function SignalTimeLimits(min_s::Real, max_s::Real)
        minimum_time = Float64(min_s)
        maximum_time = Float64(max_s)
        isfinite(minimum_time) && isfinite(maximum_time) || throw(ArgumentError(
            "Time Limits должны быть конечными числами",
        ))
        minimum_time < maximum_time || throw(ArgumentError(
            "Минимальная Time Limit должна быть меньше максимальной",
        ))
        new(minimum_time, maximum_time)
    end
end

Base.:(==)(left::SignalTimeLimits, right::SignalTimeLimits) =
    left.min_s == right.min_s && left.max_s == right.max_s
Base.isequal(left::SignalTimeLimits, right::SignalTimeLimits) = left == right
Base.hash(limits::SignalTimeLimits, seed::UInt) = hash((limits.min_s, limits.max_s), seed)

@enum SignalSpectrumScale begin
    DB_SPECTRUM_SCALE
    LINEAR_SPECTRUM_SCALE
end

@enum SignalSpectrumFrequencyScale begin
    LINEAR_SPECTRUM_FREQUENCY_SCALE
    LOG_SPECTRUM_FREQUENCY_SCALE
end

@enum SignalSpectrogramFrequencyScale begin
    LINEAR_SPECTROGRAM_FREQUENCY_SCALE
    LOG_SPECTROGRAM_FREQUENCY_SCALE
end

abstract type AbstractSignalSpectrogramPowerLimits end

"""Derive Spectrogram colormap limits from the complete raw power matrix."""
struct AutomaticSignalSpectrogramPowerLimits <: AbstractSignalSpectrogramPowerLimits end

"""User-requested finite Spectrogram colormap interval in canonical dB."""
struct ExplicitSignalSpectrogramPowerLimits <: AbstractSignalSpectrogramPowerLimits
    min_db::Float64
    max_db::Float64

    function ExplicitSignalSpectrogramPowerLimits(min_db::Real, max_db::Real)
        min_db isa Bool && throw(ArgumentError(
            "Минимальная Power Limit Spectrogram должна быть числом, но не Bool",
        ))
        max_db isa Bool && throw(ArgumentError(
            "Максимальная Power Limit Spectrogram должна быть числом, но не Bool",
        ))
        minimum_power = Float64(min_db)
        maximum_power = Float64(max_db)
        isfinite(minimum_power) && isfinite(maximum_power) || throw(ArgumentError(
            "Power Limits Spectrogram должны быть конечными числами",
        ))
        minimum_power < maximum_power || throw(ArgumentError(
            "Минимальная Power Limit Spectrogram должна быть меньше максимальной",
        ))
        new(
            minimum_power == 0.0 ? 0.0 : minimum_power,
            maximum_power == 0.0 ? 0.0 : maximum_power,
        )
    end
end

Base.:(==)(
    ::AutomaticSignalSpectrogramPowerLimits,
    ::AutomaticSignalSpectrogramPowerLimits,
) = true
Base.isequal(
    ::AutomaticSignalSpectrogramPowerLimits,
    ::AutomaticSignalSpectrogramPowerLimits,
) = true
Base.hash(::AutomaticSignalSpectrogramPowerLimits, seed::UInt) =
    hash(:automatic_spectrogram_power_limits, seed)
Base.:(==)(
    left::ExplicitSignalSpectrogramPowerLimits,
    right::ExplicitSignalSpectrogramPowerLimits,
) = left.min_db == right.min_db && left.max_db == right.max_db
Base.isequal(
    left::ExplicitSignalSpectrogramPowerLimits,
    right::ExplicitSignalSpectrogramPowerLimits,
) = left == right
Base.hash(limits::ExplicitSignalSpectrogramPowerLimits, seed::UInt) =
    hash((limits.min_db, limits.max_db), seed)

@enum SignalSpectrumTopology begin
    ONE_SIDED_SPECTRUM
    CENTERED_TWO_SIDED_SPECTRUM
end

abstract type AbstractSignalSpectrumFrequencyLimits end

"""Provider-selected full topology domain."""
struct AutomaticSignalSpectrumFrequencyLimits <: AbstractSignalSpectrumFrequencyLimits end

"""User-requested finite frequency interval in canonical Hz."""
struct ExplicitSignalSpectrumFrequencyLimits <: AbstractSignalSpectrumFrequencyLimits
    min_hz::Float64
    max_hz::Float64

    function ExplicitSignalSpectrumFrequencyLimits(min_hz::Real, max_hz::Real)
        minimum_frequency = Float64(min_hz)
        maximum_frequency = Float64(max_hz)
        isfinite(minimum_frequency) && isfinite(maximum_frequency) || throw(ArgumentError(
            "Frequency Limits должны быть конечными числами",
        ))
        minimum_frequency < maximum_frequency || throw(ArgumentError(
            "Минимальная Frequency Limit должна быть меньше максимальной",
        ))
        new(
            minimum_frequency == 0.0 ? 0.0 : minimum_frequency,
            maximum_frequency == 0.0 ? 0.0 : maximum_frequency,
        )
    end
end

Base.:(==)(::AutomaticSignalSpectrumFrequencyLimits, ::AutomaticSignalSpectrumFrequencyLimits) = true
Base.isequal(::AutomaticSignalSpectrumFrequencyLimits, ::AutomaticSignalSpectrumFrequencyLimits) = true
Base.hash(::AutomaticSignalSpectrumFrequencyLimits, seed::UInt) = hash(:automatic_spectrum_limits, seed)
Base.:(==)(left::ExplicitSignalSpectrumFrequencyLimits, right::ExplicitSignalSpectrumFrequencyLimits) =
    left.min_hz == right.min_hz && left.max_hz == right.max_hz
Base.isequal(
    left::ExplicitSignalSpectrumFrequencyLimits,
    right::ExplicitSignalSpectrumFrequencyLimits,
) = left == right
Base.hash(limits::ExplicitSignalSpectrumFrequencyLimits, seed::UInt) =
    hash((limits.min_hz, limits.max_hz), seed)

"""Persistent per-Display Spectrum presentation and provider settings."""
struct SignalSpectrumSettings
    scale::SignalSpectrumScale
    frequency_scale::SignalSpectrumFrequencyScale
    leakage::Float64
    frequency_limits::AbstractSignalSpectrumFrequencyLimits

    function SignalSpectrumSettings(
        scale::SignalSpectrumScale,
        frequency_scale::SignalSpectrumFrequencyScale,
        leakage::Real,
        frequency_limits::AbstractSignalSpectrumFrequencyLimits,
    )
        leakage_value = Float64(leakage)
        isfinite(leakage_value) && 0.0 <= leakage_value <= 1.0 || throw(ArgumentError(
            "Leakage Spectrum должен быть конечным числом от 0 до 1",
        ))
        new(scale, frequency_scale, leakage_value, frequency_limits)
    end
end

SignalSpectrumSettings(
    scale::SignalSpectrumScale,
    frequency_scale::SignalSpectrumFrequencyScale,
    leakage::Real,
) = SignalSpectrumSettings(
    scale,
    frequency_scale,
    leakage,
    AutomaticSignalSpectrumFrequencyLimits(),
)

SignalSpectrumSettings() = SignalSpectrumSettings(
    DB_SPECTRUM_SCALE,
    LINEAR_SPECTRUM_FREQUENCY_SCALE,
    0.5,
    AutomaticSignalSpectrumFrequencyLimits(),
)

Base.:(==)(left::SignalSpectrumSettings, right::SignalSpectrumSettings) =
    left.scale == right.scale &&
    left.frequency_scale == right.frequency_scale &&
    left.leakage == right.leakage &&
    left.frequency_limits == right.frequency_limits
Base.isequal(left::SignalSpectrumSettings, right::SignalSpectrumSettings) = left == right
Base.hash(settings::SignalSpectrumSettings, seed::UInt) =
    hash((settings.scale, settings.frequency_scale, settings.leakage, settings.frequency_limits), seed)

"""A prospective Display/source combination violates a persisted semantic invariant."""
struct SignalAnalysisSourceCompatibilityError <: Exception
    field::String
    message::String
end

Base.showerror(io::IO, err::SignalAnalysisSourceCompatibilityError) = print(io, err.message)

"""Persistent per-Display Spectrogram provider and presentation settings."""
struct SignalSpectrogramSettings
    overlap_percent::Float64
    leakage::Float64
    frequency_limits::AbstractSignalSpectrumFrequencyLimits
    frequency_scale::SignalSpectrogramFrequencyScale
    power_limits::AbstractSignalSpectrogramPowerLimits

    function SignalSpectrogramSettings(
        overlap_percent::Real,
        leakage::Real,
        frequency_limits::AbstractSignalSpectrumFrequencyLimits,
        frequency_scale::SignalSpectrogramFrequencyScale,
        power_limits::AbstractSignalSpectrogramPowerLimits,
    )
        overlap_percent isa Bool && throw(ArgumentError(
            "Overlap Spectrogram должен быть числом, но не Bool",
        ))
        overlap_value = Float64(overlap_percent)
        isfinite(overlap_value) && 0.0 <= overlap_value <= 75.0 || throw(ArgumentError(
            "Overlap Spectrogram должен быть конечным числом от 0 до 75 процентов",
        ))
        leakage isa Bool && throw(ArgumentError(
            "Leakage Spectrogram должен быть числом, но не Bool",
        ))
        leakage_value = Float64(leakage)
        isfinite(leakage_value) && 0.0 <= leakage_value <= 1.0 || throw(ArgumentError(
            "Leakage Spectrogram должен быть конечным числом от 0 до 1",
        ))
        new(
            overlap_value == 0.0 ? 0.0 : overlap_value,
            leakage_value == 0.0 ? 0.0 : leakage_value,
            frequency_limits,
            frequency_scale,
            power_limits,
        )
    end
end

SignalSpectrogramSettings(
    overlap_percent::Real,
    leakage::Real,
    frequency_limits::AbstractSignalSpectrumFrequencyLimits,
    frequency_scale::SignalSpectrogramFrequencyScale,
) = SignalSpectrogramSettings(
    overlap_percent,
    leakage,
    frequency_limits,
    frequency_scale,
    AutomaticSignalSpectrogramPowerLimits(),
)

SignalSpectrogramSettings(
    overlap_percent::Real,
    leakage::Real,
    frequency_limits::AbstractSignalSpectrumFrequencyLimits,
) = SignalSpectrogramSettings(
    overlap_percent,
    leakage,
    frequency_limits,
    LINEAR_SPECTROGRAM_FREQUENCY_SCALE,
)
SignalSpectrogramSettings(overlap_percent::Real, leakage::Real) =
    SignalSpectrogramSettings(
        overlap_percent,
        leakage,
        AutomaticSignalSpectrumFrequencyLimits(),
    )
SignalSpectrogramSettings(overlap_percent::Real) =
    SignalSpectrogramSettings(overlap_percent, 0.5)
SignalSpectrogramSettings() = SignalSpectrogramSettings(50.0, 0.5)

Base.:(==)(left::SignalSpectrogramSettings, right::SignalSpectrogramSettings) =
    left.overlap_percent == right.overlap_percent &&
    left.leakage == right.leakage &&
    left.frequency_limits == right.frequency_limits &&
    left.frequency_scale == right.frequency_scale &&
    left.power_limits == right.power_limits
Base.isequal(left::SignalSpectrogramSettings, right::SignalSpectrogramSettings) = left == right
Base.hash(settings::SignalSpectrogramSettings, seed::UInt) =
    hash(
        (
            settings.overlap_percent,
            settings.leakage,
            settings.frequency_limits,
            settings.frequency_scale,
            settings.power_limits,
        ),
        seed,
    )

"""Compare only settings that define raw Spectrogram provider data."""
signal_spectrogram_provider_settings_equal(
    left::SignalSpectrogramSettings,
    right::SignalSpectrogramSettings,
) =
    left.overlap_percent == right.overlap_percent &&
    left.leakage == right.leakage &&
    left.frequency_limits == right.frequency_limits

function signal_spectrogram_effective_frequency_scale(
    settings::SignalSpectrogramSettings,
    topology::SignalSpectrumTopology,
)::SignalSpectrogramFrequencyScale
    topology == CENTERED_TWO_SIDED_SPECTRUM ?
        LINEAR_SPECTROGRAM_FREQUENCY_SCALE : settings.frequency_scale
end

function signal_spectrogram_available_frequency_scales(
    topology::SignalSpectrumTopology,
)::Vector{SignalSpectrogramFrequencyScale}
    topology == CENTERED_TWO_SIDED_SPECTRUM ?
        SignalSpectrogramFrequencyScale[LINEAR_SPECTROGRAM_FREQUENCY_SCALE] :
        SignalSpectrogramFrequencyScale[
            LINEAR_SPECTROGRAM_FREQUENCY_SCALE,
            LOG_SPECTROGRAM_FREQUENCY_SCALE,
        ]
end

"""Inclusive 1-based raw sample range shared by ROI consumers."""
struct SignalTimeSampleRange
    first_index::Int
    last_index::Int

    function SignalTimeSampleRange(first_index::Int, last_index::Int)
        first_index >= 1 || throw(ArgumentError("Первый индекс sample range должен быть положительным"))
        last_index >= first_index || throw(ArgumentError(
            "Последний индекс sample range не может предшествовать первому",
        ))
        new(first_index, last_index)
    end
end

Base.length(range::SignalTimeSampleRange) = range.last_index - range.first_index + 1
Base.:(==)(left::SignalTimeSampleRange, right::SignalTimeSampleRange) =
    left.first_index == right.first_index && left.last_index == right.last_index
Base.isequal(left::SignalTimeSampleRange, right::SignalTimeSampleRange) = left == right
Base.hash(range::SignalTimeSampleRange, seed::UInt) =
    hash((range.first_index, range.last_index), seed)

"""Typed raw-complex-preserving Spectrum provider query."""
struct SignalSpectrumQuery
    signal_name::String
    values::Vector{ComplexF64}
    sample_rate_hz::Float64
    sample_range::SignalTimeSampleRange
    leakage::Float64
    topology::SignalSpectrumTopology
    frequency_limits::AbstractSignalSpectrumFrequencyLimits

    function SignalSpectrumQuery(
        signal_name::AbstractString,
        values::AbstractVector{<:Number},
        sample_rate_hz::Real,
        sample_range::SignalTimeSampleRange,
        leakage::Real,
        topology::SignalSpectrumTopology,
        frequency_limits::AbstractSignalSpectrumFrequencyLimits,
    )
        isempty(signal_name) && throw(ArgumentError("Имя сигнала Spectrum query не может быть пустым"))
        samples = ComplexF64.(values)
        length(samples) == length(sample_range) || throw(ArgumentError(
            "Число отсчётов Spectrum query не совпадает с sample range",
        ))
        length(samples) >= 2 || throw(ArgumentError(
            "Spectrum provider query требует не менее двух отсчётов",
        ))
        all(value -> isfinite(real(value)) && isfinite(imag(value)), samples) || throw(ArgumentError(
            "Отсчёты Spectrum query должны быть конечными",
        ))
        sample_rate_value = Float64(sample_rate_hz)
        isfinite(sample_rate_value) && sample_rate_value > 0 || throw(ArgumentError(
            "Частота дискретизации Spectrum query должна быть положительной и конечной",
        ))
        leakage_value = Float64(leakage)
        isfinite(leakage_value) && 0.0 <= leakage_value <= 1.0 || throw(ArgumentError(
            "Leakage Spectrum query должен быть конечным числом от 0 до 1",
        ))
        new(
            String(signal_name),
            samples,
            sample_rate_value,
            sample_range,
            leakage_value,
            topology,
            frequency_limits,
        )
    end
end

SignalSpectrumQuery(
    signal_name::AbstractString,
    values::AbstractVector{<:Number},
    sample_rate_hz::Real,
    sample_range::SignalTimeSampleRange,
    leakage::Real,
    topology::SignalSpectrumTopology,
) = SignalSpectrumQuery(
    signal_name,
    values,
    sample_rate_hz,
    sample_range,
    leakage,
    topology,
    AutomaticSignalSpectrumFrequencyLimits(),
)

"""Validated raw provider power and frequency output before presentation scale."""
struct SignalSpectrumData
    frequencies_hz::Tuple{Vararg{Float64}}
    power::Tuple{Vararg{Float64}}
    topology::SignalSpectrumTopology

    function SignalSpectrumData(
        frequencies_hz::AbstractVector{<:Real},
        power::AbstractVector{<:Real},
        topology::SignalSpectrumTopology,
    )
        frequencies = Float64.(frequencies_hz)
        powers = Float64.(power)
        length(frequencies) == length(powers) || throw(ArgumentError(
            "Оси Spectrum provider имеют разную длину",
        ))
        all(isfinite, frequencies) || throw(ArgumentError(
            "Spectrum provider вернул нечисловые частоты",
        ))
        all(value -> isfinite(value) && value >= 0.0, powers) || throw(ArgumentError(
            "Spectrum provider вернул некорректную мощность",
        ))
        new(Tuple(frequencies), Tuple(powers), topology)
    end
end

SignalSpectrumData(topology::SignalSpectrumTopology) =
    SignalSpectrumData(Float64[], Float64[], topology)

abstract type AbstractSignalSpectrumProvider end
struct EngeeDSPSpectrumProvider <: AbstractSignalSpectrumProvider end

struct SignalSpectrumService{P<:AbstractSignalSpectrumProvider}
    provider::P
end

SignalSpectrumService() = SignalSpectrumService(EngeeDSPSpectrumProvider())

"""Runtime cache identity for raw Spectrum data; presentation scales are excluded."""
struct SignalSpectrumCacheKey
    signal_name::String
    sample_rate_hz::Float64
    sample_range::SignalTimeSampleRange
    leakage::Float64
    topology::SignalSpectrumTopology
    frequency_limits::AbstractSignalSpectrumFrequencyLimits
end

SignalSpectrumCacheKey(query::SignalSpectrumQuery) = SignalSpectrumCacheKey(
    query.signal_name,
    query.sample_rate_hz,
    query.sample_range,
    query.leakage,
    query.topology,
    query.frequency_limits,
)

SignalSpectrumCacheKey(
    signal_name::AbstractString,
    sample_rate_hz::Real,
    sample_range::SignalTimeSampleRange,
    leakage::Real,
    topology::SignalSpectrumTopology,
) = SignalSpectrumCacheKey(
    String(signal_name),
    Float64(sample_rate_hz),
    sample_range,
    Float64(leakage),
    topology,
    AutomaticSignalSpectrumFrequencyLimits(),
)

Base.:(==)(left::SignalSpectrumCacheKey, right::SignalSpectrumCacheKey) =
    left.signal_name == right.signal_name &&
    left.sample_rate_hz == right.sample_rate_hz &&
    left.sample_range == right.sample_range &&
    left.leakage == right.leakage &&
    left.topology == right.topology &&
    left.frequency_limits == right.frequency_limits
Base.isequal(left::SignalSpectrumCacheKey, right::SignalSpectrumCacheKey) = left == right
Base.hash(key::SignalSpectrumCacheKey, seed::UInt) = hash(
    (
        key.signal_name,
        key.sample_rate_hz,
        key.sample_range,
        key.leakage,
        key.topology,
        key.frequency_limits,
    ),
    seed,
)

"""Typed full-raw-signal query for the Spectrogram provider."""
struct SignalSpectrogramQuery
    signal_name::String
    values::Vector{ComplexF64}
    sample_rate_hz::Float64
    topology::SignalSpectrumTopology
    overlap_percent::Float64
    leakage::Float64
    frequency_limits::AbstractSignalSpectrumFrequencyLimits

    function SignalSpectrogramQuery(
        signal_name::AbstractString,
        values::AbstractVector{<:Number},
        sample_rate_hz::Real,
        topology::SignalSpectrumTopology,
        overlap_percent::Real,
        leakage::Real,
        frequency_limits::AbstractSignalSpectrumFrequencyLimits,
    )
        isempty(signal_name) && throw(ArgumentError(
            "Имя сигнала Spectrogram query не может быть пустым",
        ))
        samples = ComplexF64.(values)
        length(samples) >= 2 || throw(ArgumentError(
            "Spectrogram provider query требует не менее двух отсчётов",
        ))
        all(value -> isfinite(real(value)) && isfinite(imag(value)), samples) || throw(ArgumentError(
            "Отсчёты Spectrogram query должны быть конечными",
        ))
        sample_rate_value = Float64(sample_rate_hz)
        isfinite(sample_rate_value) && sample_rate_value > 0 || throw(ArgumentError(
            "Частота дискретизации Spectrogram query должна быть положительной и конечной",
        ))
        settings = SignalSpectrogramSettings(overlap_percent, leakage, frequency_limits)
        new(
            String(signal_name),
            samples,
            sample_rate_value,
            topology,
            settings.overlap_percent,
            settings.leakage,
            settings.frequency_limits,
        )
    end
end

SignalSpectrogramQuery(
    signal_name::AbstractString,
    values::AbstractVector{<:Number},
    sample_rate_hz::Real,
    topology::SignalSpectrumTopology,
    overlap_percent::Real,
    leakage::Real,
) = SignalSpectrogramQuery(
    signal_name,
    values,
    sample_rate_hz,
    topology,
    overlap_percent,
    leakage,
    AutomaticSignalSpectrumFrequencyLimits(),
)

SignalSpectrogramQuery(
    signal_name::AbstractString,
    values::AbstractVector{<:Number},
    sample_rate_hz::Real,
    topology::SignalSpectrumTopology,
    overlap_percent::Real,
) = SignalSpectrogramQuery(
    signal_name,
    values,
    sample_rate_hz,
    topology,
    overlap_percent,
    SignalSpectrogramSettings().leakage,
)

SignalSpectrogramQuery(
    signal_name::AbstractString,
    values::AbstractVector{<:Number},
    sample_rate_hz::Real,
    topology::SignalSpectrumTopology,
) = SignalSpectrogramQuery(
    signal_name,
    values,
    sample_rate_hz,
    topology,
    SignalSpectrogramSettings().overlap_percent,
    SignalSpectrogramSettings().leakage,
)

"""Validated raw Spectrogram provider data in frequency-by-segment-time orientation."""
struct SignalSpectrogramData
    frequencies_hz::Tuple{Vararg{Float64}}
    segment_centers_s::Tuple{Vararg{Float64}}
    power::Matrix{Float64}
    topology::SignalSpectrumTopology

    function SignalSpectrogramData(
        frequencies_hz::AbstractVector{<:Real},
        segment_centers_s::AbstractVector{<:Real},
        power::AbstractMatrix,
        topology::SignalSpectrumTopology,
    )
        frequencies = Float64.(frequencies_hz)
        segment_centers = Float64.(segment_centers_s)
        all(isfinite, frequencies) || throw(ArgumentError(
            "Spectrogram provider вернул нечисловые частоты",
        ))
        all(isfinite, segment_centers) || throw(ArgumentError(
            "Spectrogram provider вернул нечисловые центры сегментов",
        ))
        issorted(frequencies) || throw(ArgumentError(
            "Spectrogram provider вернул неупорядоченную частотную ось",
        ))
        issorted(segment_centers) || throw(ArgumentError(
            "Spectrogram provider вернул неупорядоченную временную ось",
        ))
        provider_power = Matrix(collect(power))
        size(provider_power) == (length(frequencies), length(segment_centers)) ||
            throw(DimensionMismatch(
                "Матрица Spectrogram provider имеет размер $(size(provider_power)), " *
                "ожидался ($(length(frequencies)), $(length(segment_centers)))",
            ))
        all(value -> value isa Real, provider_power) || throw(ArgumentError(
            "Spectrogram provider вернул комплексную мощность",
        ))
        powers = Float64.(provider_power)
        all(value -> isfinite(value) && value >= 0.0, powers) || throw(ArgumentError(
            "Spectrogram provider вернул некорректную мощность",
        ))
        new(Tuple(frequencies), Tuple(segment_centers), powers, topology)
    end
end

SignalSpectrogramData(topology::SignalSpectrumTopology) = SignalSpectrogramData(
    Float64[],
    Float64[],
    zeros(Float64, 0, 0),
    topology,
)

Base.:(==)(left::SignalSpectrogramData, right::SignalSpectrogramData) =
    left.frequencies_hz == right.frequencies_hz &&
    left.segment_centers_s == right.segment_centers_s &&
    left.power == right.power &&
    left.topology == right.topology
Base.isequal(left::SignalSpectrogramData, right::SignalSpectrogramData) =
    isequal(left.frequencies_hz, right.frequencies_hz) &&
    isequal(left.segment_centers_s, right.segment_centers_s) &&
    isequal(left.power, right.power) &&
    isequal(left.topology, right.topology)

abstract type AbstractSignalSpectrogramProvider end
struct EngeeDSPSpectrogramProvider <: AbstractSignalSpectrogramProvider end

struct SignalSpectrogramService{P<:AbstractSignalSpectrogramProvider}
    provider::P
end

SignalSpectrogramService() = SignalSpectrogramService(EngeeDSPSpectrogramProvider())

"""Runtime cache identity for full-resolution raw Spectrogram provider data."""
struct SignalSpectrogramCacheKey
    signal_name::String
    sample_rate_hz::Float64
    sample_count::Int
    topology::SignalSpectrumTopology
    overlap_percent::Float64
    leakage::Float64
    frequency_limits::AbstractSignalSpectrumFrequencyLimits

    function SignalSpectrogramCacheKey(
        signal_name::AbstractString,
        sample_rate_hz::Real,
        sample_count::Integer,
        topology::SignalSpectrumTopology,
        overlap_percent::Real,
        leakage::Real,
        frequency_limits::AbstractSignalSpectrumFrequencyLimits,
    )
        isempty(signal_name) && throw(ArgumentError(
            "Имя сигнала Spectrogram cache key не может быть пустым",
        ))
        sample_rate_hz isa Bool && throw(ArgumentError(
            "Частота дискретизации Spectrogram cache key должна быть числом, но не Bool",
        ))
        sample_rate_value = Float64(sample_rate_hz)
        isfinite(sample_rate_value) && sample_rate_value > 0 || throw(ArgumentError(
            "Частота дискретизации Spectrogram cache key должна быть положительной и конечной",
        ))
        sample_count isa Bool && throw(ArgumentError(
            "Число отсчётов Spectrogram cache key должно быть целым числом, но не Bool",
        ))
        sample_count >= 0 || throw(ArgumentError(
            "Число отсчётов Spectrogram cache key не может быть отрицательным",
        ))
        settings = SignalSpectrogramSettings(overlap_percent, leakage, frequency_limits)
        new(
            String(signal_name),
            sample_rate_value,
            Int(sample_count),
            topology,
            settings.overlap_percent,
            settings.leakage,
            settings.frequency_limits,
        )
    end
end

SignalSpectrogramCacheKey(
    signal_name::AbstractString,
    sample_rate_hz::Real,
    sample_count::Integer,
    topology::SignalSpectrumTopology,
    overlap_percent::Real,
    leakage::Real,
) = SignalSpectrogramCacheKey(
    signal_name,
    sample_rate_hz,
    sample_count,
    topology,
    overlap_percent,
    leakage,
    AutomaticSignalSpectrumFrequencyLimits(),
)

SignalSpectrogramCacheKey(query::SignalSpectrogramQuery) = SignalSpectrogramCacheKey(
    query.signal_name,
    query.sample_rate_hz,
    length(query.values),
    query.topology,
    query.overlap_percent,
    query.leakage,
    query.frequency_limits,
)

SignalSpectrogramCacheKey(
    signal_name::AbstractString,
    sample_rate_hz::Real,
    sample_count::Int,
    topology::SignalSpectrumTopology,
    overlap_percent::Real,
) = SignalSpectrogramCacheKey(
    signal_name,
    sample_rate_hz,
    sample_count,
    topology,
    overlap_percent,
    SignalSpectrogramSettings().leakage,
)

SignalSpectrogramCacheKey(
    signal_name::AbstractString,
    sample_rate_hz::Real,
    sample_count::Int,
    topology::SignalSpectrumTopology,
) = SignalSpectrogramCacheKey(
    signal_name,
    sample_rate_hz,
    sample_count,
    topology,
    SignalSpectrogramSettings().overlap_percent,
    SignalSpectrogramSettings().leakage,
)

Base.:(==)(left::SignalSpectrogramCacheKey, right::SignalSpectrogramCacheKey) =
    left.signal_name == right.signal_name &&
    left.sample_rate_hz == right.sample_rate_hz &&
    left.sample_count == right.sample_count &&
    left.topology == right.topology &&
    left.overlap_percent == right.overlap_percent &&
    left.leakage == right.leakage &&
    left.frequency_limits == right.frequency_limits
Base.isequal(left::SignalSpectrogramCacheKey, right::SignalSpectrogramCacheKey) = left == right
Base.hash(key::SignalSpectrogramCacheKey, seed::UInt) = hash(
    (
        key.signal_name,
        key.sample_rate_hz,
        key.sample_count,
        key.topology,
        key.overlap_percent,
        key.leakage,
        key.frequency_limits,
    ),
    seed,
)

const SIGNAL_PERSISTENCE_DEFAULT_NUM_POWER_BINS = 256

"""Persistent per-Display Persistence provider settings."""
struct SignalPersistenceSettings
    leakage::Float64

    function SignalPersistenceSettings(leakage::Real)
        leakage isa Bool && throw(ArgumentError(
            "Leakage Persistence должен быть числом, но не Bool",
        ))
        leakage_value = Float64(leakage)
        isfinite(leakage_value) && 0.0 <= leakage_value <= 1.0 || throw(ArgumentError(
            "Leakage Persistence должен быть конечным числом от 0 до 1",
        ))
        new(leakage_value == 0.0 ? 0.0 : leakage_value)
    end
end

SignalPersistenceSettings() = SignalPersistenceSettings(0.5)

Base.copy(settings::SignalPersistenceSettings) = settings
Base.:(==)(left::SignalPersistenceSettings, right::SignalPersistenceSettings) =
    left.leakage == right.leakage
Base.isequal(left::SignalPersistenceSettings, right::SignalPersistenceSettings) = left == right
Base.hash(settings::SignalPersistenceSettings, seed::UInt) = hash(settings.leakage, seed)

"""Typed full-raw-signal query for the Persistence provider."""
struct SignalPersistenceQuery
    signal_name::String
    values::Vector{ComplexF64}
    sample_rate_hz::Float64
    topology::SignalSpectrumTopology
    num_power_bins::Int
    leakage::Float64

    function SignalPersistenceQuery(
        signal_name::AbstractString,
        values::AbstractVector{<:Number},
        sample_rate_hz::Real,
        topology::SignalSpectrumTopology,
        num_power_bins::Integer,
        leakage::Real,
    )
        isempty(signal_name) && throw(ArgumentError(
            "Имя сигнала Persistence query не может быть пустым",
        ))
        samples = ComplexF64.(values)
        all(value -> isfinite(real(value)) && isfinite(imag(value)), samples) ||
            throw(ArgumentError("Отсчёты Persistence query должны быть конечными"))
        sample_rate_hz isa Bool && throw(ArgumentError(
            "Частота дискретизации Persistence query должна быть числом, но не Bool",
        ))
        sample_rate_value = Float64(sample_rate_hz)
        isfinite(sample_rate_value) && sample_rate_value > 0 || throw(ArgumentError(
            "Частота дискретизации Persistence query должна быть положительной и конечной",
        ))
        num_power_bins isa Bool && throw(ArgumentError(
            "Число power bins Persistence query должно быть целым числом, но не Bool",
        ))
        num_power_bins > 0 || throw(ArgumentError(
            "Число power bins Persistence query должно быть положительным",
        ))
        persistence_settings = SignalPersistenceSettings(leakage)
        new(
            String(signal_name),
            samples,
            sample_rate_value,
            topology,
            Int(num_power_bins),
            persistence_settings.leakage,
        )
    end
end

SignalPersistenceQuery(
    signal_name::AbstractString,
    values::AbstractVector{<:Number},
    sample_rate_hz::Real,
    topology::SignalSpectrumTopology,
    num_power_bins::Integer,
) = SignalPersistenceQuery(
    signal_name,
    values,
    sample_rate_hz,
    topology,
    num_power_bins,
    SignalPersistenceSettings().leakage,
)

SignalPersistenceQuery(
    signal_name::AbstractString,
    values::AbstractVector{<:Number},
    sample_rate_hz::Real,
    topology::SignalSpectrumTopology,
) = SignalPersistenceQuery(
    signal_name,
    values,
    sample_rate_hz,
    topology,
    SIGNAL_PERSISTENCE_DEFAULT_NUM_POWER_BINS,
)

"""Validated raw Persistence provider data in power-by-frequency orientation."""
struct SignalPersistenceData
    frequencies_hz::Tuple{Vararg{Float64}}
    power_levels::Tuple{Vararg{Float64}}
    occurrence_percent::Matrix{Float64}
    topology::SignalSpectrumTopology

    function SignalPersistenceData(
        frequencies_hz::AbstractVector{<:Real},
        power_levels::AbstractVector{<:Real},
        occurrence_percent::AbstractMatrix,
        topology::SignalSpectrumTopology,
    )
        frequencies = Float64.(frequencies_hz)
        powers = Float64.(power_levels)
        all(isfinite, frequencies) || throw(ArgumentError(
            "Persistence provider вернул нечисловые частоты",
        ))
        all(isfinite, powers) || throw(ArgumentError(
            "Persistence provider вернул нечисловые уровни мощности",
        ))
        all(value -> value > 0.0, powers) || throw(ArgumentError(
            "Persistence provider вернул неположительные уровни мощности",
        ))
        all(diff(frequencies) .> 0.0) || throw(ArgumentError(
            "Persistence provider вернул нестрого возрастающую частотную ось",
        ))
        all(diff(powers) .> 0.0) || throw(ArgumentError(
            "Persistence provider вернул нестрого возрастающую ось мощности",
        ))
        provider_occurrence = Matrix(collect(occurrence_percent))
        size(provider_occurrence) == (length(powers), length(frequencies)) ||
            throw(DimensionMismatch(
                "Матрица Persistence provider имеет размер $(size(provider_occurrence)), " *
                "ожидался ($(length(powers)), $(length(frequencies)))",
            ))
        all(value -> value isa Real, provider_occurrence) || throw(ArgumentError(
            "Persistence provider вернул комплексную встречаемость",
        ))
        occurrence = Float64.(provider_occurrence)
        all(value -> isfinite(value) && 0.0 <= value <= 100.0, occurrence) ||
            throw(ArgumentError("Persistence provider вернул встречаемость вне диапазона 0–100 %"))
        isempty(frequencies) == isempty(powers) || throw(ArgumentError(
            "Оси empty Persistence должны быть пусты одновременно",
        ))
        new(Tuple(frequencies), Tuple(powers), occurrence, topology)
    end
end

SignalPersistenceData(topology::SignalSpectrumTopology) = SignalPersistenceData(
    Float64[],
    Float64[],
    zeros(Float64, 0, 0),
    topology,
)

Base.:(==)(left::SignalPersistenceData, right::SignalPersistenceData) =
    left.frequencies_hz == right.frequencies_hz &&
    left.power_levels == right.power_levels &&
    left.occurrence_percent == right.occurrence_percent &&
    left.topology == right.topology
Base.isequal(left::SignalPersistenceData, right::SignalPersistenceData) =
    isequal(left.frequencies_hz, right.frequencies_hz) &&
    isequal(left.power_levels, right.power_levels) &&
    isequal(left.occurrence_percent, right.occurrence_percent) &&
    isequal(left.topology, right.topology)

abstract type AbstractSignalPersistenceProvider end
struct EngeeDSPPersistenceProvider <: AbstractSignalPersistenceProvider end

struct SignalPersistenceService{P<:AbstractSignalPersistenceProvider}
    provider::P
end

SignalPersistenceService() = SignalPersistenceService(EngeeDSPPersistenceProvider())

"""Runtime cache identity for full-resolution raw Persistence provider data."""
struct SignalPersistenceCacheKey
    signal_name::String
    sample_rate_hz::Float64
    sample_count::Int
    topology::SignalSpectrumTopology
    num_power_bins::Int
    leakage::Float64

    function SignalPersistenceCacheKey(
        signal_name::AbstractString,
        sample_rate_hz::Real,
        sample_count::Integer,
        topology::SignalSpectrumTopology,
        num_power_bins::Integer,
        leakage::Real,
    )
        isempty(signal_name) && throw(ArgumentError(
            "Имя сигнала Persistence cache key не может быть пустым",
        ))
        sample_rate_hz isa Bool && throw(ArgumentError(
            "Частота дискретизации Persistence cache key должна быть числом, но не Bool",
        ))
        sample_rate_value = Float64(sample_rate_hz)
        isfinite(sample_rate_value) && sample_rate_value > 0 || throw(ArgumentError(
            "Частота дискретизации Persistence cache key должна быть положительной и конечной",
        ))
        sample_count isa Bool && throw(ArgumentError(
            "Число отсчётов Persistence cache key должно быть целым числом, но не Bool",
        ))
        sample_count >= 0 || throw(ArgumentError(
            "Число отсчётов Persistence cache key не может быть отрицательным",
        ))
        num_power_bins isa Bool && throw(ArgumentError(
            "Число power bins Persistence cache key должно быть целым числом, но не Bool",
        ))
        num_power_bins > 0 || throw(ArgumentError(
            "Число power bins Persistence cache key должно быть положительным",
        ))
        persistence_settings = SignalPersistenceSettings(leakage)
        new(
            String(signal_name),
            sample_rate_value,
            Int(sample_count),
            topology,
            Int(num_power_bins),
            persistence_settings.leakage,
        )
    end
end

SignalPersistenceCacheKey(
    signal_name::AbstractString,
    sample_rate_hz::Real,
    sample_count::Integer,
    topology::SignalSpectrumTopology,
    num_power_bins::Integer,
) = SignalPersistenceCacheKey(
    signal_name,
    sample_rate_hz,
    sample_count,
    topology,
    num_power_bins,
    SignalPersistenceSettings().leakage,
)

SignalPersistenceCacheKey(query::SignalPersistenceQuery) = SignalPersistenceCacheKey(
    query.signal_name,
    query.sample_rate_hz,
    length(query.values),
    query.topology,
    query.num_power_bins,
    query.leakage,
)

Base.:(==)(left::SignalPersistenceCacheKey, right::SignalPersistenceCacheKey) =
    left.signal_name == right.signal_name &&
    left.sample_rate_hz == right.sample_rate_hz &&
    left.sample_count == right.sample_count &&
    left.topology == right.topology &&
    left.num_power_bins == right.num_power_bins &&
    left.leakage == right.leakage
Base.isequal(left::SignalPersistenceCacheKey, right::SignalPersistenceCacheKey) = left == right
Base.hash(key::SignalPersistenceCacheKey, seed::UInt) = hash(
    (
        key.signal_name,
        key.sample_rate_hz,
        key.sample_count,
        key.topology,
        key.num_power_bins,
        key.leakage,
    ),
    seed,
)

@enum SignalMeasurementOrdinate begin
    REAL_ORDINATE
    MAGNITUDE_ORDINATE
end

"""Finite raw ordinate samples inside an inclusive Time ROI."""
struct SignalOrdinateRoi
    ordinate::SignalMeasurementOrdinate
    values::Vector{Float64}
    sample_offset::Int
    sample_rate_hz::Float64

    function SignalOrdinateRoi(
        ordinate::SignalMeasurementOrdinate,
        values::AbstractVector{<:Real},
        sample_offset::Int,
        sample_rate_hz::Real,
    )
        roi_values = values isa Vector{Float64} ? values : Float64.(values)
        isempty(roi_values) && throw(ArgumentError("Time Limits не содержат ни одного отсчёта"))
        all(isfinite, roi_values) || throw(ArgumentError("ROI сигнала содержит нечисловые отсчёты"))
        sample_offset >= 0 || throw(ArgumentError("Смещение ROI не может быть отрицательным"))
        isfinite(sample_rate_hz) && sample_rate_hz > 0 || throw(ArgumentError(
            "Частота дискретизации ROI должна быть положительной и конечной",
        ))
        new(ordinate, roi_values, sample_offset, Float64(sample_rate_hz))
    end
end

"""Stateless domain collaborator that resolves inclusive raw Time ROIs."""
struct SignalTimeRoiService end

@enum SignalMeasurementKind begin
    MINIMUM_MEASUREMENT
    MAXIMUM_MEASUREMENT
    MEAN_MEASUREMENT
    MEDIAN_MEASUREMENT
    PEAK_TO_PEAK_MEASUREMENT
    RMS_MEASUREMENT
end

const SIGNAL_MEASUREMENT_CANONICAL_KINDS = (
    MINIMUM_MEASUREMENT,
    MAXIMUM_MEASUREMENT,
    MEAN_MEASUREMENT,
    MEDIAN_MEASUREMENT,
    PEAK_TO_PEAK_MEASUREMENT,
    RMS_MEASUREMENT,
)
const SIGNAL_MEASUREMENT_DEFAULT_KINDS = (
    MINIMUM_MEASUREMENT,
    MAXIMUM_MEASUREMENT,
    MEAN_MEASUREMENT,
)

const SIGNAL_MEASUREMENT_ORDINATE_NAMES = Dict(
    REAL_ORDINATE => "real",
    MAGNITUDE_ORDINATE => "magnitude",
)

const SIGNAL_MEASUREMENT_ITEM_METADATA = Dict(
    MINIMUM_MEASUREMENT => (id = "minimum", label = "Минимум"),
    MAXIMUM_MEASUREMENT => (id = "maximum", label = "Максимум"),
    MEAN_MEASUREMENT => (id = "mean", label = "Среднее"),
    MEDIAN_MEASUREMENT => (id = "median", label = "Медиана"),
    PEAK_TO_PEAK_MEASUREMENT => (id = "peak_to_peak", label = "Размах"),
    RMS_MEASUREMENT => (id = "rms", label = "СКЗ"),
)

"""Canonical, duplicate-free per-Display Statistics preference."""
struct SignalMeasurementSelection
    kinds::Tuple{Vararg{SignalMeasurementKind}}

    function SignalMeasurementSelection(kinds::Tuple{Vararg{SignalMeasurementKind}})
        length(unique(kinds)) == length(kinds) || throw(ArgumentError(
            "Виды измерений не должны повторяться",
        ))
        canonical_kinds = Tuple(
            kind for kind in SIGNAL_MEASUREMENT_CANONICAL_KINDS
            if kind in kinds
        )
        length(canonical_kinds) == length(kinds) || throw(ArgumentError(
            "Выбран неподдерживаемый вид измерения",
        ))
        new(canonical_kinds)
    end
end

SignalMeasurementSelection() = SignalMeasurementSelection(SIGNAL_MEASUREMENT_DEFAULT_KINDS)
SignalMeasurementSelection(kinds::AbstractVector{SignalMeasurementKind}) =
    SignalMeasurementSelection(Tuple(kinds))

Base.:(==)(left::SignalMeasurementSelection, right::SignalMeasurementSelection) =
    left.kinds == right.kinds
Base.isequal(left::SignalMeasurementSelection, right::SignalMeasurementSelection) = left == right
Base.hash(selection::SignalMeasurementSelection, seed::UInt) = hash(selection.kinds, seed)

signal_measurement_selected(selection::SignalMeasurementSelection, kind::SignalMeasurementKind)::Bool =
    kind in selection.kinds

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
        if kind == MINIMUM_MEASUREMENT || kind == MAXIMUM_MEASUREMENT
            position === nothing && throw(ArgumentError("Экстремум должен иметь позицию отсчёта"))
        else
            position === nothing || throw(ArgumentError(
                "Неэкстремальное измерение не имеет позиции отсчёта",
            ))
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
    signal_name::Union{Nothing,String}
    ordinate::Union{Nothing,SignalMeasurementOrdinate}
    units::SignalMeasurementUnits
    items::Tuple{Vararg{SignalMeasurementItem}}

    function SignalMeasurementsSnapshot(
        state_revision::Int,
        signal_name::Union{Nothing,AbstractString},
        ordinate::Union{Nothing,SignalMeasurementOrdinate},
        units::SignalMeasurementUnits,
        items::Tuple{Vararg{SignalMeasurementItem}},
    )
        state_revision >= 0 || throw(ArgumentError("Ревизия snapshot не может быть отрицательной"))
        signal_name === nothing || isempty(signal_name) && throw(ArgumentError("Имя сигнала snapshot не может быть пустым"))
        (signal_name === nothing) == (ordinate === nothing) || throw(ArgumentError(
            "Имя сигнала и ordinate measurements snapshot должны одновременно иметь значение или быть null",
        ))
        kinds = map(item -> item.kind, items)
        if signal_name === nothing
            isempty(items) || throw(ArgumentError("Пустой measurements snapshot не может содержать items"))
        else
            canonical_kinds = SignalMeasurementSelection(kinds).kinds
            kinds == canonical_kinds || throw(ArgumentError(
                "Измерения snapshot должны идти в каноническом порядке",
            ))
        end
        new(state_revision, signal_name === nothing ? nothing : String(signal_name), ordinate, units, items)
    end
end

"""Domain service that derives raw-sample measurements through a typed ROI collaborator."""
struct SignalMeasurementsService
    roi_service::SignalTimeRoiService
end

SignalMeasurementsService() = SignalMeasurementsService(SignalTimeRoiService())

signal_measurement_ordinate_name(ordinate::SignalMeasurementOrdinate)::String =
    SIGNAL_MEASUREMENT_ORDINATE_NAMES[ordinate]
signal_measurement_ordinate_name(::Nothing) = nothing
signal_measurement_metadata(kind::SignalMeasurementKind) = SIGNAL_MEASUREMENT_ITEM_METADATA[kind]

abstract type AbstractPeaksProvider end

"""Production provider marker. EngeeDSP is resolved only when peaks are enabled."""
struct EngeeDSPPeaksProvider <: AbstractPeaksProvider end

struct SignalPeaksCapabilityError <: Exception
    message::String
end

Base.showerror(io::IO, err::SignalPeaksCapabilityError) = print(io, err.message)

const SIGNAL_PEAKS_MAX_NUMBER_OF_PEAKS::Int = 1_000

@enum SignalExtremaMode begin
    MAXIMA_EXTREMA_MODE
    MINIMA_EXTREMA_MODE
    ALL_EXTREMA_MODE
end

const SIGNAL_EXTREMA_MODE_NAMES = Dict{SignalExtremaMode,String}(
    MAXIMA_EXTREMA_MODE => "maxima",
    MINIMA_EXTREMA_MODE => "minima",
    ALL_EXTREMA_MODE => "all",
)
const SIGNAL_EXTREMA_MODES_BY_NAME = Dict{String,SignalExtremaMode}(
    name => mode for (mode, name) in SIGNAL_EXTREMA_MODE_NAMES
)

@enum SignalPeakKind begin
    MAXIMUM_PEAK
    MINIMUM_PEAK
end


const SIGNAL_PEAK_KIND_NAMES = Dict{SignalPeakKind,String}(
    MAXIMUM_PEAK => "maximum",
    MINIMUM_PEAK => "minimum",
)

signal_extrema_mode_name(mode::SignalExtremaMode)::String = SIGNAL_EXTREMA_MODE_NAMES[mode]
signal_peak_kind_name(kind::SignalPeakKind)::String = SIGNAL_PEAK_KIND_NAMES[kind]
signal_peak_kind_order(kind::SignalPeakKind)::Int = kind == MAXIMUM_PEAK ? 0 : 1

"""Provider-affecting Extrema settings on the compatibility Peaks boundary."""
struct SignalPeaksSettings
    mode::SignalExtremaMode
    number_of_peaks::Int
    maximum_cutoff::Union{Nothing,Float64}
    minimum_cutoff::Union{Nothing,Float64}
    minimum_distance_samples::Int
    threshold::Float64

    function SignalPeaksSettings(
        mode::SignalExtremaMode,
        number_of_peaks::Int,
        maximum_cutoff::Union{Nothing,Real},
        minimum_cutoff::Union{Nothing,Real},
        minimum_distance_samples::Int,
        threshold::Real,
    )
        1 <= number_of_peaks <= SIGNAL_PEAKS_MAX_NUMBER_OF_PEAKS || throw(ArgumentError(
            "Количество экстремумов должно быть целым числом от 1 до $(SIGNAL_PEAKS_MAX_NUMBER_OF_PEAKS)",
        ))
        maximum = maximum_cutoff === nothing ? nothing : Float64(maximum_cutoff)
        maximum === nothing || isfinite(maximum) || throw(ArgumentError(
            "Отсечка максимума должна быть конечным числом или null",
        ))
        minimum = minimum_cutoff === nothing ? nothing : Float64(minimum_cutoff)
        minimum === nothing || isfinite(minimum) || throw(ArgumentError(
            "Отсечка минимума должна быть конечным числом или null",
        ))
        minimum_distance_samples >= 1 || throw(ArgumentError(
            "Минимальное расстояние должно быть положительным целым числом отсчётов",
        ))
        threshold_value = Float64(threshold)
        isfinite(threshold_value) && threshold_value >= 0 || throw(ArgumentError(
            "Порог должен быть неотрицательным конечным числом",
        ))
        new(
            mode,
            number_of_peaks,
            maximum,
            minimum,
            minimum_distance_samples,
            threshold_value == 0.0 ? 0.0 : threshold_value,
        )
    end
end

SignalPeaksSettings(
    mode::SignalExtremaMode,
    number_of_peaks::Int,
    minimum_height::Union{Nothing,Real},
    minimum_distance_samples::Int,
    threshold::Real,
) = SignalPeaksSettings(
    mode,
    number_of_peaks,
    mode == MINIMA_EXTREMA_MODE ? nothing : minimum_height,
    mode == MAXIMA_EXTREMA_MODE || minimum_height === nothing ? nothing : -minimum_height,
    minimum_distance_samples,
    threshold,
)

SignalPeaksSettings(
    number_of_peaks::Int,
    minimum_height::Union{Nothing,Real},
    minimum_distance_samples::Int,
    threshold::Real,
) = SignalPeaksSettings(
    MAXIMA_EXTREMA_MODE,
    number_of_peaks,
    minimum_height,
    minimum_distance_samples,
    threshold,
)

SignalPeaksSettings() = SignalPeaksSettings(MAXIMA_EXTREMA_MODE, 5, nothing, nothing, 1, 0.0)

"""Transient canonical viewport used only by an explicit TIME extrema calculation."""
struct SignalTimePeaksVisibleRange
    min_s::Float64
    max_s::Float64

    function SignalTimePeaksVisibleRange(min_s::Real, max_s::Real)
        minimum_value = Float64(min_s)
        maximum_value = Float64(max_s)
        isfinite(minimum_value) && isfinite(maximum_value) || throw(ArgumentError(
            "Visible TIME range должен содержать конечные числа",
        ))
        minimum_value < maximum_value || throw(ArgumentError(
            "Минимум visible TIME range должен быть меньше максимума",
        ))
        new(minimum_value, maximum_value)
    end
end

"""Transient canonical viewport used only by an explicit SPECTRUM extrema calculation."""
struct SignalSpectrumPeaksVisibleRange
    min_hz::Float64
    max_hz::Float64

    function SignalSpectrumPeaksVisibleRange(min_hz::Real, max_hz::Real)
        minimum_value = Float64(min_hz)
        maximum_value = Float64(max_hz)
        isfinite(minimum_value) && isfinite(maximum_value) || throw(ArgumentError(
            "Visible SPECTRUM range должен содержать конечные числа",
        ))
        minimum_value < maximum_value || throw(ArgumentError(
            "Минимум visible SPECTRUM range должен быть меньше максимума",
        ))
        new(minimum_value, maximum_value)
    end
end

const SignalPeaksVisibleRange = Union{
    SignalTimePeaksVisibleRange,
    SignalSpectrumPeaksVisibleRange,
}

struct SignalPeaksQuery
    state_revision::Int
    display_id::String
    signal_name::String
    ordinate::SignalMeasurementOrdinate
    values::Vector{Float64}
    sample_rate_hz::Float64
    sample_offset::Int
    settings::SignalPeaksSettings

    function SignalPeaksQuery(
        state_revision::Int,
        display_id::AbstractString,
        signal_name::AbstractString,
        ordinate::SignalMeasurementOrdinate,
        values::AbstractVector{<:Real},
        sample_rate_hz::Real,
        sample_offset::Int,
        settings::SignalPeaksSettings,
    )
        state_revision >= 0 || throw(ArgumentError("Ревизия peaks query не может быть отрицательной"))
        isempty(display_id) && throw(ArgumentError("Идентификатор Display peaks query не может быть пустым"))
        isempty(signal_name) && throw(ArgumentError("Имя сигнала peaks query не может быть пустым"))
        length(values) >= 3 || throw(ArgumentError("Для расчёта экстремумов нужно не менее трёх отсчётов"))
        peak_values = values isa Vector{Float64} ? values : Float64.(values)
        all(isfinite, peak_values) || throw(ArgumentError("Отсчёты peaks query должны быть конечными"))
        isfinite(sample_rate_hz) && sample_rate_hz > 0 || throw(ArgumentError(
            "Частота дискретизации peaks query должна быть положительной и конечной",
        ))
        sample_offset >= 0 || throw(ArgumentError(
            "Абсолютное смещение peaks query не может быть отрицательным",
        ))
        new(
            state_revision,
            String(display_id),
            String(signal_name),
            ordinate,
            peak_values,
            Float64(sample_rate_hz),
            sample_offset,
            settings,
        )
    end
end

SignalPeaksQuery(
    state_revision::Int,
    display_id::AbstractString,
    signal_name::AbstractString,
    ordinate::SignalMeasurementOrdinate,
    values::AbstractVector{<:Real},
    sample_rate_hz::Real,
    sample_offset::Int,
) = SignalPeaksQuery(
    state_revision,
    display_id,
    signal_name,
    ordinate,
    values,
    sample_rate_hz,
    sample_offset,
    SignalPeaksSettings(),
)

SignalPeaksQuery(
    state_revision::Int,
    display_id::AbstractString,
    signal_name::AbstractString,
    ordinate::SignalMeasurementOrdinate,
    values::AbstractVector{<:Real},
    sample_rate_hz::Real,
) = SignalPeaksQuery(
    state_revision,
    display_id,
    signal_name,
    ordinate,
    values,
    sample_rate_hz,
    0,
    SignalPeaksSettings(),
)

struct SignalPeaksProviderResult
    peak_values::Tuple{Vararg{Float64}}
    locations_1based::Tuple{Vararg{Int}}
    widths_samples::Tuple{Vararg{Float64}}
    prominences::Tuple{Vararg{Float64}}
    kinds::Tuple{Vararg{SignalPeakKind}}

    function SignalPeaksProviderResult(
        peak_values::AbstractVector{<:Real},
        locations_1based::AbstractVector{<:Integer},
        widths_samples::AbstractVector{<:Real},
        prominences::AbstractVector{<:Real},
        kinds::AbstractVector{SignalPeakKind},
        sample_count::Int,
    )
        sample_count >= 3 || throw(ArgumentError("Результат peaks требует не менее трёх исходных отсчётов"))
        count = length(peak_values)
        count == length(locations_1based) == length(widths_samples) == length(prominences) == length(kinds) || throw(
            DimensionMismatch("Массивы Ypk, Xpk, Wpk, Ppk и kinds должны иметь одинаковую длину"),
        )
        values = Float64.(peak_values)
        locations = Int.(locations_1based)
        widths = Float64.(widths_samples)
        peak_prominences = Float64.(prominences)
        all(isfinite, values) || throw(ArgumentError("Значения Ypk должны быть конечными"))
        all(location -> 1 <= location <= sample_count, locations) || throw(ArgumentError(
            "Индексы Xpk должны находиться внутри исходного сигнала",
        ))
        extrema_keys = [
            (locations[index], signal_peak_kind_order(kinds[index])) for index in eachindex(locations)
        ]
        issorted(extrema_keys) && allunique(extrema_keys) || throw(ArgumentError(
            "Экстремумы должны быть уникальными и следовать в хронологическом порядке",
        ))
        all(value -> isfinite(value) && value >= 0, widths) || throw(ArgumentError(
            "Значения Wpk должны быть неотрицательными и конечными",
        ))
        all(value -> isfinite(value) && value >= 0, peak_prominences) || throw(ArgumentError(
            "Значения Ppk должны быть неотрицательными и конечными",
        ))
        new(
            Tuple(values),
            Tuple(locations),
            Tuple(widths),
            Tuple(peak_prominences),
            Tuple(kinds),
        )
    end
end

SignalPeaksProviderResult(
    peak_values::AbstractVector{<:Real},
    locations_1based::AbstractVector{<:Integer},
    widths_samples::AbstractVector{<:Real},
    prominences::AbstractVector{<:Real},
    sample_count::Int,
) = SignalPeaksProviderResult(
    peak_values,
    locations_1based,
    widths_samples,
    prominences,
    fill(MAXIMUM_PEAK, length(peak_values)),
    sample_count,
)

"""One typed directional candidate used to rank combined extrema."""
struct SignalPeakProviderCandidate
    kind::SignalPeakKind
    value::Float64
    location_1based::Int
    width_samples::Float64
    prominence::Float64

    function SignalPeakProviderCandidate(
        kind::SignalPeakKind,
        value::Real,
        location_1based::Int,
        width_samples::Real,
        prominence::Real,
    )
        isfinite(value) || throw(ArgumentError("Значение extrema candidate должно быть конечным"))
        location_1based >= 1 || throw(ArgumentError("Индекс extrema candidate должен быть положительным"))
        isfinite(width_samples) && width_samples >= 0 || throw(ArgumentError(
            "Ширина extrema candidate должна быть неотрицательной и конечной",
        ))
        isfinite(prominence) && prominence >= 0 || throw(ArgumentError(
            "Prominence extrema candidate должен быть неотрицательным и конечным",
        ))
        new(
            kind,
            Float64(value),
            location_1based,
            Float64(width_samples),
            Float64(prominence),
        )
    end
end

abstract type AbstractSignalPeakPosition end

struct SignalTimePeakPosition <: AbstractSignalPeakPosition
    sample_index::Int
    time_s::Float64

    function SignalTimePeakPosition(sample_index::Int, time_s::Real)
        sample_index >= 0 || throw(ArgumentError("Индекс экстремума не может быть отрицательным"))
        value = Float64(time_s)
        isfinite(value) && value >= 0 || throw(ArgumentError(
            "Время экстремума должно быть неотрицательным и конечным",
        ))
        new(sample_index, value)
    end
end

struct SignalSpectrumPeakPosition <: AbstractSignalPeakPosition
    bin_index::Int
    frequency_hz::Float64

    function SignalSpectrumPeakPosition(bin_index::Int, frequency_hz::Real)
        bin_index >= 1 || throw(ArgumentError("Индекс спектрального бина должен быть положительным"))
        value = Float64(frequency_hz)
        isfinite(value) || throw(ArgumentError("Частота экстремума должна быть конечной"))
        new(bin_index, value == 0.0 ? 0.0 : value)
    end
end

signal_peak_position_order(position::SignalTimePeakPosition) =
    (position.time_s, position.sample_index)
signal_peak_position_order(position::SignalSpectrumPeakPosition) =
    (position.frequency_hz, position.bin_index)

struct SignalPeakItem
    id::String
    kind::SignalPeakKind
    value::Float64
    position::AbstractSignalPeakPosition
    width_samples::Float64
    prominence::Float64

    function SignalPeakItem(
        kind::SignalPeakKind,
        value::Real,
        position::AbstractSignalPeakPosition,
        width_samples::Real,
        prominence::Real,
    )
        isfinite(value) || throw(ArgumentError("Значение экстремума должно быть конечным"))
        isfinite(width_samples) && width_samples >= 0 || throw(ArgumentError("Ширина экстремума должна быть неотрицательной и конечной"))
        isfinite(prominence) && prominence >= 0 || throw(ArgumentError("Prominence экстремума должен быть неотрицательным и конечным"))
        coordinate = position isa SignalTimePeakPosition ?
            "sample-$((position::SignalTimePeakPosition).sample_index)" :
            "bin-$((position::SignalSpectrumPeakPosition).bin_index)"
        new(
            kind == MAXIMUM_PEAK ? "peak-$coordinate" : "peak-minimum-$coordinate",
            kind,
            Float64(value),
            position,
            Float64(width_samples),
            Float64(prominence),
        )
    end
end

SignalPeakItem(
    kind::SignalPeakKind,
    value::Real,
    sample_index::Int,
    time_s::Real,
    width_samples::Real,
    prominence::Real,
) = SignalPeakItem(
    kind,
    value,
    SignalTimePeakPosition(sample_index, time_s),
    width_samples,
    prominence,
)


SignalPeakItem(
    value::Real,
    sample_index::Int,
    time_s::Real,
    width_samples::Real,
    prominence::Real,
) = SignalPeakItem(
    MAXIMUM_PEAK,
    value,
    sample_index,
    time_s,
    width_samples,
    prominence,
)

struct SignalPeaksUnits
    value::String
    time::String
    width::String
    prominence::String

    function SignalPeaksUnits(
        value::AbstractString,
        time::AbstractString,
        width::AbstractString,
        prominence::AbstractString,
    )
        value == "1" || throw(ArgumentError("Extrema value unit должна быть 1"))
        time in ("s", "Hz") || throw(ArgumentError("Extrema position unit должна быть s или Hz"))
        width == "samples" || throw(ArgumentError("Extrema width unit должна быть samples"))
        prominence == "1" || throw(ArgumentError("Extrema prominence unit должна быть 1"))
        new(String(value), String(time), String(width), String(prominence))
    end
end

SignalPeaksUnits() = SignalPeaksUnits("1", "s", "samples", "1")
signal_spectrum_peaks_units() = SignalPeaksUnits("1", "Hz", "samples", "1")

struct SignalPeaksSnapshot
    enabled::Bool
    mode::SignalExtremaMode
    state_revision::Int
    display_id::String
    signal_name::Union{Nothing,String}
    ordinate::Union{Nothing,SignalMeasurementOrdinate}
    units::SignalPeaksUnits
    items::Tuple{Vararg{SignalPeakItem}}

    function SignalPeaksSnapshot(
        enabled::Bool,
        mode::SignalExtremaMode,
        state_revision::Int,
        display_id::AbstractString,
        signal_name::Union{Nothing,AbstractString},
        ordinate::Union{Nothing,SignalMeasurementOrdinate},
        units::SignalPeaksUnits,
        items::AbstractVector{SignalPeakItem},
    )
        state_revision >= 0 || throw(ArgumentError("Ревизия peaks snapshot не может быть отрицательной"))
        isempty(display_id) && throw(ArgumentError("Идентификатор Display peaks snapshot не может быть пустым"))
        signal_name === nothing || isempty(signal_name) && throw(ArgumentError("Имя сигнала peaks snapshot не может быть пустым"))
        (signal_name === nothing) == (ordinate === nothing) || throw(ArgumentError(
            "Имя сигнала и ordinate peaks snapshot должны одновременно иметь значение или быть null",
        ))
        peak_items = collect(items)
        !enabled && !isempty(peak_items) && throw(ArgumentError("Выключенный peaks snapshot не может содержать items"))
        signal_name === nothing && enabled && throw(ArgumentError("Пустой peaks snapshot не может быть enabled"))
        signal_name === nothing && !isempty(peak_items) && throw(ArgumentError("Пустой peaks snapshot не может содержать items"))
        position_types = unique(typeof(item.position) for item in peak_items)
        length(position_types) <= 1 || throw(ArgumentError(
            "Extrema snapshot не может смешивать временные и спектральные позиции",
        ))
        item_keys = [
            (signal_peak_position_order(item.position)..., signal_peak_kind_order(item.kind))
            for item in peak_items
        ]
        issorted(item_keys) && allunique(item_keys) || throw(ArgumentError(
            "Extrema items должны быть уникальными и следовать в порядке появления",
        ))
        mode == MAXIMA_EXTREMA_MODE && any(item -> item.kind != MAXIMUM_PEAK, peak_items) &&
            throw(ArgumentError("Режим maxima не может содержать minima items"))
        mode == MINIMA_EXTREMA_MODE && any(item -> item.kind != MINIMUM_PEAK, peak_items) &&
            throw(ArgumentError("Режим minima не может содержать maxima items"))
        new(
            enabled,
            mode,
            state_revision,
            String(display_id),
            signal_name === nothing ? nothing : String(signal_name),
            ordinate,
            units,
            Tuple(peak_items),
        )
    end
end


SignalPeaksSnapshot(
    enabled::Bool,
    state_revision::Int,
    display_id::AbstractString,
    signal_name::Union{Nothing,AbstractString},
    ordinate::Union{Nothing,SignalMeasurementOrdinate},
    units::SignalPeaksUnits,
    items::AbstractVector{SignalPeakItem},
) = SignalPeaksSnapshot(
    enabled,
    MAXIMA_EXTREMA_MODE,
    state_revision,
    display_id,
    signal_name,
    ordinate,
    units,
    items,
)

"""One flattened Peaks table row for one signal bound to the active TIME pane."""
struct SignalPeaksTableRow
    row_number::Int
    signal_name::String
    signal_color::String
    graph_number::Int
    peak::SignalPeakItem

    function SignalPeaksTableRow(
        row_number::Int,
        signal_name::AbstractString,
        signal_color::AbstractString,
        graph_number::Int,
        peak::SignalPeakItem,
    )
        row_number >= 1 || throw(ArgumentError("Номер строки Peaks должен быть положительным"))
        isempty(signal_name) && throw(ArgumentError("Имя сигнала Peaks row не может быть пустым"))
        isempty(signal_color) && throw(ArgumentError("Цвет сигнала Peaks row не может быть пустым"))
        graph_number >= 1 || throw(ArgumentError("Номер метки Peaks должен быть положительным"))
        new(row_number, String(signal_name), String(signal_color), graph_number, peak)
    end
end

"""Backend-authored flattened Peaks table for one authoritative TIME pane."""
struct SignalPeaksTableSnapshot
    enabled::Bool
    state_revision::Int
    display_id::String
    pane_id::String
    settings::SignalPeaksSettings
    signal_colors::Tuple{Vararg{String}}
    signals::Tuple{Vararg{SignalPeaksSnapshot}}
    rows::Tuple{Vararg{SignalPeaksTableRow}}

    function SignalPeaksTableSnapshot(
        enabled::Bool,
        state_revision::Int,
        display_id::AbstractString,
        pane_id::AbstractString,
        settings::SignalPeaksSettings,
        signal_colors::AbstractVector{<:AbstractString},
        signals::AbstractVector{SignalPeaksSnapshot},
        rows::AbstractVector{SignalPeaksTableRow},
    )
        state_revision >= 0 || throw(ArgumentError(
            "Ревизия Peaks table snapshot не может быть отрицательной",
        ))
        isempty(display_id) && throw(ArgumentError(
            "Идентификатор Display Peaks table не может быть пустым",
        ))
        isempty(pane_id) && throw(ArgumentError(
            "Идентификатор pane Peaks table не может быть пустым",
        ))
        signal_snapshots = collect(signals)
        signal_names = String[
            snapshot.signal_name::String for snapshot in signal_snapshots
        ]
        allunique(signal_names) || throw(ArgumentError(
            "Сигналы Peaks table не должны повторяться",
        ))
        all(snapshot -> snapshot.display_id == display_id, signal_snapshots) || throw(
            ArgumentError("Display сигналов Peaks table не совпадает со snapshot"),
        )
        all(snapshot -> snapshot.enabled == enabled, signal_snapshots) || throw(
            ArgumentError("Статус сигналов Peaks table не совпадает со snapshot"),
        )
        all(snapshot -> snapshot.mode == settings.mode, signal_snapshots) || throw(
            ArgumentError("Режим сигналов Extrema table не совпадает с settings"),
        )
        colors = String.(signal_colors)
        length(colors) == length(signal_snapshots) || throw(DimensionMismatch(
            "Число цветов Peaks table должно совпадать с числом сигналов",
        ))
        all(color -> !isempty(color), colors) || throw(ArgumentError(
            "Цвета сигналов Peaks table не могут быть пустыми",
        ))
        !enabled && (!isempty(signal_snapshots) || !isempty(rows)) && throw(ArgumentError(
            "Выключенный Peaks table snapshot должен быть пустым",
        ))
        table_rows = collect(rows)
        Int[row.row_number for row in table_rows] == collect(eachindex(table_rows)) || throw(
            ArgumentError("Номера строк Peaks table должны быть последовательными"),
        )
        all(row -> row.signal_name in signal_names, table_rows) || throw(ArgumentError(
            "Строка Peaks table ссылается на сигнал вне pane bindings",
        ))
        color_by_name = Dict(signal_names[index] => colors[index] for index in eachindex(signal_names))
        all(row -> row.signal_color == color_by_name[row.signal_name], table_rows) || throw(
            ArgumentError("Цвет строки Peaks table не совпадает с сигналом"),
        )
        binding_order = Dict(name => index for (index, name) in enumerate(signal_names))
        issorted(table_rows; by = row -> (
            signal_peak_position_order(row.peak.position)...,
            binding_order[row.signal_name],
            signal_peak_kind_order(row.peak.kind),
        )) || throw(ArgumentError(
            "Строки Peaks table должны быть отсортированы по времени, binding и sample index",
        ))
        new(
            enabled,
            state_revision,
            String(display_id),
            String(pane_id),
            settings,
            Tuple(colors),
            Tuple(signal_snapshots),
            Tuple(table_rows),
        )
    end
end

struct SignalPeaksService{P<:AbstractPeaksProvider}
    provider::P
    ordinate_service::SignalMeasurementsService
end

SignalPeaksService(provider::P) where {P<:AbstractPeaksProvider} =
    SignalPeaksService{P}(provider, SignalMeasurementsService())

struct GlobalSignalSelection
    signal_name::String

    function GlobalSignalSelection(signal_name::AbstractString)
        isempty(signal_name) && throw(ArgumentError("Имя глобально выбранного сигнала не может быть пустым"))
        new(String(signal_name))
    end
end

struct SignalDisplayMembership
    signal_names::Tuple{Vararg{String}}

    function SignalDisplayMembership(signal_names::AbstractVector{<:AbstractString})
        names = String.(signal_names)
        all(name -> !isempty(name), names) || throw(ArgumentError("Имена membership не могут быть пустыми"))
        allunique(names) || throw(ArgumentError("Имена membership не должны повторяться"))
        new(Tuple(names))
    end
end

abstract type AbstractSignalAnalysisSource end

struct NoSignalAnalysisSource <: AbstractSignalAnalysisSource end

struct SignalAnalysisSource <: AbstractSignalAnalysisSource
    signal_name::String

    function SignalAnalysisSource(signal_name::AbstractString)
        isempty(signal_name) && throw(ArgumentError("Имя analysis source не может быть пустым"))
        new(String(signal_name))
    end
end

signal_analysis_name(::NoSignalAnalysisSource) = nothing
signal_analysis_name(source::SignalAnalysisSource) = source.signal_name

function signal_analysis_source(signal_name::Union{Nothing,AbstractString})::AbstractSignalAnalysisSource
    signal_name === nothing ? NoSignalAnalysisSource() : SignalAnalysisSource(signal_name)
end

mutable struct SignalAnalyserViewState
    state_revision::Int
    active_plot::SignalAnalyserPlot
    selected_signal::Union{Nothing,String}
end

include(joinpath(@__DIR__, "signal_settings.jl"))

const SIGNAL_DISPLAY_LAYOUT_VERSION = 1
const SIGNAL_DISPLAY_LAYOUT_MIN_DIMENSION = 1
const SIGNAL_DISPLAY_LAYOUT_MAX_DIMENSION = 10
const SIGNAL_DISPLAY_PANE_ID_REGEX = r"^pane-[1-9][0-9]*$"
const SIGNAL_DISPLAY_LAYOUT_VARIANTS = (
    "single",
    "rows",
    "columns",
    "grid",
    "top-emphasis",
    "right-emphasis",
    "bottom-emphasis",
    "left-emphasis",
)

"""Persisted extrema marker owned by one pane and one stable signal id."""
struct SignalPaneExtremum
    sample::Int
    x::Float64
    y::Float64
    is_maximum::Bool

    function SignalPaneExtremum(sample::Int, x::Real, y::Real, is_maximum::Bool)
        sample >= 0 || throw(ArgumentError("Индекс экстремума не может быть отрицательным"))
        x_value = Float64(x)
        y_value = Float64(y)
        isfinite(x_value) || throw(ArgumentError("Координата X экстремума должна быть конечной"))
        isfinite(y_value) || throw(ArgumentError("Координата Y экстремума должна быть конечной"))
        new(sample, x_value, y_value, is_maximum)
    end
end

"""Last fully published extrema dictionary and readiness for one pane."""
mutable struct SignalPaneExtremaState
    extrema_by_signal::Dict{String,Vector{SignalPaneExtremum}}
    is_extrema_ready::Bool
    success::Bool
    error::String
    need_update::Bool
end

SignalPaneExtremaState() = SignalPaneExtremaState(
    Dict{String,Vector{SignalPaneExtremum}}(),
    false,
    false,
    "",
    true,
)

Base.copy(state::SignalPaneExtremaState) = SignalPaneExtremaState(
    Dict(signal_id => copy(items) for (signal_id, items) in state.extrema_by_signal),
    state.is_extrema_ready,
    state.success,
    state.error,
    state.need_update,
)

"""One stable plot aggregate inside a Display layout."""
struct SignalDisplayPaneState
    id::String
    name::String
    plot_type::SignalAnalyserPlot
    membership::SignalDisplayMembership
    analysis_source::Union{NoSignalAnalysisSource,SignalAnalysisSource}
    time_limits::Union{Nothing,SignalTimeLimits}
    measurement_selection::SignalMeasurementSelection
    spectrum_settings::SignalSpectrumSettings
    spectrogram_settings::SignalSpectrogramSettings
    persistence_settings::SignalPersistenceSettings
    stored_settings::SignalDisplayStoredSettings
    peaks_enabled::Bool
    peaks_settings::SignalPeaksSettings
    extrema_state::SignalPaneExtremaState

    function SignalDisplayPaneState(
        id::AbstractString,
        name::AbstractString,
        plot_type::SignalAnalyserPlot,
        membership::SignalDisplayMembership,
        analysis_source::Union{NoSignalAnalysisSource,SignalAnalysisSource},
        time_limits::Union{Nothing,SignalTimeLimits},
        measurement_selection::SignalMeasurementSelection,
        spectrum_settings::SignalSpectrumSettings,
        spectrogram_settings::SignalSpectrogramSettings,
        persistence_settings::SignalPersistenceSettings,
        stored_settings::SignalDisplayStoredSettings,
        peaks_enabled::Bool,
        peaks_settings::SignalPeaksSettings,
        extrema_state::SignalPaneExtremaState = SignalPaneExtremaState(),
    )
        pane_id = String(id)
        occursin(SIGNAL_DISPLAY_PANE_ID_REGEX, pane_id) || throw(ArgumentError(
            "Идентификатор pane должен иметь формат pane-N",
        ))
        pane_name = String(name)
        isempty(strip(pane_name)) && throw(ArgumentError("Имя pane не может быть пустым"))
        analysis_name = signal_analysis_name(analysis_source)
        # Legacy/current state is normalized at calculation and persistence
        # boundaries. Keep construction permissive so an old occupied pane can
        # be represented and repaired atomically instead of failing mid-route.
        peaks_enabled && !(plot_type in (TIME_PLOT, SPECTRUM_PLOT)) && throw(ArgumentError(
            "Экстремумы доступны только для Time или Spectrum pane",
        ))
        peaks_enabled && analysis_name === nothing && throw(ArgumentError(
            "Экстремумы требуют analysis source pane",
        ))
        new(
            pane_id,
            pane_name,
            plot_type,
            membership,
            analysis_source,
            time_limits,
            measurement_selection,
            spectrum_settings,
            spectrogram_settings,
            persistence_settings,
            stored_settings,
            peaks_enabled,
            peaks_settings,
            extrema_state,
        )
    end
end

function Base.getproperty(pane::SignalDisplayPaneState, name::Symbol)
    name === :extrema_by_signal && return getfield(pane, :extrema_state).extrema_by_signal
    name === :is_extrema_ready && return getfield(pane, :extrema_state).is_extrema_ready
    name === :success && return getfield(pane, :extrema_state).success
    name === :error && return getfield(pane, :extrema_state).error
    name === :need_update && return getfield(pane, :extrema_state).need_update
    getfield(pane, name)
end

Base.propertynames(::SignalDisplayPaneState, private::Bool = false) = (
    fieldnames(SignalDisplayPaneState)...,
    :extrema_by_signal,
    :is_extrema_ready,
    :success,
    :error,
    :need_update,
)


function signal_display_default_pane_name(id::AbstractString)::String
    pane_id = String(id)
    matched = match(SIGNAL_DISPLAY_PANE_ID_REGEX, pane_id)
    matched === nothing && throw(ArgumentError("Идентификатор pane должен иметь формат pane-N"))
    "Область $(split(pane_id, '-')[2])"
end

SignalDisplayPaneState(
    id::AbstractString,
    plot_type::SignalAnalyserPlot,
    membership::SignalDisplayMembership,
    analysis_source::Union{NoSignalAnalysisSource,SignalAnalysisSource},
    time_limits::Union{Nothing,SignalTimeLimits},
    measurement_selection::SignalMeasurementSelection,
    spectrum_settings::SignalSpectrumSettings,
    spectrogram_settings::SignalSpectrogramSettings,
    persistence_settings::SignalPersistenceSettings,
    stored_settings::SignalDisplayStoredSettings,
    peaks_enabled::Bool,
    peaks_settings::SignalPeaksSettings,
) = SignalDisplayPaneState(
    id,
    signal_display_default_pane_name(id),
    plot_type,
    membership,
    analysis_source,
    time_limits,
    measurement_selection,
    spectrum_settings,
    spectrogram_settings,
    persistence_settings,
    stored_settings,
    peaks_enabled,
    peaks_settings,
)

Base.:(==)(left::SignalDisplayPaneState, right::SignalDisplayPaneState) =
    left.id == right.id &&
    left.name == right.name &&
    left.plot_type == right.plot_type &&
    left.membership.signal_names == right.membership.signal_names &&
    isequal(signal_analysis_name(left.analysis_source), signal_analysis_name(right.analysis_source)) &&
    isequal(left.time_limits, right.time_limits) &&
    left.measurement_selection == right.measurement_selection &&
    left.spectrum_settings == right.spectrum_settings &&
    left.spectrogram_settings == right.spectrogram_settings &&
    left.persistence_settings == right.persistence_settings &&
    left.stored_settings == right.stored_settings &&
    left.peaks_enabled == right.peaks_enabled &&
    left.peaks_settings == right.peaks_settings &&
    left.extrema_by_signal == right.extrema_by_signal &&
    left.is_extrema_ready == right.is_extrema_ready &&
    left.success == right.success &&
    left.error == right.error &&
    left.need_update == right.need_update
Base.isequal(left::SignalDisplayPaneState, right::SignalDisplayPaneState) = left == right
Base.copy(pane::SignalDisplayPaneState) = SignalDisplayPaneState(
    pane.id,
    pane.name,
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
    pane.peaks_settings,
    copy(pane.extrema_state),
)

function signal_display_pane_with_id(
    pane::SignalDisplayPaneState,
    id::AbstractString,
)::SignalDisplayPaneState
    SignalDisplayPaneState(
        id,
        pane.name,
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
        pane.peaks_settings,
        pane.extrema_state,
    )
end

function signal_display_pane_with_time_links(
    pane::SignalDisplayPaneState,
    link_time::Bool,
    link_amplitude::Bool,
)::SignalDisplayPaneState
    time = pane.stored_settings.time
    stored = SignalDisplayStoredSettings(
        pane.stored_settings.display,
        SignalTimePreferences(
            time.normalize_y,
            time.show_markers,
            time.units,
            time.y_limits,
            link_time,
            link_amplitude,
        ),
        pane.stored_settings.spectrum,
        pane.stored_settings.spectrogram,
        pane.stored_settings.persistence,
    )
    SignalDisplayPaneState(
        pane.id,
        pane.name,
        pane.plot_type,
        pane.membership,
        pane.analysis_source,
        pane.time_limits,
        pane.measurement_selection,
        pane.spectrum_settings,
        pane.spectrogram_settings,
        pane.persistence_settings,
        stored,
        pane.peaks_enabled,
        pane.peaks_settings,
        pane.extrema_state,
    )
end

signal_display_pane_with_time_link(
    pane::SignalDisplayPaneState,
    link_time::Bool,
)::SignalDisplayPaneState = signal_display_pane_with_time_links(
    pane,
    link_time,
    pane.stored_settings.time.link_amplitude,
)

function signal_display_pane_with_spectrum_links(
    pane::SignalDisplayPaneState,
    link_frequency::Bool,
    link_magnitude::Bool,
)::SignalDisplayPaneState
    stored = SignalDisplayStoredSettings(
        pane.stored_settings.display,
        pane.stored_settings.time,
        SignalSpectrumPreferences(
            pane.stored_settings.spectrum.frequency_units,
            pane.stored_settings.spectrum.y_limits,
            pane.stored_settings.spectrum.resolution_type,
            pane.stored_settings.spectrum.rbw,
            pane.stored_settings.spectrum.window_length,
            pane.stored_settings.spectrum.window,
            pane.stored_settings.spectrum.sidelobe_attenuation_db,
            pane.stored_settings.spectrum.overlap_percent,
            pane.stored_settings.spectrum.nfft,
            link_frequency,
            link_magnitude,
        ),
        pane.stored_settings.spectrogram,
        pane.stored_settings.persistence,
    )
    SignalDisplayPaneState(
        pane.id,
        pane.name,
        pane.plot_type,
        pane.membership,
        pane.analysis_source,
        pane.time_limits,
        pane.measurement_selection,
        pane.spectrum_settings,
        pane.spectrogram_settings,
        pane.persistence_settings,
        stored,
        pane.peaks_enabled,
        pane.peaks_settings,
        pane.extrema_state,
    )
end

function signal_display_pane_with_time_limits(
    pane::SignalDisplayPaneState,
    time_limits::Union{Nothing,SignalTimeLimits},
)::SignalDisplayPaneState
    SignalDisplayPaneState(
        pane.id,
        pane.name,
        pane.plot_type,
        pane.membership,
        pane.analysis_source,
        time_limits,
        pane.measurement_selection,
        pane.spectrum_settings,
        pane.spectrogram_settings,
        pane.persistence_settings,
        pane.stored_settings,
        pane.peaks_enabled,
        pane.peaks_settings,
        pane.extrema_state,
    )
end

function signal_display_pane_with_peaks_settings(
    pane::SignalDisplayPaneState,
    peaks_settings::SignalPeaksSettings,
)::SignalDisplayPaneState
    SignalDisplayPaneState(
        pane.id,
        pane.name,
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
        peaks_settings,
        pane.extrema_state,
    )
end

function signal_display_pane_with_name(
    pane::SignalDisplayPaneState,
    name::AbstractString,
)::SignalDisplayPaneState
    SignalDisplayPaneState(
        pane.id,
        name,
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
        pane.peaks_settings,
        pane.extrema_state,
    )
end

signal_display_pane_members(pane::SignalDisplayPaneState)::Vector{String} =
    collect(pane.membership.signal_names)
signal_display_pane_analysis_name(pane::SignalDisplayPaneState) =
    signal_analysis_name(pane.analysis_source)

function signal_display_empty_pane(id::AbstractString)::SignalDisplayPaneState
    SignalDisplayPaneState(
        id,
        TIME_PLOT,
        SignalDisplayMembership(String[]),
        NoSignalAnalysisSource(),
        nothing,
        SignalMeasurementSelection(),
        SignalSpectrumSettings(),
        SignalSpectrogramSettings(),
        SignalPersistenceSettings(),
        SignalDisplayStoredSettings(),
        false,
        SignalPeaksSettings(),
    )
end

signal_display_layout_variant(rows::Int, columns::Int)::String = "$(rows)x$(columns)"

function signal_display_layout_validate_dimensions(rows::Int, columns::Int)::Nothing
    SIGNAL_DISPLAY_LAYOUT_MIN_DIMENSION <= rows <= SIGNAL_DISPLAY_LAYOUT_MAX_DIMENSION ||
        throw(ArgumentError(
            "Число строк layout должно быть от $(SIGNAL_DISPLAY_LAYOUT_MIN_DIMENSION) " *
            "до $(SIGNAL_DISPLAY_LAYOUT_MAX_DIMENSION)",
        ))
    SIGNAL_DISPLAY_LAYOUT_MIN_DIMENSION <= columns <= SIGNAL_DISPLAY_LAYOUT_MAX_DIMENSION ||
        throw(ArgumentError(
            "Число столбцов layout должно быть от $(SIGNAL_DISPLAY_LAYOUT_MIN_DIMENSION) " *
            "до $(SIGNAL_DISPLAY_LAYOUT_MAX_DIMENSION)",
        ))
    nothing
end

"""Versioned rectangular topology and ordered pane configuration for one Display."""
struct SignalDisplayLayoutState
    version::Int
    variant::String
    rows::Int
    columns::Int
    panes::Vector{SignalDisplayPaneState}
    active_pane_id::String
    next_pane_number::Int

    function SignalDisplayLayoutState(
        version::Int,
        variant::AbstractString,
        rows::Int,
        columns::Int,
        panes::AbstractVector{SignalDisplayPaneState},
        active_pane_id::AbstractString,
        next_pane_number::Int,
    )
        version == SIGNAL_DISPLAY_LAYOUT_VERSION || throw(ArgumentError(
            "Неподдерживаемая версия layout: $version",
        ))
        signal_display_layout_validate_dimensions(rows, columns)
        canonical_variant = signal_display_layout_variant(rows, columns)
        String(variant) == canonical_variant || throw(ArgumentError(
            "Variant layout должен быть равен $canonical_variant",
        ))
        pane_values = SignalDisplayPaneState[copy(pane) for pane in panes]
        length(pane_values) == rows * columns || throw(ArgumentError(
            "Число panes должно совпадать с topology layout",
        ))
        pane_ids = [pane.id for pane in pane_values]
        allunique(pane_ids) || throw(ArgumentError(
            "Идентификаторы panes не должны повторяться",
        ))
        active_id = String(active_pane_id)
        active_id in pane_ids || throw(ArgumentError(
            "Active pane должна входить в panes layout",
        ))
        active_index = findfirst(==(active_id), pane_ids)::Int
        time_link_source = pane_values[active_index].plot_type in (TIME_PLOT, SPECTROGRAM_PLOT) ?
            pane_values[active_index] : begin
                first_time_index = findfirst(
                    pane -> pane.plot_type in (TIME_PLOT, SPECTROGRAM_PLOT),
                    pane_values,
                )
                first_time_index === nothing ? nothing : pane_values[first_time_index]
            end
        if time_link_source !== nothing
            link_time = (time_link_source::SignalDisplayPaneState).stored_settings.time.link_time
            link_amplitude = (time_link_source::SignalDisplayPaneState).stored_settings.time.link_amplitude
            pane_values = SignalDisplayPaneState[
                (
                    pane.stored_settings.time.link_time != link_time ||
                    pane.stored_settings.time.link_amplitude != link_amplitude
                ) ? signal_display_pane_with_time_links(pane, link_time, link_amplitude) : pane
                for pane in pane_values
            ]
        end
        spectrum_link_source_index = pane_values[active_index].plot_type in (
            SPECTRUM_PLOT,
            PERSISTENCE_PLOT,
        ) ? active_index : findfirst(
            pane -> pane.plot_type in (SPECTRUM_PLOT, PERSISTENCE_PLOT),
            pane_values,
        )
        if spectrum_link_source_index !== nothing
            source = pane_values[spectrum_link_source_index::Int]
            link_frequency = source.stored_settings.spectrum.link_frequency
            link_magnitude = source.stored_settings.spectrum.link_magnitude
            pane_values = SignalDisplayPaneState[
                (
                    pane.stored_settings.spectrum.link_frequency != link_frequency ||
                    pane.stored_settings.spectrum.link_magnitude != link_magnitude
                ) ? signal_display_pane_with_spectrum_links(
                    pane,
                    link_frequency,
                    link_magnitude,
                ) : pane
                for pane in pane_values
            ]
        end
        pane_numbers = Int[parse(Int, split(id, '-')[2]) for id in pane_ids]
        next_pane_number > maximum(pane_numbers) || throw(ArgumentError(
            "Следующий номер pane должен быть больше всех сохранённых номеров",
        ))
        new(
            version,
            canonical_variant,
            rows,
            columns,
            pane_values,
            active_id,
            next_pane_number,
        )
    end
end

Base.:(==)(left::SignalDisplayLayoutState, right::SignalDisplayLayoutState) =
    left.version == right.version &&
    left.variant == right.variant &&
    left.rows == right.rows &&
    left.columns == right.columns &&
    left.panes == right.panes &&
    left.active_pane_id == right.active_pane_id &&
    left.next_pane_number == right.next_pane_number
Base.isequal(left::SignalDisplayLayoutState, right::SignalDisplayLayoutState) = left == right
Base.copy(layout::SignalDisplayLayoutState) = SignalDisplayLayoutState(
    layout.version,
    layout.variant,
    layout.rows,
    layout.columns,
    layout.panes,
    layout.active_pane_id,
    layout.next_pane_number,
)

function signal_display_legacy_single_pane_layout(
    pane::SignalDisplayPaneState,
)::SignalDisplayLayoutState
    SignalDisplayLayoutState(
        SIGNAL_DISPLAY_LAYOUT_VERSION,
        "1x1",
        1,
        1,
        SignalDisplayPaneState[pane],
        pane.id,
        2,
    )
end

function signal_display_default_layout(
    pane::SignalDisplayPaneState,
)::SignalDisplayLayoutState
    pane.id == "pane-1" || throw(ArgumentError(
        "Fresh layout должен начинаться с pane-1",
    ))
    SignalDisplayLayoutState(
        SIGNAL_DISPLAY_LAYOUT_VERSION,
        "2x2",
        2,
        2,
        SignalDisplayPaneState[
            pane,
            signal_display_empty_pane("pane-2"),
            signal_display_empty_pane("pane-3"),
            signal_display_empty_pane("pane-4"),
        ],
        "pane-1",
        5,
    )
end

function signal_display_active_pane(
    layout::SignalDisplayLayoutState,
)::SignalDisplayPaneState
    index = findfirst(pane -> pane.id == layout.active_pane_id, layout.panes)
    index === nothing && throw(ArgumentError("Active pane отсутствует в layout"))
    layout.panes[index]
end

function signal_display_layout_replace_pane(
    layout::SignalDisplayLayoutState,
    replacement::SignalDisplayPaneState,
)::SignalDisplayLayoutState
    index = findfirst(pane -> pane.id == replacement.id, layout.panes)
    index === nothing && throw(ArgumentError("Pane не найдена: $(replacement.id)"))
    link_time = any(pane -> pane.stored_settings.time.link_time, layout.panes)
    link_amplitude = any(pane -> pane.stored_settings.time.link_amplitude, layout.panes)
    time_source_index = findfirst(
        pane -> pane.id != replacement.id && pane.stored_settings.time.link_time &&
            pane.plot_type in (TIME_PLOT, SPECTROGRAM_PLOT) &&
            signal_display_pane_analysis_name(pane) !== nothing,
        layout.panes,
    )
    amplitude_source_index = findfirst(
        pane -> pane.id != replacement.id && pane.stored_settings.time.link_amplitude &&
            pane.plot_type == TIME_PLOT && signal_display_pane_analysis_name(pane) !== nothing,
        layout.panes,
    )
    time_source = time_source_index === nothing ? nothing : layout.panes[time_source_index::Int]
    amplitude_source = amplitude_source_index === nothing ? nothing :
        layout.panes[amplitude_source_index::Int]
    if link_time || link_amplitude
        current_time = replacement.stored_settings.time
        time_units = link_time && time_source !== nothing ?
            (time_source::SignalDisplayPaneState).plot_type == SPECTROGRAM_PLOT ?
                (time_source::SignalDisplayPaneState).stored_settings.spectrogram.time_units :
                (time_source::SignalDisplayPaneState).stored_settings.time.units :
            current_time.units
        y_limits = link_amplitude && replacement.plot_type == TIME_PLOT &&
            amplitude_source !== nothing ?
                (amplitude_source::SignalDisplayPaneState).stored_settings.time.y_limits :
                current_time.y_limits
        time = SignalTimePreferences(
            current_time.normalize_y,
            current_time.show_markers,
            time_units,
            y_limits,
            link_time,
            link_amplitude,
        )
        current_spectrogram = replacement.stored_settings.spectrogram
        spectrogram = SignalSpectrogramPreferences(
            link_time && replacement.plot_type == SPECTROGRAM_PLOT ?
                time_units : current_spectrogram.time_units,
            current_spectrogram.frequency_units,
            current_spectrogram.scale,
            current_spectrogram.time_resolution,
            current_spectrogram.reassign,
        )
        stored = SignalDisplayStoredSettings(
            replacement.stored_settings.display,
            time,
            replacement.stored_settings.spectrum,
            spectrogram,
            replacement.stored_settings.persistence,
        )
        linked_limits = link_time && time_source !== nothing &&
            replacement.plot_type in (TIME_PLOT, SPECTROGRAM_PLOT) &&
            signal_display_pane_analysis_name(replacement) !== nothing ?
                (time_source::SignalDisplayPaneState).time_limits : replacement.time_limits
        replacement = SignalDisplayPaneState(
            replacement.id,
            replacement.name,
            replacement.plot_type,
            replacement.membership,
            replacement.analysis_source,
            linked_limits,
            replacement.measurement_selection,
            replacement.spectrum_settings,
            replacement.spectrogram_settings,
            replacement.persistence_settings,
            stored,
            replacement.peaks_enabled,
            replacement.peaks_settings,
            replacement.extrema_state,
        )
    end
    link_frequency = any(pane -> pane.stored_settings.spectrum.link_frequency, layout.panes)
    link_magnitude = any(pane -> pane.stored_settings.spectrum.link_magnitude, layout.panes)
    spectrum_source_index = findfirst(
        pane -> pane.id != replacement.id &&
            pane.plot_type in (SPECTRUM_PLOT, PERSISTENCE_PLOT) &&
            signal_display_pane_analysis_name(pane) !== nothing,
        layout.panes,
    )
    spectrum_source = spectrum_source_index === nothing ? nothing :
        layout.panes[spectrum_source_index::Int]
    if link_frequency || link_magnitude
        current = replacement.stored_settings.spectrum
        source_preferences = spectrum_source === nothing ? current :
            (spectrum_source::SignalDisplayPaneState).stored_settings.spectrum
        source_frequency_units = if spectrum_source === nothing ||
            (spectrum_source::SignalDisplayPaneState).plot_type == SPECTRUM_PLOT
            source_preferences.frequency_units
        else
            (spectrum_source::SignalDisplayPaneState).stored_settings.persistence.frequency_units
        end
        source_magnitude_limits = if spectrum_source === nothing ||
            (spectrum_source::SignalDisplayPaneState).plot_type == SPECTRUM_PLOT
            source_preferences.y_limits
        else
            (spectrum_source::SignalDisplayPaneState).stored_settings.persistence.power_limits
        end
        spectrum_preferences = SignalSpectrumPreferences(
            link_frequency && replacement.plot_type == SPECTRUM_PLOT ?
                source_frequency_units : current.frequency_units,
            link_magnitude && replacement.plot_type == SPECTRUM_PLOT ?
                source_magnitude_limits : current.y_limits,
            current.resolution_type,
            current.rbw,
            current.window_length,
            current.window,
            current.sidelobe_attenuation_db,
            current.overlap_percent,
            current.nfft,
            link_frequency,
            link_magnitude,
        )
        current_persistence = replacement.stored_settings.persistence
        source_frequency_limits = if spectrum_source === nothing
            replacement.spectrum_settings.frequency_limits
        elseif (spectrum_source::SignalDisplayPaneState).plot_type == SPECTRUM_PLOT
            (spectrum_source::SignalDisplayPaneState).spectrum_settings.frequency_limits
        else
            limits = (spectrum_source::SignalDisplayPaneState).stored_settings.persistence.frequency_limits
            limits === nothing ? AutomaticSignalSpectrumFrequencyLimits() :
                ExplicitSignalSpectrumFrequencyLimits(limits.minimum, limits.maximum)
        end
        source_frequency_scale = if spectrum_source === nothing ||
            (spectrum_source::SignalDisplayPaneState).plot_type == SPECTRUM_PLOT
            spectrum_source === nothing ? replacement.spectrum_settings.frequency_scale :
                (spectrum_source::SignalDisplayPaneState).spectrum_settings.frequency_scale
        else
            (spectrum_source::SignalDisplayPaneState).stored_settings.persistence.frequency_scale
        end
        persistence_frequency_limits = source_frequency_limits isa ExplicitSignalSpectrumFrequencyLimits ?
            SignalSettingRange(
                (source_frequency_limits::ExplicitSignalSpectrumFrequencyLimits).min_hz,
                (source_frequency_limits::ExplicitSignalSpectrumFrequencyLimits).max_hz,
            ) : nothing
        persistence_preferences = replacement.plot_type == PERSISTENCE_PLOT ?
            SignalPersistencePreferences(
                current_persistence.time_units,
                link_frequency ? source_frequency_units : current_persistence.frequency_units,
                link_frequency ? persistence_frequency_limits : current_persistence.frequency_limits,
                link_magnitude ? source_magnitude_limits : current_persistence.power_limits,
                current_persistence.density_limits,
                link_frequency ? source_frequency_scale : current_persistence.frequency_scale,
                current_persistence.scale,
                current_persistence.time_resolution,
                current_persistence.overlap_percent,
                current_persistence.power_bins,
            ) : current_persistence
        stored = SignalDisplayStoredSettings(
            replacement.stored_settings.display,
            replacement.stored_settings.time,
            spectrum_preferences,
            replacement.stored_settings.spectrogram,
            persistence_preferences,
        )
        spectrum_settings = if link_frequency && replacement.plot_type == SPECTRUM_PLOT &&
            spectrum_source !== nothing
            SignalSpectrumSettings(
                replacement.spectrum_settings.scale,
                source_frequency_scale,
                replacement.spectrum_settings.leakage,
                source_frequency_limits,
            )
        else
            replacement.spectrum_settings
        end
        replacement = SignalDisplayPaneState(
            replacement.id,
            replacement.name,
            replacement.plot_type,
            replacement.membership,
            replacement.analysis_source,
            replacement.time_limits,
            replacement.measurement_selection,
            spectrum_settings,
            replacement.spectrogram_settings,
            replacement.persistence_settings,
            stored,
            replacement.peaks_enabled,
            replacement.peaks_settings,
            replacement.extrema_state,
        )
    end
    panes = copy(layout.panes)
    panes[index] = replacement
    SignalDisplayLayoutState(
        layout.version,
        layout.variant,
        layout.rows,
        layout.columns,
        panes,
        layout.active_pane_id,
        layout.next_pane_number,
    )
end

function signal_display_layout_replace_active_pane(
    layout::SignalDisplayLayoutState,
    replacement::SignalDisplayPaneState,
)::SignalDisplayLayoutState
    pane = signal_display_active_pane(layout)
    replacement.id == pane.id || throw(ArgumentError(
        "Replacement pane должна иметь идентификатор active pane",
    ))
    signal_display_layout_replace_pane(
        layout,
        replacement,
    )
end

function signal_display_layout_select_pane(
    layout::SignalDisplayLayoutState,
    pane_id::AbstractString,
)::SignalDisplayLayoutState
    requested_id = String(pane_id)
    any(pane -> pane.id == requested_id, layout.panes) || throw(ArgumentError(
        "Pane не найдена: $requested_id",
    ))
    SignalDisplayLayoutState(
        layout.version,
        layout.variant,
        layout.rows,
        layout.columns,
        layout.panes,
        requested_id,
        layout.next_pane_number,
    )
end

function signal_display_next_pane_number(
    panes::AbstractVector{SignalDisplayPaneState},
)::Int
    maximum(
        parse(Int, split(pane.id, '-')[2])
        for pane in panes
    ) + 1
end

"""Resize preserves configured panes; every newly created pane starts empty."""
function signal_display_layout_resize(
    layout::SignalDisplayLayoutState,
    rows::Int,
    columns::Int,
    new_pane_template::SignalDisplayPaneState,
)::SignalDisplayLayoutState
    signal_display_layout_validate_dimensions(rows, columns)
    requested_count = rows * columns
    surviving_count = min(length(layout.panes), requested_count)
    panes = SignalDisplayPaneState[copy(layout.panes[index]) for index in 1:surviving_count]
    # `next_pane_number` used to be a monotonic high-water mark.  A transient
    # large layout therefore made a later 1x4 -> 1x5 resize jump from pane-4
    # straight to pane-17.  Derive allocation from the stable panes that still
    # occupy this layout: removed/transient panes must not consume user-visible
    # ids or default names, while every surviving pane keeps its exact id/name.
    next_pane_number = signal_display_next_pane_number(panes)
    while length(panes) < requested_count
        pane_id = "pane-$next_pane_number"
        push!(panes, signal_display_pane_with_name(
            signal_display_pane_with_id(new_pane_template, pane_id),
            signal_display_default_pane_name(pane_id),
        ))
        next_pane_number += 1
    end
    active_pane_id = any(pane -> pane.id == layout.active_pane_id, panes) ?
        layout.active_pane_id : first(panes).id
    SignalDisplayLayoutState(
        layout.version,
        signal_display_layout_variant(rows, columns),
        rows,
        columns,
        panes,
        active_pane_id,
        next_pane_number,
    )
end

function signal_display_layout_resize(
    layout::SignalDisplayLayoutState,
    rows::Int,
    columns::Int,
)::SignalDisplayLayoutState
    signal_display_layout_resize(
        layout,
        rows,
        columns,
        signal_display_empty_pane(layout.active_pane_id),
    )
end

function signal_display_layout_without_signal(
    layout::SignalDisplayLayoutState,
    signal_name::AbstractString,
)::SignalDisplayLayoutState
    panes = SignalDisplayPaneState[
        signal_display_pane_without_signal(pane, signal_name)
        for pane in layout.panes
    ]
    SignalDisplayLayoutState(
        layout.version,
        layout.variant,
        layout.rows,
        layout.columns,
        panes,
        layout.active_pane_id,
        layout.next_pane_number,
    )
end

function signal_display_pane_without_signal(
    pane::SignalDisplayPaneState,
    signal_name::AbstractString,
)::SignalDisplayPaneState
    members = [
        name for name in signal_display_pane_members(pane)
        if name != signal_name
    ]
    current_analysis = signal_display_pane_analysis_name(pane)
    analysis_name = current_analysis == signal_name ? nothing : current_analysis
    SignalDisplayPaneState(
        pane.id,
        pane.name,
        pane.plot_type,
        SignalDisplayMembership(members),
        signal_analysis_source(analysis_name),
        analysis_name === nothing ? nothing : pane.time_limits,
        pane.measurement_selection,
        pane.spectrum_settings,
        pane.spectrogram_settings,
        pane.persistence_settings,
        pane.stored_settings,
        analysis_name !== nothing && !isempty(members) &&
        pane.plot_type in (TIME_PLOT, SPECTRUM_PLOT) && pane.peaks_enabled,
        pane.peaks_settings,
        pane.extrema_state,
    )
end

mutable struct SignalAnalyserDisplayState
    id::String
    name::String
    active_plot::SignalAnalyserPlot
    membership::SignalDisplayMembership
    analysis_source::Union{NoSignalAnalysisSource,SignalAnalysisSource}
    time_limits::Union{Nothing,SignalTimeLimits}
    measurement_selection::SignalMeasurementSelection
    spectrum_settings::SignalSpectrumSettings
    spectrogram_settings::SignalSpectrogramSettings
    persistence_settings::SignalPersistenceSettings
    stored_settings::SignalDisplayStoredSettings
    peaks_enabled::Bool

    function SignalAnalyserDisplayState(
        id::AbstractString,
        name::AbstractString,
        active_plot::SignalAnalyserPlot,
        membership::SignalDisplayMembership,
        analysis_source::Union{NoSignalAnalysisSource,SignalAnalysisSource},
        time_limits::Union{Nothing,SignalTimeLimits},
        measurement_selection::SignalMeasurementSelection,
        spectrum_settings::SignalSpectrumSettings,
        spectrogram_settings::SignalSpectrogramSettings,
        persistence_settings::SignalPersistenceSettings,
        stored_settings::SignalDisplayStoredSettings,
        peaks_enabled::Bool,
    )
        analysis_name = signal_analysis_name(analysis_source)
        # The mutable legacy Display projection is normalized from its
        # authoritative active pane at service boundaries.
        peaks_enabled && !(active_plot in (TIME_PLOT, SPECTRUM_PLOT)) && throw(ArgumentError(
            "Экстремумы доступны только для Time или Spectrum plot",
        ))
        peaks_enabled && analysis_name === nothing && throw(ArgumentError(
            "Экстремумы требуют analysis source",
        ))
        new(
            String(id),
            String(name),
            active_plot,
            membership,
            analysis_source,
            time_limits,
            measurement_selection,
            spectrum_settings,
            spectrogram_settings,
            persistence_settings,
            stored_settings,
            peaks_enabled,
        )
    end
end

function SignalAnalyserDisplayState(
    id::AbstractString,
    name::AbstractString,
    active_plot::SignalAnalyserPlot,
    membership::SignalDisplayMembership,
    analysis_source::Union{NoSignalAnalysisSource,SignalAnalysisSource},
    time_limits::Union{Nothing,SignalTimeLimits},
    measurement_selection::SignalMeasurementSelection,
    spectrum_settings::SignalSpectrumSettings,
    spectrogram_settings::SignalSpectrogramSettings,
    persistence_settings::SignalPersistenceSettings,
    peaks_enabled::Bool,
)
    SignalAnalyserDisplayState(
        id,
        name,
        active_plot,
        membership,
        analysis_source,
        time_limits,
        measurement_selection,
        spectrum_settings,
        spectrogram_settings,
        persistence_settings,
        SignalDisplayStoredSettings(),
        peaks_enabled,
    )
end

function SignalAnalyserDisplayState(
    id::AbstractString,
    name::AbstractString,
    active_plot::SignalAnalyserPlot,
    membership::SignalDisplayMembership,
    analysis_source::Union{NoSignalAnalysisSource,SignalAnalysisSource},
    time_limits::Union{Nothing,SignalTimeLimits},
    measurement_selection::SignalMeasurementSelection,
    spectrum_settings::SignalSpectrumSettings,
    spectrogram_settings::SignalSpectrogramSettings,
    peaks_enabled::Bool,
)
    SignalAnalyserDisplayState(
        id,
        name,
        active_plot,
        membership,
        analysis_source,
        time_limits,
        measurement_selection,
        spectrum_settings,
        spectrogram_settings,
        SignalPersistenceSettings(),
        peaks_enabled,
    )
end

function SignalAnalyserDisplayState(
    id::AbstractString,
    name::AbstractString,
    active_plot::SignalAnalyserPlot,
    membership::SignalDisplayMembership,
    analysis_source::Union{NoSignalAnalysisSource,SignalAnalysisSource},
    time_limits::Union{Nothing,SignalTimeLimits},
    measurement_selection::SignalMeasurementSelection,
    spectrum_settings::SignalSpectrumSettings,
    peaks_enabled::Bool,
)
    SignalAnalyserDisplayState(
        id,
        name,
        active_plot,
        membership,
        analysis_source,
        time_limits,
        measurement_selection,
        spectrum_settings,
        SignalSpectrogramSettings(),
        peaks_enabled,
    )
end

function SignalAnalyserDisplayState(
    id::AbstractString,
    name::AbstractString,
    active_plot::SignalAnalyserPlot,
    membership::SignalDisplayMembership,
    analysis_source::Union{NoSignalAnalysisSource,SignalAnalysisSource},
    time_limits::Union{Nothing,SignalTimeLimits},
    peaks_enabled::Bool,
)
    SignalAnalyserDisplayState(
        id,
        name,
        active_plot,
        membership,
        analysis_source,
        time_limits,
        SignalMeasurementSelection(),
        SignalSpectrumSettings(),
        peaks_enabled,
    )
end

function SignalAnalyserDisplayState(
    id::AbstractString,
    name::AbstractString,
    active_plot::SignalAnalyserPlot,
    membership::SignalDisplayMembership,
    analysis_source::Union{NoSignalAnalysisSource,SignalAnalysisSource},
    time_limits::Union{Nothing,SignalTimeLimits},
    measurement_selection::SignalMeasurementSelection,
    peaks_enabled::Bool,
)
    SignalAnalyserDisplayState(
        id,
        name,
        active_plot,
        membership,
        analysis_source,
        time_limits,
        measurement_selection,
        SignalSpectrumSettings(),
        peaks_enabled,
    )
end

function SignalAnalyserDisplayState(
    id::AbstractString,
    name::AbstractString,
    active_plot::SignalAnalyserPlot,
    selected_signal::Union{Nothing,AbstractString},
    visible_signals::AbstractVector{<:AbstractString},
    time_limits::Union{Nothing,SignalTimeLimits},
    measurement_selection::SignalMeasurementSelection,
    spectrum_settings::SignalSpectrumSettings,
    spectrogram_settings::SignalSpectrogramSettings,
    persistence_settings::SignalPersistenceSettings,
    peaks_enabled::Bool,
)
    SignalAnalyserDisplayState(
        id,
        name,
        active_plot,
        SignalDisplayMembership(visible_signals),
        signal_analysis_source(selected_signal),
        time_limits,
        measurement_selection,
        spectrum_settings,
        spectrogram_settings,
        persistence_settings,
        peaks_enabled,
    )
end

function SignalAnalyserDisplayState(
    id::AbstractString,
    name::AbstractString,
    active_plot::SignalAnalyserPlot,
    selected_signal::Union{Nothing,AbstractString},
    visible_signals::AbstractVector{<:AbstractString},
    time_limits::Union{Nothing,SignalTimeLimits},
    measurement_selection::SignalMeasurementSelection,
    spectrum_settings::SignalSpectrumSettings,
    spectrogram_settings::SignalSpectrogramSettings,
    peaks_enabled::Bool,
)
    SignalAnalyserDisplayState(
        id,
        name,
        active_plot,
        SignalDisplayMembership(visible_signals),
        signal_analysis_source(selected_signal),
        time_limits,
        measurement_selection,
        spectrum_settings,
        spectrogram_settings,
        peaks_enabled,
    )
end

function SignalAnalyserDisplayState(
    id::AbstractString,
    name::AbstractString,
    active_plot::SignalAnalyserPlot,
    selected_signal::Union{Nothing,AbstractString},
    visible_signals::AbstractVector{<:AbstractString},
    time_limits::Union{Nothing,SignalTimeLimits},
    measurement_selection::SignalMeasurementSelection,
    spectrum_settings::SignalSpectrumSettings,
    peaks_enabled::Bool,
)
    SignalAnalyserDisplayState(
        id,
        name,
        active_plot,
        selected_signal,
        visible_signals,
        time_limits,
        measurement_selection,
        spectrum_settings,
        SignalSpectrogramSettings(),
        peaks_enabled,
    )
end

function SignalAnalyserDisplayState(
    id::AbstractString,
    name::AbstractString,
    active_plot::SignalAnalyserPlot,
    selected_signal::Union{Nothing,AbstractString},
    visible_signals::AbstractVector{<:AbstractString},
    time_limits::Union{Nothing,SignalTimeLimits},
    peaks_enabled::Bool,
)
    SignalAnalyserDisplayState(
        id,
        name,
        active_plot,
        selected_signal,
        visible_signals,
        time_limits,
        SignalMeasurementSelection(),
        SignalSpectrumSettings(),
        peaks_enabled,
    )
end

function SignalAnalyserDisplayState(
    id::AbstractString,
    name::AbstractString,
    active_plot::SignalAnalyserPlot,
    selected_signal::Union{Nothing,AbstractString},
    visible_signals::AbstractVector{<:AbstractString},
    time_limits::Union{Nothing,SignalTimeLimits},
    measurement_selection::SignalMeasurementSelection,
    peaks_enabled::Bool,
)
    SignalAnalyserDisplayState(
        id,
        name,
        active_plot,
        selected_signal,
        visible_signals,
        time_limits,
        measurement_selection,
        SignalSpectrumSettings(),
        peaks_enabled,
    )
end

signal_analyser_display_members(display::SignalAnalyserDisplayState)::Vector{String} =
    collect(display.membership.signal_names)
signal_analyser_display_analysis_name(display::SignalAnalyserDisplayState) =
    signal_analysis_name(display.analysis_source)

function signal_display_pane_from_display(
    id::AbstractString,
    display::SignalAnalyserDisplayState,
    name::AbstractString = signal_display_default_pane_name(id),
    extrema_state::SignalPaneExtremaState = SignalPaneExtremaState(),
)::SignalDisplayPaneState
    SignalDisplayPaneState(
        id,
        name,
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
        SignalPeaksSettings(),
        extrema_state,
    )
end

signal_display_default_layout(
    display::SignalAnalyserDisplayState,
)::SignalDisplayLayoutState = signal_display_default_layout(
    signal_display_pane_from_display("pane-1", display),
)

signal_display_legacy_single_pane_layout(
    display::SignalAnalyserDisplayState,
)::SignalDisplayLayoutState = signal_display_legacy_single_pane_layout(
    signal_display_pane_from_display("pane-1", display),
)

function signal_analyser_publish_display_state!(
    display::SignalAnalyserDisplayState,
    prospective::SignalAnalyserDisplayState,
)
    display.id == prospective.id || throw(ArgumentError("Нельзя опубликовать состояние другого Display"))
    display.name = prospective.name
    display.active_plot = prospective.active_plot
    display.membership = prospective.membership
    display.analysis_source = prospective.analysis_source
    display.time_limits = prospective.time_limits
    display.measurement_selection = prospective.measurement_selection
    display.spectrum_settings = prospective.spectrum_settings
    display.spectrogram_settings = prospective.spectrogram_settings
    display.persistence_settings = prospective.persistence_settings
    display.stored_settings = prospective.stored_settings
    display.peaks_enabled = prospective.peaks_enabled
    nothing
end

"""Stable identity of one pane output calculation and its cache generation."""
struct SignalAnalyserOutputContextKey
    display_id::String
    pane_id::String
    plot_type::SignalAnalyserPlot
    calculation_revision::Int

    function SignalAnalyserOutputContextKey(
        display_id::AbstractString,
        pane_id::AbstractString,
        plot_type::SignalAnalyserPlot,
        calculation_revision::Int,
    )
        isempty(display_id) && throw(ArgumentError("Display id output context не может быть пустым"))
        isempty(pane_id) && throw(ArgumentError("Pane id output context не может быть пустым"))
        calculation_revision >= 0 || throw(ArgumentError(
            "Calculation revision output context не может быть отрицательной",
        ))
        new(String(display_id), String(pane_id), plot_type, calculation_revision)
    end
end

"""Provider-affecting Peaks request context for one active TIME pane."""
struct SignalAnalyserPeaksContextKey
    display_id::String
    pane_id::String
    plot_type::SignalAnalyserPlot
    signal_names::Tuple{Vararg{String}}
    time_limits::Union{Nothing,SignalTimeLimits}
    spectrum_settings::Union{Nothing,SignalSpectrumSettings}
    visible_range::Union{Nothing,SignalPeaksVisibleRange}
    settings::SignalPeaksSettings
    calculation_revision::Int

    function SignalAnalyserPeaksContextKey(
        display_id::AbstractString,
        pane_id::AbstractString,
        plot_type::SignalAnalyserPlot,
        signal_names::AbstractVector{<:AbstractString},
        time_limits::Union{Nothing,SignalTimeLimits},
        spectrum_settings::Union{Nothing,SignalSpectrumSettings},
        visible_range::Union{Nothing,SignalPeaksVisibleRange},
        settings::SignalPeaksSettings,
        calculation_revision::Int,
    )
        isempty(display_id) && throw(ArgumentError("Display id Peaks context не может быть пустым"))
        isempty(pane_id) && throw(ArgumentError("Pane id Peaks context не может быть пустым"))
        names = String.(signal_names)
        allunique(names) || throw(ArgumentError("Signal names Peaks context не должны повторяться"))
        calculation_revision >= 0 || throw(ArgumentError(
            "Calculation revision Peaks context не может быть отрицательной",
        ))
        plot_type in (TIME_PLOT, SPECTRUM_PLOT) || throw(ArgumentError(
            "Extrema context поддерживает только TIME или SPECTRUM pane",
        ))
        plot_type == TIME_PLOT && spectrum_settings !== nothing && throw(ArgumentError(
            "TIME extrema context не должен содержать Spectrum settings",
        ))
        plot_type == SPECTRUM_PLOT && spectrum_settings === nothing && throw(ArgumentError(
            "SPECTRUM extrema context требует Spectrum settings",
        ))
        plot_type == TIME_PLOT && visible_range isa SignalSpectrumPeaksVisibleRange && throw(
            ArgumentError("TIME extrema context не принимает частотный visible range"),
        )
        plot_type == SPECTRUM_PLOT && visible_range isa SignalTimePeaksVisibleRange && throw(
            ArgumentError("SPECTRUM extrema context не принимает временной visible range"),
        )
        new(
            String(display_id),
            String(pane_id),
            plot_type,
            Tuple(names),
            time_limits,
            spectrum_settings,
            visible_range,
            settings,
            calculation_revision,
        )
    end
end

Base.:(==)(left::SignalAnalyserPeaksContextKey, right::SignalAnalyserPeaksContextKey) =
    left.display_id == right.display_id &&
    left.pane_id == right.pane_id &&
    left.plot_type == right.plot_type &&
    left.signal_names == right.signal_names &&
    isequal(left.time_limits, right.time_limits) &&
    isequal(left.spectrum_settings, right.spectrum_settings) &&
    isequal(left.visible_range, right.visible_range) &&
    left.settings == right.settings &&
    left.calculation_revision == right.calculation_revision
Base.isequal(left::SignalAnalyserPeaksContextKey, right::SignalAnalyserPeaksContextKey) =
    left == right
Base.hash(key::SignalAnalyserPeaksContextKey, seed::UInt) = hash(
    (
        key.display_id,
        key.pane_id,
        key.plot_type,
        key.signal_names,
        key.time_limits,
        key.spectrum_settings,
        key.visible_range,
        key.settings,
        key.calculation_revision,
    ),
    seed,
)

"""Cache identity for one signal inside one pane Peaks calculation."""
struct SignalAnalyserPeaksSignalContextKey
    display_id::String
    pane_id::String
    plot_type::SignalAnalyserPlot
    signal_name::String
    time_limits::Union{Nothing,SignalTimeLimits}
    spectrum_settings::Union{Nothing,SignalSpectrumSettings}
    visible_range::Union{Nothing,SignalPeaksVisibleRange}
    settings::SignalPeaksSettings
    calculation_revision::Int

    function SignalAnalyserPeaksSignalContextKey(
        context::SignalAnalyserPeaksContextKey,
        signal_name::AbstractString,
    )
        name = String(signal_name)
        name in context.signal_names || throw(ArgumentError(
            "Сигнал Peaks cache отсутствует в pane context",
        ))
        new(
            context.display_id,
            context.pane_id,
            context.plot_type,
            name,
            context.time_limits,
            context.spectrum_settings,
            context.visible_range,
            context.settings,
            context.calculation_revision,
        )
    end
end

Base.:(==)(
    left::SignalAnalyserPeaksSignalContextKey,
    right::SignalAnalyserPeaksSignalContextKey,
) =
    left.display_id == right.display_id &&
    left.pane_id == right.pane_id &&
    left.plot_type == right.plot_type &&
    left.signal_name == right.signal_name &&
    isequal(left.time_limits, right.time_limits) &&
    isequal(left.spectrum_settings, right.spectrum_settings) &&
    isequal(left.visible_range, right.visible_range) &&
    left.settings == right.settings &&
    left.calculation_revision == right.calculation_revision

Base.:(==)(left::SignalAnalyserOutputContextKey, right::SignalAnalyserOutputContextKey) =
    left.display_id == right.display_id &&
    left.pane_id == right.pane_id &&
    left.plot_type == right.plot_type &&
    left.calculation_revision == right.calculation_revision
Base.isequal(left::SignalAnalyserOutputContextKey, right::SignalAnalyserOutputContextKey) =
    left == right
Base.hash(key::SignalAnalyserOutputContextKey, seed::UInt) = hash(
    (key.display_id, key.pane_id, key.plot_type, key.calculation_revision),
    seed,
)

"""Last fully published Plotly payload for one pane; stale entries remain last-good."""
struct SignalAnalyserPlotCacheEntry
    context::SignalAnalyserOutputContextKey
    plots::Vector{Dict{String,Any}}
end

"""Last fully published Peaks result for one pane/signal; stale entries remain last-good."""
struct SignalAnalyserPeaksCacheEntry
    context::SignalAnalyserPeaksSignalContextKey
    peaks::SignalPeaksSnapshot
end

"""API-visible Peaks table readiness kept independently from graph output."""
struct SignalAnalyserPeaksStatus
    context::SignalAnalyserPeaksContextKey
    isready::Bool
    success::Bool
    error::String
end

"""API-visible readiness state kept separately from stale/dirty state."""
struct SignalAnalyserOutputStatus
    context::SignalAnalyserOutputContextKey
    isready::Bool
    success::Bool
    error::String
end

"""Cooperative cancellation flag shared with the one currently running calculation."""
mutable struct SignalAnalyserCancellationToken
    cancelled::Threads.Atomic{Bool}
end

SignalAnalyserCancellationToken() = SignalAnalyserCancellationToken(Threads.Atomic{Bool}(false))

"""Stable queue identity of one pane; pane ids are only unique inside a Display."""
struct SignalAnalyserExtremaPaneKey
    display_id::String
    pane_id::String

    function SignalAnalyserExtremaPaneKey(
        display_id::AbstractString,
        pane_id::AbstractString,
    )
        display = String(display_id)
        pane = String(pane_id)
        isempty(display) && throw(ArgumentError("Display id extrema queue не может быть пустым"))
        isempty(pane) && throw(ArgumentError("Pane id extrema queue не может быть пустым"))
        new(display, pane)
    end
end

Base.:(==)(left::SignalAnalyserExtremaPaneKey, right::SignalAnalyserExtremaPaneKey) =
    left.display_id == right.display_id && left.pane_id == right.pane_id
Base.isequal(left::SignalAnalyserExtremaPaneKey, right::SignalAnalyserExtremaPaneKey) =
    left == right
Base.hash(key::SignalAnalyserExtremaPaneKey, seed::UInt) =
    hash((key.display_id, key.pane_id), seed)

"""Runtime-only bounded visible-pane scheduler state; it is never session-serialized."""
mutable struct SignalAnalyserCalculationManager
    calculation_revision::Int
    page_calculation_revisions::Dict{String,Int}
    peaks_calculation_revision::Int
    peaks_page_calculation_revisions::Dict{String,Int}
    plot_cache::Dict{String,SignalAnalyserPlotCacheEntry}
    peaks_cache::Dict{String,SignalAnalyserPeaksCacheEntry}
    need_update_pages::Dict{String,Bool}
    peaks_need_update_pages::Dict{String,Bool}
    output_statuses::Dict{String,SignalAnalyserOutputStatus}
    peaks_statuses::Dict{String,SignalAnalyserPeaksStatus}
    active_page_id::Union{Nothing,String}
    active_context::Union{Nothing,SignalAnalyserOutputContextKey}
    active_peaks_context::Union{Nothing,SignalAnalyserPeaksContextKey}
    active_task::Union{Nothing,Task}
    active_poll_count::Int
    cancellation_token::Union{Nothing,SignalAnalyserCancellationToken}
    peaks_task::Union{Nothing,Task}
    peaks_active_poll_count::Int
    peaks_cancellation_token::Union{Nothing,SignalAnalyserCancellationToken}
    queued_contexts::Vector{SignalAnalyserOutputContextKey}
    queued_peaks_contexts::Vector{SignalAnalyserPeaksContextKey}
    output_poll_counts::Dict{String,Int}
    peaks_poll_counts::Dict{String,Int}
    active_task_is_worker::Bool
    extrema_task::Union{Nothing,Task}
    active_extrema_pane::Union{Nothing,SignalAnalyserExtremaPaneKey}
    extrema_queue::Vector{SignalAnalyserExtremaPaneKey}
    extrema_visible_ranges::Dict{SignalAnalyserExtremaPaneKey,Union{Nothing,SignalPeaksVisibleRange}}
end

function SignalAnalyserCalculationManager(page_ids::AbstractVector{<:AbstractString})
    ids = String.(page_ids)
    allunique(ids) || throw(ArgumentError("Page ids calculation manager не должны повторяться"))
    SignalAnalyserCalculationManager(
        0,
        Dict(id => 0 for id in ids),
        0,
        Dict(id => 0 for id in ids),
        Dict{String,SignalAnalyserPlotCacheEntry}(),
        Dict{String,SignalAnalyserPeaksCacheEntry}(),
        Dict(id => true for id in ids),
        Dict(id => true for id in ids),
        Dict{String,SignalAnalyserOutputStatus}(),
        Dict{String,SignalAnalyserPeaksStatus}(),
        nothing,
        nothing,
        nothing,
        nothing,
        0,
        nothing,
        nothing,
        0,
        nothing,
        SignalAnalyserOutputContextKey[],
        SignalAnalyserPeaksContextKey[],
        Dict{String,Int}(),
        Dict{String,Int}(),
        false,
        nothing,
        nothing,
        SignalAnalyserExtremaPaneKey[],
        Dict{SignalAnalyserExtremaPaneKey,Union{Nothing,SignalPeaksVisibleRange}}(),
    )
end

function signal_analyser_clone_calculation_manager(
    manager::SignalAnalyserCalculationManager,
)::SignalAnalyserCalculationManager
    SignalAnalyserCalculationManager(
        manager.calculation_revision,
        copy(manager.page_calculation_revisions),
        manager.peaks_calculation_revision,
        copy(manager.peaks_page_calculation_revisions),
        copy(manager.plot_cache),
        copy(manager.peaks_cache),
        copy(manager.need_update_pages),
        copy(manager.peaks_need_update_pages),
        copy(manager.output_statuses),
        copy(manager.peaks_statuses),
        manager.active_page_id,
        nothing,
        nothing,
        nothing,
        0,
        nothing,
        nothing,
        0,
        nothing,
        SignalAnalyserOutputContextKey[],
        SignalAnalyserPeaksContextKey[],
        Dict{String,Int}(),
        Dict{String,Int}(),
        false,
        nothing,
        nothing,
        SignalAnalyserExtremaPaneKey[],
        Dict{SignalAnalyserExtremaPaneKey,Union{Nothing,SignalPeaksVisibleRange}}(),
    )
end

mutable struct SignalAnalyserState{
    P<:AbstractPeaksProvider,
    S<:AbstractSignalSpectrumProvider,
    G<:AbstractSignalSpectrogramProvider,
    R<:AbstractSignalPersistenceProvider,
}
    signals::Vector{AnalysedSignal}
    view::SignalAnalyserViewState
    row_selection::GlobalSignalSelection
    displays::Vector{SignalAnalyserDisplayState}
    active_display_id::String
    next_display_number::Int
    display_layouts::Dict{String,SignalDisplayLayoutState}
    plot_cache::Dict{String,Dict{String,Any}}
    spectrum_cache::Dict{SignalSpectrumCacheKey,SignalSpectrumData}
    spectrogram_cache::Dict{SignalSpectrogramCacheKey,SignalSpectrogramData}
    persistence_cache::Dict{SignalPersistenceCacheKey,SignalPersistenceData}
    measurements_service::SignalMeasurementsService
    peaks_service::SignalPeaksService{P}
    spectrum_service::SignalSpectrumService{S}
    spectrogram_service::SignalSpectrogramService{G}
    persistence_service::SignalPersistenceService{R}
    output_manager::SignalAnalyserCalculationManager
    lock::ReentrantLock
end

function SignalAnalyserState(
    signals::Vector{AnalysedSignal},
    view::SignalAnalyserViewState,
    plot_cache::Dict{String,Dict{String,Any}},
    lock::ReentrantLock,
    ;
    peaks_provider::AbstractPeaksProvider = EngeeDSPPeaksProvider(),
    spectrum_provider::AbstractSignalSpectrumProvider = EngeeDSPSpectrumProvider(),
    spectrogram_provider::AbstractSignalSpectrogramProvider = EngeeDSPSpectrogramProvider(),
    persistence_provider::AbstractSignalPersistenceProvider = EngeeDSPPersistenceProvider(),
)
    isempty(signals) && throw(ArgumentError("Signal Analyser требует хотя бы один сигнал в global inventory"))
    # A fresh analyser starts with no signal bound to its only pane.  Visibility
    # mirrors the active Display membership, so it must start clear as well.
    signals = AnalysedSignal[
        AnalysedSignal(
            signal.id,
            signal.name,
            signal.color,
            signal.sample_rate_hz,
            copy(signal.values),
            signal.is_complex,
            false,
        ) for signal in signals
    ]
    allunique(signal.id for signal in signals) || throw(ArgumentError(
        "Signal ids в global inventory должны быть уникальны",
    ))
    known_names = [signal.name for signal in signals]
    allunique(known_names) || throw(ArgumentError(
        "Signal names в global inventory должны быть уникальны",
    ))
    row_selected_signal = view.selected_signal === nothing ? first(known_names) : view.selected_signal
    row_selected_signal in known_names || throw(ArgumentError("Глобально выбранный сигнал отсутствует в inventory"))
    display = SignalAnalyserDisplayState(
        "display-1",
        "Экран 1",
        view.active_plot,
        SignalDisplayMembership(String[]),
        NoSignalAnalysisSource(),
        nothing,
        false,
    )
    view.selected_signal = nothing
    SignalAnalyserState(
        signals,
        view,
        GlobalSignalSelection(row_selected_signal),
        SignalAnalyserDisplayState[display],
        display.id,
        2,
        Dict(display.id => signal_display_default_layout(display)),
        plot_cache,
        Dict{SignalSpectrumCacheKey,SignalSpectrumData}(),
        Dict{SignalSpectrogramCacheKey,SignalSpectrogramData}(),
        Dict{SignalPersistenceCacheKey,SignalPersistenceData}(),
        SignalMeasurementsService(),
        SignalPeaksService(peaks_provider),
        SignalSpectrumService(spectrum_provider),
        SignalSpectrogramService(spectrogram_provider),
        SignalPersistenceService(persistence_provider),
        SignalAnalyserCalculationManager([
            "$(display.id)::pane-$pane_number" for pane_number in 1:4
        ]),
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

    harmonic = @. sin(2pi * 180.0 * time)

    AnalysedSignal[
        AnalysedSignal(
            "Гармонический сигнал",
            "#2563eb",
            sample_rate_hz,
            ComplexF64.(harmonic),
            false,
            true,
        ),
    ]
end

function default_signal_analyser_state(;
    peaks_provider::AbstractPeaksProvider = EngeeDSPPeaksProvider(),
    spectrum_provider::AbstractSignalSpectrumProvider = EngeeDSPSpectrumProvider(),
    spectrogram_provider::AbstractSignalSpectrogramProvider = EngeeDSPSpectrogramProvider(),
    persistence_provider::AbstractSignalPersistenceProvider = EngeeDSPPersistenceProvider(),
)::SignalAnalyserState
    signals = default_signal_catalog()
    SignalAnalyserState(
        signals,
        SignalAnalyserViewState(0, TIME_PLOT, first(signals).name),
        Dict{String,Dict{String,Any}}(),
        ReentrantLock(),
        peaks_provider = peaks_provider,
        spectrum_provider = spectrum_provider,
        spectrogram_provider = spectrogram_provider,
        persistence_provider = persistence_provider,
    )
end

function signal_by_name(state::SignalAnalyserState, name::AbstractString)::AnalysedSignal
    index = findfirst(signal -> signal.name == name, state.signals)
    index === nothing && throw(ArgumentError("Сигнал не найден: $name"))
    state.signals[index]
end

function signal_by_id(state::SignalAnalyserState, id::AbstractString)::AnalysedSignal
    index = findfirst(signal -> signal.id == id, state.signals)
    index === nothing && throw(ArgumentError("Сигнал не найден: $id"))
    state.signals[index]
end

function signal_analyser_publish_row_selection!(
    state::SignalAnalyserState,
    selection::GlobalSignalSelection,
)
    any(signal -> signal.name == selection.signal_name, state.signals) || throw(ArgumentError(
        "Глобально выбранный сигнал отсутствует в inventory",
    ))
    state.row_selection = selection
    nothing
end
