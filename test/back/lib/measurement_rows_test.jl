using Test

const MEASUREMENT_ROWS = Main.AppTestContext

@testset "Measurements contain every signal bound to the active pane" begin
    state = MEASUREMENT_ROWS.test_state_with_complex_signal()
    names = [signal.name for signal in state.signals]

    MEASUREMENT_ROWS.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => state.view.state_revision,
        "operation" => "update_pane",
        "display_id" => "display-1",
        "version" => 1,
        "pane_id" => "pane-1",
        "plot_type" => "time",
        "signal_bindings" => reverse(names),
    ); lightweight = true)

    snapshot = MEASUREMENT_ROWS.signal_analyser_snapshot(state)
    rows = snapshot["measurement_rows"]
    @test [row["signal_name"] for row in rows] == names
    @test length(rows) == 2
    @test all(row -> [item["id"] for item in row["items"]] == ["minimum", "maximum", "mean"], rows)
    @test rows[1]["ordinate"] == "real"
    @test rows[2]["ordinate"] == "magnitude"
    @test all(row -> row["error"] === nothing, rows)
    @test all(row -> row["time_limits"] == snapshot["time_limits"], rows)

    MEASUREMENT_ROWS.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => state.view.state_revision,
        "operation" => "update_pane",
        "display_id" => "display-1",
        "version" => 1,
        "pane_id" => "pane-1",
        "plot_type" => "time",
        "signal_bindings" => [names[2]],
    ); lightweight = true)
    single = MEASUREMENT_ROWS.signal_analyser_snapshot(state)
    @test [row["signal_name"] for row in single["measurement_rows"]] == [names[2]]
end
