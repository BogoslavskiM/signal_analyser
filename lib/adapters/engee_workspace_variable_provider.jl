const ENGEE_WORKSPACE_CATALOG_INTROSPECTION = """
let
    catalog_module = @__MODULE__
    catalog_symbols = sort!(
        collect(names(catalog_module; all = false, imported = false));
        by = String,
    )
    catalog_entries = NamedTuple[]
    catalog_total = 0
    for catalog_symbol in catalog_symbols
        isdefined(catalog_module, catalog_symbol) || continue
        catalog_value = getfield(catalog_module, catalog_symbol)
        catalog_value isa Module && continue
        catalog_name = String(catalog_symbol)
        1 <= ncodeunits(catalog_name) <= 256 || error("workspace catalog name bound")
        catalog_type = string(typeof(catalog_value))
        length(catalog_type) <= 200 || error("workspace catalog type bound")
        catalog_payload = catalog_value
        catalog_time = nothing
        catalog_is_timed = false
        if catalog_value isa NamedTuple && :time in keys(catalog_value) && :value in keys(catalog_value)
            catalog_time = getproperty(catalog_value, :time)
            catalog_payload = getproperty(catalog_value, :value)
            catalog_is_timed = true
        elseif catalog_value isa AbstractDict &&
            (haskey(catalog_value, "time") || haskey(catalog_value, :time)) &&
            (haskey(catalog_value, "value") || haskey(catalog_value, :value))
            catalog_time = haskey(catalog_value, "time") ? catalog_value["time"] : catalog_value[:time]
            catalog_payload = haskey(catalog_value, "value") ? catalog_value["value"] : catalog_value[:value]
            catalog_is_timed = true
        else
            catalog_fields = fieldnames(typeof(catalog_value))
            if :time in catalog_fields && :value in catalog_fields
                catalog_time = getfield(catalog_value, :time)
                catalog_payload = getfield(catalog_value, :value)
                catalog_is_timed = true
            end
        end
        catalog_dimensions = catalog_payload isa AbstractArray ? size(catalog_payload) : ()
        catalog_shape_bounded = length(catalog_dimensions) <= 16 && all(
            catalog_dimension -> catalog_dimension isa Integer &&
                !(catalog_dimension isa Bool) &&
                0 <= catalog_dimension <= 9007199254740991,
            catalog_dimensions,
        )
        catalog_shape = catalog_shape_bounded ? Int[catalog_dimensions...] : Int[]
        catalog_numeric = catalog_payload isa AbstractArray &&
            eltype(catalog_payload) <: Number && !(eltype(catalog_payload) <: Bool)
        catalog_time_valid = catalog_time isa AbstractVector &&
            length(catalog_time) == (isempty(catalog_shape) ? 0 : first(catalog_shape)) &&
            eltype(catalog_time) <: Real && !(eltype(catalog_time) <: Bool)
        catalog_source_kind = if catalog_shape_bounded && catalog_is_timed && catalog_time_valid && catalog_numeric && length(catalog_shape) == 1
            "timed_vector"
        elseif catalog_shape_bounded && catalog_is_timed && catalog_time_valid && catalog_numeric && length(catalog_shape) == 2
            "timed_matrix"
        elseif catalog_shape_bounded && !catalog_is_timed && catalog_numeric && length(catalog_shape) == 1
            "raw_vector"
        elseif catalog_shape_bounded && !catalog_is_timed && catalog_numeric && length(catalog_shape) == 2
            "raw_matrix"
        else
            "unsupported"
        end
        catalog_total += 1
        if catalog_total <= 1000
            push!(catalog_entries, (
                name = catalog_name,
                type = catalog_type,
                shape = catalog_shape,
                source_kind = catalog_source_kind,
            ))
        end
    end
    (
        entries = catalog_entries,
        truncated = catalog_total > length(catalog_entries),
        total = catalog_total,
    )
end
"""

struct EngeeWorkspaceVariableProvider <: AbstractWorkspaceVariableProvider end

function engee_workspace_genie_api(::EngeeWorkspaceVariableProvider)
    engee_module = try
        Base.require(@__MODULE__, :Engee)
    catch err
        throw(WorkspaceUnavailableError(
            "Рабочая область Engee недоступна: $(sprint(showerror, err))",
        ))
    end
    engee_api = try
        getproperty(engee_module, :engee)
    catch
        throw(WorkspaceUnavailableError("Рабочая область Engee недоступна: Engee.engee не найден"))
    end
    try
        getproperty(engee_api, :genie)
    catch
        throw(WorkspaceUnavailableError("Рабочая область Engee недоступна: engee.genie не найден"))
    end
end

function workspace_variable_catalog(provider::EngeeWorkspaceVariableProvider)
    genie_api = engee_workspace_genie_api(provider)
    evaluate = try
        getproperty(genie_api, :eval)
    catch
        throw(WorkspaceUnavailableError(
            "Каталог рабочей области Engee недоступен: engee.genie.eval не найден",
        ))
    end
    try
        Base.invokelatest(evaluate, ENGEE_WORKSPACE_CATALOG_INTROSPECTION)
    catch err
        throw(WorkspaceProviderError(
            "Не удалось получить каталог рабочей области Engee: $(sprint(showerror, err))",
        ))
    end
end

function workspace_variable_value(
    provider::EngeeWorkspaceVariableProvider,
    variable_name::String,
)
    genie_api = engee_workspace_genie_api(provider)
    receive = try
        getproperty(genie_api, :recv)
    catch
        throw(WorkspaceUnavailableError(
            "Импорт из рабочей области Engee недоступен: engee.genie.recv не найден",
        ))
    end
    try
        Base.invokelatest(receive, variable_name; context = Main)
    catch err
        throw(WorkspaceProviderError(
            "Не удалось получить переменную из рабочей области Engee: $(sprint(showerror, err))",
        ))
    end
end
