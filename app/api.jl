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
    "update_metadata" => Set([
        "state_revision",
        "operation",
        "signal_id",
        "name",
        "color",
        "sample_rate_hz",
    ]),
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

function signal_analyser_layouts_bootstrap_payload(
    snapshot::Dict{String,Any},
)::Dict{String,Any}
    state = snapshot["state"]::Dict{String,Any}
    payload = copy(state)
    merge!(payload, snapshot)
    payload
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

function signal_analyser_session_validation_response(err)
    api_json(Dict{String,Any}(
        "ok" => false,
        "code" => err.code,
        "error" => Dict{String,Any}(
            "code" => err.code,
            "message" => err.message,
            "fields" => err.fields,
        ),
    ); status = 422)
end

function native_engee_io_error_response(err; headers = nothing)
    api_json(Dict{String,Any}(
        "ok" => false,
        "code" => err.code,
        "error" => Dict{String,Any}(
            "code" => err.code,
            "message" => err.message,
            "fields" => err.fields,
        ),
    ); status = err.code in ("target_exists", "internal_name_conflict") ? 409 : 422, headers = headers)
end

function native_engee_provider_error_response(err; headers = nothing)
    code = err isa WorkspaceUnavailableError ? "engee_unavailable" : "engee_provider_error"
    api_json(Dict{String,Any}(
        "ok" => false,
        "code" => code,
        "error" => Dict{String,Any}(
            "code" => code,
            "message" => sprint(showerror, err),
            "fields" => Dict{String,String}(),
        ),
    ); status = err isa WorkspaceUnavailableError ? 503 : 502, headers = headers)
end

function signal_package_validation_response(err)
    api_json(Dict{String,Any}(
        "ok" => false,
        "code" => err.code,
        "error" => Dict{String,Any}(
            "code" => err.code,
            "message" => err.message,
            "fields" => err.fields,
        ),
    ); status = if err.code in ("archive_size_limit", "archive_entry_limit", "archive_total_limit", "archive_file_limit")
        413
    elseif err.code == "workspace_unavailable"
        503
    elseif err.code == "workspace_provider_error"
        502
    else
        422
    end)
end

function signal_package_base64(value)::Vector{UInt8}
    value isa AbstractString || throw(signal_package_validation_error(
        "invalid_request",
        "archive_base64 должен быть строкой";
        field = "archive_base64",
    ))
    encoded = String(value)
    max_encoded = cld(SIGNAL_PACKAGE_MAX_ARCHIVE_BYTES, 3) * 4 + 4
    ncodeunits(encoded) <= max_encoded || throw(signal_package_validation_error(
        "archive_size_limit",
        "Base64 payload превышает лимит пакета";
        field = "archive_base64",
    ))
    bytes = try
        base64decode(encoded)
    catch
        throw(signal_package_validation_error(
            "invalid_base64",
            "archive_base64 содержит некорректный Base64";
            field = "archive_base64",
        ))
    end
    length(bytes) <= SIGNAL_PACKAGE_MAX_ARCHIVE_BYTES || throw(signal_package_validation_error(
        "archive_size_limit",
        "Архив превышает лимит размера";
        field = "archive_base64",
    ))
    bytes
end

function parse_signal_package_validate_request(data)::Vector{UInt8}
    request = signal_package_exact_object(data, Set(["archive_base64"]), "body")
    signal_package_base64(signal_package_value(request, "archive_base64"))
end

function parse_signal_package_workspace_preflight_request(data)::Tuple{Vector{UInt8},String}
    request = signal_package_exact_object(
        data,
        Set(["archive_base64", "workspace_prefix"]),
        "body",
    )
    archive = signal_package_base64(signal_package_value(request, "archive_base64"))
    prefix = signal_package_string(
        signal_package_value(request, "workspace_prefix"),
        "workspace_prefix",
    )
    signal_package_workspace_names(AnalysedSignal[], prefix)
    archive, prefix
end

function parse_signal_package_import_request(data)::Tuple{Int,Vector{UInt8},Bool,String}
    data isa AbstractDict || throw(signal_package_validation_error(
        "invalid_request",
        "body должен быть JSON-объектом";
        field = "body",
    ))
    actual = Set(String(key) for key in keys(data))
    minimal = Set(["state_revision", "archive_base64"])
    workspace = Set(["state_revision", "archive_base64", "publish_workspace", "workspace_prefix"])
    actual in (minimal, workspace) || throw(signal_package_validation_error(
        "invalid_request",
        "body имеет неверный набор полей";
        field = "body",
    ))
    request = data
    revision = signal_package_integer(
        signal_package_value(request, "state_revision"),
        "state_revision",
    )
    archive = signal_package_base64(signal_package_value(request, "archive_base64"))
    publish_workspace = if actual == workspace
        value = signal_package_value(request, "publish_workspace")
        value isa Bool || throw(signal_package_validation_error(
            "invalid_request",
            "publish_workspace должен быть boolean";
            field = "publish_workspace",
        ))
        value
    else
        false
    end
    workspace_prefix = actual == workspace ? signal_package_string(
        signal_package_value(request, "workspace_prefix"),
        "workspace_prefix",
    ) : SIGNAL_PACKAGE_DEFAULT_WORKSPACE_PREFIX
    publish_workspace && signal_package_workspace_names(AnalysedSignal[], workspace_prefix)
    revision, archive, publish_workspace, workspace_prefix
end

function signal_package_binary_response(bytes::Vector{UInt8})
    headers = [
        "Content-Type" => "application/vnd.engee.signal-analyser-package+zip",
        "Content-Disposition" => "attachment; filename=\"$(SIGNAL_PACKAGE_DEFAULT_FILENAME)\"",
        "Cache-Control" => "no-store",
        "X-Content-Type-Options" => "nosniff",
    ]
    Genie.Renderer.HTTP.Response(200, headers; body = bytes)
end

function signal_analyser_session_stale_response(
    state::SignalAnalyserState,
    err::SignalAnalyserStaleStateError,
)
    lock(state.lock) do
        current = Dict{String,Any}("state_revision" => state.view.state_revision)
        api_json(Dict{String,Any}(
            "ok" => false,
            "code" => "stale_state",
            "error" => Dict{String,Any}(
                "code" => "stale_state",
                "message" => sprint(showerror, err),
            ),
            "state" => current,
            "current" => current,
        ); status = 409)
    end
end

function signal_analyser_stale_response(state::SignalAnalyserState, err::SignalAnalyserStaleStateError)
    current = signal_analyser_state_lite(state)
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

function signal_analyser_layout_stale_response(
    state::SignalAnalyserState,
    err::SignalAnalyserStaleStateError,
)
    current = signal_analyser_layouts_lite_snapshot(state)
    api_json(Dict{String,Any}(
        "ok" => false,
        "code" => "stale_state",
        "error" => Dict{String,Any}(
            "code" => "stale_state",
            "message" => sprint(showerror, err),
        ),
        "state" => current["state"],
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
    current = signal_analyser_state_lite(state)
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

function signal_analyser_inactive_output_response(
    state::SignalAnalyserState,
    err::SignalAnalyserInactiveOutputError;
    headers = nothing,
)
    current = signal_analyser_state_lite(state)
    api_json(Dict{String,Any}(
        "ok" => false,
        "code" => "inactive_output",
        "error" => Dict{String,Any}(
            "code" => "inactive_output",
            "message" => sprint(showerror, err),
        ),
        "state" => current,
        "current" => current,
    ); status = 409, headers = headers)
end

function signal_analyser_state_lite_api_payload(
    state::SignalAnalyserState,
)::Dict{String,Any}
    payload = signal_analyser_state_lite(state)
    payload["app_version"] = RUNTIME_REVISION.sha
    payload["toolbar"] = Dict{String,Any}(
        "import" => Dict{String,Any}(
            "visible" => true,
            "disabled" => false,
            "icon" => "import",
        ),
        "export" => Dict{String,Any}(
            "visible" => true,
            "disabled" => false,
            "icon" => "download",
            "default_operation" => "workspace",
            "operations" => String["workspace", "script", "jld2", "session"],
        ),
        "other" => Dict{String,Any}(
            "visible" => false,
            "disabled" => true,
            "icon" => "more-vertical",
        ),
        "help" => Dict{String,Any}(
            "visible" => false,
            "disabled" => true,
            "icon" => "help-circle",
            "href" => "",
        ),
    )
    payload
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

function signal_inventory_query_integer(
    value,
    field::AbstractString,
    default::Int,
)::Int
    (value === nothing || value == "") && return default
    parsed = if value isa Integer && !(value isa Bool)
        try
            Int(value)
        catch err
            (err isa InexactError || err isa OverflowError) || rethrow()
            nothing
        end
    elseif value isa AbstractString && occursin(r"^[0-9]+$", String(value))
        tryparse(Int, String(value))
    else
        nothing
    end
    parsed === nothing && throw(signal_inventory_validation_error(
        field,
        "Требуется неотрицательное целое число",
    ))
    parsed::Int
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
            "Допустимо: import_workspace, import_workspace_batch, duplicate, extract_time_limits, delete, update_metadata"
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
            value = try
                Float64(sample_rate_value)
            catch err
                (err isa InexactError || err isa OverflowError) || rethrow()
                NaN
            end
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
    elseif operation == "update_metadata"
        signal_id_value = signal_analyser_payload_value(data, "signal_id")
        signal_id = signal_id_value isa AbstractString &&
            !isempty(strip(String(signal_id_value))) ? String(signal_id_value) : nothing
        signal_id === nothing && (field_errors["signal_id"] = "Требуется непустая строка")
        name_value = signal_analyser_payload_value(data, "name")
        name = name_value isa AbstractString && !isempty(strip(String(name_value))) ?
            String(strip(String(name_value))) : nothing
        name === nothing && (field_errors["name"] = "Требуется непустая строка")
        color_value = signal_analyser_payload_value(data, "color")
        color = color_value isa AbstractString &&
            occursin(r"^#[0-9A-Fa-f]{6}$", String(color_value)) ? String(color_value) : nothing
        color === nothing && (field_errors["color"] = "Требуется цвет формата #RRGGBB")
        rate_value = signal_analyser_payload_value(data, "sample_rate_hz")
        rate = if rate_value isa Real && !(rate_value isa Bool)
            converted = try
                Float64(rate_value)
            catch err
                (err isa InexactError || err isa OverflowError) || rethrow()
                NaN
            end
            isfinite(converted) && converted > 0 ? converted : nothing
        else
            nothing
        end
        rate === nothing && (field_errors["sample_rate_hz"] =
            "Требуется положительное конечное число")
        isempty(field_errors) || throw(SignalAnalyserValidationError(
            "Некорректный запрос Signals",
            field_errors,
        ))
        return UpdateSignalMetadataCommand(
            revision::Int,
            signal_id::String,
            name::String,
            color::String,
            rate::Float64,
        )
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

function parse_derive_signal_command(data)::DeriveSignalCommand
    data isa AbstractDict || throw(signal_inventory_validation_error(
        "body",
        "Ожидался JSON-объект",
    ))
    expected = Set([
        "state_revision",
        "source_signal_id",
        "operation",
        "target_name",
        "overwrite",
        "multiplier",
        "body",
    ])
    errors = Dict{String,String}()
    signal_inventory_request_exact_fields!(errors, data, expected)
    revision = signal_inventory_request_revision!(errors, data)
    source_value = signal_analyser_payload_value(data, "source_signal_id")
    source_id = source_value isa AbstractString && !isempty(strip(String(source_value))) ?
        String(strip(String(source_value))) : nothing
    source_id === nothing && (errors["source_signal_id"] = "Требуется непустая строка")
    operation_value = signal_analyser_payload_value(data, "operation")
    operation = operation_value isa AbstractString &&
        String(operation_value) in SIGNAL_DERIVED_OPERATION_NAMES ? String(operation_value) : nothing
    operation === nothing && (errors["operation"] =
        "Допустимо: abs, square, sqrt, signed_sqrt_abs, multiply, fft, custom")
    target_value = signal_analyser_payload_value(data, "target_name")
    target_name = target_value isa AbstractString && !isempty(strip(String(target_value))) ?
        String(strip(String(target_value))) : nothing
    target_name === nothing && (errors["target_name"] = "Требуется непустая строка")
    overwrite_value = signal_analyser_payload_value(data, "overwrite")
    overwrite = overwrite_value isa Bool ? overwrite_value : nothing
    overwrite === nothing && (errors["overwrite"] = "Требуется boolean")
    multiplier_value = signal_analyser_payload_value(data, "multiplier")
    multiplier = if multiplier_value === nothing
        nothing
    elseif multiplier_value isa Real && !(multiplier_value isa Bool)
        converted = try
            Float64(multiplier_value)
        catch err
            (err isa InexactError || err isa OverflowError) || rethrow()
            NaN
        end
        isfinite(converted) ? converted : nothing
    else
        nothing
    end
    multiplier_value !== nothing && multiplier === nothing &&
        (errors["multiplier"] = "Требуется null или конечное число")
    body_value = signal_analyser_payload_value(data, "body")
    body = body_value === nothing ? nothing :
        body_value isa AbstractString ? String(body_value) : nothing
    body_value !== nothing && body === nothing &&
        (errors["body"] = "Требуется null или строка")
    isempty(errors) || throw(SignalAnalyserValidationError(
        "Некорректный запрос операции над сигналом",
        errors,
    ))
    try
        DeriveSignalCommand(
            revision::Int,
            source_id::String,
            operation::String,
            target_name::String,
            overwrite::Bool,
            multiplier,
            body,
        )
    catch err
        err isa ArgumentError || rethrow()
        throw(signal_inventory_validation_error("operation", sprint(showerror, err)))
    end
end

function parse_crop_signal_command(data)::CropSignalCommand
    data isa AbstractDict || throw(signal_inventory_validation_error(
        "body",
        "Ожидался JSON-объект",
    ))
    expected = Set([
        "state_revision",
        "source_signal_id",
        "min_s",
        "max_s",
        "target_name",
        "overwrite",
    ])
    errors = Dict{String,String}()
    signal_inventory_request_exact_fields!(errors, data, expected)
    revision = signal_inventory_request_revision!(errors, data)
    source_value = signal_analyser_payload_value(data, "source_signal_id")
    source_id = source_value isa AbstractString && !isempty(strip(String(source_value))) ?
        String(strip(String(source_value))) : nothing
    source_id === nothing && (errors["source_signal_id"] = "Требуется непустая строка")

    parse_boundary = function (field_id::String)
        value = signal_analyser_payload_value(data, field_id)
        if !(value isa Real) || value isa Bool
            errors[field_id] = "Требуется конечное число в секундах"
            return nothing
        end
        converted = try
            Float64(value)
        catch err
            (err isa InexactError || err isa OverflowError) || rethrow()
            NaN
        end
        if !isfinite(converted)
            errors[field_id] = "Требуется конечное число в секундах"
            return nothing
        end
        converted == 0.0 ? 0.0 : converted
    end
    minimum_time = parse_boundary("min_s")
    maximum_time = parse_boundary("max_s")
    minimum_time !== nothing && maximum_time !== nothing &&
        minimum_time >= maximum_time &&
        (errors["min_s"] = "min_s должен быть строго меньше max_s")

    target_value = signal_analyser_payload_value(data, "target_name")
    target_name = target_value isa AbstractString && !isempty(strip(String(target_value))) ?
        String(strip(String(target_value))) : nothing
    if target_name === nothing
        errors["target_name"] = "Требуется непустая строка"
    elseif ncodeunits(target_name) > 128
        errors["target_name"] = "Имя не может быть длиннее 128 байт"
    end
    overwrite_value = signal_analyser_payload_value(data, "overwrite")
    overwrite = overwrite_value isa Bool ? overwrite_value : nothing
    overwrite === nothing && (errors["overwrite"] = "Требуется boolean")

    isempty(errors) || throw(SignalAnalyserValidationError(
        "Некорректный запрос обрезки сигнала",
        errors,
    ))
    CropSignalCommand(
        revision::Int,
        source_id::String,
        minimum_time::Float64,
        maximum_time::Float64,
        target_name::String,
        overwrite::Bool,
    )
end

function signal_operation_error_response(err::SignalOperationProviderError)
    status = err.code == "operation_unavailable" ? 503 :
        err.code in ("engee_transport_error", "engee_scratch_collision") ? 502 : 422
    api_json(Dict{String,Any}(
        "ok" => false,
        "code" => err.code,
        "error" => Dict{String,Any}(
            "code" => err.code,
            "message" => err.message,
            "fields" => Dict{String,String}(
                err.code in ("operation_failed", "invalid_operation_body") ?
                    "body" => err.message : "operation" => err.message,
            ),
        ),
    ); status = status)
end

function status_payload()
    Dict(
        "ok" => true,
        "project" => EXAMPLE_APP_STATE["project_name"],
        "ready" => EXAMPLE_APP_STATE["ready"],
        "runtime_revision" => RUNTIME_REVISION.sha,
    )
end
