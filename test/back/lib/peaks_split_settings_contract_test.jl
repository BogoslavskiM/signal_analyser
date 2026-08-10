using Test
const PEAKS_SPLIT = Main.AppTestContext

@testset "Split Peaks settings are typed, atomic and output-passive" begin
    state = PEAKS_SPLIT.default_signal_analyser_state()
    pane = state.display_layouts["display-1"].panes[1]
    @test pane.peaks_settings == PEAKS_SPLIT.SignalPeaksSettings(99, nothing, 1, 0.0)
    before_revision = state.view.state_revision
    before_output = copy(state.output_manager.need_update_pages)
    invalids = [
        Dict("number_of_peaks" => 0, "minimum_height" => nothing, "minimum_distance_samples" => 1, "threshold" => 0),
        Dict("number_of_peaks" => 1001, "minimum_height" => nothing, "minimum_distance_samples" => 1, "threshold" => 0),
        Dict("number_of_peaks" => 1, "minimum_height" => "bad", "minimum_distance_samples" => 1, "threshold" => 0),
        Dict("number_of_peaks" => 1, "minimum_height" => nothing, "minimum_distance_samples" => 0, "threshold" => 0),
        Dict("number_of_peaks" => 1, "minimum_height" => nothing, "minimum_distance_samples" => 1, "threshold" => -1),
    ]
    for settings in invalids
        caught = try PEAKS_SPLIT.apply_signal_peaks_settings!(state, Dict("state_revision" => before_revision, "display_id" => "display-1", "pane_id" => "pane-1", "settings" => settings)); nothing catch err; err end
        @test caught isa PEAKS_SPLIT.SignalAnalyserValidationError
        @test state.view.state_revision == before_revision && pane.peaks_settings == PEAKS_SPLIT.SignalPeaksSettings()
    end
    applied = PEAKS_SPLIT.apply_signal_peaks_settings!(state, Dict("state_revision" => before_revision, "display_id" => "display-1", "pane_id" => "pane-1", "settings" => Dict("number_of_peaks" => 7, "minimum_height" => nothing, "minimum_distance_samples" => 3, "threshold" => 0.25)))
    @test applied["state_revision"] == before_revision + 1
    current = PEAKS_SPLIT.signal_analyser_layout_by_display_id(state, "display-1").panes[1]
    @test current.peaks_settings == PEAKS_SPLIT.SignalPeaksSettings(7, nothing, 3, 0.25)
    @test state.output_manager.need_update_pages == before_output
    @test PEAKS_SPLIT.validate_signal_peaks_settings_request(Dict("state_revision" => state.view.state_revision, "display_id" => "display-1", "pane_id" => "pane-1", "settings" => Dict("number_of_peaks" => 7, "minimum_height" => nothing, "minimum_distance_samples" => 3, "threshold" => 0.25))).settings == current.peaks_settings
end
