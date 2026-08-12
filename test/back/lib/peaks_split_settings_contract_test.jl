using Test
const PEAKS_SPLIT = Main.AppTestContext

@testset "Extrema settings are typed, atomic and output-passive" begin
    state = PEAKS_SPLIT.default_signal_analyser_state()
    signal_name = only(state.signals).name
    PEAKS_SPLIT.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => state.view.state_revision,
        "operation" => "update_pane",
        "display_id" => "display-1",
        "version" => 1,
        "pane_id" => "pane-1",
        "plot_type" => "time",
        "signal_bindings" => [signal_name],
    ); lightweight = true)
    pane = state.display_layouts["display-1"].panes[1]
    @test pane.peaks_settings == PEAKS_SPLIT.SignalPeaksSettings(PEAKS_SPLIT.MAXIMA_EXTREMA_MODE, 5, nothing, nothing, 1, 0.0)
    before_revision = state.view.state_revision
    before_output = copy(state.output_manager.need_update_pages)
    invalids = [
        Dict("mode" => "sideways", "number_of_peaks" => 1, "maximum_cutoff" => nothing, "minimum_cutoff" => nothing, "minimum_distance_samples" => 1, "threshold" => 0),
        Dict("mode" => "all", "number_of_peaks" => 0, "maximum_cutoff" => nothing, "minimum_cutoff" => nothing, "minimum_distance_samples" => 1, "threshold" => 0),
        Dict("mode" => "maxima", "number_of_peaks" => 1001, "maximum_cutoff" => nothing, "minimum_cutoff" => nothing, "minimum_distance_samples" => 1, "threshold" => 0),
        Dict("mode" => "maxima", "number_of_peaks" => 1, "maximum_cutoff" => "bad", "minimum_cutoff" => nothing, "minimum_distance_samples" => 1, "threshold" => 0),
        Dict("mode" => "minima", "number_of_peaks" => 1, "maximum_cutoff" => nothing, "minimum_cutoff" => "bad", "minimum_distance_samples" => 1, "threshold" => 0),
        Dict("mode" => "maxima", "number_of_peaks" => 1, "maximum_cutoff" => nothing, "minimum_cutoff" => nothing, "minimum_distance_samples" => 0, "threshold" => 0),
        Dict("mode" => "maxima", "number_of_peaks" => 1, "maximum_cutoff" => nothing, "minimum_cutoff" => nothing, "minimum_distance_samples" => 1, "threshold" => -1),
    ]
    for settings in invalids
        caught = try PEAKS_SPLIT.apply_signal_peaks_settings!(state, Dict("state_revision" => before_revision, "display_id" => "display-1", "pane_id" => "pane-1", "settings" => settings)); nothing catch err; err end
        @test caught isa PEAKS_SPLIT.SignalAnalyserValidationError
        @test state.view.state_revision == before_revision && pane.peaks_settings == PEAKS_SPLIT.SignalPeaksSettings()
    end
    applied = PEAKS_SPLIT.apply_signal_peaks_settings!(state, Dict("state_revision" => before_revision, "display_id" => "display-1", "pane_id" => "pane-1", "settings" => Dict("mode" => "minima", "number_of_peaks" => 7, "maximum_cutoff" => 5.0, "minimum_cutoff" => -2.5, "minimum_distance_samples" => 3, "threshold" => 0.25)))
    @test applied["state_revision"] == before_revision + 1
    current = PEAKS_SPLIT.signal_analyser_layout_by_display_id(state, "display-1").panes[1]
    @test current.peaks_settings == PEAKS_SPLIT.SignalPeaksSettings(PEAKS_SPLIT.MINIMA_EXTREMA_MODE, 7, 5.0, -2.5, 3, 0.25)
    @test state.output_manager.need_update_pages == before_output
    @test PEAKS_SPLIT.validate_signal_peaks_settings_request(Dict("state_revision" => state.view.state_revision, "display_id" => "display-1", "pane_id" => "pane-1", "settings" => Dict("mode" => "minima", "number_of_peaks" => 7, "maximum_cutoff" => 5.0, "minimum_cutoff" => -2.5, "minimum_distance_samples" => 3, "threshold" => 0.25))).settings == current.peaks_settings
    legacy_minima = PEAKS_SPLIT.validate_signal_peaks_settings_request(Dict("state_revision" => state.view.state_revision, "display_id" => "display-1", "pane_id" => "pane-1", "settings" => Dict("mode" => "minima", "number_of_peaks" => 7, "minimum_height" => 2.5, "minimum_distance_samples" => 3, "threshold" => 0.25))).settings
    @test legacy_minima.maximum_cutoff === nothing && legacy_minima.minimum_cutoff == -2.5
    legacy_maxima = PEAKS_SPLIT.validate_signal_peaks_settings_request(Dict("state_revision" => state.view.state_revision, "display_id" => "display-1", "pane_id" => "pane-1", "settings" => Dict("number_of_peaks" => 7, "minimum_height" => 2.5, "minimum_distance_samples" => 3, "threshold" => 0.25))).settings
    @test legacy_maxima.mode == PEAKS_SPLIT.MAXIMA_EXTREMA_MODE && legacy_maxima.maximum_cutoff == 2.5 && legacy_maxima.minimum_cutoff === nothing
end
