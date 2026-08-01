struct EngeeWorkspaceSignalSource{P<:AbstractWorkspaceVariableProvider} <:
    AbstractWorkspaceSignalSource
    provider::P
end

EngeeWorkspaceSignalSource() = EngeeWorkspaceSignalSource(EngeeWorkspaceVariableProvider())

function workspace_signal_value(
    source::EngeeWorkspaceSignalSource,
    variable_name::String,
)
    try
        workspace_variable_value(source.provider, variable_name)
    catch err
        (err isa WorkspaceUnavailableError || err isa WorkspaceProviderError) || rethrow()
        throw(SignalWorkspaceSourceError(sprint(showerror, err)))
    end
end
