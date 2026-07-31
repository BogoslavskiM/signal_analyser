using Test

const SA = Main.AppTestContext

mutable struct FakePeaksProvider <: SA.AbstractPeaksProvider
    calls::Vector{SA.SignalPeaksQuery}
    result::SA.SignalPeaksProviderResult
    failure::Union{Nothing,Exception}
end

function SA.signal_peaks_detect(provider::FakePeaksProvider, query::SA.SignalPeaksQuery)
    push!(provider.calls, query)
    isnothing(provider.failure) || throw(provider.failure)
    provider.result
end

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

function assert_visibility(snapshot, visible_names, analysis_name)
    @test snapshot["visible_signals"] == visible_names
    @test snapshot["analysis_signal"] == analysis_name
    @test snapshot["selected_signal"] == analysis_name
    @test snapshot["plot_payload"]["visible_signals"] == visible_names
    @test snapshot["plot_payload"]["selected_signal"] == analysis_name
end

function p0_measurement_state()
    real_values = fill(ComplexF64(2.0, 9.0), 1100)
    real_values[1026] = 25.0 + 0.0im
    real_values[1071] = 25.0 + 0.0im
    real_values[1051] = -30.0 + 0.0im
    real_values[1100] = -30.0 + 0.0im
    complex_values = fill(ComplexF64(6.0, 8.0), 1100)
    complex_values[1026] = 8.0 + 15.0im
    complex_values[1071] = 8.0 + 15.0im
    complex_values[1051] = 1.0 + 0.0im
    complex_values[1100] = 1.0 + 0.0im
    signals = SA.AnalysedSignal[
        SA.AnalysedSignal("raw-real", "#111111", 1000.0, real_values, false, true),
        SA.AnalysedSignal("raw-complex", "#222222", 1000.0, complex_values, true, true),
    ]
    SA.SignalAnalyserState(signals, SA.SignalAnalyserViewState(0, SA.TIME_PLOT, "raw-real"), Dict{String,Dict{String,Any}}(), ReentrantLock())
end

function raw_measurement_items(signal)
    values = signal.is_complex ? abs.(signal.values) : real.(signal.values)
    ordinate = Float64.(values)
    minimum_index = findfirst(value -> value == minimum(ordinate), ordinate) - 1
    maximum_index = findfirst(value -> value == maximum(ordinate), ordinate) - 1
    expected = Dict(
        "minimum" => Dict("id" => "minimum", "label" => "Минимум", "value" => ordinate[minimum_index + 1], "time_s" => minimum_index / signal.sample_rate_hz, "sample_index" => minimum_index),
        "maximum" => Dict("id" => "maximum", "label" => "Максимум", "value" => ordinate[maximum_index + 1], "time_s" => maximum_index / signal.sample_rate_hz, "sample_index" => maximum_index),
        "mean" => Dict("id" => "mean", "label" => "Среднее", "value" => sum(ordinate) / length(ordinate), "time_s" => nothing, "sample_index" => nothing),
    )
    [expected["minimum"], expected["maximum"], expected["mean"]]
end

function assert_p0_snapshot_measurements(snapshot, signal)
    @test haskey(snapshot, "measurements")
    haskey(snapshot, "measurements") || return
    payload = get(snapshot, "measurements", Dict{String,Any}())
    @test Set(keys(payload)) == Set(["state_revision", "signal_name", "ordinate", "units", "items"])
    @test payload["state_revision"] == snapshot["state_revision"]
    @test payload["signal_name"] == signal.name == snapshot["selected_signal"]
    @test payload["ordinate"] == (signal.is_complex ? "magnitude" : "real")
    @test payload["units"] == Dict("time" => "s", "value" => "1")
    @test payload["items"] == raw_measurement_items(signal)
    @test payload["items"][3]["time_s"] === nothing
    @test payload["items"][3]["sample_index"] === nothing
end

@testset "Signal Analyser snapshot and cache" begin
    SA.reset_pspectrum_double!()
    state = SA.default_signal_analyser_state()
    snapshot = SA.signal_analyser_snapshot(state)

    @test SA.snapshot_keyset(snapshot) == Set(["state_revision", "active_display_id", "displays", "active_plot", "row_selected_signal", "analysis_signal", "selected_signal", "visible_signals", "signals", "plots", "plot_payload", "measurements", "peaks", "panel"])
    @test snapshot["active_display_id"] == "display-1"
    @test snapshot["displays"] == [Dict(
        "id" => "display-1",
        "name" => "Display 1",
        "active_plot" => "time",
        "analysis_signal" => "Гармонический сигнал",
        "selected_signal" => "Гармонический сигнал",
        "visible_signals" => ["Гармонический сигнал", "Комплексный ЛЧМ-сигнал"],
        "peaks_enabled" => false,
    )]
    @test snapshot["state_revision"] == 0
    @test snapshot["active_plot"] == "time"
    @test snapshot["row_selected_signal"] == "Гармонический сигнал"
    @test snapshot["analysis_signal"] == "Гармонический сигнал"
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
    assert_p0_snapshot_measurements(snapshot, state.signals[1])
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
    assert_p0_snapshot_measurements(second_snapshot, state.signals[2])
    @test length(SA.PSPECTRUM_CALLS) == 6
    assert_heatmap_plot(second_snapshot["plots"]["spectrogram"])

    SA.apply_signal_analyser_view!(state, Dict("state_revision" => 1, "active_plot" => "spectrum"))
    @test length(SA.PSPECTRUM_CALLS) == 6
    no_op = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 2, "active_plot" => "spectrum", "selected_signal" => second_name))
    @test no_op["state_revision"] == 2
    @test state.view.state_revision == 2
end

@testset "Signal Analyser Peaks use an injected provider over full raw samples" begin
    fake = FakePeaksProvider(
        SA.SignalPeaksQuery[],
        SA.SignalPeaksProviderResult([7.0, 11.0], [2, 1051], [1.5, 2.0], [4.0, 6.0], 1100),
        nothing,
    )
    base = p0_measurement_state()
    state = SA.SignalAnalyserState(base.signals, base.view, Dict{String,Dict{String,Any}}(), ReentrantLock(); peaks_provider = fake)
    disabled = SA.signal_analyser_snapshot(state)
    @test isempty(fake.calls)
    @test disabled["peaks"] == Dict("enabled" => false, "state_revision" => 0, "display_id" => "display-1", "signal_name" => "raw-real", "ordinate" => "real", "units" => Dict("value" => "1", "time" => "s", "width" => "samples", "prominence" => "1"), "items" => Any[])

    enabled = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "peaks_enabled" => true))
    @test length(fake.calls) == 1
    @test length(fake.calls[1].values) == 1100
    @test fake.calls[1].ordinate == SA.REAL_ORDINATE
    @test length(enabled["plots"]["time"]["y"]) <= 1024
    @test enabled["peaks"]["enabled"] === true
    @test enabled["peaks"]["state_revision"] == enabled["state_revision"] == 1
    @test enabled["peaks"]["items"] == [
        Dict("id" => "peak-1", "value" => 7.0, "sample_index" => 1, "time_s" => 0.001, "width_samples" => 1.5, "prominence" => 4.0),
        Dict("id" => "peak-1050", "value" => 11.0, "sample_index" => 1050, "time_s" => 1.05, "width_samples" => 2.0, "prominence" => 6.0),
    ]
    @test enabled["displays"][1]["peaks_enabled"] === true

    disabled_again = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 1, "active_plot" => "spectrum"))
    @test disabled_again["peaks"]["enabled"] === false
    @test disabled_again["displays"][1]["peaks_enabled"] === false
    @test length(fake.calls) == 1
end

@testset "Signal Analyser Display pages keep independent view state" begin
    SA.reset_pspectrum_double!()
    state = SA.default_signal_analyser_state()
    first_name, second_name = [signal.name for signal in state.signals]

    created = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 0, "operation" => "create"))
    @test created["state_revision"] == 1
    @test created["active_display_id"] == "display-2"
    @test [display["id"] for display in created["displays"]] == ["display-1", "display-2"]
    @test created["displays"][2] == Dict(
        "id" => "display-2",
        "name" => "Display 2",
        "active_plot" => "time",
        "analysis_signal" => first_name,
        "selected_signal" => first_name,
        "visible_signals" => [first_name, second_name],
        "peaks_enabled" => false,
    )

    configured_second = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 1,
        "active_plot" => "spectrum",
        "selected_signal" => second_name,
        "visible_signals" => [second_name],
    ))
    @test configured_second["state_revision"] == 2
    @test configured_second["active_display_id"] == "display-2"
    @test configured_second["active_plot"] == "spectrum"
    @test configured_second["visible_signals"] == [second_name]
    assert_p0_snapshot_measurements(configured_second, state.signals[2])

    selected_first = SA.apply_signal_analyser_display!(state, Dict(
        "state_revision" => 2,
        "operation" => "select",
        "display_id" => "display-1",
    ))
    @test selected_first["state_revision"] == 3
    @test selected_first["active_display_id"] == "display-1"
    @test selected_first["active_plot"] == "time"
    @test selected_first["selected_signal"] == first_name
    @test selected_first["visible_signals"] == [first_name, second_name]
    assert_p0_snapshot_measurements(selected_first, state.signals[1])

    restored_second = SA.apply_signal_analyser_display!(state, Dict(
        "state_revision" => 3,
        "operation" => "select",
        "display_id" => "display-2",
    ))
    @test restored_second["state_revision"] == 4
    @test restored_second["active_display_id"] == "display-2"
    @test restored_second["active_plot"] == "spectrum"
    @test restored_second["selected_signal"] == second_name
    @test restored_second["visible_signals"] == [second_name]
    @test [trace["name"] for trace in restored_second["plot_payload"]["time_traces"]] == [second_name]
    assert_p0_snapshot_measurements(restored_second, state.signals[2])
end

@testset "Signal Analyser Display page lifecycle is revision-safe and atomic" begin
    SA.reset_pspectrum_double!()
    state = SA.default_signal_analyser_state()
    initial = SA.signal_analyser_snapshot(state)

    for invalid_payload in (
        Dict{String,Any}(),
        Dict("state_revision" => 0.0, "operation" => "create"),
        Dict("state_revision" => true, "operation" => "create"),
        Dict("state_revision" => 0, "operation" => "unknown"),
        Dict("state_revision" => 0, "operation" => "create", "display_id" => "display-1"),
        Dict("state_revision" => 0, "operation" => "select"),
        Dict("state_revision" => 0, "operation" => "close", "display_id" => "missing"),
        Dict("state_revision" => 0, "operation" => "create", "extra" => true),
    )
        err = try
            SA.apply_signal_analyser_display!(state, invalid_payload)
            nothing
        catch caught
            caught
        end
        @test err isa SA.SignalAnalyserValidationError
        @test !isempty(err.fields)
        @test SA.signal_analyser_snapshot(state) == initial
    end

    cannot_close_last = try
        SA.apply_signal_analyser_display!(state, Dict("state_revision" => 0, "operation" => "close", "display_id" => "display-1"))
        nothing
    catch caught
        caught
    end
    @test cannot_close_last isa SA.SignalAnalyserValidationError
    @test haskey(cannot_close_last.fields, "operation")
    @test SA.signal_analyser_snapshot(state) == initial

    first_created = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 0, "operation" => "create"))
    stale = try
        SA.apply_signal_analyser_display!(state, Dict("state_revision" => 0, "operation" => "select", "display_id" => "display-1"))
        nothing
    catch caught
        caught
    end
    @test stale isa SA.SignalAnalyserStaleStateError
    @test SA.signal_analyser_snapshot(state) == first_created
    after_stale = SA.signal_analyser_snapshot(state)
    @test after_stale["state_revision"] == first_created["state_revision"]
    @test after_stale["measurements"] == first_created["measurements"]

    state = SA.default_signal_analyser_state()
    snapshot = SA.signal_analyser_snapshot(state)
    for number in 2:5
        snapshot = SA.apply_signal_analyser_display!(state, Dict("state_revision" => snapshot["state_revision"], "operation" => "create"))
        @test snapshot["active_display_id"] == "display-$number"
    end
    @test length(snapshot["displays"]) == 5
    @test [display["id"] for display in snapshot["displays"]] == ["display-1", "display-2", "display-3", "display-4", "display-5"]

    closed = SA.apply_signal_analyser_display!(state, Dict("state_revision" => snapshot["state_revision"], "operation" => "close", "display_id" => "display-4"))
    @test closed["active_display_id"] == "display-5"
    @test [display["id"] for display in closed["displays"]] == ["display-1", "display-2", "display-3", "display-5"]
    @test closed["state_revision"] == snapshot["state_revision"] + 1

    closed_active = SA.apply_signal_analyser_display!(state, Dict("state_revision" => closed["state_revision"], "operation" => "close", "display_id" => "display-5"))
    @test closed_active["active_display_id"] == "display-3"
    @test [display["id"] for display in closed_active["displays"]] == ["display-1", "display-2", "display-3"]

    # Closing a non-active page must not change focus.  If the active first page
    # is closed, there is no left neighbour, so focus moves to the right page.
    preserved_active = SA.apply_signal_analyser_display!(state, Dict(
        "state_revision" => closed_active["state_revision"],
        "operation" => "select",
        "display_id" => "display-2",
    ))
    @test preserved_active["active_display_id"] == "display-2"
    after_nonactive_close = SA.apply_signal_analyser_display!(state, Dict(
        "state_revision" => preserved_active["state_revision"],
        "operation" => "close",
        "display_id" => "display-3",
    ))
    @test after_nonactive_close["active_display_id"] == "display-2"
    selected_first = SA.apply_signal_analyser_display!(state, Dict(
        "state_revision" => after_nonactive_close["state_revision"],
        "operation" => "select",
        "display_id" => "display-1",
    ))
    after_first_close = SA.apply_signal_analyser_display!(state, Dict(
        "state_revision" => selected_first["state_revision"],
        "operation" => "close",
        "display_id" => "display-1",
    ))
    @test after_first_close["active_display_id"] == "display-2"
    @test [display["id"] for display in after_first_close["displays"]] == ["display-2"]
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
            "visible_signals" => [second_name],
        ),
    )
    @test hidden_selected["state_revision"] == 1
    assert_visibility(hidden_selected, [second_name], second_name)
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

@testset "Signal Analyser raw-sample snapshot measurements contract" begin
    SA.reset_pspectrum_double!()
    state = p0_measurement_state()
    real_snapshot = SA.signal_analyser_snapshot(state)
    @test length(real_snapshot["plot_payload"]["time_traces"][1]["y"]) <= 1024
    assert_p0_snapshot_measurements(real_snapshot, state.signals[1])
    @test real_snapshot["measurements"]["items"][1]["sample_index"] == 1050
    @test real_snapshot["measurements"]["items"][2]["sample_index"] == 1025
    @test state.view.state_revision == 0
    repeated = SA.signal_analyser_snapshot(state)
    @test repeated["state_revision"] == real_snapshot["state_revision"]
    @test repeated["visible_signals"] == real_snapshot["visible_signals"]
    @test repeated["measurements"] == real_snapshot["measurements"]

    complex_snapshot = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "selected_signal" => "raw-complex"))
    @test complex_snapshot["state_revision"] == 1
    assert_p0_snapshot_measurements(complex_snapshot, state.signals[2])
    @test complex_snapshot["measurements"]["items"][1]["sample_index"] == 1050
    @test complex_snapshot["measurements"]["items"][2]["sample_index"] == 1025

    fallback = SA.apply_signal_analyser_view!(
        state,
        Dict("state_revision" => 1, "visible_signals" => ["raw-real"]),
    )
    @test fallback["state_revision"] == 2
    @test fallback["selected_signal"] == "raw-real"
    assert_p0_snapshot_measurements(fallback, state.signals[1])
end

function invalid_raw_selection_state()
    valid = SA.AnalysedSignal(
        "valid-raw",
        "#111111",
        1000.0,
        ComplexF64[1.0 + 0.0im, 2.0 + 0.0im, 3.0 + 0.0im],
        false,
        true,
    )
    invalid = SA.AnalysedSignal(
        "invalid-raw",
        "#222222",
        1000.0,
        ComplexF64[1.0 + 0.0im, NaN + 0.0im, 3.0 + 0.0im],
        false,
        false,
    )
    SA.SignalAnalyserState(
        SA.AnalysedSignal[valid, invalid],
        SA.SignalAnalyserViewState(0, SA.TIME_PLOT, valid.name),
        Dict{String,Dict{String,Any}}(),
        ReentrantLock(),
    )
end

function state_publication_fingerprint(state)
    (
        revision = state.view.state_revision,
        active_display_id = state.active_display_id,
        active_plot = state.view.active_plot,
        row_selected_signal = state.row_selection.signal_name,
        analysis_signal = state.view.selected_signal,
        displays = [
            (
                id = display.id,
                active_plot = display.active_plot,
                analysis_signal = SA.signal_analyser_display_analysis_name(display),
                visible_signals = SA.signal_analyser_display_members(display),
                peaks_enabled = display.peaks_enabled,
            )
            for display in state.displays
        ],
        plot_cache = deepcopy(state.plot_cache),
    )
end

@testset "Signal Analyser invalid raw measurements abort View and Display publication" begin
    SA.reset_pspectrum_double!()
    state = invalid_raw_selection_state()
    baseline_snapshot = SA.signal_analyser_snapshot(state)
    baseline = state_publication_fingerprint(state)

    @test_throws ArgumentError SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 0,
        "selected_signal" => "invalid-raw",
        "visible_signals" => ["valid-raw", "invalid-raw"],
    ))
    @test state_publication_fingerprint(state) == baseline
    @test SA.signal_analyser_snapshot(state) == baseline_snapshot

    invalid_display = SA.SignalAnalyserDisplayState(
        "display-invalid",
        "Display invalid",
        SA.TIME_PLOT,
        "invalid-raw",
        ["valid-raw", "invalid-raw"],
    )
    push!(state.displays, invalid_display)
    display_baseline_snapshot = SA.signal_analyser_snapshot(state)
    display_baseline = state_publication_fingerprint(state)

    @test_throws ArgumentError SA.apply_signal_analyser_display!(state, Dict(
        "state_revision" => 0,
        "operation" => "select",
        "display_id" => "display-invalid",
    ))
    @test state_publication_fingerprint(state) == display_baseline
    @test SA.signal_analyser_snapshot(state) == display_baseline_snapshot
end

@testset "Signal Analyser Peaks provider failures and display scope are atomic" begin
    result = SA.SignalPeaksProviderResult([9.0], [2], [1.0], [3.0], 1100)
    fake = FakePeaksProvider(SA.SignalPeaksQuery[], result, nothing)
    base = p0_measurement_state()
    state = SA.SignalAnalyserState(base.signals, base.view, Dict{String,Dict{String,Any}}(), ReentrantLock(); peaks_provider = fake)
    before = SA.signal_analyser_snapshot(state)
    fingerprint = state_publication_fingerprint(state)
    fake.failure = ArgumentError("provider failure")
    @test_throws ArgumentError SA.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "peaks_enabled" => true))
    @test state_publication_fingerprint(state) == fingerprint
    @test SA.signal_analyser_snapshot(state) == before

    fake.failure = nothing
    complex_enabled = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "selected_signal" => "raw-complex", "peaks_enabled" => true))
    @test fake.calls[end].ordinate == SA.MAGNITUDE_ORDINATE
    @test collect(fake.calls[end].values) == Float64.(abs.(state.signals[2].values))
    @test complex_enabled["peaks"]["signal_name"] == "raw-complex"
    @test complex_enabled["peaks"]["items"][1]["sample_index"] == 1

    selected_change_before = state_publication_fingerprint(state)
    fake.failure = ArgumentError("provider failure on selected signal")
    @test_throws ArgumentError SA.apply_signal_analyser_view!(state, Dict("state_revision" => 1, "selected_signal" => "raw-real"))
    @test state_publication_fingerprint(state) == selected_change_before
    fake.failure = nothing

    created = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 1, "operation" => "create"))
    @test created["active_display_id"] == "display-2"
    @test created["displays"][1]["peaks_enabled"] === true
    @test created["displays"][2]["peaks_enabled"] === false
    first = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 2, "operation" => "select", "display_id" => "display-1"))
    @test first["peaks"]["display_id"] == "display-1"
    @test first["peaks"]["enabled"] === true
    second = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 3, "operation" => "select", "display_id" => "display-2"))
    @test second["peaks"]["display_id"] == "display-2"
    @test second["peaks"]["enabled"] === false

    empty_fake = FakePeaksProvider(SA.SignalPeaksQuery[], SA.SignalPeaksProviderResult(Float64[], Int[], Float64[], Float64[], 1100), nothing)
    empty_base = p0_measurement_state()
    empty_state = SA.SignalAnalyserState(empty_base.signals, empty_base.view, Dict{String,Dict{String,Any}}(), ReentrantLock(); peaks_provider = empty_fake)
    empty = SA.apply_signal_analyser_view!(empty_state, Dict("state_revision" => 0, "peaks_enabled" => true))
    @test empty["peaks"]["enabled"] === true
    @test empty["peaks"]["items"] == Any[]
end

function assert_empty_display_snapshot(snapshot)
    @test snapshot["analysis_signal"] === nothing
    @test snapshot["selected_signal"] === nothing
    @test snapshot["visible_signals"] == String[]
    @test snapshot["plot_payload"]["selected_signal"] === nothing
    @test snapshot["plot_payload"]["visible_signals"] == String[]
    @test snapshot["plot_payload"]["time_traces"] == Any[]
    @test snapshot["plot_payload"]["spectrum_traces"] == Any[]
    for key in ("time", "spectrum")
        @test snapshot["plots"][key]["type"] == "line"
        @test snapshot["plots"][key]["x"] == Any[]
        @test snapshot["plots"][key]["y"] == Any[]
    end
    for key in ("spectrogram", "persistence")
        @test snapshot["plots"][key]["type"] == "heatmap"
        @test snapshot["plots"][key]["x"] == Any[]
        @test snapshot["plots"][key]["y"] == Any[]
        @test snapshot["plots"][key]["z"] == Any[]
        @test snapshot["plot_payload"][key]["type"] == "heatmap"
        @test snapshot["plot_payload"][key]["signal"] === nothing
    end
    @test snapshot["measurements"] == Dict(
        "state_revision" => snapshot["state_revision"],
        "signal_name" => nothing,
        "ordinate" => nothing,
        "units" => Dict("time" => "s", "value" => "1"),
        "items" => Any[],
    )
    @test snapshot["peaks"] == Dict(
        "enabled" => false,
        "state_revision" => snapshot["state_revision"],
        "display_id" => snapshot["active_display_id"],
        "signal_name" => nothing,
        "ordinate" => nothing,
        "units" => Dict("value" => "1", "time" => "s", "width" => "samples", "prominence" => "1"),
        "items" => Any[],
    )
end

@testset "Cascade 5 separates rows, membership and analysis lifecycle" begin
    SA.reset_pspectrum_double!()
    names = ["raw-real", "raw-complex"]
    provider = FakePeaksProvider(SA.SignalPeaksQuery[], SA.SignalPeaksProviderResult([9.0], [2], [1.0], [3.0], 1100), nothing)
    base = p0_measurement_state()
    state = SA.SignalAnalyserState(base.signals, base.view, Dict{String,Dict{String,Any}}(), ReentrantLock(); peaks_provider = provider)

    initial = SA.signal_analyser_snapshot(state)
    @test initial["row_selected_signal"] == names[1]
    @test initial["analysis_signal"] == names[1] == initial["selected_signal"]

    independent_canonical = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 0,
        "row_selected_signal" => names[2],
        "analysis_signal" => names[1],
    ))
    @test independent_canonical["state_revision"] == 1
    @test independent_canonical["row_selected_signal"] == names[2]
    @test independent_canonical["analysis_signal"] == names[1]
    @test independent_canonical["visible_signals"] == names

    enabled = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 1, "peaks_enabled" => true))
    @test enabled["state_revision"] == 2
    @test length(provider.calls) == 1

    clear = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 2, "visible_signals" => String[]))
    @test clear["state_revision"] == 3
    @test clear["row_selected_signal"] == names[2]
    @test clear["displays"][1]["peaks_enabled"] === false
    @test length(provider.calls) == 1
    assert_empty_display_snapshot(clear)

    no_op_clear = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 3, "visible_signals" => String[], "analysis_signal" => nothing, "selected_signal" => nothing))
    @test no_op_clear["state_revision"] == 3
    @test length(provider.calls) == 1

    recovered = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 3, "visible_signals" => [names[2]]))
    @test recovered["state_revision"] == 4
    @test recovered["row_selected_signal"] == names[2]
    assert_visibility(recovered, [names[2]], names[2])
    @test recovered["displays"][1]["peaks_enabled"] === false
    @test length(provider.calls) == 1

    before_conflict = SA.signal_analyser_snapshot(state)
    conflict = try
        SA.apply_signal_analyser_view!(state, Dict("state_revision" => 4, "analysis_signal" => names[1], "selected_signal" => names[2]))
        nothing
    catch caught
        caught
    end
    @test conflict isa SA.SignalAnalyserValidationError
    @test haskey(conflict.fields, "analysis_signal") || haskey(conflict.fields, "selected_signal")
    @test SA.signal_analyser_snapshot(state) == before_conflict

    stale = try
        SA.apply_signal_analyser_view!(state, Dict("state_revision" => 3, "visible_signals" => String[]))
        nothing
    catch caught
        caught
    end
    @test stale isa SA.SignalAnalyserStaleStateError
    @test SA.signal_analyser_snapshot(state) == before_conflict
end

@testset "Cascade 5 Clear Display preserves inactive pages and seeded creation" begin
    SA.reset_pspectrum_double!()
    state = SA.default_signal_analyser_state()
    names = [signal.name for signal in state.signals]
    created = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 0, "operation" => "create"))
    @test created["active_display_id"] == "display-2"
    @test created["displays"][2]["visible_signals"] == names
    @test created["displays"][2]["analysis_signal"] == names[1]

    first = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 1, "operation" => "select", "display_id" => "display-1"))
    cleared = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 2, "visible_signals" => String[]))
    assert_empty_display_snapshot(cleared)
    second = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 3, "operation" => "select", "display_id" => "display-2"))
    @test second["visible_signals"] == names
    @test second["analysis_signal"] == names[1]
    @test second["displays"][1]["visible_signals"] == String[]
    @test second["displays"][1]["analysis_signal"] === nothing

    restored_first = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 4, "operation" => "select", "display_id" => "display-1"))
    restored = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 5, "visible_signals" => [names[1]]))
    @test restored["analysis_signal"] == names[1]
    @test restored["displays"][2]["visible_signals"] == names
    @test restored["displays"][2]["analysis_signal"] == names[1]
end
