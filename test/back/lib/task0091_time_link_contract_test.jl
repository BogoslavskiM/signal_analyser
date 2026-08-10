using Test

const TASK0091_TIME_LINK = Main.AppTestContext

function task0091_layout!(state, operation::String; pane_id::String = "", plot_type::String = "time", bindings::Vector{String} = String[])
    payload = Dict{String,Any}(
        "state_revision" => state.view.state_revision,
        "operation" => operation,
        "display_id" => "display-1",
        "version" => 1,
    )
    if operation == "resize"
        merge!(payload, Dict("variant" => "1x3", "rows" => 1, "columns" => 3))
    else
        merge!(payload, Dict("pane_id" => pane_id))
        operation == "update_pane" && merge!(payload, Dict("plot_type" => plot_type, "signal_bindings" => bindings))
    end
    TASK0091_TIME_LINK.apply_signal_analyser_layout!(state, payload; lightweight = true)
end

function task0091_apply_x_limits!(service, state, value::Dict{String,Float64})
    drafted = TASK0091_TIME_LINK.apply_signal_setting!(service, state, Dict(
        "state_revision" => state.view.state_revision, "display_id" => "display-1",
        "field_id" => "time.x_limits", "value" => value,
    ))
    accepted = TASK0091_TIME_LINK.apply_signal_settings!(service, state, Dict(
        "state_revision" => drafted["state"]["state_revision"], "display_id" => "display-1",
    ))
    @test accepted["success"] === true
    accepted
end

@testset "TASK-0091 intra-Display linked and unlinked time limits are pane-scoped" begin
    state = TASK0091_TIME_LINK.default_signal_analyser_state()
    service = TASK0091_TIME_LINK.SignalSettingsService()
    signal_name = only(state.signals).name

    created = TASK0091_TIME_LINK.apply_signal_analyser_display!(state, Dict(
        "state_revision" => 0, "operation" => "create",
    ); lightweight = true)
    @test created["active_display_id"] == "display-2"
    display_two_layout = copy(state.display_layouts["display-2"])
    display_two_limits = TASK0091_TIME_LINK.signal_analyser_display_by_id(state, "display-2").time_limits
    TASK0091_TIME_LINK.apply_signal_analyser_display!(state, Dict(
        "state_revision" => state.view.state_revision, "operation" => "select", "display_id" => "display-1",
    ); lightweight = true)

    task0091_layout!(state, "resize")
    layout = state.display_layouts["display-1"]
    @test length(layout.panes) == 3
    @test all(pane -> TASK0091_TIME_LINK.signal_display_pane_members(pane) == [signal_name], layout.panes)

    task0091_layout!(state, "update_pane"; pane_id = "pane-3", plot_type = "spectrum", bindings = [signal_name])
    task0091_layout!(state, "select_pane"; pane_id = "pane-1")
    task0091_apply_x_limits!(service, state, Dict("min" => 0.02, "max" => 0.06))
    task0091_layout!(state, "select_pane"; pane_id = "pane-2")
    task0091_apply_x_limits!(service, state, Dict("min" => 0.08, "max" => 0.12))

    unlinked = state.display_layouts["display-1"]
    @test unlinked.panes[1].time_limits != unlinked.panes[2].time_limits
    @test unlinked.panes[3].plot_type == TASK0091_TIME_LINK.SPECTRUM_PLOT
    @test unlinked.panes[3].time_limits != unlinked.panes[2].time_limits

    linked = TASK0091_TIME_LINK.apply_signal_setting!(service, state, Dict(
        "state_revision" => state.view.state_revision, "display_id" => "display-1",
        "field_id" => "time.link_time", "value" => true,
    ))
    @test linked["state"]["state_revision"] == state.view.state_revision
    @test all(pane.stored_settings.time.link_time for pane in state.display_layouts["display-1"].panes[1:2])
    @test !state.display_layouts["display-1"].panes[3].stored_settings.time.link_time

    lock(state.lock) do
        for key in keys(state.output_manager.need_update_pages)
            state.output_manager.need_update_pages[key] = false
        end
    end
    task0091_layout!(state, "select_pane"; pane_id = "pane-1")
    task0091_apply_x_limits!(service, state, Dict("min" => 0.14, "max" => 0.18))
    propagated = state.display_layouts["display-1"]
    @test propagated.panes[1].time_limits == propagated.panes[2].time_limits
    @test propagated.panes[3].time_limits != propagated.panes[1].time_limits
    @test state.display_layouts["display-2"] == display_two_layout
    @test TASK0091_TIME_LINK.signal_analyser_display_by_id(state, "display-2").time_limits == display_two_limits
    @test state.output_manager.need_update_pages["display-1::pane-1"]
    @test state.output_manager.need_update_pages["display-1::pane-2"]
    @test !state.output_manager.need_update_pages["display-1::pane-3"]
    @test !state.output_manager.need_update_pages["display-2::pane-1"]

    task0091_layout!(state, "select_pane"; pane_id = "pane-2")
    TASK0091_TIME_LINK.apply_signal_setting!(service, state, Dict(
        "state_revision" => state.view.state_revision, "display_id" => "display-1",
        "field_id" => "time.link_time", "value" => false,
    ))
    task0091_apply_x_limits!(service, state, Dict("min" => 0.19, "max" => 0.22))
    unlinked_again = state.display_layouts["display-1"]
    @test unlinked_again.panes[1].time_limits != unlinked_again.panes[2].time_limits
end
