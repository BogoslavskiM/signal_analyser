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
    "abs",
    "square",
    "sqrt",
    "signed_sqrt_abs",
    "multiply",
    "fft",
    "custom",
])
const SIGNAL_DERIVED_MAX_SAMPLES = 5_000_000

struct DeriveSignalCommand <: AbstractSignalInventoryCommand
    revision::Int
    source_signal_id::String
    operation::String
    target_name::String
    overwrite::Bool
    multiplier::Union{Nothing,Float64}
    body::Union{Nothing,String}

    function DeriveSignalCommand(
        revision::Int,
        source_signal_id::AbstractString,
        operation::AbstractString,
        target_name::AbstractString,
        overwrite::Bool,
        multiplier::Union{Nothing,Real},
        body::Union{Nothing,AbstractString},
    )
        revision >= 0 || throw(ArgumentError("Ревизия Signals command не может быть отрицательной"))
        source_id = strip(String(source_signal_id))
        isempty(source_id) && throw(ArgumentError("Source signal id не может быть пустым"))
        operation_name = String(operation)
        operation_name in SIGNAL_DERIVED_OPERATION_NAMES || throw(ArgumentError(
            "Неподдерживаемая операция над сигналом",
        ))
        name = strip(String(target_name))
        isempty(name) && throw(ArgumentError("Имя производного сигнала не может быть пустым"))
        ncodeunits(name) <= 128 || throw(ArgumentError(
            "Имя производного сигнала не может быть длиннее 128 байт",
        ))
        typed_multiplier = if multiplier === nothing
            nothing
        else
            multiplier isa Bool && throw(ArgumentError("Множитель должен быть числом, но не Bool"))
            value = Float64(multiplier)
            isfinite(value) || throw(ArgumentError("Множитель должен быть конечным числом"))
            value
        end
        operation_name == "multiply" && typed_multiplier === nothing && throw(ArgumentError(
            "Для операции multiply требуется множитель",
        ))
        operation_name != "multiply" && typed_multiplier !== nothing && throw(ArgumentError(
            "Множитель допустим только для операции multiply",
        ))
        operation_body = body === nothing ? nothing : String(body)
        if operation_name == "custom"
            operation_body === nothing || !isempty(strip(operation_body)) || throw(ArgumentError(
                "Тело пользовательской операции не может быть пустым",
            ))
            operation_body === nothing && throw(ArgumentError(
                "Для пользовательской операции требуется тело",
            ))
            ncodeunits(operation_body) <= 16_384 || throw(ArgumentError(
                "Тело пользовательской операции не может быть длиннее 16384 байт",
            ))
        elseif operation_body !== nothing
            throw(ArgumentError("Тело допустимо только для пользовательской операции"))
        end
        new(
            revision,
            source_id,
            operation_name,
            name,
            overwrite,
            typed_multiplier,
            operation_body,
        )
    end
end

abstract type AbstractSignalOperationProvider end

struct SignalOperationProviderResult
    values::Vector{ComplexF64}
    is_complex::Bool

    function SignalOperationProviderResult(values::AbstractVector, is_complex::Bool)
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
        new(samples, is_complex)
    end
end

struct SignalOperationProviderError <: Exception
    code::String
    message::String
end

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
    "#000080",
    "#0000d1",
    "#0010ff",
    "#0058ff",
    "#00a4ff",
    "#06ecf1",
    "#40ffb7",
    "#7dff7a",
    "#b7ff40",
    "#f1fc06",
    "#ffb900",
    "#ff7300",
    "#ff3000",
    "#d10000",
    "#800000",
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
    )
        length(values) >= 2 || throw(ArgumentError(
            "Сигнал должен содержать не менее двух отсчётов",
        ))
        all(value -> value isa Number && !(value isa Bool), values) || throw(ArgumentError(
            "Отсчёты сигнала должны быть числами, но не Bool",
        ))
        samples = ComplexF64.(values)
        all(value -> isfinite(real(value)) && isfinite(imag(value)), samples) ||
            throw(ArgumentError("Отсчёты сигнала должны быть конечными"))
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
