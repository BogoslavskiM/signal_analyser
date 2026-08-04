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
    name::String
    color::String
    sample_rate_hz::Float64
    values::Vector{ComplexF64}
    is_complex::Bool
    visible::Bool
end

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
    values::Tuple{Vararg{Float64}}
    sample_offset::Int
    sample_rate_hz::Float64

    function SignalOrdinateRoi(
        ordinate::SignalMeasurementOrdinate,
        values::AbstractVector{<:Real},
        sample_offset::Int,
        sample_rate_hz::Real,
    )
        roi_values = Float64.(values)
        isempty(roi_values) && throw(ArgumentError("Time Limits не содержат ни одного отсчёта"))
        all(isfinite, roi_values) || throw(ArgumentError("ROI сигнала содержит нечисловые отсчёты"))
        sample_offset >= 0 || throw(ArgumentError("Смещение ROI не может быть отрицательным"))
        isfinite(sample_rate_hz) && sample_rate_hz > 0 || throw(ArgumentError(
            "Частота дискретизации ROI должна быть положительной и конечной",
        ))
        new(ordinate, Tuple(roi_values), sample_offset, Float64(sample_rate_hz))
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

struct SignalPeaksQuery
    state_revision::Int
    display_id::String
    signal_name::String
    ordinate::SignalMeasurementOrdinate
    values::Tuple{Vararg{Float64}}
    sample_rate_hz::Float64
    sample_offset::Int

    function SignalPeaksQuery(
        state_revision::Int,
        display_id::AbstractString,
        signal_name::AbstractString,
        ordinate::SignalMeasurementOrdinate,
        values::AbstractVector{<:Real},
        sample_rate_hz::Real,
        sample_offset::Int,
    )
        state_revision >= 0 || throw(ArgumentError("Ревизия peaks query не может быть отрицательной"))
        isempty(display_id) && throw(ArgumentError("Идентификатор Display peaks query не может быть пустым"))
        isempty(signal_name) && throw(ArgumentError("Имя сигнала peaks query не может быть пустым"))
        length(values) >= 3 || throw(ArgumentError("Для поиска пиков нужно не менее трёх отсчётов"))
        peak_values = Float64.(values)
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
            Tuple(peak_values),
            Float64(sample_rate_hz),
            sample_offset,
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
) = SignalPeaksQuery(
    state_revision,
    display_id,
    signal_name,
    ordinate,
    values,
    sample_rate_hz,
    0,
)

struct SignalPeaksProviderResult
    peak_values::Tuple{Vararg{Float64}}
    locations_1based::Tuple{Vararg{Int}}
    widths_samples::Tuple{Vararg{Float64}}
    prominences::Tuple{Vararg{Float64}}

    function SignalPeaksProviderResult(
        peak_values::AbstractVector{<:Real},
        locations_1based::AbstractVector{<:Integer},
        widths_samples::AbstractVector{<:Real},
        prominences::AbstractVector{<:Real},
        sample_count::Int,
    )
        sample_count >= 3 || throw(ArgumentError("Результат peaks требует не менее трёх исходных отсчётов"))
        count = length(peak_values)
        count == length(locations_1based) == length(widths_samples) == length(prominences) || throw(
            DimensionMismatch("Массивы Ypk, Xpk, Wpk и Ppk должны иметь одинаковую длину"),
        )
        values = Float64.(peak_values)
        locations = Int.(locations_1based)
        widths = Float64.(widths_samples)
        peak_prominences = Float64.(prominences)
        all(isfinite, values) || throw(ArgumentError("Значения Ypk должны быть конечными"))
        all(location -> 1 <= location <= sample_count, locations) || throw(ArgumentError(
            "Индексы Xpk должны находиться внутри исходного сигнала",
        ))
        issorted(locations) && allunique(locations) || throw(ArgumentError(
            "Индексы Xpk должны быть уникальными и следовать в порядке появления",
        ))
        all(value -> isfinite(value) && value >= 0, widths) || throw(ArgumentError(
            "Значения Wpk должны быть неотрицательными и конечными",
        ))
        all(value -> isfinite(value) && value >= 0, peak_prominences) || throw(ArgumentError(
            "Значения Ppk должны быть неотрицательными и конечными",
        ))
        new(Tuple(values), Tuple(locations), Tuple(widths), Tuple(peak_prominences))
    end
end

struct SignalPeakItem
    id::String
    value::Float64
    sample_index::Int
    time_s::Float64
    width_samples::Float64
    prominence::Float64

    function SignalPeakItem(
        value::Real,
        sample_index::Int,
        time_s::Real,
        width_samples::Real,
        prominence::Real,
    )
        isfinite(value) || throw(ArgumentError("Значение пика должно быть конечным"))
        sample_index >= 0 || throw(ArgumentError("Индекс пика не может быть отрицательным"))
        isfinite(time_s) && time_s >= 0 || throw(ArgumentError("Время пика должно быть неотрицательным и конечным"))
        isfinite(width_samples) && width_samples >= 0 || throw(ArgumentError("Ширина пика должна быть неотрицательной и конечной"))
        isfinite(prominence) && prominence >= 0 || throw(ArgumentError("Высота выступа пика должна быть неотрицательной и конечной"))
        new(
            "peak-$sample_index",
            Float64(value),
            sample_index,
            Float64(time_s),
            Float64(width_samples),
            Float64(prominence),
        )
    end
end

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
        (value, time, width, prominence) == ("1", "s", "samples", "1") || throw(ArgumentError(
            "Peaks P0 использует фиксированные единицы value/time/width/prominence",
        ))
        new(String(value), String(time), String(width), String(prominence))
    end
end

SignalPeaksUnits() = SignalPeaksUnits("1", "s", "samples", "1")

struct SignalPeaksSnapshot
    enabled::Bool
    state_revision::Int
    display_id::String
    signal_name::Union{Nothing,String}
    ordinate::Union{Nothing,SignalMeasurementOrdinate}
    units::SignalPeaksUnits
    items::Tuple{Vararg{SignalPeakItem}}

    function SignalPeaksSnapshot(
        enabled::Bool,
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
        indices = [item.sample_index for item in peak_items]
        issorted(indices) && allunique(indices) || throw(ArgumentError(
            "Peaks items должны быть уникальными и следовать в порядке появления",
        ))
        new(
            enabled,
            state_revision,
            String(display_id),
            signal_name === nothing ? nothing : String(signal_name),
            ordinate,
            units,
            Tuple(peak_items),
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
const SIGNAL_DISPLAY_LAYOUT_MAX_DIMENSION = 4
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

"""One stable plot aggregate inside a Display layout."""
struct SignalDisplayPaneState
    id::String
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

    function SignalDisplayPaneState(
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
    )
        pane_id = String(id)
        occursin(SIGNAL_DISPLAY_PANE_ID_REGEX, pane_id) || throw(ArgumentError(
            "Идентификатор pane должен иметь формат pane-N",
        ))
        analysis_name = signal_analysis_name(analysis_source)
        isempty(membership.signal_names) == (analysis_name === nothing) || throw(ArgumentError(
            "Analysis source должна отсутствовать только у пустой pane",
        ))
        analysis_name === nothing || analysis_name in membership.signal_names || throw(ArgumentError(
            "Analysis source должна входить в signal bindings pane",
        ))
        (analysis_name === nothing) == (time_limits === nothing) || throw(ArgumentError(
            "Time Limits должны отсутствовать только у пустой pane",
        ))
        peaks_enabled && plot_type != TIME_PLOT && throw(ArgumentError(
            "Поиск пиков доступен только для Time pane",
        ))
        peaks_enabled && analysis_name === nothing && throw(ArgumentError(
            "Поиск пиков требует analysis source pane",
        ))
        new(
            pane_id,
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
        )
    end
end

Base.:(==)(left::SignalDisplayPaneState, right::SignalDisplayPaneState) =
    left.id == right.id &&
    left.plot_type == right.plot_type &&
    left.membership.signal_names == right.membership.signal_names &&
    isequal(signal_analysis_name(left.analysis_source), signal_analysis_name(right.analysis_source)) &&
    isequal(left.time_limits, right.time_limits) &&
    left.measurement_selection == right.measurement_selection &&
    left.spectrum_settings == right.spectrum_settings &&
    left.spectrogram_settings == right.spectrogram_settings &&
    left.persistence_settings == right.persistence_settings &&
    left.stored_settings == right.stored_settings &&
    left.peaks_enabled == right.peaks_enabled
Base.isequal(left::SignalDisplayPaneState, right::SignalDisplayPaneState) = left == right
Base.copy(pane::SignalDisplayPaneState) = SignalDisplayPaneState(
    pane.id,
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
    )
end

signal_display_layout_variant(rows::Int, columns::Int)::String = "$(rows)x$(columns)"

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
        SIGNAL_DISPLAY_LAYOUT_MIN_DIMENSION <= rows <= SIGNAL_DISPLAY_LAYOUT_MAX_DIMENSION ||
            throw(ArgumentError("Число строк layout должно быть от 1 до 4"))
        SIGNAL_DISPLAY_LAYOUT_MIN_DIMENSION <= columns <= SIGNAL_DISPLAY_LAYOUT_MAX_DIMENSION ||
            throw(ArgumentError("Число столбцов layout должно быть от 1 до 4"))
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

function signal_display_default_layout(
    plot_type::SignalAnalyserPlot,
    signal_bindings::AbstractVector{<:AbstractString},
)::SignalDisplayLayoutState
    pane = SignalDisplayPaneState("pane-1", plot_type, signal_bindings)
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
    plot_type::SignalAnalyserPlot,
    signal_bindings::AbstractVector{<:AbstractString},
)::SignalDisplayLayoutState
    pane = signal_display_active_pane(layout)
    signal_display_layout_replace_pane(
        layout,
        SignalDisplayPaneState(pane.id, plot_type, signal_bindings),
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

"""Resize preserves the ordered prefix, drops only its suffix, and never reuses IDs."""
function signal_display_layout_resize(
    layout::SignalDisplayLayoutState,
    rows::Int,
    columns::Int,
)::SignalDisplayLayoutState
    requested_count = rows * columns
    surviving_count = min(length(layout.panes), requested_count)
    panes = SignalDisplayPaneState[copy(layout.panes[index]) for index in 1:surviving_count]
    next_pane_number = layout.next_pane_number
    while length(panes) < requested_count
        push!(panes, SignalDisplayPaneState("pane-$next_pane_number", TIME_PLOT, String[]))
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

function signal_display_layout_without_signal(
    layout::SignalDisplayLayoutState,
    signal_name::AbstractString,
)::SignalDisplayLayoutState
    panes = SignalDisplayPaneState[
        SignalDisplayPaneState(
            pane.id,
            pane.plot_type,
            [name for name in pane.signal_bindings if name != signal_name],
        )
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
        isempty(membership.signal_names) == (analysis_name === nothing) || throw(ArgumentError(
            "Analysis source должен отсутствовать только у пустого Display",
        ))
        analysis_name === nothing || analysis_name in membership.signal_names || throw(ArgumentError(
            "Analysis source должен входить в membership Display",
        ))
        (analysis_name === nothing) == (time_limits === nothing) || throw(ArgumentError(
            "Time Limits должны отсутствовать только у пустого Display",
        ))
        peaks_enabled && active_plot != TIME_PLOT && throw(ArgumentError(
            "Поиск пиков доступен только для Time plot",
        ))
        peaks_enabled && analysis_name === nothing && throw(ArgumentError(
            "Поиск пиков требует analysis source",
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
    known_names = [signal.name for signal in signals]
    visible_signals = [signal.name for signal in signals if signal.visible]
    row_selected_signal = view.selected_signal === nothing ? first(known_names) : view.selected_signal
    row_selected_signal in known_names || throw(ArgumentError("Глобально выбранный сигнал отсутствует в inventory"))
    analysis_name = if view.selected_signal !== nothing && view.selected_signal in visible_signals
        view.selected_signal
    elseif isempty(visible_signals)
        nothing
    else
        first(visible_signals)
    end
    display = SignalAnalyserDisplayState(
        "display-1",
        "Display 1",
        view.active_plot,
        analysis_name,
        visible_signals,
        analysis_name === nothing ? nothing : SignalTimeLimits(
            0.0,
            signal_duration_s(signals[findfirst(signal -> signal.name == analysis_name, signals)::Int]),
        ),
        false,
    )
    view.selected_signal = analysis_name
    SignalAnalyserState(
        signals,
        view,
        GlobalSignalSelection(row_selected_signal),
        SignalAnalyserDisplayState[display],
        display.id,
        2,
        Dict(display.id => signal_display_default_layout(
            display.active_plot,
            signal_analyser_display_members(display),
        )),
        plot_cache,
        Dict{SignalSpectrumCacheKey,SignalSpectrumData}(),
        Dict{SignalSpectrogramCacheKey,SignalSpectrogramData}(),
        Dict{SignalPersistenceCacheKey,SignalPersistenceData}(),
        SignalMeasurementsService(),
        SignalPeaksService(peaks_provider),
        SignalSpectrumService(spectrum_provider),
        SignalSpectrogramService(spectrogram_provider),
        SignalPersistenceService(persistence_provider),
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
