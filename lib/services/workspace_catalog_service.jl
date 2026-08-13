mutable struct WorkspaceCatalogService{P<:AbstractWorkspaceVariableProvider}
    provider::P
    registry::WorkspaceCatalogRegistry
    lock::ReentrantLock
end

WorkspaceCatalogService(provider::P) where {P<:AbstractWorkspaceVariableProvider} =
    WorkspaceCatalogService(provider, WorkspaceCatalogRegistry(), ReentrantLock())

function workspace_catalog_payload_keys(value)::Set{String}
    if value isa NamedTuple
        return Set(String(key) for key in keys(value))
    elseif value isa AbstractDict
        return Set(string(key) for key in keys(value))
    end
    Set{String}()
end

function workspace_catalog_payload_value(value, key::String)
    if value isa NamedTuple
        symbol = Symbol(key)
        return symbol in keys(value) ? getproperty(value, symbol) : nothing
    elseif value isa AbstractDict
        haskey(value, key) && return value[key]
        symbol = Symbol(key)
        haskey(value, symbol) && return value[symbol]
    end
    nothing
end

function workspace_catalog_expect_exact_keys!(
    value,
    expected::Set{String},
    label::AbstractString,
)
    actual = workspace_catalog_payload_keys(value)
    source_key_count = value isa NamedTuple || value isa AbstractDict ? length(keys(value)) : 0
    actual == expected && source_key_count == length(expected) || throw(WorkspaceProviderError(
        "$(label) имеет некорректный набор metadata полей",
    ))
    nothing
end

function workspace_catalog_shape(value)::NamedTuple{(:shape, :bounded),Tuple{Tuple{Vararg{Int}},Bool}}
    (value isa AbstractVector || value isa Tuple) || return (shape = (), bounded = false)
    length(value) <= WORKSPACE_CATALOG_MAX_DIMENSIONS || return (shape = (), bounded = false)
    dimensions = Int[]
    for dimension in value
        if !(dimension isa Integer) || dimension isa Bool ||
            dimension < 0 || dimension > WORKSPACE_CATALOG_JSON_SAFE_INTEGER
            return (shape = (), bounded = false)
        end
        push!(dimensions, Int(dimension))
    end
    (shape = Tuple(dimensions), bounded = true)
end

function workspace_catalog_structure(
    shape_result::NamedTuple{(:shape, :bounded),Tuple{Tuple{Vararg{Int}},Bool}},
    source_kind::WorkspaceVariableSourceKind,
)::NamedTuple{(:shape, :source_kind),Tuple{Tuple{Vararg{Int}},WorkspaceVariableSourceKind}}
    shape = shape_result.shape
    expected_rank = if source_kind in (
        RAW_VECTOR_WORKSPACE_SOURCE,
        TIMED_VECTOR_WORKSPACE_SOURCE,
    )
        1
    elseif source_kind in (
        RAW_MATRIX_WORKSPACE_SOURCE,
        TIMED_MATRIX_WORKSPACE_SOURCE,
    )
        2
    else
        0
    end
    structurally_supported = shape_result.bounded &&
        expected_rank > 0 &&
        length(shape) == expected_rank &&
        first(shape) >= 2 &&
        (expected_rank == 1 || 1 <= shape[2] <= WORKSPACE_CATALOG_MAX_OUTPUTS)
    structurally_supported ?
        (shape = shape, source_kind = source_kind) :
        (shape = (), source_kind = UNSUPPORTED_WORKSPACE_SOURCE)
end

function workspace_catalog_metadata(value)::WorkspaceVariableMetadata
    workspace_catalog_expect_exact_keys!(
        value,
        Set(["name", "type", "shape", "source_kind"]),
        "Строка каталога",
    )
    name_value = workspace_catalog_payload_value(value, "name")
    name_value isa AbstractString || throw(WorkspaceProviderError(
        "Имя переменной каталога должно быть строкой",
    ))
    name = String(name_value)
    1 <= ncodeunits(name) <= WORKSPACE_CATALOG_MAX_NAME_BYTES || throw(WorkspaceProviderError(
        "Имя переменной каталога выходит за допустимую длину",
    ))

    type_value = workspace_catalog_payload_value(value, "type")
    type_value isa AbstractString || throw(WorkspaceProviderError(
        "Тип переменной каталога должен быть строкой",
    ))
    type_label = String(type_value)
    length(type_label) <= WORKSPACE_CATALOG_MAX_TYPE_LENGTH || throw(WorkspaceProviderError(
        "Тип переменной каталога выходит за допустимую длину",
    ))

    source_value = workspace_catalog_payload_value(value, "source_kind")
    source_value isa AbstractString || throw(WorkspaceProviderError(
        "Source kind переменной каталога должен быть строкой",
    ))
    source_name = String(source_value)
    haskey(WORKSPACE_SOURCE_KINDS_BY_NAME, source_name) || throw(WorkspaceProviderError(
        "Source kind переменной каталога не поддерживается",
    ))
    shape_result = workspace_catalog_shape(workspace_catalog_payload_value(value, "shape"))
    structure = workspace_catalog_structure(
        shape_result,
        WORKSPACE_SOURCE_KINDS_BY_NAME[source_name],
    )
    shape = structure.shape
    sample_count = isempty(shape) ? 0 : first(shape)
    WorkspaceVariableMetadata(
        name,
        type_label,
        shape,
        sample_count,
        structure.source_kind,
    )
end

function workspace_catalog_enumeration(
    service::WorkspaceCatalogService,
)::WorkspaceCatalogEnumeration
    raw = try
        workspace_variable_catalog(service.provider)
    catch err
        (err isa WorkspaceUnavailableError || err isa WorkspaceProviderError) && rethrow()
        throw(WorkspaceProviderError(
            "Provider каталога завершился с ошибкой: $(sprint(showerror, err))",
        ))
    end
    raw_keys = workspace_catalog_payload_keys(raw)
    raw_keys in (
        Set(["entries", "truncated", "total"]),
        Set(["entries", "truncated", "filtered", "total"]),
    ) || throw(WorkspaceProviderError(
        "Результат provider каталога имеет некорректный набор metadata полей",
    ))
    entries_value = workspace_catalog_payload_value(raw, "entries")
    entries_value isa AbstractVector || throw(WorkspaceProviderError(
        "Provider каталога должен вернуть массив entries",
    ))
    length(entries_value) <= WORKSPACE_CATALOG_MAX_ENTRIES || throw(WorkspaceProviderError(
        "Provider каталога вернул слишком много entries",
    ))
    truncated_value = workspace_catalog_payload_value(raw, "truncated")
    truncated_value isa Bool || throw(WorkspaceProviderError(
        "Provider каталога должен вернуть boolean truncated",
    ))
    total_value = workspace_catalog_payload_value(raw, "total")
    if !(total_value isa Integer) || total_value isa Bool ||
        total_value < 0 || total_value > WORKSPACE_CATALOG_JSON_SAFE_INTEGER
        throw(WorkspaceProviderError("Provider каталога вернул некорректный total"))
    end
    total = Int(total_value)
    filtered_value = workspace_catalog_payload_value(raw, "filtered")
    filtered = if filtered_value === nothing && !("filtered" in raw_keys)
        0
    elseif filtered_value isa Integer && !(filtered_value isa Bool) &&
        0 <= filtered_value <= total
        Int(filtered_value)
    else
        throw(WorkspaceProviderError("Provider каталога вернул некорректный filtered"))
    end
    expected_truncated = total > length(entries_value) + filtered
    truncated_value == expected_truncated || throw(WorkspaceProviderError(
        "Provider каталога вернул несогласованный truncated",
    ))
    if truncated_value
        length(entries_value) == WORKSPACE_CATALOG_MAX_ENTRIES || throw(WorkspaceProviderError(
            "Truncated catalog должен содержать ровно 1000 entries",
        ))
    else
        total == length(entries_value) + filtered || throw(WorkspaceProviderError(
            "Total каталога не совпадает с числом entries и filtered",
        ))
    end

    metadata = WorkspaceVariableMetadata[workspace_catalog_metadata(item) for item in entries_value]
    sort!(metadata; by = item -> item.name)
    names = [item.name for item in metadata]
    allunique(names) || throw(WorkspaceProviderError(
        "Provider каталога вернул duplicate имена",
    ))
    try
        WorkspaceCatalogEnumeration(metadata, truncated_value, filtered, total)
    catch err
        err isa ArgumentError || rethrow()
        throw(WorkspaceProviderError(sprint(showerror, err)))
    end
end

function workspace_catalog_entry_status(
    metadata::WorkspaceVariableMetadata,
)::NamedTuple
    rank = length(metadata.shape)
    expected_rank = if metadata.source_kind in (
        RAW_VECTOR_WORKSPACE_SOURCE,
        TIMED_VECTOR_WORKSPACE_SOURCE,
    )
        1
    elseif metadata.source_kind in (
        RAW_MATRIX_WORKSPACE_SOURCE,
        TIMED_MATRIX_WORKSPACE_SOURCE,
    )
        2
    else
        0
    end
    reason = if metadata.source_kind == UNSUPPORTED_WORKSPACE_SOURCE
        "Тип или структура переменной не поддерживается"
    elseif rank != expected_rank
        "Metadata shape не соответствует типу переменной"
    elseif metadata.sample_count < 2
        "Переменная должна содержать не менее двух отсчётов"
    elseif expected_rank == 2 && !(1 <= metadata.shape[2] <= WORKSPACE_CATALOG_MAX_OUTPUTS)
        "Матрица должна содержать от 1 до 1000 столбцов"
    else
        nothing
    end
    if reason !== nothing
        return (
            compatibility = INCOMPATIBLE_WORKSPACE_COMPATIBILITY,
            reason = first(String(reason), min(length(reason), WORKSPACE_CATALOG_MAX_REASON_LENGTH)),
            sample_rate_requirement = UNSUPPORTED_WORKSPACE_SAMPLE_RATE,
            selectable = false,
        )
    elseif metadata.source_kind in (RAW_VECTOR_WORKSPACE_SOURCE, RAW_MATRIX_WORKSPACE_SOURCE)
        return (
            compatibility = REQUIRES_SAMPLE_RATE_WORKSPACE_COMPATIBILITY,
            reason = nothing,
            sample_rate_requirement = REQUIRED_WORKSPACE_SAMPLE_RATE,
            selectable = true,
        )
    end
    (
        compatibility = COMPATIBLE_WORKSPACE_COMPATIBILITY,
        reason = nothing,
        sample_rate_requirement = NOT_NEEDED_WORKSPACE_SAMPLE_RATE,
        selectable = true,
    )
end

function workspace_catalog_snapshot(
    enumeration::WorkspaceCatalogEnumeration;
    now::Dates.DateTime = Dates.now(Dates.UTC),
    catalog_revision::AbstractString = workspace_catalog_revision(),
)::WorkspaceCatalogSnapshot
    revision = String(catalog_revision)
    entries = WorkspaceCatalogEntry[]
    ids = Set{String}()
    filtered = enumeration.filtered
    for metadata in enumeration.variables
        id = workspace_variable_id(revision, metadata.name)
        id in ids && throw(WorkspaceProviderError("Provider каталога создал collision variable_id"))
        push!(ids, id)
        status = workspace_catalog_entry_status(metadata)
        entry = WorkspaceCatalogEntry(
            id,
            metadata.name,
            metadata.type_label,
            metadata.shape,
            metadata.sample_count,
            metadata.source_kind,
            status.compatibility,
            status.reason,
            status.sample_rate_requirement,
            status.selectable,
        )
        if entry.selectable
            push!(entries, entry)
        else
            filtered += 1
        end
    end
    try
        WorkspaceCatalogSnapshot(
            revision,
            now,
            now + WORKSPACE_CATALOG_TTL,
            enumeration.truncated,
            filtered,
            enumeration.total,
            entries,
        )
    catch err
        err isa ArgumentError || rethrow()
        throw(WorkspaceProviderError(sprint(showerror, err)))
    end
end

function latest_workspace_catalog!(
    service::WorkspaceCatalogService;
    now::Dates.DateTime = Dates.now(Dates.UTC),
    refresh::Bool = false,
    catalog_revision::AbstractString = workspace_catalog_revision(),
)::WorkspaceCatalogSnapshot
    lock(service.lock) do
        service.registry = workspace_catalog_registry_prune(service.registry, now)
        if !refresh && !isempty(service.registry.snapshots)
            return last(service.registry.snapshots)
        end
        enumeration = workspace_catalog_enumeration(service)
        snapshot = workspace_catalog_snapshot(
            enumeration;
            now = now,
            catalog_revision = catalog_revision,
        )
        service.registry = workspace_catalog_registry_store(service.registry, snapshot, now)
        snapshot
    end
end

function load_workspace_catalog!(
    service::WorkspaceCatalogService;
    now::Dates.DateTime = Dates.now(Dates.UTC),
    catalog_revision::AbstractString = workspace_catalog_revision(),
)::WorkspaceCatalogSnapshot
    latest_workspace_catalog!(
        service;
        now = now,
        refresh = true,
        catalog_revision = catalog_revision,
    )
end

function fresh_workspace_catalog_enumeration(
    service::WorkspaceCatalogService,
)::WorkspaceCatalogEnumeration
    lock(service.lock) do
        workspace_catalog_enumeration(service)
    end
end

function lookup_workspace_catalog!(
    service::WorkspaceCatalogService,
    catalog_revision::AbstractString;
    now::Dates.DateTime = Dates.now(Dates.UTC),
)::WorkspaceCatalogSnapshot
    lock(service.lock) do
        current, snapshot = workspace_catalog_registry_lookup(
            service.registry,
            catalog_revision,
            now,
        )
        service.registry = current
        snapshot === nothing && throw(StaleWorkspaceCatalogError(String(catalog_revision)))
        snapshot
    end
end

function workspace_catalog_variable_payload(entry::WorkspaceCatalogEntry)::Dict{String,Any}
    Dict{String,Any}(
        "variable_id" => entry.variable_id,
        "name" => entry.name,
        "type" => entry.type_label,
        "shape" => collect(entry.shape),
        "sample_count" => entry.sample_count,
        "source_kind" => workspace_source_kind_name(entry.source_kind),
        "compatibility" => workspace_compatibility_name(entry.compatibility),
        "reason" => entry.reason,
        "sample_rate_requirement" => workspace_sample_rate_requirement_name(
            entry.sample_rate_requirement,
        ),
        "selectable" => entry.selectable,
    )
end

function workspace_catalog_payload(snapshot::WorkspaceCatalogSnapshot)::Dict{String,Any}
    Dict{String,Any}(
        "catalog_revision" => snapshot.catalog_revision,
        "expires_at" => workspace_catalog_timestamp(snapshot.expires_at),
        "truncated" => snapshot.truncated,
        "filtered" => snapshot.filtered,
        "total" => snapshot.total,
        "variables" => [workspace_catalog_variable_payload(entry) for entry in snapshot.variables],
    )
end
