using Genie.Renderer.Json

const SIGNAL_INVENTORY_REQUEST_FIELDS = Dict(
    "import_workspace" => Set([
        "state_revision",
        "operation",
        "variable_name",
        "signal_name",
        "sample_rate_hz",
    ]),
    "import_workspace_batch" => Set([
        "state_revision",
        "operation",
        "catalog_revision",
        "selections",
    ]),
    "duplicate" => Set(["state_revision", "operation", "signal_name"]),
    "extract_time_limits" => Set(["state_revision", "operation", "display_id"]),
    "delete" => Set(["state_revision", "operation", "signal_name"]),
)

json_safe(value::AbstractFloat) = isfinite(value) ? value : nothing
json_safe(value::Real) = value
json_safe(value::AbstractString) = value
json_safe(value::Bool) = value
json_safe(value::Nothing) = value
json_safe(value::AbstractVector) = Any[json_safe(item) for item in value]
json_safe(value::Tuple) = Any[json_safe(item) for item in value]
json_safe(value::AbstractDict) = Dict(string(key) => json_safe(val) for (key, val) in pairs(value))
json_safe(value::NamedTuple) = Dict(string(key) => json_safe(getproperty(value, key)) for key in keys(value))
json_safe(value) = value

function api_json(payload; status::Int = 200, headers = nothing)
    headers === nothing ?
        Genie.Renderer.Json.json(json_safe(payload); status = status) :
        Genie.Renderer.Json.json(json_safe(payload); status = status, headers = headers)
end

function workspace_api_error_response(
    code::AbstractString,
    err;
    status::Int,
    headers = nothing,
)
    api_json(Dict(
        "ok" => false,
        "code" => String(code),
        "error" => Dict(
            "code" => String(code),
            "message" => sprint(showerror, err),
        ),
    ); status = status, headers = headers)
end

function api_error_response(
    action::AbstractString,
    err;
    status::Int = 400,
    headers = nothing,
)
    @error action exception = (err, catch_backtrace())
    api_json(Dict(
        "ok" => false,
        "error" => string(action, ": ", sprint(showerror, err)),
    ); status = status, headers = headers)
end

function signal_analyser_validation_response(err::SignalAnalyserValidationError)
    api_json(Dict(
        "ok" => false,
        "code" => "invalid_request",
        "error" => Dict(
            "code" => "invalid_request",
            "message" => err.message,
            "fields" => err.fields,
        ),
    ); status = 422)
end

function signal_analyser_stale_response(state::SignalAnalyserState, err::SignalAnalyserStaleStateError)
    current = signal_analyser_snapshot(state)
    api_json(Dict(
        "ok" => false,
        "code" => "stale_state",
        "error" => Dict(
            "code" => "stale_state",
            "message" => sprint(showerror, err),
        ),
        "state" => current,
        "current" => current,
    ); status = 409)
end

function signal_setting_validation_response(
    service::SignalSettingsService,
    state::SignalAnalyserState,
    err::SignalSettingValidationError,
)
    settings = if isempty(err.display_id)
        nothing
    else
        try
            signal_settings_document(service, state, err.display_id)
        catch nested
            nested isa SignalAnalyserValidationError || rethrow()
            nothing
        end
    end
    api_json(Dict{String,Any}(
        "ok" => false,
        "code" => "invalid_setting",
        "field_id" => err.field_id,
        "error" => Dict{String,Any}(
            "code" => "invalid_setting",
            "message" => err.message,
            "field_id" => err.field_id,
        ),
        "settings" => settings,
    ); status = 422)
end

function signal_setting_stale_response(
    service::SignalSettingsService,
    state::SignalAnalyserState,
    err::SignalAnalyserStaleStateError,
    display_id::AbstractString,
)
    current = signal_analyser_snapshot(state)
    settings = signal_settings_document(service, state, display_id)
    api_json(Dict{String,Any}(
        "ok" => false,
        "code" => "stale_state",
        "error" => Dict{String,Any}(
            "code" => "stale_state",
            "message" => sprint(showerror, err),
        ),
        "state" => current,
        "current" => current,
        "settings" => settings,
    ); status = 409)
end

function signal_inventory_request_exact_fields!(
    field_errors::Dict{String,String},
    data::AbstractDict,
    expected::Set{String},
)
    actual = signal_analyser_payload_keys(data)
    actual == expected && return
    missing = sort!(collect(setdiff(expected, actual)))
    unknown = sort!(collect(setdiff(actual, expected)))
    details = String[]
    isempty(missing) || push!(details, "отсутствуют: $(join(missing, ", "))")
    isempty(unknown) || push!(details, "неизвестны: $(join(unknown, ", "))")
    field_errors["body"] = "Ожидался точный набор полей ($(join(details, "; ")))"
end

function signal_inventory_request_revision!(
    field_errors::Dict{String,String},
    data::AbstractDict,
)::Union{Nothing,Int}
    value = signal_analyser_payload_value(data, "state_revision")
    if !(value isa Integer) || value isa Bool || value < 0
        field_errors["state_revision"] = "Требуется неотрицательное целое число"
        return nothing
    end
    try
        Int(value)
    catch err
        (err isa InexactError || err isa OverflowError) || rethrow()
        field_errors["state_revision"] = "Требуется целое число в диапазоне Int"
        nothing
    end
end

function signal_inventory_batch_selections!(
    field_errors::Dict{String,String},
    value,
)::Union{Nothing,Vector{WorkspaceImportSelection}}
    if !(value isa AbstractVector) ||
        !(1 <= length(value) <= WORKSPACE_CATALOG_MAX_SELECTIONS)
        field_errors["selections"] = "Требуется массив от 1 до 1000 selections"
        return nothing
    end
    selections = WorkspaceImportSelection[]
    seen_ids = Set{String}()
    for (index, item) in enumerate(value)
        if !(item isa AbstractDict) ||
            signal_analyser_payload_keys(item) != Set(["variable_id", "sample_rate_hz"])
            field_errors["selections"] =
                "Selection $(index) должна содержать только variable_id и sample_rate_hz"
            return nothing
        end
        id_value = signal_analyser_payload_value(item, "variable_id")
        if !(id_value isa AbstractString) ||
            !occursin(WORKSPACE_VARIABLE_ID_REGEX, String(id_value))
            field_errors["selections"] = "Selection $(index) содержит некорректный variable_id"
            return nothing
        end
        id = String(id_value)
        if id in seen_ids
            field_errors["selections"] = "Variable ID selections не должны повторяться"
            return nothing
        end
        push!(seen_ids, id)
        sample_rate_value = signal_analyser_payload_value(item, "sample_rate_hz")
        sample_rate = if sample_rate_value === nothing
            nothing
        elseif sample_rate_value isa Real && !(sample_rate_value isa Bool)
            rate = try
                Float64(sample_rate_value)
            catch err
                (err isa InexactError || err isa OverflowError) || rethrow()
                nothing
            end
            if rate !== nothing && isfinite(rate) && rate > 0
                rate
            else
                field_errors["selections"] =
                    "Selection $(index) должна содержать null или положительный конечный sample_rate_hz"
                return nothing
            end
        else
            field_errors["selections"] =
                "Selection $(index) должна содержать null или положительный конечный sample_rate_hz"
            return nothing
        end
        push!(selections, WorkspaceImportSelection(id, sample_rate))
    end
    selections
end

function parse_signal_inventory_command(data)::AbstractSignalInventoryCommand
    data isa AbstractDict || throw(signal_inventory_validation_error(
        "body",
        "Ожидался JSON-объект",
    ))
    field_errors = Dict{String,String}()
    operation_value = signal_analyser_payload_value(data, "operation")
    operation = if operation_value isa AbstractString &&
        haskey(SIGNAL_INVENTORY_REQUEST_FIELDS, String(operation_value))
        String(operation_value)
    else
        field_errors["operation"] =
            "Допустимо: import_workspace, import_workspace_batch, duplicate, extract_time_limits, delete"
        nothing
    end
    expected_fields = operation === nothing ?
        Set(["state_revision", "operation"]) :
        SIGNAL_INVENTORY_REQUEST_FIELDS[operation]
    signal_inventory_request_exact_fields!(field_errors, data, expected_fields)
    revision = signal_inventory_request_revision!(field_errors, data)

    if operation == "import_workspace_batch"
        catalog_value = signal_analyser_payload_value(data, "catalog_revision")
        catalog_revision = if catalog_value isa AbstractString &&
            occursin(WORKSPACE_CATALOG_REVISION_REGEX, String(catalog_value))
            String(catalog_value)
        else
            field_errors["catalog_revision"] = "Требуется catalog revision формата wc_UUID"
            nothing
        end
        selections = signal_inventory_batch_selections!(
            field_errors,
            signal_analyser_payload_value(data, "selections"),
        )
        isempty(field_errors) || throw(SignalAnalyserValidationError(
            "Некорректный запрос Signals",
            field_errors,
        ))
        return ImportWorkspaceBatchCommand(
            revision::Int,
            catalog_revision::String,
            selections::Vector{WorkspaceImportSelection},
        )
    elseif operation == "import_workspace"
        variable_value = signal_analyser_payload_value(data, "variable_name")
        variable_name = if variable_value isa AbstractString &&
            !isempty(strip(String(variable_value)))
            String(variable_value)
        else
            field_errors["variable_name"] = "Требуется непустая строка"
            nothing
        end
        signal_value = signal_analyser_payload_value(data, "signal_name")
        signal_name = if signal_value === nothing
            nothing
        elseif signal_value isa AbstractString && !isempty(strip(String(signal_value)))
            String(signal_value)
        else
            field_errors["signal_name"] = "Требуется null или непустая строка"
            nothing
        end
        sample_rate_value = signal_analyser_payload_value(data, "sample_rate_hz")
        sample_rate = if sample_rate_value === nothing
            nothing
        elseif sample_rate_value isa Real && !(sample_rate_value isa Bool)
            value = Float64(sample_rate_value)
            if isfinite(value) && value > 0
                value
            else
                field_errors["sample_rate_hz"] =
                    "Требуется null или положительное конечное число"
                nothing
            end
        else
            field_errors["sample_rate_hz"] =
                "Требуется null или положительное конечное число"
            nothing
        end
        isempty(field_errors) || throw(SignalAnalyserValidationError(
            "Некорректный запрос Signals",
            field_errors,
        ))
        return ImportWorkspaceSignalCommand(
            revision::Int,
            variable_name::String,
            signal_name,
            sample_rate,
        )
    elseif operation == "extract_time_limits"
        display_value = signal_analyser_payload_value(data, "display_id")
        display_id = if display_value isa AbstractString &&
            !isempty(strip(String(display_value)))
            String(display_value)
        else
            field_errors["display_id"] = "Требуется непустая строка"
            nothing
        end
        isempty(field_errors) || throw(SignalAnalyserValidationError(
            "Некорректный запрос Signals",
            field_errors,
        ))
        return ExtractTimeLimitsSignalCommand(revision::Int, display_id::String)
    end

    signal_value = signal_analyser_payload_value(data, "signal_name")
    signal_name = if signal_value isa AbstractString &&
        !isempty(strip(String(signal_value)))
        String(signal_value)
    else
        field_errors["signal_name"] = "Требуется непустая строка"
        nothing
    end
    isempty(field_errors) || throw(SignalAnalyserValidationError(
        "Некорректный запрос Signals",
        field_errors,
    ))
    operation == "duplicate" ?
        DuplicateSignalCommand(revision::Int, signal_name::String) :
        DeleteSignalCommand(revision::Int, signal_name::String)
end

function status_payload()
    Dict(
        "ok" => true,
        "project" => EXAMPLE_APP_STATE["project_name"],
        "ready" => EXAMPLE_APP_STATE["ready"],
    )
end
