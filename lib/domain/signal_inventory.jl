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
