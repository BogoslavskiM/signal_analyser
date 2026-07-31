using Test

const SA = Main.AppTestContext

function assert_line_plot(plot)
    @test plot["type"] == "line"
    @test !isempty(plot["x"])
    @test length(plot["x"]) == length(plot["y"])
    @test SA.all_finite(plot["x"])
    @test SA.all_finite(plot["y"])
end

function assert_heatmap_plot(plot; persistence::Bool = false)
    @test plot["type"] == "heatmap"
    @test !isempty(plot["x"])
    @test !isempty(plot["y"])
    @test length(plot["z"]) == length(plot["y"])
    @test all(row -> length(row) == length(plot["x"]), plot["z"])
    @test SA.all_finite(plot["x"])
    @test SA.all_finite(plot["y"])
    @test SA.all_finite_matrix(plot["z"])
    persistence && @test all(value -> 0.0 <= value <= 100.0, Iterators.flatten(plot["z"]))
end

function assert_trace(trace, signal_name, color)
    @test trace["type"] == "line"
    @test trace["signal"] == signal_name
    @test trace["name"] == signal_name
    @test trace["color"] == color
    @test !isempty(trace["x"])
    @test length(trace["x"]) == length(trace["y"])
    @test SA.all_finite(trace["x"])
    @test SA.all_finite(trace["y"])
end

function assert_visibility(snapshot, visible_names, selected_name)
    @test snapshot["visible_signals"] == visible_names
    @test snapshot["selected_signal"] == selected_name
    @test [signal["name"] for signal in snapshot["signals"] if signal["visible"]] == visible_names
    @test selected_name in visible_names
    @test snapshot["plot_payload"]["visible_signals"] == visible_names
    @test snapshot["plot_payload"]["selected_signal"] == selected_name
end

@testset "Signal Analyser snapshot and cache" begin
    SA.reset_pspectrum_double!()
    state = SA.default_signal_analyser_state()
    snapshot = SA.signal_analyser_snapshot(state)

    @test SA.snapshot_keyset(snapshot) == Set(["state_revision", "active_plot", "selected_signal", "visible_signals", "signals", "plots", "plot_payload", "panel"])
    @test snapshot["state_revision"] == 0
    @test snapshot["active_plot"] == "time"
    @test snapshot["selected_signal"] == "Гармонический сигнал"
    @test snapshot["visible_signals"] == ["Гармонический сигнал", "Комплексный ЛЧМ-сигнал"]
    @test [signal["name"] for signal in snapshot["signals"]] == ["Гармонический сигнал", "Комплексный ЛЧМ-сигнал"]
    @test [signal["color"] for signal in snapshot["signals"]] == ["#2563eb", "#dc2626"]
    @test [signal["sample_rate_hz"] for signal in snapshot["signals"]] == [2048.0, 2048.0]
    @test [signal["sample_count"] for signal in snapshot["signals"]] == [512, 512]
    @test all(signal -> signal["duration_s"] == 511 / 2048, snapshot["signals"])
    @test [signal["data_type"] for signal in snapshot["signals"]] == ["Вещественный", "Комплексный"]
    @test all(signal -> signal["visible"] === true, snapshot["signals"])

    @test Set(keys(snapshot["plots"])) == Set(["time", "spectrum", "spectrogram", "persistence"])
    assert_line_plot(snapshot["plots"]["time"])
    assert_line_plot(snapshot["plots"]["spectrum"])
    @test snapshot["plots"]["spectrum"]["method"] == "welch"
    assert_heatmap_plot(snapshot["plots"]["spectrogram"])
    assert_heatmap_plot(snapshot["plots"]["persistence"]; persistence = true)
    @test Set(keys(snapshot["plot_payload"])) == Set(["selected_signal", "visible_signals", "time_traces", "spectrum_traces", "spectrogram", "persistence"])
    @test [trace["name"] for trace in snapshot["plot_payload"]["time_traces"]] == ["Гармонический сигнал", "Комплексный ЛЧМ-сигнал"]
    @test [trace["name"] for trace in snapshot["plot_payload"]["spectrum_traces"]] == ["Гармонический сигнал", "Комплексный ЛЧМ-сигнал"]
    assert_trace(snapshot["plot_payload"]["time_traces"][1], "Гармонический сигнал", "#2563eb")
    assert_trace(snapshot["plot_payload"]["time_traces"][2], "Комплексный ЛЧМ-сигнал", "#dc2626")
    assert_trace(snapshot["plot_payload"]["spectrum_traces"][1], "Гармонический сигнал", "#2563eb")
    assert_trace(snapshot["plot_payload"]["spectrum_traces"][2], "Комплексный ЛЧМ-сигнал", "#dc2626")
    @test snapshot["plots"]["time"]["x"] == snapshot["plot_payload"]["time_traces"][1]["x"]
    @test snapshot["plots"]["time"]["y"] == snapshot["plot_payload"]["time_traces"][1]["y"]
    @test snapshot["plots"]["spectrum"]["x"] == snapshot["plot_payload"]["spectrum_traces"][1]["x"]
    @test snapshot["plots"]["spectrum"]["y"] == snapshot["plot_payload"]["spectrum_traces"][1]["y"]
    @test snapshot["plot_payload"]["spectrogram"]["signal"] == "Гармонический сигнал"
    @test snapshot["plot_payload"]["persistence"]["signal"] == "Гармонический сигнал"
    @test length(SA.PSPECTRUM_CALLS) == 6
    @test SA.PSPECTRUM_CALLS[1].representation == "power"
    @test SA.PSPECTRUM_CALLS[1].options[end - 1:end] == ("TwoSided", true)
    @test "FrequencyResolution" in SA.PSPECTRUM_CALLS[1].options

    SA.signal_analyser_snapshot(state)
    @test length(SA.PSPECTRUM_CALLS) == 6

    second_name = snapshot["signals"][2]["name"]
    second_snapshot = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "selected_signal" => second_name))
    @test second_snapshot["state_revision"] == 1
    @test second_snapshot["selected_signal"] == second_name
    @test second_snapshot["plot_payload"]["spectrogram"]["signal"] == second_name
    @test second_snapshot["plot_payload"]["persistence"]["signal"] == second_name
    @test second_snapshot["plots"]["time"]["y"] == second_snapshot["plot_payload"]["time_traces"][2]["y"]
    @test second_snapshot["plots"]["spectrum"]["y"] == second_snapshot["plot_payload"]["spectrum_traces"][2]["y"]
    @test length(SA.PSPECTRUM_CALLS) == 6
    assert_heatmap_plot(second_snapshot["plots"]["spectrogram"])

    SA.apply_signal_analyser_view!(state, Dict("state_revision" => 1, "active_plot" => "spectrum"))
    @test length(SA.PSPECTRUM_CALLS) == 6
    no_op = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 2, "active_plot" => "spectrum", "selected_signal" => second_name))
    @test no_op["state_revision"] == 2
    @test state.view.state_revision == 2
end

@testset "Signal Analyser view validation and atomicity" begin
    SA.reset_pspectrum_double!()
    state = SA.default_signal_analyser_state()
    SA.signal_analyser_snapshot(state)
    before = SA.signal_analyser_snapshot(state)

    for invalid_payload in (
        Dict{String,Any}(),
        Dict("state_revision" => 0.0),
        Dict("state_revision" => true),
        Dict("state_revision" => 0, "active_plot" => "surface"),
        Dict("state_revision" => 0, "selected_signal" => "missing"),
        Dict("state_revision" => 0, "visible_signals" => "Гармонический сигнал"),
        Dict("state_revision" => 0, "visible_signals" => String[]),
        Dict("state_revision" => 0, "visible_signals" => ["Гармонический сигнал", 1]),
        Dict("state_revision" => 0, "visible_signals" => ["Гармонический сигнал", "Гармонический сигнал"]),
        Dict("state_revision" => 0, "visible_signals" => ["Гармонический сигнал", "missing"]),
        Dict("state_revision" => 0, "unexpected" => "field"),
        ["state_revision", 0],
    )
        error = try
            SA.apply_signal_analyser_view!(state, invalid_payload)
            nothing
        catch caught
            caught
        end
        @test error isa SA.SignalAnalyserValidationError
        @test !isempty(error.fields)
        @test SA.signal_analyser_snapshot(state) == before
    end

    stale = try
        SA.apply_signal_analyser_view!(state, Dict("state_revision" => 9, "active_plot" => "spectrum"))
        nothing
    catch caught
        caught
    end
    @test stale isa SA.SignalAnalyserStaleStateError
    @test SA.signal_analyser_snapshot(state) == before

    failing_state = SA.default_signal_analyser_state()
    first_name, second_name = [signal.name for signal in failing_state.signals]
    SA.apply_signal_analyser_view!(failing_state, Dict("state_revision" => 0, "visible_signals" => [first_name]))
    failure_before = SA.signal_analyser_snapshot(failing_state)

    SA.PSPECTRUM_FAILURE[] = true
    dsp_error = try
        SA.apply_signal_analyser_view!(
            failing_state,
            Dict("state_revision" => 1, "selected_signal" => second_name, "visible_signals" => [first_name, second_name]),
        )
        nothing
    catch caught
        caught
    end
    @test dsp_error isa ArgumentError
    @test sprint(showerror, dsp_error) == "ArgumentError: deterministic EngeeDSP failure"
    SA.PSPECTRUM_FAILURE[] = false
    @test SA.signal_analyser_snapshot(failing_state) == failure_before
end

@testset "Signal Analyser visible signal mutation contract" begin
    SA.reset_pspectrum_double!()
    state = SA.default_signal_analyser_state()
    names = [signal.name for signal in state.signals]
    first_name, second_name = names

    hidden_selected = SA.apply_signal_analyser_view!(
        state,
        Dict(
            "state_revision" => 0,
            "selected_signal" => first_name,
            "visible_signals" => [second_name],
        ),
    )
    @test hidden_selected["state_revision"] == 1
    assert_visibility(hidden_selected, [second_name], second_name)
    @test hidden_selected["signals"][1]["visible"] === false
    @test hidden_selected["signals"][2]["visible"] === true
    @test [trace["name"] for trace in hidden_selected["plot_payload"]["time_traces"]] == [second_name]
    @test [trace["name"] for trace in hidden_selected["plot_payload"]["spectrum_traces"]] == [second_name]
    @test hidden_selected["plot_payload"]["spectrogram"]["signal"] == second_name
    @test hidden_selected["plot_payload"]["persistence"]["signal"] == second_name

    restored = SA.apply_signal_analyser_view!(
        state,
        Dict(
            "state_revision" => 1,
            "selected_signal" => second_name,
            "visible_signals" => [second_name, first_name],
        ),
    )
    @test restored["state_revision"] == 2
    assert_visibility(restored, [first_name, second_name], second_name)
    @test [trace["name"] for trace in restored["plot_payload"]["time_traces"]] == [first_name, second_name]
    @test [trace["name"] for trace in restored["plot_payload"]["spectrum_traces"]] == [first_name, second_name]

    no_op = SA.apply_signal_analyser_view!(
        state,
        Dict(
            "state_revision" => 2,
            "selected_signal" => second_name,
            "visible_signals" => [first_name, second_name],
        ),
    )
    @test no_op["state_revision"] == 2
    assert_visibility(no_op, [first_name, second_name], second_name)
end

@testset "Signal Analyser visibility failures do not partially mutate state" begin
    SA.reset_pspectrum_double!()
    state = SA.default_signal_analyser_state()
    names = [signal.name for signal in state.signals]
    first_name, second_name = names

    one_visible = SA.apply_signal_analyser_view!(
        state,
        Dict("state_revision" => 0, "visible_signals" => [first_name]),
    )
    @test one_visible["state_revision"] == 1
    assert_visibility(one_visible, [first_name], first_name)
    before = SA.signal_analyser_snapshot(state)

    stale = try
        SA.apply_signal_analyser_view!(
            state,
            Dict("state_revision" => 0, "visible_signals" => [first_name, second_name]),
        )
        nothing
    catch caught
        caught
    end
    @test stale isa SA.SignalAnalyserStaleStateError
    @test SA.signal_analyser_snapshot(state) == before

    SA.PSPECTRUM_FAILURE[] = true
    dsp_error = try
        SA.apply_signal_analyser_view!(
            state,
            Dict("state_revision" => 1, "visible_signals" => [first_name, second_name]),
        )
        nothing
    catch caught
        caught
    end
    @test dsp_error isa ArgumentError
    SA.PSPECTRUM_FAILURE[] = false
    @test SA.signal_analyser_snapshot(state) == before
end
