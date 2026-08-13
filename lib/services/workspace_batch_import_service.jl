struct WorkspaceBatchImportService{
    C<:WorkspaceCatalogService,
    I<:SignalInventoryService,
}
    catalog_service::C
    inventory_service::I
end

function workspace_batch_validation_error(message::AbstractString)
    signal_inventory_validation_error("selections", message)
end

function workspace_batch_resolve_selections(
    snapshot::WorkspaceCatalogSnapshot,
    command::ImportWorkspaceBatchCommand,
)::Vector{Tuple{WorkspaceCatalogEntry,WorkspaceImportSelection}}
    requested = Dict(selection.variable_id => selection for selection in command.selections)
    resolved = Tuple{WorkspaceCatalogEntry,WorkspaceImportSelection}[]
    for entry in snapshot.variables
        haskey(requested, entry.variable_id) || continue
        entry.selectable || throw(workspace_batch_validation_error(
            "Переменная $(entry.name) недоступна для импорта",
        ))
        push!(resolved, (entry, requested[entry.variable_id]))
    end
    length(resolved) == length(command.selections) || throw(workspace_batch_validation_error(
        "Selections содержит неизвестный variable_id",
    ))
    resolved
end

function workspace_batch_fresh_metadata(
    service::WorkspaceBatchImportService,
    resolved::Vector{Tuple{WorkspaceCatalogEntry,WorkspaceImportSelection}},
    catalog_revision::String,
)::Vector{Tuple{WorkspaceVariableMetadata,WorkspaceImportSelection}}
    fresh = fresh_workspace_catalog_enumeration(service.catalog_service)
    fresh_by_name = Dict(metadata.name => metadata for metadata in fresh.variables)
    validated = Tuple{WorkspaceVariableMetadata,WorkspaceImportSelection}[]
    for (stored_entry, selection) in resolved
        stored = workspace_catalog_metadata(stored_entry)
        fresh_metadata = get(fresh_by_name, stored.name, nothing)
        if fresh_metadata === nothing || !workspace_catalog_metadata_equal(stored, fresh_metadata)
            throw(WorkspaceChangedError(
                catalog_revision,
                "Переменная рабочей области изменилась: $(stored.name)",
            ))
        end
        push!(validated, (fresh_metadata, selection))
    end
    validated
end

function workspace_batch_output_count(
    selected::Vector{Tuple{WorkspaceVariableMetadata,WorkspaceImportSelection}},
)::Int
    count = 0
    for (metadata, _) in selected
        increment = metadata.source_kind in (
            RAW_MATRIX_WORKSPACE_SOURCE,
            TIMED_MATRIX_WORKSPACE_SOURCE,
        ) ? metadata.shape[2] : 1
        count += increment
        count <= WORKSPACE_CATALOG_MAX_OUTPUTS || throw(workspace_batch_validation_error(
            "Batch import создаёт более 1000 signals",
        ))
    end
    1 <= count <= WORKSPACE_CATALOG_MAX_OUTPUTS || throw(workspace_batch_validation_error(
        "Batch import должен создать от 1 до 1000 signals",
    ))
    count
end

function workspace_batch_actual_metadata(
    name::String,
    value,
)::WorkspaceVariableMetadata
    timed = signal_inventory_timed_fields(value)
    payload = timed === nothing ? value : timed.value
    shape = if payload isa AbstractVector
        (length(payload),)
    elseif payload isa AbstractMatrix
        (size(payload, 1), size(payload, 2))
    else
        ()
    end
    source_kind = if timed === nothing && length(shape) == 1
        RAW_VECTOR_WORKSPACE_SOURCE
    elseif timed === nothing && length(shape) == 2
        RAW_MATRIX_WORKSPACE_SOURCE
    elseif timed !== nothing && length(shape) == 1
        TIMED_VECTOR_WORKSPACE_SOURCE
    elseif timed !== nothing && length(shape) == 2
        TIMED_MATRIX_WORKSPACE_SOURCE
    else
        UNSUPPORTED_WORKSPACE_SOURCE
    end
    WorkspaceVariableMetadata(
        name,
        string(typeof(value)),
        shape,
        isempty(shape) ? 0 : first(shape),
        source_kind,
    )
end

function workspace_batch_candidates(
    service::WorkspaceBatchImportService,
    selected::Vector{Tuple{WorkspaceVariableMetadata,WorkspaceImportSelection}},
    expected_output_count::Int,
)::Vector{WorkspaceSignalCandidate}
    received = Any[]
    for (metadata, _) in selected
        value = try
            workspace_variable_value(service.catalog_service.provider, metadata.name)
        catch err
            (err isa WorkspaceUnavailableError || err isa WorkspaceProviderError) && rethrow()
            throw(WorkspaceProviderError(
                "Provider значения завершился с ошибкой: $(sprint(showerror, err))",
            ))
        end
        push!(received, value)
    end
    raw_rate = nothing
    candidates = WorkspaceSignalCandidate[]
    for (index, (metadata, selection)) in enumerate(selected)
        value = received[index]
        actual = workspace_batch_actual_metadata(metadata.name, value)
        workspace_catalog_metadata_equal(metadata, actual) || throw(workspace_batch_validation_error(
            "Фактическое значение переменной $(metadata.name) не совпадает с catalog metadata",
        ))
        requested_rate = if metadata.source_kind in (
            RAW_VECTOR_WORKSPACE_SOURCE,
            RAW_MATRIX_WORKSPACE_SOURCE,
        )
            selection.sample_rate_hz === nothing && throw(workspace_batch_validation_error(
                "Raw переменная $(metadata.name) требует sample_rate_hz",
            ))
            if raw_rate === nothing
                raw_rate = selection.sample_rate_hz
            elseif selection.sample_rate_hz != raw_rate
                throw(workspace_batch_validation_error(
                    "Все raw variables должны иметь одинаковый sample_rate_hz",
                ))
            end
            selection.sample_rate_hz
        else
            nothing
        end
        series = try
            signal_inventory_workspace_series(value, requested_rate)
        catch err
            err isa SignalAnalyserValidationError || rethrow()
            detail = isempty(err.fields) ? err.message : first(values(err.fields))
            throw(workspace_batch_validation_error(
                "Переменная $(metadata.name): $(detail)",
            ))
        end
        for item in series
            push!(candidates, WorkspaceSignalCandidate(metadata.name, item))
        end
    end
    length(candidates) == expected_output_count || throw(workspace_batch_validation_error(
        "Фактическое число signals не совпадает с catalog metadata",
    ))
    candidates
end

function apply_workspace_batch_import!(
    service::WorkspaceBatchImportService,
    state::SignalAnalyserState,
    command::ImportWorkspaceBatchCommand;
    now::Dates.DateTime = Dates.now(Dates.UTC),
    lightweight::Bool = false,
)::Dict{String,Any}
    lock(state.lock) do
        command.revision == state.view.state_revision || throw(SignalAnalyserStaleStateError(
            command.revision,
            state.view.state_revision,
        ))
        catalog = lookup_workspace_catalog!(
            service.catalog_service,
            command.catalog_revision;
            now = now,
        )
        resolved = workspace_batch_resolve_selections(catalog, command)
        selected = workspace_batch_fresh_metadata(
            service,
            resolved,
            command.catalog_revision,
        )
        output_count = workspace_batch_output_count(selected)
        candidates = workspace_batch_candidates(service, selected, output_count)
        prepared = prepare_signal_inventory_batch_mutation(
            service.inventory_service,
            state,
            candidates;
            lightweight = lightweight,
        )
        publish_signal_inventory_mutation!(state, prepared)
        prepared.snapshot
    end
end

function apply_signal_inventory!(
    service::WorkspaceBatchImportService,
    state::SignalAnalyserState,
    command::AbstractSignalInventoryCommand;
    lightweight::Bool = false,
)::Dict{String,Any}
    command isa ImportWorkspaceBatchCommand ?
        apply_workspace_batch_import!(service, state, command; lightweight = lightweight) :
        apply_signal_inventory!(
            service.inventory_service,
            state,
            command;
            lightweight = lightweight,
        )
end

function apply_signal_inventory!(
    service::WorkspaceBatchImportService,
    state::SignalAnalyserState,
    data;
    lightweight::Bool = false,
)::Dict{String,Any}
    apply_signal_inventory!(
        service,
        state,
        parse_signal_inventory_command(data);
        lightweight = lightweight,
    )
end


function apply_signal_inventory_command!(
    service::WorkspaceBatchImportService,
    state::SignalAnalyserState,
    command_or_data;
    lightweight::Bool = false,
)
    apply_signal_inventory!(
        service,
        state,
        command_or_data;
        lightweight = lightweight,
    )
end
