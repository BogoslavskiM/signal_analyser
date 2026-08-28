using Test

const PANE_OWNED_EXTREMA = Main.AppTestContext

function pane_owned_extrema_state()
    state = PANE_OWNED_EXTREMA.default_signal_analyser_state()
    display_id = state.active_display_id
    layout = state.display_layouts[display_id]
    signal_name = only(state.signals).name
    for pane_id in ("pane-2", "pane-3")
        PANE_OWNED_EXTREMA.apply_signal_analyser_layout!(state, Dict(
            "state_revision" => state.view.state_revision,
            "operation" => "update_pane",
            "display_id" => display_id,
            "version" => 1,
            "pane_id" => pane_id,
            "plot_type" => "time",
            "signal_bindings" => [signal_name],
        ); lightweight = true)
    end
    state, display_id, layout.active_pane_id, signal_name
end

function pane_owned_extrema_pane(state, display_id, pane_id)
    layout = PANE_OWNED_EXTREMA.signal_analyser_layout_by_display_id(state, display_id)
    PANE_OWNED_EXTREMA.signal_analyser_layout_pane_by_id(layout, pane_id)
end

@testset "HND-0775 extrema are pane-owned, signal-id keyed and queued first" begin
    state, display_id, pane_1, _ = pane_owned_extrema_state()
    pane_2 = pane_owned_extrema_pane(state, display_id, "pane-2")
    pane_3 = pane_owned_extrema_pane(state, display_id, "pane-3")
    signal = only(state.signals)
    item = PANE_OWNED_EXTREMA.SignalPaneExtremum(4, 0.4, 2.5, true)

    @test item.is_maximum === true
    @test_throws ArgumentError PANE_OWNED_EXTREMA.SignalPaneExtremum(-1, 0.4, 2.5, false)

    # A running worker is represented explicitly so this test exercises queue
    # ordering only; it never starts provider work or relies on timing.
    manager = state.output_manager
    manager.extrema_task = current_task()
    manager.active_extrema_pane = PANE_OWNED_EXTREMA.SignalAnalyserExtremaPaneKey(display_id, pane_1)

    pane_2.extrema_by_signal[signal.id] = [item]
    pane_2.extrema_state.is_extrema_ready = true
    pane_2.extrema_state.success = true
    pane_2.extrema_state.error = ""
    pane_2.extrema_state.need_update = false

    first = PANE_OWNED_EXTREMA.signal_analyser_calculate_pane_extrema!(state, display_id, "pane-2")
    @test first["is_extrema_ready"] === false && first["success"] === false
    @test first["error"] == "" && first["need_update"] === true
    @test first["extrema_by_signal"][signal.id]["items"][1]["is_maximum"] === true
    @test manager.extrema_queue == [PANE_OWNED_EXTREMA.SignalAnalyserExtremaPaneKey(display_id, "pane-2")]

    PANE_OWNED_EXTREMA.signal_analyser_calculate_pane_extrema!(state, display_id, "pane-3")
    PANE_OWNED_EXTREMA.signal_analyser_calculate_pane_extrema!(state, display_id, "pane-2")
    @test manager.extrema_queue == [
        PANE_OWNED_EXTREMA.SignalAnalyserExtremaPaneKey(display_id, "pane-2"),
        PANE_OWNED_EXTREMA.SignalAnalyserExtremaPaneKey(display_id, "pane-3"),
    ]
    @test pane_3.extrema_by_signal == Dict{String,Vector{PANE_OWNED_EXTREMA.SignalPaneExtremum}}()
end

@testset "HND-0775 clear affects only its pane and cancels only its queued duplicate" begin
    state, display_id, _, _ = pane_owned_extrema_state()
    pane_2 = pane_owned_extrema_pane(state, display_id, "pane-2")
    pane_3 = pane_owned_extrema_pane(state, display_id, "pane-3")
    signal = only(state.signals)
    pane_2.extrema_by_signal[signal.id] = [PANE_OWNED_EXTREMA.SignalPaneExtremum(2, 0.2, 1.0, false)]
    pane_2.extrema_state.is_extrema_ready = true
    pane_2.extrema_state.success = true
    pane_2.extrema_state.need_update = false
    pane_3.extrema_by_signal[signal.id] = [PANE_OWNED_EXTREMA.SignalPaneExtremum(3, 0.3, 3.0, true)]
    pane_3.extrema_state.is_extrema_ready = true
    pane_3.extrema_state.success = true
    pane_3.extrema_state.need_update = false

    key_2 = PANE_OWNED_EXTREMA.SignalAnalyserExtremaPaneKey(display_id, "pane-2")
    key_3 = PANE_OWNED_EXTREMA.SignalAnalyserExtremaPaneKey(display_id, "pane-3")
    state.output_manager.extrema_queue = [key_3, key_2]
    state.output_manager.extrema_visible_ranges[key_2] = nothing
    cleared = PANE_OWNED_EXTREMA.signal_analyser_clear_pane_extrema!(state, display_id, "pane-2")

    @test isempty(cleared["extrema_by_signal"])
    @test cleared["is_extrema_ready"] === false && cleared["success"] === false
    @test cleared["error"] == "" && cleared["need_update"] === true
    @test isempty(pane_2.extrema_by_signal)
    @test state.output_manager.extrema_queue == [key_3]
    @test !haskey(state.output_manager.extrema_visible_ranges, key_2)
    @test pane_3.extrema_by_signal[signal.id][1].is_maximum === true
    @test pane_3.is_extrema_ready === true && pane_3.success === true && pane_3.need_update === false
end
