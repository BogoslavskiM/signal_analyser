using Test

const TASK0157_ATOMIC = Main.AppTestContext

struct Task0157OperationDouble <: TASK0157_ATOMIC.AbstractSignalOperationProvider
    result::Union{Nothing,TASK0157_ATOMIC.SignalOperationProviderResult}
    failure::Union{Nothing,TASK0157_ATOMIC.SignalOperationProviderError}
end

function TASK0157_ATOMIC.signal_operation_execute(
    provider::Task0157OperationDouble,
    ::TASK0157_ATOMIC.AnalysedSignal,
    ::TASK0157_ATOMIC.DeriveSignalCommand,
)::TASK0157_ATOMIC.SignalOperationProviderResult
    provider.failure === nothing || throw(provider.failure)
    provider.result::TASK0157_ATOMIC.SignalOperationProviderResult
end

struct Task0157WorkspaceSource <: TASK0157_ATOMIC.AbstractWorkspaceSignalSource end
TASK0157_ATOMIC.workspace_signal_value(::Task0157WorkspaceSource, ::String) = error("workspace must not be used")

function task0157_atomic_command(state, source; target::String = "производный", overwrite::Bool = false)
    TASK0157_ATOMIC.DeriveSignalCommand(
        state.view.state_revision,
        source.id,
        "preprocess",
        "resample",
        TASK0157_ATOMIC.ResampleSignalOperationParameters("factor", nothing, 2, 1, nothing),
        target,
        overwrite,
    )
end

@testset "TASK-0157 preprocess publication is atomic for create overwrite stale and provider errors" begin
    state = TASK0157_ATOMIC.default_signal_analyser_state()
    source = only(state.signals)
    service = TASK0157_ATOMIC.SignalInventoryService(Task0157WorkspaceSource())
    result = TASK0157_ATOMIC.SignalOperationProviderResult([1.0, 2.0, 3.0, 4.0], false, 2 * source.sample_rate_hz)
    success = Task0157OperationDouble(result, nothing)
    before_names = [signal.name for signal in state.signals]
    before_revision = state.view.state_revision

    failed = Task0157OperationDouble(nothing, TASK0157_ATOMIC.SignalOperationProviderError("operation_failed", "деталь провайдера не должна публиковаться"))
    @test_throws TASK0157_ATOMIC.SignalOperationProviderError TASK0157_ATOMIC.apply_derived_signal!(failed, service, state, task0157_atomic_command(state, source))
    @test [signal.name for signal in state.signals] == before_names && state.view.state_revision == before_revision

    created = TASK0157_ATOMIC.apply_derived_signal!(success, service, state, task0157_atomic_command(state, source))
    derived = TASK0157_ATOMIC.signal_by_name(state, "производный")
    @test created["ok"] === true && created["derived_signal"]["name"] == "производный"
    @test derived.sample_rate_hz == 2 * source.sample_rate_hz && length(derived.values) == 4
    @test state.view.state_revision == before_revision + 1

    collision = task0157_atomic_command(state, source)
    @test_throws TASK0157_ATOMIC.SignalAnalyserValidationError TASK0157_ATOMIC.apply_derived_signal!(success, service, state, collision)
    @test state.view.state_revision == before_revision + 1 && length(state.signals) == length(before_names) + 1

    overwritten = TASK0157_ATOMIC.apply_derived_signal!(success, service, state, task0157_atomic_command(state, source; overwrite = true))
    @test overwritten["state_revision"] == before_revision + 2 && length(state.signals) == length(before_names) + 1

    same_source = task0157_atomic_command(state, source; target = source.name, overwrite = true)
    @test_throws TASK0157_ATOMIC.SignalAnalyserValidationError TASK0157_ATOMIC.apply_derived_signal!(success, service, state, same_source)
    @test state.view.state_revision == before_revision + 2

    stale = TASK0157_ATOMIC.DeriveSignalCommand(
        before_revision,
        source.id,
        "preprocess",
        "resample",
        TASK0157_ATOMIC.ResampleSignalOperationParameters("rate", 1500.0, nothing, nothing, nothing),
        "устаревший",
        false,
    )
    @test_throws TASK0157_ATOMIC.SignalAnalyserStaleStateError TASK0157_ATOMIC.apply_derived_signal!(success, service, state, stale)
    @test TASK0157_ATOMIC.signal_by_name(state, "устаревший") === nothing && state.view.state_revision == before_revision + 2
end

@testset "TASK-0157 operation errors retain direct UI field ids and sanitize internal failure" begin
    direct = TASK0157_ATOMIC.SignalOperationProviderError("invalid_operation_parameters", "Неверная частота", "upper_passband")
    response = TASK0157_ATOMIC.signal_operation_error_response(direct)
    @test response.status == 422
    @test response.body["error"]["fields"] == Dict("upper_passband" => "Неверная частота")
    @test all(key -> !occursin('.', key), keys(response.body["error"]["fields"]))

    internal = TASK0157_ATOMIC.signal_operation_internal_error_response(ErrorException("TypeError: Julia stack / Engee internals"))
    @test internal.status == 500 && internal.body["error"]["code"] == "operation_failed"
    @test internal.body["error"]["message"] == "Операция над сигналом не выполнена"
    @test !occursin("TypeError", internal.body["error"]["message"]) && !occursin("Engee", internal.body["error"]["message"])
end
