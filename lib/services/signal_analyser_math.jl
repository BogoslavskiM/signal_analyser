const SIGNAL_ANALYSER_MAX_LINE_POINTS = 1024
const SIGNAL_ANALYSER_MAX_HEATMAP_COLUMNS = 160
const SIGNAL_ANALYSER_MAX_HEATMAP_ROWS = 160

"""Finite full-raw Spectrogram dB extent; equality is valid for constant power."""
struct SignalSpectrogramPowerExtent
    min_db::Float64
    max_db::Float64

    function SignalSpectrogramPowerExtent(min_db::Real, max_db::Real)
        minimum_power = Float64(min_db)
        maximum_power = Float64(max_db)
        isfinite(minimum_power) && isfinite(maximum_power) || throw(ArgumentError(
            "Effective Power Limits Spectrogram должны быть конечными числами",
        ))
        minimum_power <= maximum_power || throw(ArgumentError(
            "Минимальная effective Power Limit Spectrogram не может превышать максимальную",
        ))
        new(
            minimum_power == 0.0 ? 0.0 : minimum_power,
            maximum_power == 0.0 ? 0.0 : maximum_power,
        )
    end
end

"""Finite full-raw linear-power extent, including exact zeros."""
struct SignalSpectrogramRawPowerExtent
    minimum::Float64
    maximum::Float64

    function SignalSpectrogramRawPowerExtent(minimum::Real, maximum::Real)
        min_power = Float64(minimum)
        max_power = Float64(maximum)
        isfinite(min_power) && isfinite(max_power) && min_power >= 0.0 || throw(
            ArgumentError("Raw Power Limits Spectrogram должны быть конечными и неотрицательными"),
        )
        min_power <= max_power || throw(ArgumentError(
            "Минимальная raw Power Limit Spectrogram не может превышать максимальную",
        ))
        new(
            min_power == 0.0 ? 0.0 : min_power,
            max_power == 0.0 ? 0.0 : max_power,
        )
    end
end

"""Transient full-raw dB projection plus canonical and linear extrema."""
struct SignalSpectrogramPowerProjection
    values_db::Matrix{Float64}
    finite_extent::Union{Nothing,SignalSpectrogramPowerExtent}
    raw_extent::Union{Nothing,SignalSpectrogramRawPowerExtent}
end

function SignalSpectrogramPowerProjection(data::SignalSpectrogramData)
    values_db = Matrix{Float64}(undef, size(data.power))
    minimum_power_db = Inf
    maximum_power_db = -Inf
    has_finite_power = false
    for index in eachindex(data.power)
        power_db = 10 * log10(data.power[index])
        values_db[index] = power_db
        if isfinite(power_db)
            minimum_power_db = min(minimum_power_db, power_db)
            maximum_power_db = max(maximum_power_db, power_db)
            has_finite_power = true
        end
    end
    extent = has_finite_power ?
        SignalSpectrogramPowerExtent(minimum_power_db, maximum_power_db) : nothing
    raw_extent = isempty(data.power) ? nothing : SignalSpectrogramRawPowerExtent(
        minimum(data.power),
        maximum(data.power),
    )
    SignalSpectrogramPowerProjection(values_db, extent, raw_extent)
end

"""Typed requested/effective Spectrogram colormap resolution."""
struct SignalSpectrogramPowerLimitsResolution{L<:AbstractSignalSpectrogramPowerLimits}
    requested::L
    effective::Union{Nothing,SignalSpectrogramPowerExtent}
end

SignalSpectrogramPowerLimitsResolution(
    limits::AutomaticSignalSpectrogramPowerLimits,
    projection::SignalSpectrogramPowerProjection,
) = SignalSpectrogramPowerLimitsResolution(limits, projection.finite_extent)

SignalSpectrogramPowerLimitsResolution(
    limits::ExplicitSignalSpectrogramPowerLimits,
    ::SignalSpectrogramPowerProjection,
) = SignalSpectrogramPowerLimitsResolution(
    limits,
    SignalSpectrogramPowerExtent(limits.min_db, limits.max_db),
)

"""Strict scale-specific limits sent directly to the renderer."""
struct SignalSpectrogramRenderedPowerLimits
    minimum::Float64
    maximum::Float64
    scale::SignalSpectrumScale

    function SignalSpectrogramRenderedPowerLimits(
        minimum::Real,
        maximum::Real,
        scale::SignalSpectrumScale,
    )
        min_value = Float64(minimum)
        max_value = Float64(maximum)
        isfinite(min_value) && isfinite(max_value) || throw(ArgumentError(
            "Rendered Power Limits Spectrogram должны быть конечными",
        ))
        min_value < max_value || throw(ArgumentError(
            "Rendered Power Limits Spectrogram должны быть строго возрастающими",
        ))
        scale == LINEAR_SPECTRUM_SCALE && min_value < 0.0 && throw(ArgumentError(
            "Linear rendered Power Limits Spectrogram не могут быть отрицательными",
        ))
        new(
            min_value == 0.0 ? 0.0 : min_value,
            max_value == 0.0 ? 0.0 : max_value,
            scale,
        )
    end
end

function SignalSpectrogramRenderedPowerLimits(
    limits::ExplicitSignalSpectrogramPowerLimits,
    scale::SignalSpectrumScale,
)
    scale == DB_SPECTRUM_SCALE && return SignalSpectrogramRenderedPowerLimits(
        limits.min_db,
        limits.max_db,
        scale,
    )
    SignalSpectrogramRenderedPowerLimits(
        10.0 ^ (limits.min_db / 10.0),
        10.0 ^ (limits.max_db / 10.0),
        scale,
    )
end

"""Immutable presentation inputs assembled from the two canonical authorities."""
struct SignalSpectrogramPresentationSettings{L<:AbstractSignalSpectrogramPowerLimits}
    scale::SignalSpectrumScale
    power_limits::L

    function SignalSpectrogramPresentationSettings(
        scale::SignalSpectrumScale,
        power_limits::L,
    ) where {L<:AbstractSignalSpectrogramPowerLimits}
        scale == LINEAR_SPECTRUM_SCALE &&
            power_limits isa ExplicitSignalSpectrogramPowerLimits &&
            SignalSpectrogramRenderedPowerLimits(power_limits, scale)
        new{L}(scale, power_limits)
    end
end

"""Typed projection result consumed by the Spectrogram wire serializer."""
struct SignalSpectrogramPresentationPlan{L<:AbstractSignalSpectrogramPowerLimits}
    values::Matrix{Float64}
    scale::SignalSpectrumScale
    power_limits::SignalSpectrogramPowerLimitsResolution{L}
    rendered_limits::Union{Nothing,SignalSpectrogramRenderedPowerLimits}
end

struct SignalSpectrogramPresentationPlanner end

function signal_spectrogram_constant_linear_limits(
    ::SignalSpectrogramPresentationPlanner,
    power::Float64,
)::SignalSpectrogramRenderedPowerLimits
    power > 0.0 && isfinite(power) || throw(ArgumentError(
        "Constant Linear Spectrogram power должна быть положительной и конечной",
    ))
    previous = prevfloat(power)
    following = nextfloat(power)
    if isfinite(previous) && previous >= 0.0 && previous < power &&
        isfinite(following) && power < following
        return SignalSpectrogramRenderedPowerLimits(previous, following, LINEAR_SPECTRUM_SCALE)
    elseif isfinite(previous) && previous >= 0.0 && previous < power
        return SignalSpectrogramRenderedPowerLimits(previous, power, LINEAR_SPECTRUM_SCALE)
    elseif isfinite(following) && power < following
        return SignalSpectrogramRenderedPowerLimits(power, following, LINEAR_SPECTRUM_SCALE)
    end
    throw(ArgumentError("Для constant Linear Spectrogram power не найден finite renderer interval"))
end

function signal_spectrogram_rendered_limits(
    ::SignalSpectrogramPresentationPlanner,
    settings::SignalSpectrogramPresentationSettings{<:ExplicitSignalSpectrogramPowerLimits},
    ::SignalSpectrogramPowerProjection,
    ::SignalSpectrogramPowerLimitsResolution,
)::SignalSpectrogramRenderedPowerLimits
    SignalSpectrogramRenderedPowerLimits(settings.power_limits, settings.scale)
end

function signal_spectrogram_rendered_limits(
    planner::SignalSpectrogramPresentationPlanner,
    settings::SignalSpectrogramPresentationSettings{AutomaticSignalSpectrogramPowerLimits},
    projection::SignalSpectrogramPowerProjection,
    resolution::SignalSpectrogramPowerLimitsResolution,
)::Union{Nothing,SignalSpectrogramRenderedPowerLimits}
    extent = resolution.effective
    extent === nothing && return nothing
    if settings.scale == DB_SPECTRUM_SCALE
        return extent.min_db < extent.max_db ? SignalSpectrogramRenderedPowerLimits(
            extent.min_db,
            extent.max_db,
            settings.scale,
        ) : SignalSpectrogramRenderedPowerLimits(
            extent.min_db - 1.0,
            extent.max_db + 1.0,
            settings.scale,
        )
    end
    raw_extent = projection.raw_extent
    raw_extent === nothing && throw(ArgumentError(
        "Canonical Auto Power Limits существуют без raw Spectrogram extent",
    ))
    raw_extent.minimum < raw_extent.maximum && return SignalSpectrogramRenderedPowerLimits(
        raw_extent.minimum,
        raw_extent.maximum,
        settings.scale,
    )
    signal_spectrogram_constant_linear_limits(planner, raw_extent.minimum)
end

function signal_spectrogram_presentation_plan(
    planner::SignalSpectrogramPresentationPlanner,
    data::SignalSpectrogramData,
    settings::SignalSpectrogramPresentationSettings,
)::SignalSpectrogramPresentationPlan
    projection = SignalSpectrogramPowerProjection(data)
    resolution = SignalSpectrogramPowerLimitsResolution(settings.power_limits, projection)
    rendered_limits = signal_spectrogram_rendered_limits(
        planner,
        settings,
        projection,
        resolution,
    )
    values = settings.scale == DB_SPECTRUM_SCALE ? projection.values_db : copy(data.power)
    SignalSpectrogramPresentationPlan(values, settings.scale, resolution, rendered_limits)
end

function signal_analyser_engee_dsp_module()
    try
        Base.require(@__MODULE__, :EngeeDSP)
    catch err
        throw(ArgumentError(
            "Для расчёта спектра, спектрограммы и персистентности требуется пакет EngeeDSP. " *
            "Исходная ошибка: $(sprint(showerror, err))",
        ))
    end
end

function signal_analyser_pspectrum(args...)
    engee_dsp = signal_analyser_engee_dsp_module()
    functions_module = getproperty(engee_dsp, :Functions)
    pspectrum = getproperty(functions_module, :pspectrum)
    pspectrum(args...)
end

function signal_analyser_bounded_indices(length_value::Int, limit::Int)::Vector{Int}
    length_value > 0 || return Int[]
    length_value <= limit && return collect(1:length_value)
    unique(round.(Int, range(1, length_value; length = limit)))
end

function signal_analyser_bounded_line(x::Vector{Float64}, y::Vector{Float64})
    length(x) == length(y) || throw(DimensionMismatch("Оси линейного графика имеют разную длину"))
    indices = signal_analyser_bounded_indices(length(x), SIGNAL_ANALYSER_MAX_LINE_POINTS)
    x[indices], y[indices]
end

function signal_analyser_bounded_heatmap(
    x::Vector{Float64},
    y::Vector{Float64},
    z::Matrix{Float64},
)
    size(z) == (length(y), length(x)) || throw(DimensionMismatch(
        "Матрица heatmap имеет размер $(size(z)), ожидался ($(length(y)), $(length(x)))",
    ))
    x_indices = signal_analyser_bounded_indices(length(x), SIGNAL_ANALYSER_MAX_HEATMAP_COLUMNS)
    y_indices = signal_analyser_bounded_indices(length(y), SIGNAL_ANALYSER_MAX_HEATMAP_ROWS)
    bounded_z = [
        [z[row_index, column_index] for column_index in x_indices]
        for row_index in y_indices
    ]
    x[x_indices], y[y_indices], bounded_z
end

function signal_analyser_time_plot(signal::AnalysedSignal)::Dict{String,Any}
    x = signal_time_values(signal)
    y = signal.is_complex ? Float64.(abs.(signal.values)) : Float64.(real.(signal.values))
    x, y = signal_analyser_bounded_line(x, y)
    Dict{String,Any}(
        "type" => "line",
        "x" => x,
        "y" => y,
        "x_label" => "Время, с",
        "y_label" => "Амплитуда",
    )
end

function signal_analyser_spectrum_plot(
    data::SignalSpectrumData,
    settings::SignalSpectrumSettings,
)::Dict{String,Any}
    x = Float64[data.frequencies_hz...]
    power = Float64[data.power...]
    y = if settings.scale == DB_SPECTRUM_SCALE
        Float64.(10 .* log10.(power))
    else
        power
    end
    x, y = signal_analyser_bounded_line(x, y)
    Dict{String,Any}(
        "type" => "line",
        "x" => x,
        "y" => y,
        "x_label" => "Частота, Гц",
        "y_label" => settings.scale == DB_SPECTRUM_SCALE ? "Мощность, дБ" : "Мощность",
        "method" => "pspectrum",
        "frequency_limits" => signal_spectrum_frequency_limits_metadata(settings, data),
    )
end

function signal_analyser_spectrum_plot(signal::AnalysedSignal)::Dict{String,Any}
    settings = SignalSpectrumSettings()
    service = SignalSpectrumService()
    data = signal_spectrum_data(
        service,
        signal,
        signal_full_time_limits(SignalMeasurementsService(), signal),
        settings,
    )
    signal_analyser_spectrum_plot(data, settings)
end

function signal_analyser_spectrogram_plot(
    data::SignalSpectrogramData,
    frequency_limits_metadata::Dict{String,Any},
    frequency_scale_metadata::Dict{String,Any},
    presentation_settings::SignalSpectrogramPresentationSettings,
)::Dict{String,Any}
    plan = signal_spectrogram_presentation_plan(
        SignalSpectrogramPresentationPlanner(),
        data,
        presentation_settings,
    )
    x = Float64[data.segment_centers_s...]
    y = Float64[data.frequencies_hz...]
    z = plan.values
    x, y, z = signal_analyser_bounded_heatmap(x, y, z)
    Dict{String,Any}(
        "type" => "heatmap",
        "x" => x,
        "y" => y,
        "z" => z,
        "x_label" => "Время, с",
        "y_label" => "Частота, Гц",
        "color_label" => plan.scale == DB_SPECTRUM_SCALE ? "Мощность, дБ" : "Мощность",
        "frequency_limits" => frequency_limits_metadata,
        "frequency_scale" => frequency_scale_metadata,
        "power_limits" => signal_spectrogram_power_limits_metadata(plan),
    )
end

function signal_analyser_spectrogram_plot(
    data::SignalSpectrogramData,
    frequency_limits_metadata::Dict{String,Any},
    frequency_scale_metadata::Dict{String,Any},
    power_limits::AbstractSignalSpectrogramPowerLimits,
)::Dict{String,Any}
    signal_analyser_spectrogram_plot(
        data,
        frequency_limits_metadata,
        frequency_scale_metadata,
        SignalSpectrogramPresentationSettings(DB_SPECTRUM_SCALE, power_limits),
    )
end


function signal_analyser_spectrogram_plot(
    data::SignalSpectrogramData,
    frequency_limits_metadata::Dict{String,Any},
    frequency_scale_metadata::Dict{String,Any},
)::Dict{String,Any}
    signal_analyser_spectrogram_plot(
        data,
        frequency_limits_metadata,
        frequency_scale_metadata,
        SignalSpectrogramPresentationSettings(
            DB_SPECTRUM_SCALE,
            AutomaticSignalSpectrogramPowerLimits(),
        ),
    )
end

function signal_analyser_spectrogram_plot(
    data::SignalSpectrogramData,
    settings::SignalSpectrogramSettings,
    scale::SignalSpectrumScale,
)::Dict{String,Any}
    signal_analyser_spectrogram_plot(
        data,
        signal_spectrogram_frequency_limits_metadata(settings, data),
        signal_spectrogram_frequency_scale_metadata(settings, data),
        SignalSpectrogramPresentationSettings(scale, settings.power_limits),
    )
end

signal_analyser_spectrogram_plot(
    data::SignalSpectrogramData,
    settings::SignalSpectrogramSettings,
)::Dict{String,Any} = signal_analyser_spectrogram_plot(data, settings, DB_SPECTRUM_SCALE)

function signal_analyser_spectrogram_plot(
    data::SignalSpectrogramData,
    settings::SignalSpectrogramSettings,
    signal::Union{Nothing,AnalysedSignal},
    scale::SignalSpectrumScale,
)::Dict{String,Any}
    signal_analyser_spectrogram_plot(
        data,
        signal_spectrogram_frequency_limits_metadata(settings, signal),
        signal_spectrogram_frequency_scale_metadata(settings, signal),
        SignalSpectrogramPresentationSettings(scale, settings.power_limits),
    )
end

signal_analyser_spectrogram_plot(
    data::SignalSpectrogramData,
    settings::SignalSpectrogramSettings,
    signal::Union{Nothing,AnalysedSignal},
)::Dict{String,Any} = signal_analyser_spectrogram_plot(
    data,
    settings,
    signal,
    DB_SPECTRUM_SCALE,
)

signal_analyser_spectrogram_plot(data::SignalSpectrogramData)::Dict{String,Any} =
    signal_analyser_spectrogram_plot(data, SignalSpectrogramSettings())

function signal_analyser_spectrogram_plot(signal::AnalysedSignal)::Dict{String,Any}
    settings = SignalSpectrogramSettings()
    data = signal_spectrogram_data(SignalSpectrogramService(), signal, settings)
    signal_analyser_spectrogram_plot(data, settings, signal, DB_SPECTRUM_SCALE)
end

abstract type AbstractSignalPersistenceDensityLimits end

"""Canonical Auto preference for Persistence density color limits."""
struct AutomaticSignalPersistenceDensityLimits <: AbstractSignalPersistenceDensityLimits end

Base.:(==)(::AutomaticSignalPersistenceDensityLimits, ::AutomaticSignalPersistenceDensityLimits) = true
Base.hash(::AutomaticSignalPersistenceDensityLimits, seed::UInt) = hash(:auto_persistence_density, seed)

"""Canonical explicit Persistence density limits in percent."""
struct ExplicitSignalPersistenceDensityLimits <: AbstractSignalPersistenceDensityLimits
    minimum::Float64
    maximum::Float64

    function ExplicitSignalPersistenceDensityLimits(minimum::Real, maximum::Real)
        minimum isa Bool && throw(ArgumentError(
            "Минимальная Density Limit Persistence должна быть числом, но не Bool",
        ))
        maximum isa Bool && throw(ArgumentError(
            "Максимальная Density Limit Persistence должна быть числом, но не Bool",
        ))
        min_value = Float64(minimum)
        max_value = Float64(maximum)
        isfinite(min_value) && isfinite(max_value) || throw(ArgumentError(
            "Density Limits Persistence должны быть конечными",
        ))
        0.0 <= min_value < max_value <= 100.0 || throw(ArgumentError(
            "Density Limits Persistence должны лежать внутри 0–100 процентов",
        ))
        new(
            min_value == 0.0 ? 0.0 : min_value,
            max_value == 0.0 ? 0.0 : max_value,
        )
    end
end


Base.:(==)(
    left::ExplicitSignalPersistenceDensityLimits,
    right::ExplicitSignalPersistenceDensityLimits,
) = left.minimum == right.minimum && left.maximum == right.maximum
Base.hash(limits::ExplicitSignalPersistenceDensityLimits, seed::UInt) =
    hash((limits.minimum, limits.maximum), seed)

"""Canonical full-raw Persistence density extent; equality represents a constant matrix."""
struct SignalPersistenceDensityExtent
    minimum::Float64
    maximum::Float64

    function SignalPersistenceDensityExtent(minimum::Real, maximum::Real)
        min_value = Float64(minimum)
        max_value = Float64(maximum)
        isfinite(min_value) && isfinite(max_value) || throw(ArgumentError(
            "Effective Density Limits Persistence должны быть конечными",
        ))
        0.0 <= min_value <= max_value <= 100.0 || throw(ArgumentError(
            "Effective Density Limits Persistence должны лежать внутри 0–100 процентов",
        ))
        new(
            min_value == 0.0 ? 0.0 : min_value,
            max_value == 0.0 ? 0.0 : max_value,
        )
    end
end

"""Finite strict Persistence density interval sent directly to the renderer."""
struct SignalPersistenceRenderedDensityLimits
    minimum::Float64
    maximum::Float64

    function SignalPersistenceRenderedDensityLimits(minimum::Real, maximum::Real)
        min_value = Float64(minimum)
        max_value = Float64(maximum)
        isfinite(min_value) && isfinite(max_value) || throw(ArgumentError(
            "Rendered Density Limits Persistence должны быть конечными",
        ))
        0.0 <= min_value < max_value <= 100.0 || throw(ArgumentError(
            "Rendered Density Limits Persistence должны быть строго возрастающими внутри 0–100 процентов",
        ))
        new(
            min_value == 0.0 ? 0.0 : min_value,
            max_value == 0.0 ? 0.0 : max_value,
        )
    end
end

"""Immutable typed Persistence presentation preference."""
struct SignalPersistencePresentationSettings{L<:AbstractSignalPersistenceDensityLimits}
    density_limits::L
end

SignalPersistencePresentationSettings(::Nothing) = SignalPersistencePresentationSettings(
    AutomaticSignalPersistenceDensityLimits(),
)

SignalPersistencePresentationSettings(range::SignalSettingRange) =
    SignalPersistencePresentationSettings(
        ExplicitSignalPersistenceDensityLimits(range.minimum, range.maximum),
    )

"""Canonical requested/effective density resolution derived before wire bounding."""
struct SignalPersistenceDensityLimitsResolution{L<:AbstractSignalPersistenceDensityLimits}
    requested::L
    effective::Union{Nothing,SignalPersistenceDensityExtent}
end

"""Typed Persistence presentation output consumed by the plot serializer."""
struct SignalPersistencePresentationPlan{L<:AbstractSignalPersistenceDensityLimits}
    occurrence_percent::Matrix{Float64}
    density_limits::SignalPersistenceDensityLimitsResolution{L}
    rendered_limits::Union{Nothing,SignalPersistenceRenderedDensityLimits}
end

struct SignalPersistencePresentationPlanner end

function signal_persistence_density_resolution(
    ::SignalPersistencePresentationPlanner,
    requested::AutomaticSignalPersistenceDensityLimits,
    data::SignalPersistenceData,
)
    extent = isempty(data.occurrence_percent) ? nothing : SignalPersistenceDensityExtent(
        minimum(data.occurrence_percent),
        maximum(data.occurrence_percent),
    )
    SignalPersistenceDensityLimitsResolution(requested, extent)
end

function signal_persistence_density_resolution(
    ::SignalPersistencePresentationPlanner,
    requested::ExplicitSignalPersistenceDensityLimits,
    ::SignalPersistenceData,
)
    SignalPersistenceDensityLimitsResolution(
        requested,
        SignalPersistenceDensityExtent(requested.minimum, requested.maximum),
    )
end

function signal_persistence_constant_rendered_limits(
    ::SignalPersistencePresentationPlanner,
    value::Float64,
)::SignalPersistenceRenderedDensityLimits
    value == 0.0 && return SignalPersistenceRenderedDensityLimits(0.0, 1.0)
    value == 100.0 && return SignalPersistenceRenderedDensityLimits(99.0, 100.0)
    SignalPersistenceRenderedDensityLimits(max(0.0, value - 1.0), min(100.0, value + 1.0))
end

function signal_persistence_rendered_density_limits(
    ::SignalPersistencePresentationPlanner,
    resolution::SignalPersistenceDensityLimitsResolution{ExplicitSignalPersistenceDensityLimits},
)::SignalPersistenceRenderedDensityLimits
    requested = resolution.requested
    SignalPersistenceRenderedDensityLimits(requested.minimum, requested.maximum)
end

function signal_persistence_rendered_density_limits(
    planner::SignalPersistencePresentationPlanner,
    resolution::SignalPersistenceDensityLimitsResolution{AutomaticSignalPersistenceDensityLimits},
)::Union{Nothing,SignalPersistenceRenderedDensityLimits}
    extent = resolution.effective
    extent === nothing && return nothing
    extent.minimum < extent.maximum && return SignalPersistenceRenderedDensityLimits(
        extent.minimum,
        extent.maximum,
    )
    signal_persistence_constant_rendered_limits(planner, extent.minimum)
end

function signal_persistence_presentation_plan(
    planner::SignalPersistencePresentationPlanner,
    data::SignalPersistenceData,
    settings::SignalPersistencePresentationSettings,
)::SignalPersistencePresentationPlan
    resolution = signal_persistence_density_resolution(
        planner,
        settings.density_limits,
        data,
    )
    rendered = signal_persistence_rendered_density_limits(planner, resolution)
    SignalPersistencePresentationPlan(copy(data.occurrence_percent), resolution, rendered)
end

function signal_analyser_persistence_plot(
    data::SignalPersistenceData,
    settings::SignalPersistencePresentationSettings,
)::Dict{String,Any}
    plan = signal_persistence_presentation_plan(
        SignalPersistencePresentationPlanner(),
        data,
        settings,
    )
    x = Float64[data.frequencies_hz...]
    linear_power = Float64[data.power_levels...]
    y = Float64.(10 .* log10.(linear_power))
    x, y, z = signal_analyser_bounded_heatmap(x, y, plan.occurrence_percent)
    Dict{String,Any}(
        "type" => "heatmap",
        "x" => x,
        "y" => y,
        "z" => z,
        "x_label" => "Частота, Гц",
        "y_label" => "Мощность, дБ",
        "color_label" => "Встречаемость, %",
        "density_limits" => signal_persistence_density_limits_metadata(plan),
    )
end

function signal_analyser_persistence_plot(
    data::SignalPersistenceData,
    density_limits::Union{Nothing,SignalSettingRange},
)::Dict{String,Any}
    signal_analyser_persistence_plot(
        data,
        SignalPersistencePresentationSettings(density_limits),
    )
end


signal_analyser_persistence_plot(data::SignalPersistenceData)::Dict{String,Any} =
    signal_analyser_persistence_plot(data, nothing)

function signal_analyser_persistence_plot(signal::AnalysedSignal)::Dict{String,Any}
    data = signal_persistence_data(SignalPersistenceService(), signal)
    signal_analyser_persistence_plot(data)
end

function signal_analyser_plots(signal::AnalysedSignal)::Dict{String,Any}
    Dict{String,Any}(
        "time" => signal_analyser_time_plot(signal),
        "spectrum" => signal_analyser_spectrum_plot(signal),
        "spectrogram" => signal_analyser_spectrogram_plot(signal),
        "persistence" => signal_analyser_persistence_plot(signal),
    )
end


function signal_analyser_base_plots(signal::AnalysedSignal)::Dict{String,Any}
    Dict{String,Any}(
        "time" => signal_analyser_time_plot(signal),
        "spectrum" => signal_analyser_spectrum_plot(
            SignalSpectrumData(signal.is_complex ? CENTERED_TWO_SIDED_SPECTRUM : ONE_SIDED_SPECTRUM),
            SignalSpectrumSettings(),
        ),
        "spectrogram" => signal_analyser_spectrogram_plot(
            SignalSpectrogramData(signal_spectrum_topology(signal)),
            SignalSpectrogramSettings(),
            signal,
        ),
        "persistence" => signal_analyser_persistence_plot(
            SignalPersistenceData(signal_spectrum_topology(signal)),
        ),
    )
end
