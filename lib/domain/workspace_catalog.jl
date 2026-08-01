import Dates
import SHA
import UUIDs

const WORKSPACE_CATALOG_TTL = Dates.Minute(5)
const WORKSPACE_CATALOG_MAX_SNAPSHOTS = 8
const WORKSPACE_CATALOG_MAX_ENTRIES = 1000
const WORKSPACE_CATALOG_MAX_SELECTIONS = 1000
const WORKSPACE_CATALOG_MAX_OUTPUTS = 1000
const WORKSPACE_CATALOG_MAX_NAME_BYTES = 256
const WORKSPACE_CATALOG_MAX_TYPE_LENGTH = 200
const WORKSPACE_CATALOG_MAX_REASON_LENGTH = 500
const WORKSPACE_CATALOG_MAX_DIMENSIONS = 16
const WORKSPACE_CATALOG_JSON_SAFE_INTEGER = 9_007_199_254_740_991
const WORKSPACE_CATALOG_REVISION_REGEX =
    r"^wc_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
const WORKSPACE_VARIABLE_ID_REGEX = r"^wv_[0-9a-f]{64}$"
const WORKSPACE_VARIABLE_ID_DOMAIN = "SignalAnalyser\0WorkspaceVariableId\0v1\0"

@enum WorkspaceVariableSourceKind begin
    RAW_VECTOR_WORKSPACE_SOURCE
    RAW_MATRIX_WORKSPACE_SOURCE
    TIMED_VECTOR_WORKSPACE_SOURCE
    TIMED_MATRIX_WORKSPACE_SOURCE
    UNSUPPORTED_WORKSPACE_SOURCE
end

@enum WorkspaceVariableCompatibility begin
    REQUIRES_SAMPLE_RATE_WORKSPACE_COMPATIBILITY
    COMPATIBLE_WORKSPACE_COMPATIBILITY
    INCOMPATIBLE_WORKSPACE_COMPATIBILITY
end

@enum WorkspaceSampleRateRequirement begin
    REQUIRED_WORKSPACE_SAMPLE_RATE
    NOT_NEEDED_WORKSPACE_SAMPLE_RATE
    UNSUPPORTED_WORKSPACE_SAMPLE_RATE
end

const WORKSPACE_SOURCE_KIND_NAMES = Dict(
    RAW_VECTOR_WORKSPACE_SOURCE => "raw_vector",
    RAW_MATRIX_WORKSPACE_SOURCE => "raw_matrix",
    TIMED_VECTOR_WORKSPACE_SOURCE => "timed_vector",
    TIMED_MATRIX_WORKSPACE_SOURCE => "timed_matrix",
    UNSUPPORTED_WORKSPACE_SOURCE => "unsupported",
)
const WORKSPACE_SOURCE_KINDS_BY_NAME = Dict(
    value => key for (key, value) in WORKSPACE_SOURCE_KIND_NAMES
)
const WORKSPACE_COMPATIBILITY_NAMES = Dict(
    REQUIRES_SAMPLE_RATE_WORKSPACE_COMPATIBILITY => "requires_sample_rate",
    COMPATIBLE_WORKSPACE_COMPATIBILITY => "compatible",
    INCOMPATIBLE_WORKSPACE_COMPATIBILITY => "incompatible",
)
const WORKSPACE_SAMPLE_RATE_REQUIREMENT_NAMES = Dict(
    REQUIRED_WORKSPACE_SAMPLE_RATE => "required",
    NOT_NEEDED_WORKSPACE_SAMPLE_RATE => "not_needed",
    UNSUPPORTED_WORKSPACE_SAMPLE_RATE => "unsupported",
)

workspace_source_kind_name(kind::WorkspaceVariableSourceKind)::String =
    WORKSPACE_SOURCE_KIND_NAMES[kind]
workspace_compatibility_name(kind::WorkspaceVariableCompatibility)::String =
    WORKSPACE_COMPATIBILITY_NAMES[kind]
workspace_sample_rate_requirement_name(kind::WorkspaceSampleRateRequirement)::String =
    WORKSPACE_SAMPLE_RATE_REQUIREMENT_NAMES[kind]

struct WorkspaceUnavailableError <: Exception
    message::String
end

struct WorkspaceProviderError <: Exception
    message::String
end

struct StaleWorkspaceCatalogError <: Exception
    catalog_revision::String
end

struct WorkspaceChangedError <: Exception
    catalog_revision::String
    message::String
end

Base.showerror(io::IO, err::WorkspaceUnavailableError) = print(io, err.message)
Base.showerror(io::IO, err::WorkspaceProviderError) = print(io, err.message)
Base.showerror(io::IO, err::StaleWorkspaceCatalogError) = print(
    io,
    "Каталог рабочей области отсутствует, истёк или был вытеснен: ",
    err.catalog_revision,
)
Base.showerror(io::IO, err::WorkspaceChangedError) = print(io, err.message)

abstract type AbstractWorkspaceVariableProvider end

function workspace_variable_catalog(provider::AbstractWorkspaceVariableProvider)
    throw(MethodError(workspace_variable_catalog, (provider,)))
end

function workspace_variable_value(
    provider::AbstractWorkspaceVariableProvider,
    variable_name::String,
)
    throw(MethodError(workspace_variable_value, (provider, variable_name)))
end

struct WorkspaceVariableMetadata
    name::String
    type_label::String
    shape::Tuple{Vararg{Int}}
    sample_count::Int
    source_kind::WorkspaceVariableSourceKind
end

struct WorkspaceCatalogEnumeration
    variables::Tuple{Vararg{WorkspaceVariableMetadata}}
    truncated::Bool
    total::Int

    function WorkspaceCatalogEnumeration(
        variables::AbstractVector{WorkspaceVariableMetadata},
        truncated::Bool,
        total::Integer,
    )
        0 <= total <= WORKSPACE_CATALOG_JSON_SAFE_INTEGER || throw(ArgumentError(
            "Некорректное total enumeration рабочей области",
        ))
        total >= length(variables) || throw(ArgumentError(
            "Total enumeration меньше числа переменных",
        ))
        truncated == (total > length(variables)) || throw(ArgumentError(
            "Флаг truncated enumeration не согласован с total",
        ))
        length(variables) <= WORKSPACE_CATALOG_MAX_ENTRIES || throw(ArgumentError(
            "Enumeration превышает допустимое число переменных",
        ))
        names = [metadata.name for metadata in variables]
        allunique(names) || throw(ArgumentError("Имена enumeration должны быть уникальными"))
        new(Tuple(variables), truncated, Int(total))
    end
end

struct WorkspaceCatalogEntry
    variable_id::String
    name::String
    type_label::String
    shape::Tuple{Vararg{Int}}
    sample_count::Int
    source_kind::WorkspaceVariableSourceKind
    compatibility::WorkspaceVariableCompatibility
    reason::Union{Nothing,String}
    sample_rate_requirement::WorkspaceSampleRateRequirement
    selectable::Bool
end

workspace_catalog_metadata(entry::WorkspaceCatalogEntry) = WorkspaceVariableMetadata(
    entry.name,
    entry.type_label,
    entry.shape,
    entry.sample_count,
    entry.source_kind,
)

function workspace_catalog_metadata_equal(
    left::WorkspaceVariableMetadata,
    right::WorkspaceVariableMetadata,
)::Bool
    left.name == right.name &&
        left.type_label == right.type_label &&
        left.shape == right.shape &&
        left.source_kind == right.source_kind
end

struct WorkspaceCatalogSnapshot
    catalog_revision::String
    created_at::Dates.DateTime
    expires_at::Dates.DateTime
    truncated::Bool
    total::Int
    variables::Tuple{Vararg{WorkspaceCatalogEntry}}
    variable_index::Tuple{Vararg{Pair{String,Int}}}

    function WorkspaceCatalogSnapshot(
        catalog_revision::AbstractString,
        created_at::Dates.DateTime,
        expires_at::Dates.DateTime,
        truncated::Bool,
        total::Integer,
        variables::AbstractVector{WorkspaceCatalogEntry},
    )
        revision = String(catalog_revision)
        occursin(WORKSPACE_CATALOG_REVISION_REGEX, revision) || throw(ArgumentError(
            "Некорректная revision каталога рабочей области",
        ))
        expires_at == created_at + WORKSPACE_CATALOG_TTL || throw(ArgumentError(
            "Срок каталога должен быть равен пяти минутам",
        ))
        0 <= total <= WORKSPACE_CATALOG_JSON_SAFE_INTEGER || throw(ArgumentError(
            "Некорректное total каталога рабочей области",
        ))
        total >= length(variables) || throw(ArgumentError(
            "Total каталога меньше числа опубликованных переменных",
        ))
        truncated == (total > length(variables)) || throw(ArgumentError(
            "Флаг truncated не согласован с total каталога",
        ))
        length(variables) <= WORKSPACE_CATALOG_MAX_ENTRIES || throw(ArgumentError(
            "Каталог превышает допустимое число переменных",
        ))
        ids = [entry.variable_id for entry in variables]
        names = [entry.name for entry in variables]
        allunique(ids) || throw(ArgumentError("Variable ID каталога должны быть уникальными"))
        allunique(names) || throw(ArgumentError("Имена каталога должны быть уникальными"))
        index = Pair{String,Int}[entry.variable_id => position for (position, entry) in enumerate(variables)]
        new(
            revision,
            created_at,
            expires_at,
            truncated,
            Int(total),
            Tuple(variables),
            Tuple(index),
        )
    end
end

struct WorkspaceCatalogRegistry
    snapshots::Tuple{Vararg{WorkspaceCatalogSnapshot}}

    function WorkspaceCatalogRegistry(snapshots::AbstractVector{WorkspaceCatalogSnapshot})
        length(snapshots) <= WORKSPACE_CATALOG_MAX_SNAPSHOTS || throw(ArgumentError(
            "Registry каталога превышает допустимую ёмкость",
        ))
        revisions = [snapshot.catalog_revision for snapshot in snapshots]
        allunique(revisions) || throw(ArgumentError("Revision registry должны быть уникальными"))
        new(Tuple(snapshots))
    end
end

WorkspaceCatalogRegistry() = WorkspaceCatalogRegistry(WorkspaceCatalogSnapshot[])

function workspace_catalog_registry_prune(
    registry::WorkspaceCatalogRegistry,
    now::Dates.DateTime,
)::WorkspaceCatalogRegistry
    WorkspaceCatalogRegistry(WorkspaceCatalogSnapshot[
        snapshot for snapshot in registry.snapshots if now < snapshot.expires_at
    ])
end

function workspace_catalog_registry_store(
    registry::WorkspaceCatalogRegistry,
    snapshot::WorkspaceCatalogSnapshot,
    now::Dates.DateTime,
)::WorkspaceCatalogRegistry
    current = workspace_catalog_registry_prune(registry, now)
    retained = WorkspaceCatalogSnapshot[
        item for item in current.snapshots
        if item.catalog_revision != snapshot.catalog_revision
    ]
    push!(retained, snapshot)
    length(retained) > WORKSPACE_CATALOG_MAX_SNAPSHOTS &&
        (retained = retained[(end - WORKSPACE_CATALOG_MAX_SNAPSHOTS + 1):end])
    WorkspaceCatalogRegistry(retained)
end

function workspace_catalog_registry_lookup(
    registry::WorkspaceCatalogRegistry,
    catalog_revision::AbstractString,
    now::Dates.DateTime,
)::Tuple{WorkspaceCatalogRegistry,Union{Nothing,WorkspaceCatalogSnapshot}}
    current = workspace_catalog_registry_prune(registry, now)
    revision = String(catalog_revision)
    index = findfirst(snapshot -> snapshot.catalog_revision == revision, current.snapshots)
    (current, index === nothing ? nothing : current.snapshots[index])
end

function workspace_catalog_entry(
    snapshot::WorkspaceCatalogSnapshot,
    variable_id::AbstractString,
)::Union{Nothing,WorkspaceCatalogEntry}
    id = String(variable_id)
    index = findfirst(pair -> first(pair) == id, snapshot.variable_index)
    index === nothing ? nothing : snapshot.variables[last(snapshot.variable_index[index])]
end

function workspace_catalog_revision()::String
    "wc_" * lowercase(string(UUIDs.uuid4()))
end

function workspace_variable_id(
    catalog_revision::AbstractString,
    name::AbstractString,
)::String
    revision = String(catalog_revision)
    occursin(WORKSPACE_CATALOG_REVISION_REGEX, revision) || throw(ArgumentError(
        "Некорректная revision каталога рабочей области",
    ))
    input = WORKSPACE_VARIABLE_ID_DOMAIN * revision * "\0" * String(name)
    "wv_" * bytes2hex(SHA.sha256(codeunits(input)))
end

workspace_catalog_timestamp(value::Dates.DateTime)::String =
    Dates.format(value, Dates.dateformat"yyyy-mm-ddTHH:MM:SS.sssZ")

struct WorkspaceImportSelection
    variable_id::String
    sample_rate_hz::Union{Nothing,Float64}

    function WorkspaceImportSelection(
        variable_id::AbstractString,
        sample_rate_hz::Union{Nothing,Real},
    )
        id = String(variable_id)
        occursin(WORKSPACE_VARIABLE_ID_REGEX, id) || throw(ArgumentError(
            "Некорректный variable_id",
        ))
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
        new(id, rate)
    end
end
