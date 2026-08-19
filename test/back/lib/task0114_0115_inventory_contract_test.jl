using Test

const TASK0114_0115 = Main.AppTestContext

struct Task0115OperationDouble <: TASK0114_0115.AbstractSignalOperationProvider
    result::Union{Nothing,TASK0114_0115.SignalOperationProviderResult}
    failure::Union{Nothing,TASK0114_0115.SignalOperationProviderError}
end

"""Minimal typed source: derived operations never query workspace values."""
struct Task0115WorkspaceSource <: TASK0114_0115.AbstractWorkspaceSignalSource end

function TASK0114_0115.workspace_signal_value(
    ::Task0115WorkspaceSource,
    variable_name::String,
)
    throw(TASK0114_0115.SignalWorkspaceSourceError("workspace is not used by this test"))
end

function TASK0114_0115.signal_operation_execute(
    provider::Task0115OperationDouble,
    source::TASK0114_0115.AnalysedSignal,
    command::TASK0114_0115.DeriveSignalCommand,
)::TASK0114_0115.SignalOperationProviderResult
    provider.failure === nothing || throw(provider.failure)
    provider.result::TASK0114_0115.SignalOperationProviderResult
end

@testset "TASK-0114 sample pages preserve real and complex values" begin
    state = TASK0114_0115.test_state_with_complex_signal()
    real_signal, complex_signal = state.signals

    real_page = TASK0114_0115.signal_inventory_samples_payload(state, real_signal.id, 0, 2)
    @test real_page["cursor"] == 0
    @test length(real_page["rows"]) == 2
    @test real_page["rows"][1]["sample_index"] == 0
    @test real_page["rows"][2]["time_s"] == 1 / real_signal.sample_rate_hz
    @test real_page["rows"][1]["value"] isa Real
    @test real_page["rows"][1]["square"] isa Real
    @test real_page["next_cursor"] == 2

    complex_page = TASK0114_0115.signal_inventory_samples_payload(state, complex_signal.id, 0, 1)
    row = only(complex_page["rows"])
    @test row["value"] == string(complex_signal.values[1])
    @test row["square"] == string(complex_signal.values[1]^2)
    @test row["magnitude"] == abs(complex_signal.values[1])
    @test_throws TASK0114_0115.SignalAnalyserValidationError TASK0114_0115.signal_inventory_samples_payload(state, real_signal.id, -1, 2)
    @test_throws TASK0114_0115.SignalAnalyserValidationError TASK0114_0115.signal_inventory_samples_payload(state, real_signal.id, 0, 501)
end

@testset "TASK-0115 derived operation remains atomic under provider failure and collision" begin
    state = TASK0114_0115.default_signal_analyser_state()
    service = TASK0114_0115.SignalInventoryService(Task0115WorkspaceSource())
    source = only(state.signals)
    before_names = [signal.name for signal in state.signals]
    before_revision = state.view.state_revision
    command = TASK0114_0115.DeriveSignalCommand(
        before_revision, source.id, "abs", "derived-copy", false, nothing, nothing,
    )
    failed_provider = Task0115OperationDouble(
        nothing,
        TASK0114_0115.SignalOperationProviderError("operation_failed", "provider failure"),
    )
    @test_throws TASK0114_0115.SignalOperationProviderError TASK0114_0115.apply_derived_signal!(
        failed_provider, service, state, command,
    )
    @test [signal.name for signal in state.signals] == before_names
    @test state.view.state_revision == before_revision

    result = TASK0114_0115.SignalOperationProviderResult([1.0, 4.0, 9.0], false)
    success_provider = Task0115OperationDouble(result, nothing)
    created = TASK0114_0115.apply_derived_signal!(success_provider, service, state, command)
    @test created["state_revision"] == before_revision + 1
    @test TASK0114_0115.signal_by_name(state, "derived-copy").values == ComplexF64[1, 4, 9]

    collision = TASK0114_0115.DeriveSignalCommand(
        state.view.state_revision, source.id, "abs", "derived-copy", false, nothing, nothing,
    )
    @test_throws TASK0114_0115.SignalAnalyserValidationError TASK0114_0115.apply_derived_signal!(
        success_provider, service, state, collision,
    )
    @test state.view.state_revision == before_revision + 1

    overwrite = TASK0114_0115.DeriveSignalCommand(
        state.view.state_revision, source.id, "abs", "derived-copy", true, nothing, nothing,
    )
    replaced = TASK0114_0115.apply_derived_signal!(success_provider, service, state, overwrite)
    @test replaced["state_revision"] == before_revision + 2
    @test TASK0114_0115.signal_by_name(state, "derived-copy").values == ComplexF64[1, 4, 9]
end
