using Test

const OP_HISTORY = Main.AppTestContext

struct OperationHistoryProvider <: OP_HISTORY.AbstractSignalOperationProvider end
struct OperationHistoryWorkspaceSource <: OP_HISTORY.AbstractWorkspaceSignalSource end

function OP_HISTORY.signal_operation_execute(
    ::OperationHistoryProvider,
    source::OP_HISTORY.AnalysedSignal,
    ::OP_HISTORY.DeriveSignalCommand,
)::OP_HISTORY.SignalOperationProviderResult
    OP_HISTORY.SignalOperationProviderResult(source.values .* 2, source.is_complex)
end

@testset "Derived signals keep an ordered reproducible operation chain" begin
    state = OP_HISTORY.default_signal_analyser_state()
    source = only(state.signals)
    inventory = OP_HISTORY.SignalInventoryService(OperationHistoryWorkspaceSource())
    command = OP_HISTORY.DeriveSignalCommand(
        state.view.state_revision,
        source.id,
        "preprocess",
        "custom-preprocess",
        OP_HISTORY.CustomSignalOperationParameters("init_signal .* 2"),
        "doubled",
        false,
    )
    OP_HISTORY.apply_derived_signal!(OperationHistoryProvider(), inventory, state, command)
    doubled = OP_HISTORY.signal_by_name(state, "doubled")
    @test length(doubled.operations) == 1
    @test doubled.operations[1].operation == "custom-preprocess"
    @test doubled.operations[1].body == "init_signal .* 2"

    crop = OP_HISTORY.CropSignalCommand(
        state.view.state_revision,
        doubled.id,
        0.0,
        1 / doubled.sample_rate_hz,
        "doubled_crop",
        false,
    )
    OP_HISTORY.apply_cropped_signal!(inventory, state, crop)
    cropped = OP_HISTORY.signal_by_name(state, "doubled_crop")
    @test [step.operation for step in cropped.operations] == ["custom-preprocess", "crop"]
    @test occursin("copy(init_signal[1:2])", cropped.operations[2].body)
    summary = OP_HISTORY.signal_inventory_summary_payload(state, cropped.id)
    @test [step["operation"] for step in summary["operation_history"]] ==
        ["custom-preprocess", "crop"]
    @test summary["operation_history"][1]["body"] == "init_signal .* 2"

    OP_HISTORY.apply_signal_inventory!(
        inventory,
        state,
        OP_HISTORY.DuplicateSignalCommand(state.view.state_revision, cropped.name),
    )
    duplicate = OP_HISTORY.signal_by_name(state, "doubled_crop_Copy")
    @test duplicate.operations == cropped.operations
end
