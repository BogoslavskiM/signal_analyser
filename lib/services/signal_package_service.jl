using Base64
using SHA

const SIGNAL_PACKAGE_SCHEMA = "signal-analyser-package"
const SIGNAL_PACKAGE_VERSION = 1
const SIGNAL_PACKAGE_SIGNALS_SCHEMA = "signal-analyser-package-signals"
const SIGNAL_PACKAGE_GRAPHS_SCHEMA = "signal-analyser-package-graphs"
const SIGNAL_PACKAGE_GRAPH_SCHEMA = "signal-analyser-package-plotly"
const SIGNAL_PACKAGE_DEFAULT_FILENAME = "signal-analyser-session.sazip"
const SIGNAL_PACKAGE_DEFAULT_WORKSPACE_PREFIX = "imported_"
const SIGNAL_PACKAGE_RESERVED_WORKSPACE_NAMES = Set([
    "Base",
    "Core",
    "Main",
    "ans",
    "baremodule",
    "begin",
    "break",
    "catch",
    "const",
    "continue",
    "do",
    "else",
    "elseif",
    "end",
    "export",
    "false",
    "finally",
    "for",
    "function",
    "global",
    "if",
    "import",
    "include",
    "let",
    "local",
    "macro",
    "module",
    "mutable",
    "primitive",
    "quote",
    "return",
    "struct",
    "true",
    "try",
    "using",
    "where",
    "while",
])
const SIGNAL_PACKAGE_REQUIRED_ENTRIES = Set([
    "manifest.json",
    "session/session.json",
    "signals/index.json",
    "graphs/index.json",
    "scripts/reproduce.jl",
    "Project.toml",
    "Manifest.toml",
    "checksums.sha256",
])

struct SignalPackageValidationError <: Exception
    code::String
    message::String
    fields::Dict{String,String}
end

Base.showerror(io::IO, err::SignalPackageValidationError) = print(io, err.message)

signal_package_validation_error(
    code::AbstractString,
    message::AbstractString;
    field::AbstractString = "archive",
) = SignalPackageValidationError(
    String(code),
    String(message),
    Dict(String(field) => String(message)),
)

struct SignalPackageGraphSnapshot
    id::String
    page_id::String
    display_id::String
    pane_id::String
    plot_type::SignalAnalyserPlot
    signal_names::Vector{String}
    analysis_signal::Union{Nothing,String}
    plots::Vector{Dict{String,Any}}
end

struct ValidatedSignalPackage
    document::SignalAnalyserSessionDocument
    signals::Vector{AnalysedSignal}
    graphs::Vector{SignalPackageGraphSnapshot}
    entry_count::Int
    archive_bytes::Int
    checksum_count::Int
end

abstract type AbstractSignalPackageWorkspacePublisher end

struct EngeeSignalPackageWorkspacePublisher <: AbstractSignalPackageWorkspacePublisher end

struct SignalPackageService{P<:AbstractSignalPackageWorkspacePublisher}
    project_root::String
    workspace_publisher::P
end

SignalPackageService(project_root::AbstractString) = SignalPackageService(
    normpath(String(project_root)),
    EngeeSignalPackageWorkspacePublisher(),
)

struct SignalPackageWorkspaceItem
    signal_name::String
    variable_name::String
    action::String
    status::String
    error::String
end

function signal_package_workspace_receive(
    ::EngeeSignalPackageWorkspacePublisher,
    variable_name::String,
)
    genie_api = engee_workspace_genie_api(EngeeWorkspaceVariableProvider())
    receive = try
        getproperty(genie_api, :recv)
    catch
        throw(WorkspaceUnavailableError("Публикация недоступна: engee.genie.recv не найден"))
    end
    Base.invokelatest(receive, variable_name; context = Main)
end

function signal_package_workspace_send(
    ::EngeeSignalPackageWorkspacePublisher,
    variable_name::String,
    value::T,
) where {T}
    genie_api = engee_workspace_genie_api(EngeeWorkspaceVariableProvider())
    send_value = try
        getproperty(genie_api, :send)
    catch
        throw(WorkspaceUnavailableError("Публикация недоступна: engee.genie.send не найден"))
    end
    Base.invokelatest(send_value, variable_name, value)
end


signal_package_workspace_item_payload(item::SignalPackageWorkspaceItem) = Dict{String,Any}(
    "signal_name" => item.signal_name,
    "variable_name" => item.variable_name,
    "action" => item.action,
    "status" => item.status,
    "error" => item.error,
)

function publish_signal_package_workspace!(
    publisher::AbstractSignalPackageWorkspacePublisher,
    signals::Vector{AnalysedSignal},
    prefix::AbstractString,
)::Dict{String,Any}
    names = signal_package_workspace_names(signals, prefix)
    previous_values = Vector{Any}(undef, length(names))
    collisions = falses(length(names))
    try
        for index in eachindex(names)
            previous = signal_package_workspace_receive(publisher, names[index])
            previous_values[index] = previous
            collisions[index] = previous !== Nothing
        end
    catch err
        message = sprint(showerror, err)
        items = SignalPackageWorkspaceItem[
            SignalPackageWorkspaceItem(
                signal.name,
                names[index],
                "preflight",
                "not_attempted",
                message,
            ) for (index, signal) in enumerate(signals)
        ]
        return Dict{String,Any}(
            "requested" => true,
            "success" => false,
            "changed" => false,
            "partial_create_risk" => false,
            "prefix" => String(prefix),
            "collisions" => String[],
            "error" => message,
            "items" => signal_package_workspace_item_payload.(items),
        )
    end

    items = SignalPackageWorkspaceItem[]
    successful = Int[]
    failure_index = nothing
    failure_message = ""
    for index in eachindex(signals)
        signal = signals[index]
        value = signal.is_complex ? copy(signal.values) : Float64[real(item) for item in signal.values]
        try
            signal_package_workspace_send(publisher, names[index], value)
            push!(successful, index)
            push!(items, SignalPackageWorkspaceItem(
                signal.name,
                names[index],
                collisions[index] ? "replace" : "create",
                collisions[index] ? "replaced" : "created",
                "",
            ))
        catch err
            failure_index = index
            failure_message = sprint(showerror, err)
            push!(items, SignalPackageWorkspaceItem(
                signal.name,
                names[index],
                collisions[index] ? "replace" : "create",
                "failed",
                failure_message,
            ))
            break
        end
    end
    if failure_index === nothing
        return Dict{String,Any}(
            "requested" => true,
            "success" => true,
            "changed" => !isempty(signals),
            "partial_create_risk" => false,
            "prefix" => String(prefix),
            "collisions" => names[collisions],
            "error" => "",
            "items" => signal_package_workspace_item_payload.(items),
        )
    end

    # Engee exposes neither delete nor batch transaction.  Restore only values
    # that this operation replaced; newly created names cannot be removed.
    for index in reverse(successful)
        if collisions[index]
            rollback_error = ""
            rolled_back = try
                signal_package_workspace_send(publisher, names[index], previous_values[index])
                true
            catch err
                rollback_error = sprint(showerror, err)
                false
            end
            item_index = findfirst(item -> item.variable_name == names[index], items)
            items[item_index::Int] = SignalPackageWorkspaceItem(
                signals[index].name,
                names[index],
                "replace",
                rolled_back ? "replaced_rolled_back" : "replacement_rollback_failed",
                rollback_error,
            )
        else
            item_index = findfirst(item -> item.variable_name == names[index], items)
            items[item_index::Int] = SignalPackageWorkspaceItem(
                signals[index].name,
                names[index],
                "create",
                "created_not_reverted",
                "Удаление отдельной workspace variable недоступно",
            )
        end
    end
    failed_at = failure_index::Int
    for index in (failed_at + 1):length(signals)
        push!(items, SignalPackageWorkspaceItem(
            signals[index].name,
            names[index],
            collisions[index] ? "replace" : "create",
            "not_attempted",
            "",
        ))
    end
    partial_create = any(item -> item.status == "created_not_reverted", items)
    rollback_failed = any(item -> item.status == "replacement_rollback_failed", items)
    Dict{String,Any}(
        "requested" => true,
        "success" => false,
        "changed" => partial_create || rollback_failed,
        "partial_create_risk" => partial_create,
        "prefix" => String(prefix),
        "collisions" => names[collisions],
        "error" => failure_message,
        "items" => signal_package_workspace_item_payload.(items),
    )
end

function signal_package_json_bytes(value)::Vector{UInt8}
    encoded = try
        Genie.JSONParser.json(value; allownan = false)
    catch err
        throw(signal_package_validation_error(
            "json_encode_failed",
            "Не удалось сериализовать JSON пакета: $(sprint(showerror, err))",
        ))
    end
    Vector{UInt8}(codeunits(encoded))
end

function signal_package_parse_json(bytes::Vector{UInt8}, path::AbstractString)
    text = try
        String(copy(bytes))
    catch
        throw(signal_package_validation_error("invalid_utf8", "$path не является UTF-8"; field = path))
    end
    try
        Genie.JSONParser.parse(text; allownan = false)
    catch err
        throw(signal_package_validation_error(
            "invalid_json",
            "$path содержит некорректный JSON: $(sprint(showerror, err))";
            field = path,
        ))
    end
end

function signal_package_exact_object(value, fields::Set{String}, path::AbstractString)::AbstractDict
    value isa AbstractDict || throw(signal_package_validation_error(
        "invalid_package_schema",
        "$path должен быть JSON-объектом";
        field = path,
    ))
    actual = Set(String(key) for key in keys(value))
    actual == fields || begin
        missing = sort!(collect(setdiff(fields, actual)))
        unknown = sort!(collect(setdiff(actual, fields)))
        detail = String[]
        isempty(missing) || push!(detail, "отсутствуют: $(join(missing, ", "))")
        isempty(unknown) || push!(detail, "неизвестны: $(join(unknown, ", "))")
        throw(signal_package_validation_error(
            "invalid_package_schema",
            "$path имеет неверные поля ($(join(detail, "; ")))";
            field = path,
        ))
    end
    value
end

function signal_package_value(object::AbstractDict, key::String)
    haskey(object, key) ? object[key] : object[Symbol(key)]
end

function signal_package_string(value, path::AbstractString)::String
    value isa AbstractString || throw(signal_package_validation_error(
        "invalid_package_schema",
        "$path должен быть строкой";
        field = path,
    ))
    result = String(value)
    1 <= ncodeunits(result) <= SIGNAL_ANALYSER_SESSION_MAX_TEXT_LENGTH || throw(
        signal_package_validation_error("domain_limit", "$path имеет недопустимую длину"; field = path),
    )
    result
end

function signal_package_integer(value, path::AbstractString; minimum::Int = 0)::Int
    value isa Integer && !(value isa Bool) || throw(signal_package_validation_error(
        "invalid_package_schema",
        "$path должен быть целым числом";
        field = path,
    ))
    result = try
        Int(value)
    catch
        throw(signal_package_validation_error("domain_limit", "$path вне диапазона Int"; field = path))
    end
    result >= minimum || throw(signal_package_validation_error(
        "domain_limit",
        "$path должен быть не меньше $minimum";
        field = path,
    ))
    result
end

function signal_package_float(value, path::AbstractString)::Float64
    value isa Real && !(value isa Bool) || throw(signal_package_validation_error(
        "invalid_package_schema",
        "$path должен быть числом";
        field = path,
    ))
    result = try
        Float64(value)
    catch
        throw(signal_package_validation_error("domain_limit", "$path вне диапазона Float64"; field = path))
    end
    isfinite(result) || throw(signal_package_validation_error(
        "nonfinite_value",
        "$path должен быть конечным числом";
        field = path,
    ))
    result == 0.0 ? 0.0 : result
end

function signal_package_validate_json_finite(value, path::AbstractString = "graph")::Nothing
    if value isa AbstractFloat
        isfinite(value) || throw(signal_package_validation_error(
            "nonfinite_value",
            "$path содержит не-конечное число";
            field = path,
        ))
    elseif value isa Real || value isa Bool || value isa Nothing || value isa AbstractString
        nothing
    elseif value isa AbstractVector || value isa Tuple
        for (index, item) in enumerate(value)
            signal_package_validate_json_finite(item, "$path[$index]")
        end
    elseif value isa AbstractDict
        for (key, item) in pairs(value)
            key isa AbstractString || key isa Symbol || throw(signal_package_validation_error(
                "invalid_package_schema",
                "$path содержит нестроковый ключ";
                field = path,
            ))
            signal_package_validate_json_finite(item, "$path.$(String(key))")
        end
    else
        throw(signal_package_validation_error(
            "invalid_package_schema",
            "$path содержит неподдерживаемый JSON-тип $(typeof(value))";
            field = path,
        ))
    end
    nothing
end

function signal_package_signal_id(signal::AnalysedSignal)::String
    "signal-" * bytes2hex(sha256(Vector{UInt8}(codeunits("signal-analyser:" * signal.name))))[1:24]
end

function signal_package_identifier_fragment(value::AbstractString)::String
    output = IOBuffer()
    previous_underscore = false
    for character in String(value)
        accepted = isascii(character) && (isletter(character) || isdigit(character) || character == '_')
        mapped = accepted ? character : '_'
        if mapped == '_'
            previous_underscore && continue
            previous_underscore = true
        else
            previous_underscore = false
        end
        write(output, mapped)
    end
    result = strip(String(take!(output)), '_')
    isempty(result) ? "signal" : result
end

function signal_package_workspace_names(
    signals::Vector{AnalysedSignal},
    prefix::AbstractString,
)::Vector{String}
    prefix_value = String(prefix)
    occursin(r"^[A-Za-z_][A-Za-z0-9_]{0,63}$", prefix_value) || throw(
        signal_package_validation_error(
            "invalid_workspace_prefix",
            "Префикс должен быть Julia-идентификатором ASCII длиной до 64 символов";
            field = "workspace_prefix",
        ),
    )
    candidates = String[]
    seen = Set{String}()
    for signal in signals
        fragment = signal_package_identifier_fragment(signal.name)
        base = prefix_value * fragment
        if isdigit(first(base))
            base = "_" * base
        end
        id_suffix = "_" * last(signal_package_signal_id(signal), 8)
        candidate = first(base, min(length(base), 128))
        if candidate in seen
            keep = max(1, 128 - length(id_suffix))
            candidate = first(base, min(length(base), keep)) * id_suffix
        end
        occursin(r"^[A-Za-z_][A-Za-z0-9_]{0,127}$", candidate) || throw(
            signal_package_validation_error(
                "invalid_workspace_name",
                "Имя workspace variable не является допустимым Julia-идентификатором: $candidate";
                field = "workspace_prefix",
            ),
        )
        candidate in SIGNAL_PACKAGE_RESERVED_WORKSPACE_NAMES && throw(
            signal_package_validation_error(
                "reserved_workspace_name",
                "Имя workspace variable зарезервировано: $candidate";
                field = "workspace_prefix",
            ),
        )
        candidate in seen && throw(signal_package_validation_error(
            "workspace_name_collision",
            "Не удалось построить уникальные имена workspace";
            field = "workspace_prefix",
        ))
        push!(seen, candidate)
        push!(candidates, candidate)
    end
    candidates
end

function preflight_signal_package_workspace(
    service::SignalPackageService,
    archive::Vector{UInt8},
    prefix::AbstractString,
)::Dict{String,Any}
    package = validate_signal_package(service, archive)
    prefix_value = String(prefix)
    names = signal_package_workspace_names(package.signals, prefix_value)
    items = Dict{String,Any}[]
    collisions = String[]
    for (signal, variable_name) in zip(package.signals, names)
        previous = try
            signal_package_workspace_receive(service.workspace_publisher, variable_name)
        catch err
            code = err isa WorkspaceUnavailableError ?
                "workspace_unavailable" : "workspace_provider_error"
            throw(signal_package_validation_error(
                code,
                "Не удалось проверить имя $variable_name в рабочей области Engee: $(sprint(showerror, err))";
                field = "workspace_prefix",
            ))
        end
        action = previous === Nothing ? "create" : "replace"
        action == "replace" && push!(collisions, variable_name)
        push!(items, Dict{String,Any}(
            "signal_name" => signal.name,
            "variable_name" => variable_name,
            "action" => action,
        ))
    end
    Dict{String,Any}(
        "ok" => true,
        "prefix" => prefix_value,
        "collisions" => collisions,
        "items" => items,
    )
end

function signal_package_csv(signal::AnalysedSignal)::Vector{UInt8}
    output = IOBuffer()
    write(output, "time_s,real,imag\n")
    for (index, sample) in enumerate(signal.values)
        time_s = (index - 1) / signal.sample_rate_hz
        isfinite(time_s) || throw(signal_package_validation_error(
            "nonfinite_value",
            "Временная ось сигнала $(signal.name) не является конечной",
        ))
        write(output, repr(Float64(time_s)))
        write(output, ',')
        write(output, repr(Float64(real(sample))))
        write(output, ',')
        write(output, repr(Float64(imag(sample))))
        write(output, '\n')
    end
    take!(output)
end

function signal_package_reproduce_script(
    signals::Vector{AnalysedSignal},
    paths::Vector{String},
)::Vector{UInt8}
    output = IOBuffer()
    write(output, "# Signal Analyser .sazip v1 deterministic reproduction template.\n")
    write(output, "# This file is informational and is never executed by package import.\n")
    write(output, "using DelimitedFiles\n\n")
    write(output, "const SIGNAL_ANALYSER_PACKAGE_SIGNALS = [\n")
    for (signal, path) in zip(signals, paths)
        write(output, "    (name = ", repr(signal.name), ", file = ", repr("../" * path), ", is_complex = ", repr(signal.is_complex), "),\n")
    end
    write(output, "]\n\n")
    write(output, "function reproduce_signal_analyser_package(; prefix = \"imported_\")\n")
    write(output, "    package_root = normpath(joinpath(@__DIR__, \"..\"))\n")
    write(output, "    for signal in SIGNAL_ANALYSER_PACKAGE_SIGNALS\n")
    write(output, "        matrix = readdlm(joinpath(package_root, signal.file), ',', Float64; skipstart = 1)\n")
    write(output, "        values = signal.is_complex ? complex.(matrix[:, 2], matrix[:, 3]) : matrix[:, 2]\n")
    write(output, "        engee.genie.send(prefix * replace(signal.name, r\"[^A-Za-z0-9_]\" => \"_\"), values)\n")
    write(output, "    end\n")
    write(output, "    nothing\n")
    write(output, "end\n")
    take!(output)
end

function signal_package_graph_exports_unlocked(
    state::SignalAnalyserState,
)::Tuple{Vector{Dict{String,Any}},Vector{Pair{String,Vector{UInt8}}}}
    index_entries = Dict{String,Any}[]
    payloads = Pair{String,Vector{UInt8}}[]
    for page_id in sort!(collect(keys(state.output_manager.plot_cache)))
        cache = state.output_manager.plot_cache[page_id]
        get(state.output_manager.need_update_pages, page_id, true) && continue
        status = get(state.output_manager.output_statuses, page_id, nothing)
        status === nothing && continue
        status.context == cache.context && status.isready && status.success || continue
        display = findfirst(item -> item.id == cache.context.display_id, state.displays)
        display === nothing && continue
        layout = state.display_layouts[cache.context.display_id]
        pane_index = findfirst(item -> item.id == cache.context.pane_id, layout.panes)
        pane_index === nothing && continue
        pane = layout.panes[pane_index]
        pane.plot_type == cache.context.plot_type || continue
        plots = deepcopy(cache.plots)
        signal_package_validate_json_finite(plots, "graphs.$page_id.plots")
        graph_id = "graph-" * bytes2hex(sha256(Vector{UInt8}(codeunits(page_id))))[1:24]
        path = "graphs/$graph_id.json"
        graph_document = Dict{String,Any}(
            "schema" => SIGNAL_PACKAGE_GRAPH_SCHEMA,
            "version" => SIGNAL_PACKAGE_VERSION,
            "plots" => plots,
        )
        push!(payloads, path => signal_package_json_bytes(graph_document))
        push!(index_entries, Dict{String,Any}(
            "id" => graph_id,
            "page_id" => page_id,
            "path" => path,
            "display_id" => cache.context.display_id,
            "pane_id" => cache.context.pane_id,
            "plot_type" => signal_analyser_plot_name(cache.context.plot_type),
            "source" => Dict{String,Any}(
                "signal_names" => signal_display_pane_members(pane),
                "analysis_signal" => signal_display_pane_analysis_name(pane),
            ),
            "context" => Dict{String,Any}(
                "calculation_revision" => cache.context.calculation_revision,
                "context_key" => signal_analyser_output_context_id(cache.context),
            ),
        ))
    end
    index_entries, payloads
end

function signal_package_environment_bytes(service::SignalPackageService, filename::String)::Vector{UInt8}
    path = joinpath(service.project_root, filename)
    isfile(path) || throw(signal_package_validation_error(
        "environment_metadata_missing",
        "$filename отсутствует в приложении",
    ))
    bytes = read(path)
    length(bytes) <= SIGNAL_PACKAGE_MAX_ENTRY_BYTES || throw(signal_package_validation_error(
        "archive_entry_limit",
        "$filename превышает лимит entry",
    ))
    bytes
end

function export_signal_package(
    service::SignalPackageService,
    state::SignalAnalyserState,
)::Vector{UInt8}
    session_payload, signals, graph_index, graph_payloads = lock(state.lock) do
        document = signal_analyser_session_document_unlocked(state)
        payload = signal_analyser_session_payload(document)
        signal_copies = AnalysedSignal[
            AnalysedSignal(
                signal.id,
                signal.name,
                signal.color,
                signal.sample_rate_hz,
                copy(signal.values),
                signal.is_complex,
                signal.visible,
            ) for signal in state.signals
        ]
        index, graphs = signal_package_graph_exports_unlocked(state)
        (payload, signal_copies, index, graphs)
    end

    signal_paths = ["signals/$(signal_package_signal_id(signal)).csv" for signal in signals]
    signal_index_entries = Dict{String,Any}[
        Dict{String,Any}(
            "id" => signal_package_signal_id(signal),
            "name" => signal.name,
            "path" => path,
            "sample_rate_hz" => signal.sample_rate_hz,
            "sample_count" => length(signal.values),
            "is_complex" => signal.is_complex,
            "color" => signal.color,
            "visible" => signal.visible,
        ) for (signal, path) in zip(signals, signal_paths)
    ]
    signals_index = Dict{String,Any}(
        "schema" => SIGNAL_PACKAGE_SIGNALS_SCHEMA,
        "version" => SIGNAL_PACKAGE_VERSION,
        "signals" => signal_index_entries,
    )
    graphs_index = Dict{String,Any}(
        "schema" => SIGNAL_PACKAGE_GRAPHS_SCHEMA,
        "version" => SIGNAL_PACKAGE_VERSION,
        "graphs" => graph_index,
    )
    manifest = Dict{String,Any}(
        "schema" => SIGNAL_PACKAGE_SCHEMA,
        "version" => SIGNAL_PACKAGE_VERSION,
        "application" => Dict{String,Any}(
            "name" => "Signal Analyser",
            "session_schema" => SIGNAL_ANALYSER_SESSION_SCHEMA,
            "session_version" => SIGNAL_ANALYSER_SESSION_VERSION,
        ),
        "contents" => Dict{String,Any}(
            "signal_count" => length(signals),
            "graph_snapshot_count" => length(graph_index),
            "png_snapshots" => "optional_not_included",
            "reproduce_script" => "informational_never_auto_executed",
            "environment_files" => String["Project.toml", "Manifest.toml"],
        ),
        "limits" => Dict{String,Any}(
            "max_signals" => SIGNAL_ANALYSER_SESSION_MAX_SIGNALS,
            "max_displays" => SIGNAL_ANALYSER_SESSION_MAX_DISPLAYS,
            "max_total_samples" => SIGNAL_ANALYSER_SESSION_MAX_TOTAL_SAMPLES,
            "max_archive_bytes" => SIGNAL_PACKAGE_MAX_ARCHIVE_BYTES,
            "max_entry_bytes" => SIGNAL_PACKAGE_MAX_ENTRY_BYTES,
            "max_files" => SIGNAL_PACKAGE_MAX_FILES,
        ),
    )
    entries = SignalPackageArchiveEntry[
        SignalPackageArchiveEntry("manifest.json", signal_package_json_bytes(manifest)),
        SignalPackageArchiveEntry("session/session.json", signal_package_json_bytes(session_payload)),
        SignalPackageArchiveEntry("signals/index.json", signal_package_json_bytes(signals_index)),
    ]
    append!(entries, [
        SignalPackageArchiveEntry(path, signal_package_csv(signal))
        for (signal, path) in zip(signals, signal_paths)
    ])
    push!(entries, SignalPackageArchiveEntry("graphs/index.json", signal_package_json_bytes(graphs_index)))
    append!(entries, [SignalPackageArchiveEntry(first(pair), last(pair)) for pair in graph_payloads])
    push!(entries, SignalPackageArchiveEntry(
        "scripts/reproduce.jl",
        signal_package_reproduce_script(signals, signal_paths),
    ))
    push!(entries, SignalPackageArchiveEntry("Project.toml", signal_package_environment_bytes(service, "Project.toml")))
    push!(entries, SignalPackageArchiveEntry("Manifest.toml", signal_package_environment_bytes(service, "Manifest.toml")))
    checksum_lines = String[
        "$(bytes2hex(sha256(entry.bytes)))  $(entry.name)" for entry in entries
    ]
    push!(entries, SignalPackageArchiveEntry(
        "checksums.sha256",
        Vector{UInt8}(codeunits(join(checksum_lines, "\n") * "\n")),
    ))
    write_signal_package_archive(entries)
end

function signal_package_entry_map(
    entries::Vector{SignalPackageArchiveEntry},
)::Dict{String,Vector{UInt8}}
    Dict(entry.name => entry.bytes for entry in entries)
end

function signal_package_validate_checksums!(entries::Dict{String,Vector{UInt8}})::Int
    checksum_bytes = get(entries, "checksums.sha256", nothing)
    checksum_bytes === nothing && throw(signal_package_validation_error(
        "missing_required_entry",
        "Отсутствует checksums.sha256",
    ))
    text = try
        String(copy(checksum_bytes))
    catch
        throw(signal_package_validation_error("invalid_checksum_file", "checksums.sha256 не является UTF-8"))
    end
    endswith(text, "\n") || throw(signal_package_validation_error(
        "invalid_checksum_file",
        "checksums.sha256 должен завершаться новой строкой",
    ))
    expected_names = Set(setdiff(keys(entries), ["checksums.sha256"]))
    checked = Set{String}()
    for line in split(chop(text; tail = 1), '\n'; keepempty = true)
        isempty(line) && throw(signal_package_validation_error(
            "invalid_checksum_file",
            "checksums.sha256 содержит пустую строку",
        ))
        match_result = match(r"^([0-9a-f]{64})  (.+)$", line)
        match_result === nothing && throw(signal_package_validation_error(
            "invalid_checksum_file",
            "Некорректная строка checksums.sha256",
        ))
        digest = match_result.captures[1]
        name = signal_package_validate_entry_name(match_result.captures[2])
        name == "checksums.sha256" && throw(signal_package_validation_error(
            "invalid_checksum_file",
            "checksums.sha256 не должен включать себя",
        ))
        name in checked && throw(signal_package_validation_error(
            "invalid_checksum_file",
            "Повтор checksum для $name",
        ))
        haskey(entries, name) || throw(signal_package_validation_error(
            "invalid_checksum_file",
            "Checksum ссылается на отсутствующий entry $name",
        ))
        bytes2hex(sha256(entries[name])) == digest || throw(signal_package_validation_error(
            "checksum_mismatch",
            "SHA-256 не совпадает для $name";
            field = name,
        ))
        push!(checked, name)
    end
    checked == expected_names || throw(signal_package_validation_error(
        "checksum_coverage",
        "checksums.sha256 должен точно покрывать все entries пакета",
    ))
    length(checked)
end

function signal_package_validate_manifest!(value)::Tuple{Int,Int}
    manifest = signal_package_exact_object(
        value,
        Set(["schema", "version", "application", "contents", "limits"]),
        "manifest.json",
    )
    signal_package_value(manifest, "schema") == SIGNAL_PACKAGE_SCHEMA || throw(
        signal_package_validation_error("unsupported_package", "Неизвестная схема пакета"),
    )
    signal_package_integer(signal_package_value(manifest, "version"), "manifest.version") ==
        SIGNAL_PACKAGE_VERSION || throw(
        signal_package_validation_error("unsupported_version", "Поддерживается только .sazip v1"),
    )
    application = signal_package_exact_object(
        signal_package_value(manifest, "application"),
        Set(["name", "session_schema", "session_version"]),
        "manifest.application",
    )
    signal_package_value(application, "name") == "Signal Analyser" || throw(
        signal_package_validation_error("wrong_application", "Пакет создан другим приложением"),
    )
    signal_package_value(application, "session_schema") == SIGNAL_ANALYSER_SESSION_SCHEMA || throw(
        signal_package_validation_error("wrong_session_schema", "Некорректная схема session payload"),
    )
    signal_package_integer(
        signal_package_value(application, "session_version"),
        "manifest.application.session_version",
    ) in (
        SIGNAL_ANALYSER_PREVIOUS_SESSION_VERSION,
        SIGNAL_ANALYSER_IDENTITY_SESSION_VERSION,
        SIGNAL_ANALYSER_SESSION_VERSION,
    ) || throw(
        signal_package_validation_error("unsupported_session_version", "Требуется session v3, v4 или v5"),
    )
    contents = signal_package_exact_object(
        signal_package_value(manifest, "contents"),
        Set([
            "signal_count",
            "graph_snapshot_count",
            "png_snapshots",
            "reproduce_script",
            "environment_files",
        ]),
        "manifest.contents",
    )
    signal_count = signal_package_integer(
        signal_package_value(contents, "signal_count"),
        "manifest.contents.signal_count",
    )
    graph_count = signal_package_integer(
        signal_package_value(contents, "graph_snapshot_count"),
        "manifest.contents.graph_snapshot_count",
    )
    signal_package_value(contents, "png_snapshots") == "optional_not_included" || throw(
        signal_package_validation_error("invalid_package_schema", "v1 должен отмечать PNG как optional_not_included"),
    )
    signal_package_value(contents, "reproduce_script") == "informational_never_auto_executed" || throw(
        signal_package_validation_error("invalid_package_schema", "Некорректная политика reproduce script"),
    )
    environment_files = signal_package_value(contents, "environment_files")
    environment_files == ["Project.toml", "Manifest.toml"] || throw(
        signal_package_validation_error("invalid_package_schema", "Некорректный список environment files"),
    )
    limits = signal_package_exact_object(
        signal_package_value(manifest, "limits"),
        Set([
            "max_signals",
            "max_displays",
            "max_total_samples",
            "max_archive_bytes",
            "max_entry_bytes",
            "max_files",
        ]),
        "manifest.limits",
    )
    expected_limits = Dict(
        "max_signals" => SIGNAL_ANALYSER_SESSION_MAX_SIGNALS,
        "max_displays" => SIGNAL_ANALYSER_SESSION_MAX_DISPLAYS,
        "max_total_samples" => SIGNAL_ANALYSER_SESSION_MAX_TOTAL_SAMPLES,
        "max_archive_bytes" => SIGNAL_PACKAGE_MAX_ARCHIVE_BYTES,
        "max_entry_bytes" => SIGNAL_PACKAGE_MAX_ENTRY_BYTES,
        "max_files" => SIGNAL_PACKAGE_MAX_FILES,
    )
    for (key, expected) in expected_limits
        signal_package_integer(signal_package_value(limits, key), "manifest.limits.$key") == expected || throw(
            signal_package_validation_error("invalid_package_schema", "manifest.limits.$key не совпадает с v1"),
        )
    end
    (signal_count, graph_count)
end

function signal_package_parse_csv(
    bytes::Vector{UInt8},
    signal::AnalysedSignal,
    path::String,
)::Nothing
    text = try
        String(copy(bytes))
    catch
        throw(signal_package_validation_error("invalid_utf8", "$path не является UTF-8"; field = path))
    end
    endswith(text, "\n") || throw(signal_package_validation_error(
        "invalid_signal_csv",
        "$path должен завершаться новой строкой";
        field = path,
    ))
    lines = split(chop(text; tail = 1), '\n'; keepempty = true)
    !isempty(lines) && first(lines) == "time_s,real,imag" || throw(
        signal_package_validation_error("invalid_signal_csv", "$path имеет неверный header"; field = path),
    )
    length(lines) - 1 == length(signal.values) || throw(signal_package_validation_error(
        "signal_mismatch",
        "$path имеет неверное число отсчётов";
        field = path,
    ))
    for index in eachindex(signal.values)
        columns = split(lines[index + 1], ','; keepempty = true)
        length(columns) == 3 || throw(signal_package_validation_error(
            "invalid_signal_csv",
            "$path строка $index должна иметь 3 колонки";
            field = path,
        ))
        values = try
            Float64[parse(Float64, column) for column in columns]
        catch
            throw(signal_package_validation_error(
                "invalid_signal_csv",
                "$path строка $index содержит нечисловое значение";
                field = path,
            ))
        end
        all(isfinite, values) || throw(signal_package_validation_error(
            "nonfinite_value",
            "$path строка $index содержит не-конечное значение";
            field = path,
        ))
        expected_time = (index - 1) / signal.sample_rate_hz
        values[1] == expected_time || throw(signal_package_validation_error(
            "signal_mismatch",
            "$path строка $index имеет неверное time_s";
            field = path,
        ))
        sample = signal.values[index]
        values[2] == real(sample) && values[3] == imag(sample) || throw(
            signal_package_validation_error(
                "signal_mismatch",
                "$path не совпадает с session/session.json";
                field = path,
            ),
        )
    end
    nothing
end

function signal_package_validate_signals!(
    entries::Dict{String,Vector{UInt8}},
    signals::Vector{AnalysedSignal},
)::Set{String}
    root = signal_package_exact_object(
        signal_package_parse_json(entries["signals/index.json"], "signals/index.json"),
        Set(["schema", "version", "signals"]),
        "signals/index.json",
    )
    signal_package_value(root, "schema") == SIGNAL_PACKAGE_SIGNALS_SCHEMA || throw(
        signal_package_validation_error("invalid_package_schema", "Некорректная схема signals/index.json"),
    )
    signal_package_integer(signal_package_value(root, "version"), "signals.version") == 1 || throw(
        signal_package_validation_error("unsupported_version", "Некорректная версия signals index"),
    )
    raw_index = signal_package_value(root, "signals")
    raw_index isa AbstractVector || throw(signal_package_validation_error(
        "invalid_package_schema",
        "signals.signals должен быть массивом",
    ))
    length(raw_index) == length(signals) || throw(signal_package_validation_error(
        "signal_mismatch",
        "Количество сигналов index/session не совпадает",
    ))
    paths = Set{String}()
    ids = Set{String}()
    for (index, signal) in enumerate(signals)
        path_prefix = "signals.signals[$index]"
        item = signal_package_exact_object(
            raw_index[index],
            Set(["id", "name", "path", "sample_rate_hz", "sample_count", "is_complex", "color", "visible"]),
            path_prefix,
        )
        id = signal_package_string(signal_package_value(item, "id"), "$path_prefix.id")
        id == signal_package_signal_id(signal) || throw(signal_package_validation_error(
            "signal_mismatch",
            "$path_prefix.id не соответствует stable id",
        ))
        id in ids && throw(signal_package_validation_error("signal_mismatch", "Stable signal ids повторяются"))
        push!(ids, id)
        signal_package_value(item, "name") == signal.name || throw(signal_package_validation_error("signal_mismatch", "$path_prefix.name не совпадает"))
        signal_package_float(signal_package_value(item, "sample_rate_hz"), "$path_prefix.sample_rate_hz") == signal.sample_rate_hz || throw(signal_package_validation_error("signal_mismatch", "$path_prefix.sample_rate_hz не совпадает"))
        signal_package_integer(signal_package_value(item, "sample_count"), "$path_prefix.sample_count") == length(signal.values) || throw(signal_package_validation_error("signal_mismatch", "$path_prefix.sample_count не совпадает"))
        signal_package_value(item, "is_complex") === signal.is_complex || throw(signal_package_validation_error("signal_mismatch", "$path_prefix.is_complex не совпадает"))
        signal_package_value(item, "color") == signal.color || throw(signal_package_validation_error("signal_mismatch", "$path_prefix.color не совпадает"))
        signal_package_value(item, "visible") === signal.visible || throw(signal_package_validation_error("signal_mismatch", "$path_prefix.visible не совпадает"))
        path = signal_package_string(signal_package_value(item, "path"), "$path_prefix.path")
        path == "signals/$id.csv" || throw(signal_package_validation_error("invalid_package_schema", "$path_prefix.path не соответствует id"))
        haskey(entries, path) || throw(signal_package_validation_error("missing_required_entry", "Отсутствует $path"))
        path in paths && throw(signal_package_validation_error("duplicate_entry", "Повтор signal path $path"))
        push!(paths, path)
        signal_package_parse_csv(entries[path], signal, path)
    end
    paths
end

function signal_package_graph_pane(
    document::SignalAnalyserSessionDocument,
    display_id::String,
    pane_id::String,
)::SignalDisplayPaneState
    haskey(document.display_layouts, display_id) || throw(signal_package_validation_error(
        "stale_graph_snapshot",
        "Graph snapshot ссылается на отсутствующий Display",
    ))
    layout = document.display_layouts[display_id]
    index = findfirst(pane -> pane.id == pane_id, layout.panes)
    index === nothing && throw(signal_package_validation_error(
        "stale_graph_snapshot",
        "Graph snapshot ссылается на отсутствующую pane",
    ))
    layout.panes[index]
end

function signal_package_validate_graphs!(
    entries::Dict{String,Vector{UInt8}},
    document::SignalAnalyserSessionDocument,
)::Tuple{Vector{SignalPackageGraphSnapshot},Set{String}}
    root = signal_package_exact_object(
        signal_package_parse_json(entries["graphs/index.json"], "graphs/index.json"),
        Set(["schema", "version", "graphs"]),
        "graphs/index.json",
    )
    signal_package_value(root, "schema") == SIGNAL_PACKAGE_GRAPHS_SCHEMA || throw(
        signal_package_validation_error("invalid_package_schema", "Некорректная схема graphs/index.json"),
    )
    signal_package_integer(signal_package_value(root, "version"), "graphs.version") == 1 || throw(
        signal_package_validation_error("unsupported_version", "Некорректная версия graphs index"),
    )
    raw_graphs = signal_package_value(root, "graphs")
    raw_graphs isa AbstractVector || throw(signal_package_validation_error(
        "invalid_package_schema",
        "graphs.graphs должен быть массивом",
    ))
    graphs = SignalPackageGraphSnapshot[]
    paths = Set{String}()
    ids = Set{String}()
    pages = Set{String}()
    for (index, raw) in enumerate(raw_graphs)
        prefix = "graphs.graphs[$index]"
        item = signal_package_exact_object(
            raw,
            Set(["id", "page_id", "path", "display_id", "pane_id", "plot_type", "source", "context"]),
            prefix,
        )
        id = signal_package_string(signal_package_value(item, "id"), "$prefix.id")
        page_id = signal_package_string(signal_package_value(item, "page_id"), "$prefix.page_id")
        id == "graph-" * bytes2hex(sha256(Vector{UInt8}(codeunits(page_id))))[1:24] || throw(
            signal_package_validation_error("invalid_package_schema", "$prefix.id не соответствует page_id"),
        )
        id in ids && throw(signal_package_validation_error("duplicate_entry", "Повтор graph id $id"))
        page_id in pages && throw(signal_package_validation_error("duplicate_entry", "Повтор graph page $page_id"))
        push!(ids, id)
        push!(pages, page_id)
        path = signal_package_string(signal_package_value(item, "path"), "$prefix.path")
        path == "graphs/$id.json" || throw(signal_package_validation_error("invalid_package_schema", "$prefix.path не соответствует id"))
        haskey(entries, path) || throw(signal_package_validation_error("missing_required_entry", "Отсутствует $path"))
        push!(paths, path)
        display_id = signal_package_string(signal_package_value(item, "display_id"), "$prefix.display_id")
        pane_id = signal_package_string(signal_package_value(item, "pane_id"), "$prefix.pane_id")
        page_id == signal_analyser_output_page_id(display_id, pane_id) || throw(
            signal_package_validation_error("stale_graph_snapshot", "$prefix.page_id не совпадает с source"),
        )
        plot_name = signal_package_string(signal_package_value(item, "plot_type"), "$prefix.plot_type")
        haskey(SIGNAL_ANALYSER_PLOTS_BY_NAME, plot_name) || throw(
            signal_package_validation_error("invalid_package_schema", "$prefix.plot_type неизвестен"),
        )
        plot_type = SIGNAL_ANALYSER_PLOTS_BY_NAME[plot_name]
        pane = signal_package_graph_pane(document, display_id, pane_id)
        pane.plot_type == plot_type || throw(signal_package_validation_error(
            "stale_graph_snapshot",
            "$prefix.plot_type устарел относительно session",
        ))
        source = signal_package_exact_object(
            signal_package_value(item, "source"),
            Set(["signal_names", "analysis_signal"]),
            "$prefix.source",
        )
        raw_names = signal_package_value(source, "signal_names")
        raw_names isa AbstractVector && all(name -> name isa AbstractString, raw_names) || throw(
            signal_package_validation_error("invalid_package_schema", "$prefix.source.signal_names должен быть массивом строк"),
        )
        signal_names = String.(raw_names)
        signal_names == signal_display_pane_members(pane) || throw(signal_package_validation_error(
            "stale_graph_snapshot",
            "$prefix.source.signal_names устарел относительно session",
        ))
        raw_analysis = signal_package_value(source, "analysis_signal")
        analysis_signal = raw_analysis === nothing ? nothing : signal_package_string(raw_analysis, "$prefix.source.analysis_signal")
        analysis_signal == signal_display_pane_analysis_name(pane) || throw(signal_package_validation_error(
            "stale_graph_snapshot",
            "$prefix.source.analysis_signal устарел относительно session",
        ))
        context = signal_package_exact_object(
            signal_package_value(item, "context"),
            Set(["calculation_revision", "context_key"]),
            "$prefix.context",
        )
        signal_package_integer(signal_package_value(context, "calculation_revision"), "$prefix.context.calculation_revision")
        signal_package_string(signal_package_value(context, "context_key"), "$prefix.context.context_key")
        graph_document = signal_package_exact_object(
            signal_package_parse_json(entries[path], path),
            Set(["schema", "version", "plots"]),
            path,
        )
        signal_package_value(graph_document, "schema") == SIGNAL_PACKAGE_GRAPH_SCHEMA || throw(
            signal_package_validation_error("invalid_package_schema", "$path имеет неверную schema"),
        )
        signal_package_integer(signal_package_value(graph_document, "version"), "$path.version") == 1 || throw(
            signal_package_validation_error("unsupported_version", "$path имеет неверную version"),
        )
        raw_plots = signal_package_value(graph_document, "plots")
        raw_plots isa AbstractVector || throw(signal_package_validation_error("invalid_package_schema", "$path.plots должен быть массивом"))
        plots = Dict{String,Any}[]
        for (plot_index, raw_plot) in enumerate(raw_plots)
            raw_plot isa AbstractDict || throw(signal_package_validation_error(
                "invalid_package_schema",
                "$path.plots[$plot_index] должен быть объектом",
            ))
            plot = Dict{String,Any}(String(key) => value for (key, value) in pairs(raw_plot))
            signal_package_validate_json_finite(plot, "$path.plots[$plot_index]")
            push!(plots, plot)
        end
        push!(graphs, SignalPackageGraphSnapshot(
            id,
            page_id,
            display_id,
            pane_id,
            plot_type,
            signal_names,
            analysis_signal,
            plots,
        ))
    end
    graphs, paths
end

function validate_signal_package(
    ::SignalPackageService,
    archive::Vector{UInt8},
)::ValidatedSignalPackage
    archive_entries = read_signal_package_archive(archive)
    entries = signal_package_entry_map(archive_entries)
    missing = setdiff(SIGNAL_PACKAGE_REQUIRED_ENTRIES, Set(keys(entries)))
    isempty(missing) || throw(signal_package_validation_error(
        "missing_required_entry",
        "Отсутствуют обязательные entries: $(join(sort!(collect(missing)), ", "))",
    ))
    checksum_count = signal_package_validate_checksums!(entries)
    manifest_counts = signal_package_validate_manifest!(
        signal_package_parse_json(entries["manifest.json"], "manifest.json"),
    )
    session_value = signal_package_parse_json(entries["session/session.json"], "session/session.json")
    document = try
        parse_signal_analyser_session_document(session_value)
    catch err
        err isa SignalAnalyserSessionValidationError || rethrow()
        throw(SignalPackageValidationError(err.code, err.message, err.fields))
    end
    document.version in (
        SIGNAL_ANALYSER_PREVIOUS_SESSION_VERSION,
        SIGNAL_ANALYSER_IDENTITY_SESSION_VERSION,
        SIGNAL_ANALYSER_SESSION_VERSION,
    ) || throw(
        signal_package_validation_error("unsupported_session_version", "В пакете требуется session v3, v4 или v5"),
    )
    signal_paths = signal_package_validate_signals!(entries, document.signals)
    graphs, graph_paths = signal_package_validate_graphs!(entries, document)
    manifest_counts == (length(document.signals), length(graphs)) || throw(
        signal_package_validation_error("content_count_mismatch", "Счётчики manifest не совпадают с indexes"),
    )
    expected_entries = union(SIGNAL_PACKAGE_REQUIRED_ENTRIES, signal_paths, graph_paths)
    Set(keys(entries)) == expected_entries || throw(signal_package_validation_error(
        "unknown_entry",
        "Пакет содержит entries, не описанные v1 indexes",
    ))
    expected_script = signal_package_reproduce_script(
        document.signals,
        ["signals/$(signal_package_signal_id(signal)).csv" for signal in document.signals],
    )
    entries["scripts/reproduce.jl"] == expected_script || throw(
        signal_package_validation_error(
            "unsafe_reproduce_script",
            "scripts/reproduce.jl не совпадает с детерминированным v1 template",
        ),
    )
    isempty(entries["Project.toml"]) && throw(signal_package_validation_error("invalid_environment_metadata", "Project.toml пуст"))
    isempty(entries["Manifest.toml"]) && throw(signal_package_validation_error("invalid_environment_metadata", "Manifest.toml пуст"))
    ValidatedSignalPackage(
        document,
        document.signals,
        graphs,
        length(entries),
        length(archive),
        checksum_count,
    )
end

function signal_package_validation_payload(package::ValidatedSignalPackage)::Dict{String,Any}
    Dict{String,Any}(
        "ok" => true,
        "schema" => SIGNAL_PACKAGE_SCHEMA,
        "version" => SIGNAL_PACKAGE_VERSION,
        "session" => Dict{String,Any}(
            "schema" => package.document.schema,
            "version" => package.document.version,
            "source_revision" => package.document.source_revision,
        ),
        "contents" => Dict{String,Any}(
            "signals" => length(package.signals),
            "displays" => length(package.document.displays),
            "graph_snapshots" => length(package.graphs),
            "entry_count" => package.entry_count,
            "checksum_count" => package.checksum_count,
            "reproduce_script" => "validated_never_executed",
            "environment_metadata" => true,
            "png_snapshots" => "optional_not_included",
        ),
        "limits" => Dict{String,Any}(
            "total_samples" => sum(length(signal.values) for signal in package.signals),
            "max_total_samples" => SIGNAL_ANALYSER_SESSION_MAX_TOTAL_SAMPLES,
        ),
        "archive_bytes" => package.archive_bytes,
    )
end

function signal_package_restore_graphs_unlocked!(
    state::SignalAnalyserState,
    graphs::Vector{SignalPackageGraphSnapshot},
)::Nothing
    manager = state.output_manager
    for graph in graphs
        haskey(manager.need_update_pages, graph.page_id) || continue
        pane = signal_package_graph_pane(
            signal_analyser_session_document_unlocked(state),
            graph.display_id,
            graph.pane_id,
        )
        pane.plot_type == graph.plot_type || continue
        signal_display_pane_members(pane) == graph.signal_names || continue
        signal_display_pane_analysis_name(pane) == graph.analysis_signal || continue
        revision = manager.page_calculation_revisions[graph.page_id]
        context = SignalAnalyserOutputContextKey(
            graph.display_id,
            graph.pane_id,
            graph.plot_type,
            revision,
        )
        manager.plot_cache[graph.page_id] = SignalAnalyserPlotCacheEntry(context, deepcopy(graph.plots))
        manager.output_statuses[graph.page_id] = SignalAnalyserOutputStatus(
            context,
            true,
            true,
            "",
        )
        manager.need_update_pages[graph.page_id] = false
    end
    nothing
end

function import_signal_package!(
    service::SignalPackageService,
    state::SignalAnalyserState,
    package::ValidatedSignalPackage,
    expected_revision::Int,
    ;
    publish_workspace::Bool = false,
    workspace_prefix::AbstractString = SIGNAL_PACKAGE_DEFAULT_WORKSPACE_PREFIX,
)::Dict{String,Any}
    publish_workspace && signal_package_workspace_names(package.signals, workspace_prefix)
    response = lock(state.lock) do
        expected_revision == state.view.state_revision || throw(
            SignalAnalyserStaleStateError(expected_revision, state.view.state_revision),
        )
        next_revision = state.view.state_revision + 1
        candidate = signal_analyser_session_candidate(state, package.document, next_revision)
        signal_analyser_publish_session!(state, candidate)
        signal_package_restore_graphs_unlocked!(state, package.graphs)
        Dict{String,Any}(
            "ok" => true,
            "schema" => SIGNAL_PACKAGE_SCHEMA,
            "version" => SIGNAL_PACKAGE_VERSION,
            "imported_source_revision" => package.document.source_revision,
            "state_revision" => state.view.state_revision,
            "signals_imported" => length(package.signals),
            "graph_snapshots_restored" => count(
                graph -> !get(state.output_manager.need_update_pages, graph.page_id, true),
                package.graphs,
            ),
        )
    end
    workspace = publish_workspace ? publish_signal_package_workspace!(
        service.workspace_publisher,
        package.signals,
        workspace_prefix,
    ) : Dict{String,Any}(
        "requested" => false,
        "success" => true,
        "changed" => false,
        "partial_create_risk" => false,
        "prefix" => SIGNAL_PACKAGE_DEFAULT_WORKSPACE_PREFIX,
        "collisions" => String[],
        "error" => "",
        "items" => Dict{String,Any}[],
    )
    response["workspace"] = workspace
    response
end
