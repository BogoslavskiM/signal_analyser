abstract type AbstractWorkspaceSignalSource end

struct SignalWorkspaceSourceError <: Exception
    message::String
end

Base.showerror(io::IO, err::SignalWorkspaceSourceError) = print(io, err.message)

function workspace_signal_value(
    source::AbstractWorkspaceSignalSource,
    variable_name::String,
)
    throw(MethodError(workspace_signal_value, (source, variable_name)))
end

abstract type AbstractSignalInventoryCommand end

struct ImportWorkspaceSignalCommand <: AbstractSignalInventoryCommand
    revision::Int
    variable_name::String
    signal_name::Union{Nothing,String}
    sample_rate_hz::Union{Nothing,Float64}

    function ImportWorkspaceSignalCommand(
        revision::Int,
        variable_name::AbstractString,
        signal_name::Union{Nothing,AbstractString},
        sample_rate_hz::Union{Nothing,Real},
    )
        revision >= 0 || throw(ArgumentError("Ревизия Signals command не может быть отрицательной"))
        workspace_name = String(variable_name)
        isempty(strip(workspace_name)) && throw(ArgumentError(
            "Имя переменной рабочей области не может быть пустым",
        ))
        requested_name = if signal_name === nothing
            nothing
        else
            name = String(signal_name)
            isempty(strip(name)) && throw(ArgumentError("Имя сигнала не может быть пустым"))
            name
        end
        rate = if sample_rate_hz === nothing
            nothing
        else
            sample_rate_hz isa Bool && throw(ArgumentError(
                "Частота дискретизации должна быть числом, но не Bool",
            ))
            value = Float64(sample_rate_hz)
            isfinite(value) && value > 0 || throw(ArgumentError(
                "Частота дискретизации должна быть положительной и конечной",
            ))
            value
        end
        new(revision, workspace_name, requested_name, rate)
    end
end

struct ImportWorkspaceBatchCommand <: AbstractSignalInventoryCommand
    revision::Int
    catalog_revision::String
    selections::Tuple{Vararg{WorkspaceImportSelection}}

    function ImportWorkspaceBatchCommand(
        revision::Int,
        catalog_revision::AbstractString,
        selections::AbstractVector{WorkspaceImportSelection},
    )
        revision >= 0 || throw(ArgumentError("Ревизия Signals command не может быть отрицательной"))
        catalog = String(catalog_revision)
        occursin(WORKSPACE_CATALOG_REVISION_REGEX, catalog) || throw(ArgumentError(
            "Некорректная revision каталога рабочей области",
        ))
        1 <= length(selections) <= WORKSPACE_CATALOG_MAX_SELECTIONS || throw(ArgumentError(
            "Batch import должен содержать от 1 до 1000 selections",
        ))
        ids = [selection.variable_id for selection in selections]
        allunique(ids) || throw(ArgumentError("Variable ID selections не должны повторяться"))
        new(revision, catalog, Tuple(selections))
    end
end

struct DuplicateSignalCommand <: AbstractSignalInventoryCommand
    revision::Int
    signal_name::String

    function DuplicateSignalCommand(revision::Int, signal_name::AbstractString)
        revision >= 0 || throw(ArgumentError("Ревизия Signals command не может быть отрицательной"))
        name = String(signal_name)
        isempty(strip(name)) && throw(ArgumentError("Имя сигнала не может быть пустым"))
        new(revision, name)
    end
end

struct ExtractTimeLimitsSignalCommand <: AbstractSignalInventoryCommand
    revision::Int
    display_id::String

    function ExtractTimeLimitsSignalCommand(revision::Int, display_id::AbstractString)
        revision >= 0 || throw(ArgumentError("Ревизия Signals command не может быть отрицательной"))
        id = String(display_id)
        isempty(strip(id)) && throw(ArgumentError("Идентификатор Display не может быть пустым"))
        new(revision, id)
    end
end

struct DeleteSignalCommand <: AbstractSignalInventoryCommand
    revision::Int
    signal_name::String

    function DeleteSignalCommand(revision::Int, signal_name::AbstractString)
        revision >= 0 || throw(ArgumentError("Ревизия Signals command не может быть отрицательной"))
        name = String(signal_name)
        isempty(strip(name)) && throw(ArgumentError("Имя сигнала не может быть пустым"))
        new(revision, name)
    end
end

struct UpdateSignalMetadataCommand <: AbstractSignalInventoryCommand
    revision::Int
    signal_id::String
    name::String
    color::String
    sample_rate_hz::Float64

    function UpdateSignalMetadataCommand(
        revision::Int,
        signal_id::AbstractString,
        name::AbstractString,
        color::AbstractString,
        sample_rate_hz::Real,
    )
        revision >= 0 || throw(ArgumentError("Ревизия Signals command не может быть отрицательной"))
        id = String(strip(String(signal_id)))
        isempty(id) && throw(ArgumentError("Signal id не может быть пустым"))
        signal_name = String(strip(String(name)))
        isempty(signal_name) && throw(ArgumentError("Имя сигнала не может быть пустым"))
        ncodeunits(signal_name) <= 128 || throw(ArgumentError(
            "Имя сигнала не может быть длиннее 128 байт",
        ))
        signal_color = String(color)
        occursin(r"^#[0-9A-Fa-f]{6}$", signal_color) || throw(ArgumentError(
            "Цвет сигнала должен иметь формат #RRGGBB",
        ))
        sample_rate_hz isa Bool && throw(ArgumentError(
            "Частота дискретизации должна быть числом, но не Bool",
        ))
        rate = Float64(sample_rate_hz)
        isfinite(rate) && rate > 0 || throw(ArgumentError(
            "Частота дискретизации должна быть положительной и конечной",
        ))
        new(revision, id, signal_name, signal_color, rate)
    end
end

const SIGNAL_DERIVED_OPERATION_NAMES = Set([
    "bandpass",
    "bandstop",
    "highpass",
    "lowpass",
    "detrend",
    "fill-missing",
    "smooth",
    "envelope",
    "resample",
    "custom-preprocess",
])
const SIGNAL_DERIVED_MAX_SAMPLES = 5_000_000

abstract type AbstractSignalOperationParameters end

struct CustomSignalOperationParameters <: AbstractSignalOperationParameters
    body::String
end

struct FilterSignalOperationParameters <: AbstractSignalOperationParameters
    frequency_units::String
    lower_passband::Union{Nothing,Float64}
    upper_passband::Union{Nothing,Float64}
    passband::Union{Nothing,Float64}
    impulse_response::String
    steepness::Float64
    stopband_attenuation_db::Float64
end

struct DetrendSignalOperationParameters <: AbstractSignalOperationParameters
    method::String
    breakpoints::Vector{Int}
    nan_policy::String
end

struct FillMissingSignalOperationParameters <: AbstractSignalOperationParameters
    method::String
    end_method::String
    constant_value::Union{Nothing,Float64}
    window_length::Union{Nothing,Int}
    ar_order::Union{Nothing,Int}
end

struct SmoothSignalOperationParameters <: AbstractSignalOperationParameters
    method::String
    window_type::String
    duration_units::Union{Nothing,String}
    window_duration::Union{Nothing,Float64}
    smoothing_factor::Union{Nothing,Float64}
    polynomial_degree::Union{Nothing,Int}
end

struct EnvelopeSignalOperationParameters <: AbstractSignalOperationParameters
    side::String
    method::String
    filter_order::Union{Nothing,Int}
    length_units::Union{Nothing,String}
    window_length::Union{Nothing,Float64}
    separation_units::Union{Nothing,String}
    maxima_separation::Union{Nothing,Float64}
end

struct ResampleSignalOperationParameters <: AbstractSignalOperationParameters
    mode::String
    target_sample_rate_hz::Union{Nothing,Float64}
    upsample_factor::Union{Nothing,Int}
    downsample_factor::Union{Nothing,Int}
    interpolation::Union{Nothing,String}
end

const SignalOperationParameters = Union{
    CustomSignalOperationParameters,
    FilterSignalOperationParameters,
    DetrendSignalOperationParameters,
    FillMissingSignalOperationParameters,
    SmoothSignalOperationParameters,
    EnvelopeSignalOperationParameters,
    ResampleSignalOperationParameters,
}

function signal_operation_parameters_match(
    operation::String,
    parameters::SignalOperationParameters,
)::Bool
    operation == "custom-preprocess" &&
        return parameters isa CustomSignalOperationParameters
    operation in ("bandpass", "bandstop", "highpass", "lowpass") &&
        return parameters isa FilterSignalOperationParameters
    operation == "detrend" && return parameters isa DetrendSignalOperationParameters
    operation == "fill-missing" && return parameters isa FillMissingSignalOperationParameters
    operation == "smooth" && return parameters isa SmoothSignalOperationParameters
    operation == "envelope" && return parameters isa EnvelopeSignalOperationParameters
    operation == "resample" && return parameters isa ResampleSignalOperationParameters
    false
end

struct DeriveSignalCommand <: AbstractSignalInventoryCommand
    revision::Int
    source_signal_id::String
    operation_kind::String
    operation::String
    parameters::SignalOperationParameters
    target_name::String
    overwrite::Bool
    body::Union{Nothing,String}

    function DeriveSignalCommand(
        revision::Int,
        source_signal_id::AbstractString,
        operation_kind::AbstractString,
        operation::AbstractString,
        parameters::SignalOperationParameters,
        target_name::AbstractString,
        overwrite::Bool,
    )
        revision >= 0 || throw(ArgumentError("Ревизия Signals command не может быть отрицательной"))
        source_id = String(strip(String(source_signal_id)))
        isempty(source_id) && throw(ArgumentError("Source signal id не может быть пустым"))
        kind = String(operation_kind)
        kind == "preprocess" || throw(ArgumentError(
            "Раздел операции должен быть preprocess",
        ))
        operation_name = String(operation)
        operation_name in SIGNAL_DERIVED_OPERATION_NAMES || throw(ArgumentError(
            "Неподдерживаемая операция над сигналом",
        ))
        signal_operation_parameters_match(operation_name, parameters) || throw(
            ArgumentError("Параметры не соответствуют выбранной операции"),
        )
        name = String(strip(String(target_name)))
        isempty(name) && throw(ArgumentError("Имя производного сигнала не может быть пустым"))
        ncodeunits(name) <= 128 || throw(ArgumentError(
            "Имя производного сигнала не может быть длиннее 128 байт",
        ))
        operation_body = parameters isa CustomSignalOperationParameters ?
            parameters.body : nothing
        new(
            revision,
            source_id,
            kind,
            operation_name,
            parameters,
            name,
            overwrite,
            operation_body,
        )
    end
end

"""Create a new zero-origin signal from an inclusive source-time interval."""
struct CropSignalCommand <: AbstractSignalInventoryCommand
    revision::Int
    source_signal_id::String
    min_s::Float64
    max_s::Float64
    target_name::String
    overwrite::Bool

    function CropSignalCommand(
        revision::Int,
        source_signal_id::AbstractString,
        min_s::Real,
        max_s::Real,
        target_name::AbstractString,
        overwrite::Bool,
    )
        revision >= 0 || throw(ArgumentError("Ревизия Signals command не может быть отрицательной"))
        source_id = String(strip(String(source_signal_id)))
        isempty(source_id) && throw(ArgumentError("Source signal id не может быть пустым"))
        min_s isa Bool && throw(ArgumentError("min_s должен быть числом, но не Bool"))
        max_s isa Bool && throw(ArgumentError("max_s должен быть числом, но не Bool"))
        minimum_time = Float64(min_s)
        maximum_time = Float64(max_s)
        isfinite(minimum_time) && isfinite(maximum_time) || throw(ArgumentError(
            "Границы crop должны быть конечными числами",
        ))
        minimum_time < maximum_time || throw(ArgumentError(
            "min_s должен быть строго меньше max_s",
        ))
        name = String(strip(String(target_name)))
        isempty(name) && throw(ArgumentError("Имя производного сигнала не может быть пустым"))
        ncodeunits(name) <= 128 || throw(ArgumentError(
            "Имя производного сигнала не может быть длиннее 128 байт",
        ))
        new(
            revision,
            source_id,
            minimum_time == 0.0 ? 0.0 : minimum_time,
            maximum_time == 0.0 ? 0.0 : maximum_time,
            name,
            overwrite,
        )
    end
end

abstract type AbstractSignalOperationProvider end

struct SignalOperationProviderResult
    values::Vector{ComplexF64}
    is_complex::Bool
    sample_rate_hz::Union{Nothing,Float64}

    function SignalOperationProviderResult(
        values::AbstractVector,
        is_complex::Bool,
        sample_rate_hz::Union{Nothing,Real} = nothing,
    )
        samples = ComplexF64.(values)
        2 <= length(samples) <= SIGNAL_DERIVED_MAX_SAMPLES || throw(ArgumentError(
            "Результат операции должен содержать от 2 до $(SIGNAL_DERIVED_MAX_SAMPLES) отсчётов",
        ))
        all(value -> isfinite(real(value)) && isfinite(imag(value)), samples) || throw(
            ArgumentError("Результат операции содержит неконечные значения"),
        )
        !is_complex && any(value -> !iszero(imag(value)), samples) && throw(ArgumentError(
            "Вещественный результат содержит комплексные отсчёты",
        ))
        rate = if sample_rate_hz === nothing
            nothing
        else
            sample_rate_hz isa Bool && throw(ArgumentError(
                "Частота дискретизации результата должна быть числом",
            ))
            value = Float64(sample_rate_hz)
            isfinite(value) && value > 0 || throw(ArgumentError(
                "Частота дискретизации результата должна быть положительной и конечной",
            ))
            value
        end
        new(samples, is_complex, rate)
    end
end

"""Local crop result; unlike Engee operations, a single sample is valid."""
struct CroppedSignalResult
    values::Vector{ComplexF64}
    is_complex::Bool

    function CroppedSignalResult(values::AbstractVector, is_complex::Bool)
        samples = ComplexF64.(values)
        !isempty(samples) || throw(ArgumentError(
            "Выбранный диапазон должен содержать хотя бы один отсчёт",
        ))
        all(value -> isfinite(real(value)) && isfinite(imag(value)), samples) || throw(
            ArgumentError("Результат crop содержит неконечные значения"),
        )
        !is_complex && any(value -> !iszero(imag(value)), samples) && throw(ArgumentError(
            "Вещественный результат crop содержит комплексные отсчёты",
        ))
        new(samples, is_complex)
    end
end

struct SignalOperationProviderError <: Exception
    code::String
    message::String
    field::Union{Nothing,String}
end

SignalOperationProviderError(code::AbstractString, message::AbstractString) =
    SignalOperationProviderError(String(code), String(message), nothing)

SignalOperationProviderError(
    code::AbstractString,
    message::AbstractString,
    field::AbstractString,
) = SignalOperationProviderError(String(code), String(message), String(field))

Base.showerror(io::IO, err::SignalOperationProviderError) = print(io, err.message)

function signal_operation_execute(
    provider::AbstractSignalOperationProvider,
    source,
    command::DeriveSignalCommand,
)::SignalOperationProviderResult
    throw(MethodError(signal_operation_execute, (provider, source, command)))
end

signal_inventory_command_revision(command::AbstractSignalInventoryCommand)::Int =
    command.revision

struct SignalColorPalette
    colors::Tuple{Vararg{String}}

    function SignalColorPalette(colors::AbstractVector{<:AbstractString})
        values = String.(colors)
        isempty(values) && throw(ArgumentError("Палитра сигналов не может быть пустой"))
        all(color -> !isempty(color), values) || throw(ArgumentError(
            "Цвет палитры сигналов не может быть пустым",
        ))
        allunique(values) || throw(ArgumentError("Цвета палитры сигналов не должны повторяться"))
        new(Tuple(values))
    end
end

SignalColorPalette() = SignalColorPalette([
    "#2563eb",
    "#dc2626",
    "#16a34a",
    "#9333ea",
    "#ea580c",
    "#0891b2",
    "#ca8a04",
    "#db2777",
])

function signal_palette_next_color(
    palette::SignalColorPalette,
    occupied_colors::AbstractSet{String},
    next_position::Integer,
    source_color::Union{Nothing,AbstractString} = nothing,
)::String
    next_position >= 1 || throw(ArgumentError("Позиция цвета должна быть положительной"))
    color_count = length(palette.colors)
    avoided_color = source_color === nothing ? nothing : String(source_color)
    for color in palette.colors
        if !(color in occupied_colors) && (color_count == 1 || color != avoided_color)
            return color
        end
    end

    color_count == 1 && return first(palette.colors)
    first_index = mod(next_position - 1, color_count) + 1
    for offset in 0:(color_count - 1)
        color = palette.colors[mod(first_index - 1 + offset, color_count) + 1]
        color == avoided_color || return color
    end
    throw(ArgumentError("Palette не содержит допустимого цвета"))
end

struct WorkspaceSignalSeries
    values::Vector{ComplexF64}
    sample_rate_hz::Float64
    is_complex::Bool

    function WorkspaceSignalSeries(
        values::AbstractVector,
        sample_rate_hz::Real,
        is_complex::Bool,
        allow_single_sample::Bool,
    )
        minimum_samples = allow_single_sample ? 1 : 2
        length(values) >= minimum_samples || throw(ArgumentError(
            allow_single_sample ?
                "Сигнал должен содержать хотя бы один отсчёт" :
                "Сигнал должен содержать не менее двух отсчётов",
        ))
        all(value -> value isa Number && !(value isa Bool), values) || throw(ArgumentError(
            "Отсчёты сигнала должны быть числами, но не Bool",
        ))
        samples = ComplexF64.(values)
        all(value -> !isinf(real(value)) && !isinf(imag(value)), samples) ||
            throw(ArgumentError("Отсчёты сигнала не должны содержать бесконечные значения"))
        sample_rate_hz isa Bool && throw(ArgumentError(
            "Частота дискретизации должна быть числом, но не Bool",
        ))
        rate = Float64(sample_rate_hz)
        isfinite(rate) && rate > 0 || throw(ArgumentError(
            "Частота дискретизации должна быть положительной и конечной",
        ))
        !is_complex && any(value -> !iszero(imag(value)), samples) && throw(ArgumentError(
            "Вещественный сигнал не может содержать комплексные отсчёты",
        ))
        new(samples, rate, is_complex)
    end
end

WorkspaceSignalSeries(
    values::AbstractVector,
    sample_rate_hz::Real,
    is_complex::Bool,
) = WorkspaceSignalSeries(values, sample_rate_hz, is_complex, false)

WorkspaceSignalSeries(values::AbstractVector, sample_rate_hz::Real) =
    WorkspaceSignalSeries(
        values,
        sample_rate_hz,
        any(value -> value isa Complex, values),
    )

struct WorkspaceSignalCandidate
    base_name::String
    series::WorkspaceSignalSeries
    source_color::Union{Nothing,String}

    function WorkspaceSignalCandidate(
        base_name::AbstractString,
        series::WorkspaceSignalSeries,
        source_color::Union{Nothing,AbstractString} = nothing,
    )
        name = String(base_name)
        isempty(name) && throw(ArgumentError("Base name сигнала не может быть пустым"))
        new(name, series, source_color === nothing ? nothing : String(source_color))
    end
end
