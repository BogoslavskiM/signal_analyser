using Test

const V5_OUTPUTS = Main.AppTestContext

function v5_resize_to_four_panes!(state)
    V5_OUTPUTS.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => state.view.state_revision,
        "operation" => "resize",
        "display_id" => "display-1",
        "version" => 1,
        "variant" => "2x2",
        "rows" => 2,
        "columns" => 2,
    ); lightweight = true)
end

function v5_output_statuses(snapshot, display_id::AbstractString)
    only(filter(entry -> entry["display_id"] == display_id, snapshot["layouts"]))["outputs"]
end

@testset "TASK-0086 v5 default catalog and all-pane state-lite metadata" begin
    state = V5_OUTPUTS.default_signal_analyser_state()
    signal = only(state.signals)
    display = only(state.displays)

    @test signal.name == "Гармонический сигнал"
    @test !signal.is_complex && signal.visible
    @test all(iszero, imag.(signal.values))
    @test maximum(abs, real.(signal.values)) ≈ 1.0
    @test state.row_selection.signal_name == signal.name
    @test V5_OUTPUTS.signal_analyser_display_members(display) == [signal.name]
    @test V5_OUTPUTS.signal_display_pane_members(
        V5_OUTPUTS.signal_display_active_pane(state.display_layouts[display.id]),
    ) == [signal.name]

    v5_resize_to_four_panes!(state)
    lite = V5_OUTPUTS.signal_analyser_state_lite(state)
    entry = only(lite["layouts"])
    panes = entry["layout"]["panes"]
    statuses = entry["outputs"]

    @test [status["pane_id"] for status in statuses] == [pane["id"] for pane in panes]
    @test length(statuses) == 4
    @test all(status -> Set(keys(status)) == Set([
        "page_id", "display_id", "pane_id", "plot_type", "signal_bindings",
        "analysis_signal", "calculation_revision", "context_key", "need_update",
        "isready", "success", "error", "output",
    ]), statuses)
    @test all(status -> status["page_id"] == "display-1::$(status["pane_id"])" &&
        status["need_update"] && !status["isready"] && !status["success"] &&
        isempty(status["error"]) && status["output"]["data"] == Dict{String,Any}[], statuses)
    @test lite["output_scheduling"] == Dict{String,Any}(
        "scope" => "active_display",
        "max_concurrent_calculations" => 1,
        "max_queued_outputs" => 100,
    )
    @test Set(keys(lite["need_update_pages"])) == Set(status["page_id"] for status in statuses)

    created = V5_OUTPUTS.apply_signal_analyser_display!(state, Dict(
        "state_revision" => state.view.state_revision, "operation" => "create",
    ); lightweight = true)
    @test isempty(v5_output_statuses(created, "display-1"))
    @test length(v5_output_statuses(created, "display-2")) == 1
end

@testset "TASK-0086 v5 visible-pane route scheduling is bounded, deduplicated and selection-safe" begin
    state = V5_OUTPUTS.default_signal_analyser_state()
    v5_resize_to_four_panes!(state)
    layout = state.display_layouts["display-1"]
    first_context = lock(state.lock) do
        V5_OUTPUTS.signal_analyser_output_context_unlocked(state, "display-1", "pane-1")
    end
    blocker = Channel{Nothing}(1)
    parked = @async take!(blocker)
    token = V5_OUTPUTS.SignalAnalyserCancellationToken()
    lock(state.lock) do
        manager = state.output_manager
        manager.active_context = first_context
        manager.active_task = parked
        manager.active_task_is_worker = false
        manager.cancellation_token = token
        manager.need_update_pages["display-1::pane-1"] = true
    end

    first_sibling = V5_OUTPUTS.signal_analyser_active_output(state, "display-1", "pane-2")
    duplicate_sibling = V5_OUTPUTS.signal_analyser_active_output(state, "display-1", "pane-2")
    third = V5_OUTPUTS.signal_analyser_active_output(state, "display-1", "pane-3")
    fourth = V5_OUTPUTS.signal_analyser_active_output(state, "display-1", "pane-4")
    @test all(response -> response["isready"] === false && response["success"] === false &&
        isempty(response["data"]) && isempty(response["error"]),
        (first_sibling, duplicate_sibling, third, fourth))
    @test state.output_manager.active_context == first_context
    @test state.output_manager.cancellation_token === token && !token.cancelled[]
    @test [context.pane_id for context in state.output_manager.queued_contexts] == ["pane-2", "pane-3", "pane-4"]
    @test length(state.output_manager.queued_contexts) == length(unique(state.output_manager.queued_contexts))

    queued_before_select = copy(state.output_manager.queued_contexts)
    selected = V5_OUTPUTS.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => state.view.state_revision,
        "operation" => "select_pane",
        "display_id" => "display-1",
        "version" => 1,
        "pane_id" => "pane-2",
    ); lightweight = true)
    @test selected["state_revision"] == state.view.state_revision
    @test state.display_layouts["display-1"].active_pane_id == "pane-2"
    @test state.output_manager.active_context == first_context
    @test state.output_manager.cancellation_token === token && !token.cancelled[]
    @test state.output_manager.queued_contexts == queued_before_select
    @test V5_OUTPUTS.SIGNAL_ANALYSER_VISIBLE_OUTPUT_MAX_QUEUE == 100

    outside = try
        V5_OUTPUTS.signal_analyser_active_output(state, "display-2", "pane-1")
        nothing
    catch err
        err
    end
    @test outside isa V5_OUTPUTS.SignalAnalyserInactiveOutputError
    put!(blocker, nothing)
    yield()
    @test istaskdone(parked)
end
