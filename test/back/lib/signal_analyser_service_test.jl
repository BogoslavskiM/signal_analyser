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

@testset "Signal Analyser snapshot and cache" begin
    SA.reset_pspectrum_double!()
    state = SA.default_signal_analyser_state()
    snapshot = SA.signal_analyser_snapshot(state)

    @test SA.snapshot_keyset(snapshot) == Set(["state_revision", "active_plot", "selected_signal", "signals", "plots", "panel"])
    @test snapshot["state_revision"] == 0
    @test snapshot["active_plot"] == "time"
    @test snapshot["selected_signal"] == "Гармонический сигнал"
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
    @test length(SA.PSPECTRUM_CALLS) == 3
    @test SA.PSPECTRUM_CALLS[1].representation == "power"
    @test SA.PSPECTRUM_CALLS[1].options[end - 1:end] == ("TwoSided", true)
    @test "FrequencyResolution" in SA.PSPECTRUM_CALLS[1].options

    SA.signal_analyser_snapshot(state)
    @test length(SA.PSPECTRUM_CALLS) == 3

    second_name = snapshot["signals"][2]["name"]
    second_snapshot = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "selected_signal" => second_name))
    @test second_snapshot["state_revision"] == 1
    @test second_snapshot["selected_signal"] == second_name
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

    SA.PSPECTRUM_FAILURE[] = true
    dsp_error = try
        SA.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "selected_signal" => "Комплексный ЛЧМ-сигнал"))
        nothing
    catch caught
        caught
    end
    @test dsp_error isa ArgumentError
    @test sprint(showerror, dsp_error) == "ArgumentError: deterministic EngeeDSP failure"
    @test SA.signal_analyser_snapshot(state) == before
end
