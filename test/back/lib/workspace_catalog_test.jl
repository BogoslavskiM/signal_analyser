using Test

const WC = Main.AppTestContext

mutable struct FakeWorkspaceCatalogProvider <: WC.AbstractWorkspaceVariableProvider
    catalog::Any
    failure::Union{Nothing,Exception}
    values::Dict{String,Any}
end

"""Provider double whose catalog can change between the snapshot and recv gates."""
mutable struct ScriptedWorkspaceCatalogProvider <: WC.AbstractWorkspaceVariableProvider
    catalogs::Vector{Any}
    values::Dict{String,Any}
    catalog_calls::Int
    value_calls::Vector{String}
    failure::Union{Nothing,Exception}
end

struct CatalogRank17Array <: AbstractArray{Float64,17} end
Base.size(::CatalogRank17Array) = ntuple(_ -> 1, 17)
Base.getindex(::CatalogRank17Array, indexes...) = 0.0

struct CatalogUnsafeDimensionArray <: AbstractArray{Float64,1} end
Base.size(::CatalogUnsafeDimensionArray) = (9_007_199_254_740_992,)
Base.getindex(::CatalogUnsafeDimensionArray, index::Int) = 0.0

function WC.workspace_variable_catalog(provider::ScriptedWorkspaceCatalogProvider)
    provider.failure === nothing || throw(provider.failure)
    provider.catalog_calls += 1
    provider.catalogs[min(provider.catalog_calls, length(provider.catalogs))]
end

function WC.workspace_variable_value(provider::ScriptedWorkspaceCatalogProvider, name::String)
    provider.failure === nothing || throw(provider.failure)
    push!(provider.value_calls, name)
    get(provider.values, name) do
        throw(WC.WorkspaceProviderError("unknown workspace value"))
    end
end

function WC.workspace_variable_catalog(provider::FakeWorkspaceCatalogProvider)
    provider.failure === nothing || throw(provider.failure)
    provider.catalog
end

function WC.workspace_variable_value(provider::FakeWorkspaceCatalogProvider, name::String)
    provider.failure === nothing || throw(provider.failure)
    get(provider.values, name) do
        throw(WC.WorkspaceProviderError("unknown workspace value"))
    end
end

function workspace_catalog_entry_for_test(revision, name; kind = WC.RAW_VECTOR_WORKSPACE_SOURCE)
    id = WC.workspace_variable_id(revision, name)
    WC.WorkspaceCatalogEntry(
        id,
        name,
        "Vector{Float64}",
        (3,),
        3,
        kind,
        WC.REQUIRES_SAMPLE_RATE_WORKSPACE_COMPATIBILITY,
        nothing,
        WC.REQUIRED_WORKSPACE_SAMPLE_RATE,
        true,
    )
end

function workspace_catalog_snapshot_for_test(revision, name, created_at)
    WC.WorkspaceCatalogSnapshot(
        revision,
        created_at,
        created_at + WC.WORKSPACE_CATALOG_TTL,
        false,
        1,
        [workspace_catalog_entry_for_test(revision, name)],
    )
end

workspace_cache_families(state) = (
    deepcopy(state.plot_cache),
    deepcopy(state.spectrum_cache),
    deepcopy(state.spectrogram_cache),
    deepcopy(state.persistence_cache),
)

function inactive_display_payload(state)
    snapshot = WC.signal_analyser_snapshot(state)
    only(filter(display -> display["id"] != snapshot["active_display_id"], snapshot["displays"]))
end

@testset "DEC-039 workspace catalog identity, enums and bounded registry" begin
    @test WC.workspace_variable_id("wc_00000000-0000-4000-8000-000000000000", "x") ==
        "wv_166dc21f1b7379cc746253cfd2558ec9ed148a243e1c9bbb34e66c5e501f1bef"
    @test WC.workspace_variable_id("wc_123e4567-e89b-42d3-a456-426614174000", "sig") ==
        "wv_f87f6440468ba126add2585d29fd183fdde2fef0f0bb677dceb973256167ed79"
    @test WC.workspace_variable_id("wc_00000000-0000-4000-8000-000000000000", "x") !=
        WC.workspace_variable_id("wc_123e4567-e89b-42d3-a456-426614174000", "x")
    @test WC.workspace_source_kind_name(WC.RAW_VECTOR_WORKSPACE_SOURCE) == "raw_vector"
    @test WC.workspace_source_kind_name(WC.TIMED_MATRIX_WORKSPACE_SOURCE) == "timed_matrix"
    @test WC.workspace_compatibility_name(WC.REQUIRES_SAMPLE_RATE_WORKSPACE_COMPATIBILITY) == "requires_sample_rate"
    @test WC.workspace_compatibility_name(WC.INCOMPATIBLE_WORKSPACE_COMPATIBILITY) == "incompatible"
    @test WC.workspace_sample_rate_requirement_name(WC.REQUIRED_WORKSPACE_SAMPLE_RATE) == "required"
    @test WC.workspace_sample_rate_requirement_name(WC.NOT_NEEDED_WORKSPACE_SAMPLE_RATE) == "not_needed"

    created = WC.Dates.DateTime(2026, 8, 1, 0, 0, 0)
    first_revision = "wc_00000000-0000-4000-8000-000000000000"
    initial_snapshot = workspace_catalog_snapshot_for_test(first_revision, "x", created)
    @test initial_snapshot.expires_at == created + WC.Dates.Minute(5)
    @test WC.workspace_catalog_entry(initial_snapshot, initial_snapshot.variables[1].variable_id).name == "x"
    @test WC.workspace_catalog_entry(initial_snapshot, "wv_" * repeat("0", 64)) === nothing

    registry = WC.WorkspaceCatalogRegistry()
    registry = WC.workspace_catalog_registry_store(registry, initial_snapshot, created)
    pruned, found = WC.workspace_catalog_registry_lookup(registry, first_revision, created + WC.Dates.Minute(4))
    @test length(pruned.snapshots) == 1 && found === initial_snapshot
    expired, absent = WC.workspace_catalog_registry_lookup(registry, first_revision, created + WC.Dates.Minute(5))
    @test isempty(expired.snapshots) && absent === nothing

    registry = WC.WorkspaceCatalogRegistry()
    revisions = String[]
    for index in 1:9
        revision = WC.workspace_catalog_revision()
        push!(revisions, revision)
        registry = WC.workspace_catalog_registry_store(
            registry,
            workspace_catalog_snapshot_for_test(revision, "signal$(index)", created),
            created,
        )
    end
    @test length(registry.snapshots) == WC.WORKSPACE_CATALOG_MAX_SNAPSHOTS
    @test all(snapshot -> snapshot.catalog_revision != first(revisions), registry.snapshots)
    @test last(registry.snapshots).catalog_revision == last(revisions)
end

@testset "DEC-039 workspace batch command rejects malformed selections" begin
    revision = "wc_00000000-0000-4000-8000-000000000000"
    id = WC.workspace_variable_id(revision, "x")
    selection = WC.WorkspaceImportSelection(id, 48_000.0)
    command = WC.ImportWorkspaceBatchCommand(7, revision, [selection])
    @test command.revision == 7 && command.catalog_revision == revision && length(command.selections) == 1
    @test_throws ArgumentError WC.WorkspaceImportSelection("x", 1.0)
    @test_throws ArgumentError WC.WorkspaceImportSelection(id, 0.0)
    @test_throws ArgumentError WC.ImportWorkspaceBatchCommand(7, revision, [selection, selection])
    @test_throws ArgumentError WC.ImportWorkspaceBatchCommand(7, revision, WC.WorkspaceImportSelection[])
end

@testset "DEC-039 catalog service normalizes metadata without values" begin
    provider = FakeWorkspaceCatalogProvider((
        entries = [
            (name = "z raw", type = "Vector{Float64}", shape = [3], source_kind = "raw_vector"),
            (name = "a timed", type = "NamedTuple", shape = [3], source_kind = "timed_vector"),
            (name = "rank bad", type = "Array", shape = [3, 2, 1], source_kind = "raw_matrix"),
        ],
        truncated = false,
        total = 3,
    ), nothing, Dict{String,Any}())
    service = WC.WorkspaceCatalogService(provider)
    now = WC.Dates.DateTime(2026, 8, 1, 0, 0, 0)
    revision = "wc_00000000-0000-4000-8000-000000000000"
    catalog = WC.load_workspace_catalog!(service; now = now, catalog_revision = revision)
    payload = WC.workspace_catalog_payload(catalog)
    @test Set(keys(payload)) == Set(["catalog_revision", "expires_at", "truncated", "total", "variables"])
    @test payload["catalog_revision"] == revision && payload["expires_at"] == "2026-08-01T00:05:00.000Z"
    @test [entry["name"] for entry in payload["variables"]] == ["a timed", "rank bad", "z raw"]
    @test all(entry -> Set(keys(entry)) == Set(["variable_id", "name", "type", "shape", "sample_count", "source_kind", "compatibility", "reason", "sample_rate_requirement", "selectable"]), payload["variables"])
    timed, malformed, raw = payload["variables"]
    @test timed["compatibility"] == "compatible" && timed["sample_rate_requirement"] == "not_needed" && timed["reason"] === nothing && timed["selectable"]
    @test raw["compatibility"] == "requires_sample_rate" && raw["sample_rate_requirement"] == "required" && raw["selectable"]
    @test malformed["compatibility"] == "incompatible" && malformed["sample_rate_requirement"] == "unsupported" && !malformed["selectable"] && malformed["reason"] isa String
    @test all(entry -> !haskey(entry, "value") && !haskey(entry, "values") && !haskey(entry, "preview"), payload["variables"])
    @test WC.lookup_workspace_catalog!(service, revision; now = now + WC.Dates.Minute(4)) === catalog
    @test_throws WC.StaleWorkspaceCatalogError WC.lookup_workspace_catalog!(service, revision; now = now + WC.Dates.Minute(5))

    provider.catalog = (entries = [(name = "dup", type = "V", shape = [2], source_kind = "raw_vector"), (name = "dup", type = "V", shape = [2], source_kind = "raw_vector")], truncated = false, total = 2)
    @test_throws WC.WorkspaceProviderError WC.load_workspace_catalog!(service; now = now, catalog_revision = "wc_123e4567-e89b-42d3-a456-426614174000")
    provider.failure = WC.WorkspaceUnavailableError("capability absent")
    @test_throws WC.WorkspaceUnavailableError WC.load_workspace_catalog!(service; now = now, catalog_revision = "wc_123e4567-e89b-42d3-a456-426614174000")
end

@testset "DEC-039 catalog metadata parser rejects structural limits" begin
    valid = (name = "x", type = "Vector{Float64}", shape = [2], source_kind = "raw_vector")
    cases = Any[
        (name = "", type = "V", shape = [2], source_kind = "raw_vector"),
        (name = repeat("x", 257), type = "V", shape = [2], source_kind = "raw_vector"),
        (name = "x", type = repeat("T", 201), shape = [2], source_kind = "raw_vector"),
        (name = "x", type = "V", shape = [2], source_kind = "other"),
        (name = "x", type = "V", shape = [2], source_kind = "raw_vector", extra = true),
    ]
    for item in cases
        provider = FakeWorkspaceCatalogProvider((entries = [item], truncated = false, total = 1), nothing, Dict{String,Any}())
        @test_throws WC.WorkspaceProviderError WC.workspace_catalog_enumeration(WC.WorkspaceCatalogService(provider))
    end
    for shape in (fill(1, 17), [2, -1])
        provider = FakeWorkspaceCatalogProvider((entries = [(name = "structural", type = "Array", shape = shape, source_kind = "raw_vector")], truncated = false, total = 1), nothing, Dict{String,Any}())
        snapshot = WC.load_workspace_catalog!(WC.WorkspaceCatalogService(provider); catalog_revision = "wc_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
        @test !only(snapshot.variables).selectable && only(snapshot.variables).compatibility == WC.INCOMPATIBLE_WORKSPACE_COMPATIBILITY
    end
    # Rank and output-count violations are safely represented, not permitted to
    # reach value import as selectable variables.
    provider = FakeWorkspaceCatalogProvider((entries = [
        (name = "rank", type = "V", shape = [2, 2], source_kind = "raw_vector"),
        (name = "wide", type = "M", shape = [2, 1001], source_kind = "raw_matrix"),
        (name = "short", type = "V", shape = [1], source_kind = "timed_vector"),
    ], truncated = false, total = 3), nothing, Dict{String,Any}())
    snapshot = WC.load_workspace_catalog!(WC.WorkspaceCatalogService(provider); catalog_revision = "wc_00000000-0000-4000-8000-000000000000")
    @test all(!entry.selectable && entry.compatibility == WC.INCOMPATIBLE_WORKSPACE_COMPATIBILITY for entry in snapshot.variables)

    # The service must fail closed even when a provider incorrectly labels an
    # invalid shape as one of the supported raw/timed source kinds.
    invalid_by_declared_source = [
        (name = "invalid raw vector", type = "V", shape = [2, 2], source_kind = "raw_vector"),
        (name = "invalid raw matrix", type = "M", shape = [2, 1001], source_kind = "raw_matrix"),
        (name = "invalid timed vector", type = "T", shape = [1], source_kind = "timed_vector"),
        (name = "invalid timed matrix", type = "TM", shape = [1, 2], source_kind = "timed_matrix"),
    ]
    provider = FakeWorkspaceCatalogProvider((entries = invalid_by_declared_source, truncated = false, total = 4), nothing, Dict{String,Any}())
    snapshot = WC.load_workspace_catalog!(WC.WorkspaceCatalogService(provider); catalog_revision = "wc_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")
    entries = Dict(entry.name => entry for entry in snapshot.variables)
    for item in invalid_by_declared_source
        entry = entries[item.name]
        @test entry.shape == ()
        @test entry.source_kind == WC.UNSUPPORTED_WORKSPACE_SOURCE
        @test entry.sample_rate_requirement == WC.UNSUPPORTED_WORKSPACE_SAMPLE_RATE
        @test !entry.selectable && entry.compatibility == WC.INCOMPATIBLE_WORKSPACE_COMPATIBILITY
        @test !isempty(entry.reason) && ncodeunits(entry.reason) <= WC.WORKSPACE_CATALOG_MAX_REASON_LENGTH
    end
    @test valid.name == "x" # protects the exact fixture shape from accidental drift
end

@testset "DEC-039 oversized structural metadata stays catalog-visible but incompatible" begin
    # Execute the immutable adapter program in a clean Main-like module: a
    # malformed sibling must not abort enumeration or leak oversized shape.
    workspace = Module(:WorkspaceCatalogBoundsProbe)
    Core.eval(workspace, :(using Base))
    Core.eval(workspace, :(good = [1.0, 2.0, 3.0]))
    Core.eval(workspace, :(rank17 = Main.CatalogRank17Array()))
    Core.eval(workspace, :(unsafe_dimension = Main.CatalogUnsafeDimensionArray()))
    Core.eval(workspace, :(export good, rank17, unsafe_dimension))
    raw = Core.eval(workspace, Meta.parse(WC.ENGEE_WORKSPACE_CATALOG_INTROSPECTION))
    entries_by_name = Dict(item.name => item for item in raw.entries)
    @test raw.total == 3 && !raw.truncated && Set(keys(entries_by_name)) == Set(["good", "rank17", "unsafe_dimension"])
    @test entries_by_name["good"].shape == [3] && entries_by_name["good"].source_kind == "raw_vector"
    @test all(entries_by_name[name].shape == Int[] && entries_by_name[name].source_kind == "unsupported" for name in ("rank17", "unsafe_dimension"))
    provider = FakeWorkspaceCatalogProvider(raw, nothing, Dict{String,Any}())
    snapshot = WC.load_workspace_catalog!(WC.WorkspaceCatalogService(provider); catalog_revision = "wc_123e4567-e89b-42d3-a456-426614174000")
    entries = Dict(entry.name => entry for entry in snapshot.variables)
    @test entries["good"].selectable && entries["good"].source_kind == WC.RAW_VECTOR_WORKSPACE_SOURCE
    for name in ("rank17", "unsafe_dimension")
        entry = entries[name]
        @test entry.shape == () && entry.source_kind == WC.UNSUPPORTED_WORKSPACE_SOURCE
        @test !entry.selectable && entry.compatibility == WC.INCOMPATIBLE_WORKSPACE_COMPATIBILITY
        @test entry.reason isa String && ncodeunits(entry.reason) <= WC.WORKSPACE_CATALOG_MAX_REASON_LENGTH
    end
end

@testset "DEC-039 literal catalog introspection excludes non-public and imported bindings" begin
    # The literal program must enumerate only workspace-owned public bindings.
    # These fixture names are intentionally unrelated to any observed runtime
    # rows: the oracle is the structural visibility/import relationship, not a
    # blacklist of names.
    workspace = Module(:WorkspaceCatalogBindingFilterProbe)
    Core.eval(workspace, :(using Base))
    Core.eval(workspace, :(owned_workspace_signal = [1.0, 2.0, 3.0]))
    Core.eval(workspace, :(internal_workspace_scratch = [4.0, 5.0, 6.0]))
    Core.eval(workspace, :(import Base: sqrt))
    Core.eval(workspace, :(export owned_workspace_signal))

    raw = Core.eval(workspace, Meta.parse(WC.ENGEE_WORKSPACE_CATALOG_INTROSPECTION))
    @test raw.total == 1 && !raw.truncated && length(raw.entries) == 1
    entry = only(raw.entries)
    @test entry.name == "owned_workspace_signal"
    @test entry.type == "Vector{Float64}" && entry.shape == [3] && entry.source_kind == "raw_vector"
end

@testset "DEC-039 batch import is catalog-ordered and atomic" begin
    raw = (name = "z vector", type = "Vector{Float64}", shape = [3], source_kind = "raw_vector")
    matrix = (name = "a matrix", type = "Matrix{Float64}", shape = [3, 2], source_kind = "raw_matrix")
    provider = FakeWorkspaceCatalogProvider(
        (entries = [raw, matrix], truncated = false, total = 2),
        nothing,
        Dict("z vector" => [1.0, 2.0, 3.0], "a matrix" => [1.0 10.0; 2.0 20.0; 3.0 30.0]),
    )
    catalog_service = WC.WorkspaceCatalogService(provider)
    inventory_service = WC.SignalInventoryService(WC.EngeeWorkspaceSignalSource(provider))
    service = WC.WorkspaceBatchImportService(catalog_service, inventory_service)
    state = WC.default_signal_analyser_state()
    before = WC.signal_analyser_snapshot(state)
    caches = workspace_cache_families(state)
    now = WC.Dates.DateTime(2026, 8, 1, 0, 0, 0)
    revision = "wc_00000000-0000-4000-8000-000000000000"
    catalog = WC.load_workspace_catalog!(catalog_service; now = now, catalog_revision = revision)
    ids = Dict(entry.name => entry.variable_id for entry in catalog.variables)
    command = WC.ImportWorkspaceBatchCommand(0, revision, [
        WC.WorkspaceImportSelection(ids["z vector"], 10.0),
        WC.WorkspaceImportSelection(ids["a matrix"], 10.0),
    ])
    imported = WC.apply_workspace_batch_import!(service, state, command; now = now)
    added = [signal["name"] for signal in imported["signals"] if signal["name"] in ["a matrix", "a matrix2", "z vector"]]
    @test imported["state_revision"] == 1 && added == ["a matrix", "a matrix2", "z vector"]
    @test imported["row_selected_signal"] == "a matrix" && all(name -> name in imported["visible_signals"], added)

    state = WC.default_signal_analyser_state()
    before = WC.signal_analyser_snapshot(state)
    provider.values["a matrix"] = [1.0; 2.0; 3.0]
    @test_throws WC.SignalAnalyserValidationError WC.apply_workspace_batch_import!(service, state, command; now = now)
    @test WC.signal_analyser_snapshot(state) == before
    @test workspace_cache_families(state) == caches
end

@testset "DEC-039 batch freshness, raw/timed rules and rollback" begin
    revision = "wc_00000000-0000-4000-8000-000000000000"
    raw = (name = "base", type = "Vector{Float64}", shape = [3], source_kind = "raw_vector")
    timed_value = (time = [0.0, 1.0, 2.0], value = [1.0, 2.0, 3.0])
    timed = (name = "clock", type = string(typeof(timed_value)), shape = [3], source_kind = "timed_vector")
    provider = ScriptedWorkspaceCatalogProvider(
        Any[(entries = [raw, timed], truncated = false, total = 2)],
        Dict("base" => [1.0, 2.0, 3.0], "clock" => timed_value),
        0, String[], nothing,
    )
    catalog_service = WC.WorkspaceCatalogService(provider)
    service = WC.WorkspaceBatchImportService(catalog_service, WC.SignalInventoryService(WC.EngeeWorkspaceSignalSource(provider)))
    state = WC.default_signal_analyser_state()
    catalog = WC.load_workspace_catalog!(catalog_service; catalog_revision = revision)
    ids = Dict(entry.name => entry.variable_id for entry in catalog.variables)
    imported = WC.apply_workspace_batch_import!(service, state, WC.ImportWorkspaceBatchCommand(0, revision, [
        WC.WorkspaceImportSelection(ids["clock"], nothing), WC.WorkspaceImportSelection(ids["base"], 20.0),
    ]))
    @test imported["state_revision"] == 1
    @test provider.value_calls == ["base", "clock"] # catalog order, never request order
    @test [x["name"] for x in imported["signals"] if x["name"] in ["base", "clock"]] == ["base", "clock"]

    # The state revision gate wins before catalog/provider reads.
    before = WC.signal_analyser_snapshot(state)
    before_caches = workspace_cache_families(state)
    calls = provider.catalog_calls
    @test_throws WC.SignalAnalyserStaleStateError WC.apply_workspace_batch_import!(service, state, WC.ImportWorkspaceBatchCommand(0, revision, [WC.WorkspaceImportSelection(ids["base"], 20.0)]))
    @test provider.catalog_calls == calls && WC.signal_analyser_snapshot(state) == before
    @test workspace_cache_families(state) == before_caches

    # A changed metadata snapshot wins before recv and cannot publish a partial mutation.
    changed = (name = "base", type = "Vector{Float64}", shape = [4], source_kind = "raw_vector")
    provider.catalogs = Any[(entries = [raw, timed], truncated = false, total = 2), (entries = [changed, timed], truncated = false, total = 2)]
    provider.catalog_calls = 0; empty!(provider.value_calls)
    fresh_catalog = WC.load_workspace_catalog!(catalog_service; catalog_revision = "wc_123e4567-e89b-42d3-a456-426614174000")
    changed_id = only(filter(e -> e.name == "base", fresh_catalog.variables)).variable_id
    before = WC.signal_analyser_snapshot(state)
    before_caches = workspace_cache_families(state)
    @test_throws WC.WorkspaceChangedError WC.apply_workspace_batch_import!(service, state, WC.ImportWorkspaceBatchCommand(1, fresh_catalog.catalog_revision, [WC.WorkspaceImportSelection(changed_id, 20.0)]))
    @test isempty(provider.value_calls) && WC.signal_analyser_snapshot(state) == before
    @test workspace_cache_families(state) == before_caches

    # Value/prepare errors retain signals, caches and revision exactly.
    provider.catalogs = Any[(entries = [raw, timed], truncated = false, total = 2)]
    provider.catalog_calls = 0; provider.values["base"] = [1.0, 2.0] # stale actual metadata
    rollback_catalog = WC.load_workspace_catalog!(catalog_service; catalog_revision = "wc_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
    rollback_id = only(filter(e -> e.name == "base", rollback_catalog.variables)).variable_id
    before = WC.signal_analyser_snapshot(state)
    before_caches = workspace_cache_families(state)
    @test_throws WC.SignalAnalyserValidationError WC.apply_workspace_batch_import!(service, state, WC.ImportWorkspaceBatchCommand(1, rollback_catalog.catalog_revision, [WC.WorkspaceImportSelection(rollback_id, 20.0)]))
    @test WC.signal_analyser_snapshot(state) == before
    @test workspace_cache_families(state) == before_caches
end

@testset "DEC-039 batch allocation caps, inactive Displays and complete rollback" begin
    matrix = (name = "base", type = "Matrix{Float64}", shape = [3, 2], source_kind = "raw_matrix")
    provider = ScriptedWorkspaceCatalogProvider(
        Any[(entries = [matrix], truncated = false, total = 1)],
        Dict("base" => [1.0 10.0; 2.0 20.0; 3.0 30.0]), 0, String[], nothing,
    )
    catalog_service = WC.WorkspaceCatalogService(provider)
    service = WC.WorkspaceBatchImportService(catalog_service, WC.SignalInventoryService(WC.EngeeWorkspaceSignalSource(provider)))
    state = WC.default_signal_analyser_state()
    # Configure Display 2 explicitly, then make it inactive before import.
    first_name, second_name = [signal.name for signal in state.signals]
    WC.apply_signal_analyser_display!(state, Dict("state_revision" => 0, "operation" => "create"))
    WC.apply_signal_analyser_view!(state, Dict("state_revision" => 1, "active_plot" => "spectrum", "selected_signal" => second_name, "visible_signals" => [second_name]))
    WC.apply_signal_analyser_display!(state, Dict("state_revision" => 2, "operation" => "select", "display_id" => "display-1"))
    inactive_before = inactive_display_payload(state)
    catalog = WC.load_workspace_catalog!(catalog_service; catalog_revision = "wc_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")
    id = only(catalog.variables).variable_id
    first_import = WC.apply_workspace_batch_import!(service, state, WC.ImportWorkspaceBatchCommand(3, catalog.catalog_revision, [WC.WorkspaceImportSelection(id, 20.0)]))
    @test first_import["state_revision"] == 4 && inactive_display_payload(state) == inactive_before
    @test [signal.name for signal in state.signals if startswith(signal.name, "base")] == ["base", "base2"]

    # Collision allocation sees both existing inventory names and the complete
    # prospective matrix expansion, so the next first column is base3.
    second_catalog = WC.load_workspace_catalog!(catalog_service; catalog_revision = "wc_cccccccc-cccc-4ccc-8ccc-cccccccccccc")
    second_id = only(second_catalog.variables).variable_id
    WC.apply_workspace_batch_import!(service, state, WC.ImportWorkspaceBatchCommand(4, second_catalog.catalog_revision, [WC.WorkspaceImportSelection(second_id, 20.0)]))
    @test [signal.name for signal in state.signals if startswith(signal.name, "base")][1:3] == ["base", "base2", "base3"]

    # Provider failure after fresh metadata, recv/value mismatch and preparation
    # failure each leave every cache family and inactive Display untouched.
    failure_catalog = WC.load_workspace_catalog!(catalog_service; catalog_revision = "wc_dddddddd-dddd-4ddd-8ddd-dddddddddddd")
    failure_id = only(failure_catalog.variables).variable_id
    for failure_value in (WC.WorkspaceProviderError("recv failed"), [1.0, NaN, 3.0])
        before = WC.signal_analyser_snapshot(state); before_caches = workspace_cache_families(state); display_before = inactive_display_payload(state)
        provider.failure = failure_value isa Exception ? failure_value : nothing
        provider.values["base"] = failure_value isa Exception ? provider.values["base"] : failure_value
        @test_throws (failure_value isa Exception ? WC.WorkspaceProviderError : WC.SignalAnalyserValidationError) WC.apply_workspace_batch_import!(service, state, WC.ImportWorkspaceBatchCommand(5, failure_catalog.catalog_revision, [WC.WorkspaceImportSelection(failure_id, 20.0)]))
        @test WC.signal_analyser_snapshot(state) == before && workspace_cache_families(state) == before_caches && inactive_display_payload(state) == display_before
        provider.failure = nothing
    end

    # 1001 prospective outputs are rejected before any recv call or mutation.
    wide = (name = "wide", type = "Matrix{Float64}", shape = [2, 1000], source_kind = "raw_matrix")
    extra = (name = "extra", type = "Vector{Float64}", shape = [2], source_kind = "raw_vector")
    cap_provider = ScriptedWorkspaceCatalogProvider(Any[(entries = [wide, extra], truncated = false, total = 2)], Dict{String,Any}(), 0, String[], nothing)
    cap_catalog_service = WC.WorkspaceCatalogService(cap_provider)
    cap_service = WC.WorkspaceBatchImportService(cap_catalog_service, WC.SignalInventoryService(WC.EngeeWorkspaceSignalSource(cap_provider)))
    cap_state = WC.default_signal_analyser_state()
    cap_catalog = WC.load_workspace_catalog!(cap_catalog_service; catalog_revision = "wc_eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee")
    before = WC.signal_analyser_snapshot(cap_state); before_caches = workspace_cache_families(cap_state)
    command = WC.ImportWorkspaceBatchCommand(0, cap_catalog.catalog_revision, [WC.WorkspaceImportSelection(entry.variable_id, 20.0) for entry in cap_catalog.variables])
    @test_throws WC.SignalAnalyserValidationError WC.apply_workspace_batch_import!(cap_service, cap_state, command)
    @test isempty(cap_provider.value_calls) && WC.signal_analyser_snapshot(cap_state) == before && workspace_cache_families(cap_state) == before_caches
end
