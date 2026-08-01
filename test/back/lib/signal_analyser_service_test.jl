using Test

const SA = Main.AppTestContext

mutable struct FakePeaksProvider <: SA.AbstractPeaksProvider
    calls::Vector{SA.SignalPeaksQuery}
    result::SA.SignalPeaksProviderResult
    failure::Union{Nothing,Exception}
end

@testset "Cascade 15 Spectrogram Frequency Limits typed state, cache and metadata" begin
    auto = SA.AutomaticSignalSpectrumFrequencyLimits()
    explicit = SA.ExplicitSignalSpectrumFrequencyLimits(-2.0, 4.0)
    @test SA.signal_spectrum_frequency_limits_payload(auto) === nothing
    @test SA.signal_spectrum_frequency_limits_payload(explicit) == Dict("min_hz" => -2.0, "max_hz" => 4.0, "units" => "Hz")
    @test_throws ArgumentError SA.ExplicitSignalSpectrumFrequencyLimits(-0.0, -0.0)
    @test_throws ArgumentError SA.ExplicitSignalSpectrumFrequencyLimits(NaN, 1.0)

    SA.reset_pspectrum_double!(); empty!(SA.SPECTRUM_CALLS); empty!(SA.SPECTROGRAM_CALLS)
    state = SA.default_signal_analyser_state()
    initial = SA.signal_analyser_snapshot(state)
    auto_settings = Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear")
    @test initial["spectrogram_settings"] == auto_settings
    @test initial["plots"]["spectrogram"]["frequency_limits"] == Dict("mode" => "auto", "requested" => nothing,
        "effective" => Dict("min_hz" => 0.0, "max_hz" => state.signals[1].sample_rate_hz / 2, "units" => "Hz"))
    empty!(SA.SPECTRUM_CALLS); empty!(state.spectrum_cache)

    invalids = (
        Dict("overlap_percent" => 50.0, "leakage" => 0.5),
        Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => true, "frequency_scale" => "linear"),
        Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => Dict("min_hz" => true, "max_hz" => 1.0, "units" => "Hz"), "frequency_scale" => "linear"),
        Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => Dict("min_hz" => 1.0, "max_hz" => 1.0, "units" => "Hz"), "frequency_scale" => "linear"),
        Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => Dict("min_hz" => NaN, "max_hz" => 1.0, "units" => "Hz"), "frequency_scale" => "linear"),
        Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => Dict("min_hz" => 0.0, "max_hz" => 1.0, "units" => "kHz"), "frequency_scale" => "linear"),
        Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => Dict("min_hz" => -1.0, "max_hz" => 1.0, "units" => "Hz"), "frequency_scale" => "linear"),
    )
    for settings in invalids
        @test_throws SA.SignalAnalyserValidationError SA.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "spectrogram_settings" => settings))
        @test SA.signal_analyser_snapshot(state) == initial
    end
    empty!(SA.SPECTRUM_CALLS); empty!(state.spectrum_cache)

    limits = Dict("min_hz" => 1.0, "max_hz" => 4.0, "units" => "Hz")
    explicit_settings = Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => limits, "frequency_scale" => "linear")
    changed = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "spectrogram_settings" => explicit_settings))
    @test changed["state_revision"] == 1 && changed["spectrogram_settings"] == explicit_settings
    @test changed["plots"]["spectrogram"]["frequency_limits"] == Dict("mode" => "explicit", "requested" => limits, "effective" => limits)
    @test SA.SPECTROGRAM_CALLS[end].frequency_limits == SA.ExplicitSignalSpectrumFrequencyLimits(1.0, 4.0)
    @test isempty(SA.SPECTRUM_CALLS) # C15 must not materialize Spectrum on a limit-only update.
    @test SA.apply_signal_analyser_view!(state, Dict("state_revision" => 1, "spectrogram_settings" => explicit_settings))["state_revision"] == 1

    # Auto and an explicit full band are distinct provider/cache identities.
    full = Dict("overlap_percent" => 50.0, "leakage" => 0.5,
        "frequency_limits" => Dict("min_hz" => 0.0, "max_hz" => state.signals[1].sample_rate_hz / 2, "units" => "Hz"), "frequency_scale" => "linear")
    calls_before_full = length(SA.SPECTROGRAM_CALLS)
    full_changed = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 1, "spectrogram_settings" => full))
    @test full_changed["state_revision"] == 2 && length(SA.SPECTROGRAM_CALLS) == calls_before_full + 1
    @test SA.SPECTROGRAM_CALLS[end].frequency_limits isa SA.ExplicitSignalSpectrumFrequencyLimits

    # C11 short-input bypass still avoids the provider; N=2 delegates.
    short = SA.AnalysedSignal("c15-short", "#111111", 10.0, ComplexF64[1], false, true)
    empty!(SA.SPECTROGRAM_CALLS)
    short_data = SA.signal_spectrogram_data(SA.SignalSpectrogramService(SA.EngeeDSPSpectrogramProvider()), short)
    @test isempty(SA.SPECTROGRAM_CALLS)
    @test isempty(short_data.frequencies_hz)
    two = SA.AnalysedSignal("c15-two", "#111111", 10.0, ComplexF64[1, 2], false, true)
    SA.signal_spectrogram_data(SA.SignalSpectrogramService(SA.EngeeDSPSpectrogramProvider()), two)
    @test length(SA.SPECTROGRAM_CALLS) == 1

    # Explicit intent is Display-local, survives a valid real→centered-complex source change,
    # and resets atomically when the new authoritative source cannot contain it.
    real = SA.AnalysedSignal("c15-real", "#111111", 100.0, ComplexF64[1, 2, 3], false, true)
    complex = SA.AnalysedSignal("c15-complex", "#222222", 100.0, ComplexF64[1 + im, 2 + im, 3 + im], true, true)
    narrow = SA.AnalysedSignal("c15-narrow", "#333333", 10.0, ComplexF64[1, 2, 3], false, true)
    transitions = SA.SignalAnalyserState([real, complex, narrow], SA.SignalAnalyserViewState(0, SA.TIME_PLOT, real.name), Dict{String,Dict{String,Any}}(), ReentrantLock())
    complex_limits = Dict("min_hz" => 10.0, "max_hz" => 20.0, "units" => "Hz")
    c15_explicit = Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => complex_limits, "frequency_scale" => "linear")
    first = SA.apply_signal_analyser_view!(transitions, Dict("state_revision" => 0, "spectrogram_settings" => c15_explicit))
    centered = SA.apply_signal_analyser_view!(transitions, Dict("state_revision" => 1, "analysis_signal" => complex.name))
    @test centered["spectrogram_settings"] == c15_explicit
    @test centered["plots"]["spectrogram"]["frequency_limits"] == Dict("mode" => "explicit", "requested" => complex_limits, "effective" => complex_limits)
    reset = SA.apply_signal_analyser_view!(transitions, Dict("state_revision" => 2, "analysis_signal" => narrow.name))
    @test reset["spectrogram_settings"]["frequency_limits"] === nothing
    @test reset["plots"]["spectrogram"]["frequency_limits"]["mode"] == "auto"
    empty!(SA.SPECTRUM_CALLS); empty!(SA.SPECTROGRAM_CALLS)
end

struct InvalidSpectrogramProvider <: SA.AbstractSignalSpectrogramProvider
    data::SA.SignalSpectrogramData
end
SA.signal_spectrogram_calculate(provider::InvalidSpectrogramProvider, query::SA.SignalSpectrogramQuery) = provider.data

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

    @test SA.snapshot_keyset(snapshot) == Set(["state_revision", "active_display_id", "displays", "active_plot", "row_selected_signal", "analysis_signal", "selected_signal", "visible_signals", "time_limits", "measurement_kinds", "spectrum_settings", "spectrogram_settings", "signals", "plots", "plot_payload", "measurements", "peaks", "panel"])
    @test snapshot["active_display_id"] == "display-1"
    @test snapshot["displays"] == [Dict(
        "id" => "display-1",
        "name" => "Display 1",
        "active_plot" => "time",
        "analysis_signal" => "Гармонический сигнал",
        "selected_signal" => "Гармонический сигнал",
        "visible_signals" => ["Гармонический сигнал", "Комплексный ЛЧМ-сигнал"],
        "time_limits" => Dict("min_s" => 0.0, "max_s" => 511 / 2048, "units" => "s"),
        "measurement_kinds" => ["minimum", "maximum", "mean"],
        "spectrum_settings" => Dict("scale" => "db", "frequency_scale" => "linear", "leakage" => 0.5, "frequency_limits" => nothing),
        "spectrogram_settings" => Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear"),
        "peaks_enabled" => false,
    )]
    @test snapshot["state_revision"] == 0
    @test snapshot["active_plot"] == "time"
    @test snapshot["row_selected_signal"] == "Гармонический сигнал"
    @test snapshot["analysis_signal"] == "Гармонический сигнал"
    @test snapshot["time_limits"] == Dict("min_s" => 0.0, "max_s" => 511 / 2048, "units" => "s")
    @test snapshot["measurement_kinds"] == ["minimum", "maximum", "mean"]
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
    @test snapshot["plots"]["spectrum"]["method"] == "pspectrum"
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
    @test length(SA.SPECTRUM_CALLS) == 2
    @test all(query -> query.leakage == 0.5, SA.SPECTRUM_CALLS)

    SA.signal_analyser_snapshot(state)
    @test length(SA.SPECTRUM_CALLS) == 2

    second_name = snapshot["signals"][2]["name"]
    second_snapshot = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "selected_signal" => second_name))
    @test second_snapshot["state_revision"] == 1
    @test second_snapshot["selected_signal"] == second_name
    @test second_snapshot["plot_payload"]["spectrogram"]["signal"] == second_name
    @test second_snapshot["plot_payload"]["persistence"]["signal"] == second_name
    @test second_snapshot["plots"]["time"]["y"] == second_snapshot["plot_payload"]["time_traces"][2]["y"]
    @test second_snapshot["plots"]["spectrum"]["y"] == second_snapshot["plot_payload"]["spectrum_traces"][2]["y"]
    assert_p0_snapshot_measurements(second_snapshot, state.signals[2])
    @test length(SA.SPECTRUM_CALLS) == 2
    assert_heatmap_plot(second_snapshot["plots"]["spectrogram"])

    SA.apply_signal_analyser_view!(state, Dict("state_revision" => 1, "active_plot" => "spectrum"))
    @test length(SA.SPECTRUM_CALLS) == 2
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
        "time_limits" => Dict("min_s" => 0.0, "max_s" => 511 / 2048, "units" => "s"),
        "measurement_kinds" => ["minimum", "maximum", "mean"],
        "spectrum_settings" => Dict("scale" => "db", "frequency_scale" => "linear", "leakage" => 0.5, "frequency_limits" => nothing),
        "spectrogram_settings" => Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear"),
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
        SA.SignalTimeLimits(0.0, 0.002),
        false,
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

@testset "Cascade 7 Time Limits ROI" begin
    @test SA.SignalTimeLimits(0, 1) == SA.SignalTimeLimits(0.0, 1.0)
    @test_throws ArgumentError SA.SignalTimeLimits(1, 1)
    @test_throws ArgumentError SA.SignalTimeLimits(NaN, 1)
    roi = SA.SignalOrdinateRoi(SA.REAL_ORDINATE, [1.0], 7, 10.0)
    @test roi.sample_offset == 7
    @test collect(roi.values) == [1.0]
    @test_throws ArgumentError SA.SignalOrdinateRoi(SA.REAL_ORDINATE, Float64[], 0, 1.0)
end

@testset "Cascade 7 Time Limits ROI publication, Peaks and lifecycle" begin
    # Use a deliberately long raw signal: these assertions prove that ROI work is
    # performed before the Time-plot downsampling boundary and uses absolute
    # (zero-based) signal coordinates.
    values = ComplexF64.(collect(0:19))
    signal = SA.AnalysedSignal("roi", "#111111", 10.0, values, false, true)
    provider = FakePeaksProvider(
        SA.SignalPeaksQuery[],
        SA.SignalPeaksProviderResult([8.0], [2], [1.5], [3.0], 4),
        nothing,
    )
    state = SA.SignalAnalyserState(
        SA.AnalysedSignal[signal],
        SA.SignalAnalyserViewState(0, SA.TIME_PLOT, signal.name),
        Dict{String,Dict{String,Any}}(),
        ReentrantLock(); peaks_provider = provider,
    )

    # 0.7..1.01 includes raw samples 7,8,9,10 (both endpoints inclusive).
    four = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 0,
        "time_limits" => Dict("min_s" => 0.7, "max_s" => 1.01, "units" => "s"),
    ))
    @test four["state_revision"] == 1
    @test four["time_limits"] == Dict("min_s" => 0.7, "max_s" => 1.01, "units" => "s")
    @test four["measurements"]["items"] == [
        Dict("id" => "minimum", "label" => "Минимум", "value" => 7.0, "time_s" => 0.7, "sample_index" => 7),
        Dict("id" => "maximum", "label" => "Максимум", "value" => 10.0, "time_s" => 1.0, "sample_index" => 10),
        Dict("id" => "mean", "label" => "Среднее", "value" => 8.5, "time_s" => nothing, "sample_index" => nothing),
    ]
    @test isempty(provider.calls)

    one = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 1,
        "time_limits" => Dict("min_s" => 0.7, "max_s" => 0.71, "units" => "s"),
        "peaks_enabled" => true,
    ))
    @test one["state_revision"] == 2
    @test one["peaks"]["enabled"] === true
    @test one["peaks"]["items"] == Any[]
    @test isempty(provider.calls) # 1 raw sample: provider must not be invoked.

    two = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 2,
        "time_limits" => Dict("min_s" => 0.7, "max_s" => 0.81, "units" => "s"),
    ))
    @test two["state_revision"] == 3
    @test two["peaks"]["enabled"] === true
    @test two["peaks"]["items"] == Any[]
    @test isempty(provider.calls) # 2 raw samples: the same guard applies.

    peaks = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 3,
        "time_limits" => Dict("min_s" => 0.7, "max_s" => 1.01, "units" => "s"),
    ))
    @test peaks["state_revision"] == 4
    @test length(provider.calls) == 1
    query = only(provider.calls)
    @test query.sample_offset == 7
    @test collect(query.values) == [7.0, 8.0, 9.0, 10.0]
    @test query.state_revision == 4
    @test peaks["peaks"]["items"] == [Dict(
        "id" => "peak-8", "value" => 8.0, "time_s" => 0.8,
        "sample_index" => 8, "width_samples" => 1.5, "prominence" => 3.0,
    )]

    no_op = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 4,
        "time_limits" => Dict("min_s" => 0.7, "max_s" => 1.01, "units" => "s"),
        "peaks_enabled" => true,
    ))
    @test no_op["state_revision"] == 4
    @test length(provider.calls) == 2 # snapshot refresh is allowed; mutation is not.

    before_invalid = SA.signal_analyser_snapshot(state)
    invalid = try
        SA.apply_signal_analyser_view!(state, Dict(
            "state_revision" => 4,
            "time_limits" => Dict("min_s" => 1.1, "max_s" => 1.0, "units" => "s"),
        ))
        nothing
    catch caught
        caught
    end
    @test invalid isa SA.SignalAnalyserValidationError
    @test Set(keys(invalid.fields)) == Set(["time_limits"])
    @test SA.signal_analyser_snapshot(state) == before_invalid

    before_provider_failure = (
        state.view.state_revision,
        state.active_display_id,
        state.view.active_plot,
        state.view.selected_signal,
        state.displays[1].time_limits,
        state.displays[1].peaks_enabled,
        deepcopy(state.plot_cache),
    )
    provider.failure = ArgumentError("ROI provider failure")
    @test_throws ArgumentError SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 4,
        "time_limits" => Dict("min_s" => 0.8, "max_s" => 1.11, "units" => "s"),
    ))
    @test (
        state.view.state_revision,
        state.active_display_id,
        state.view.active_plot,
        state.view.selected_signal,
        state.displays[1].time_limits,
        state.displays[1].peaks_enabled,
        state.plot_cache,
    ) == before_provider_failure
    provider.failure = nothing

    # A carried range follows a source change only when it is valid for the
    # prospective analysis source; otherwise the new source receives its full range.
    short = SA.AnalysedSignal("short", "#222222", 10.0, ComplexF64.(collect(0:4)), false, true)
    long = SA.AnalysedSignal("long", "#333333", 10.0, ComplexF64.(collect(0:10)), false, true)
    lifecycle = SA.SignalAnalyserState(
        SA.AnalysedSignal[long, short], SA.SignalAnalyserViewState(0, SA.TIME_PLOT, long.name),
        Dict{String,Dict{String,Any}}(), ReentrantLock(); peaks_provider = FakePeaksProvider(
            SA.SignalPeaksQuery[], SA.SignalPeaksProviderResult(Float64[], Int[], Float64[], Float64[], 3), nothing,
        ),
    )
    narrowed = SA.apply_signal_analyser_view!(lifecycle, Dict(
        "state_revision" => 0,
        "time_limits" => Dict("min_s" => 0.5, "max_s" => 0.7, "units" => "s"),
    ))
    reset_on_short = SA.apply_signal_analyser_view!(lifecycle, Dict(
        "state_revision" => 1, "analysis_signal" => short.name,
        "time_limits" => narrowed["time_limits"],
    ))
    @test reset_on_short["time_limits"] == Dict("min_s" => 0.0, "max_s" => 0.4, "units" => "s")
    short_narrowed = SA.apply_signal_analyser_view!(lifecycle, Dict(
        "state_revision" => 2,
        "time_limits" => Dict("min_s" => 0.2, "max_s" => 0.4, "units" => "s"),
    ))
    preserved = SA.apply_signal_analyser_view!(lifecycle, Dict(
        "state_revision" => 3, "analysis_signal" => long.name,
        "time_limits" => short_narrowed["time_limits"],
    ))
    @test preserved["time_limits"] == short_narrowed["time_limits"]
    cleared = SA.apply_signal_analyser_view!(lifecycle, Dict("state_revision" => 4, "visible_signals" => String[], "time_limits" => nothing))
    @test cleared["time_limits"] === nothing
    readded = SA.apply_signal_analyser_view!(lifecycle, Dict("state_revision" => 5, "visible_signals" => [short.name], "time_limits" => nothing))
    @test readded["time_limits"] == Dict("min_s" => 0.0, "max_s" => 0.4, "units" => "s")
    created = SA.apply_signal_analyser_display!(lifecycle, Dict("state_revision" => 6, "operation" => "create"))
    @test created["time_limits"] == Dict("min_s" => 0.0, "max_s" => 1.0, "units" => "s")
    returned = SA.apply_signal_analyser_display!(lifecycle, Dict("state_revision" => 7, "operation" => "select", "display_id" => "display-1"))
    @test returned["time_limits"] == readded["time_limits"]
end

@testset "Cascade 8 selectable measurement kinds are canonical ROI statistics" begin
    signal = SA.AnalysedSignal(
        "statistics-real", "#111111", 10.0,
        ComplexF64[-2, 10, 2, -2, 4], false, true,
    )
    state = SA.SignalAnalyserState(
        SA.AnalysedSignal[signal], SA.SignalAnalyserViewState(0, SA.TIME_PLOT, signal.name),
        Dict{String,Dict{String,Any}}(), ReentrantLock(),
    )
    initial = SA.signal_analyser_snapshot(state)
    @test initial["measurement_kinds"] == ["minimum", "maximum", "mean"]
    @test initial["displays"][1]["measurement_kinds"] == ["minimum", "maximum", "mean"]

    all_kinds = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 0,
        # Request order is intentionally noncanonical: the wire/snapshot order is fixed.
        "measurement_kinds" => ["rms", "peak_to_peak", "median", "mean", "maximum", "minimum"],
    ))
    @test all_kinds["state_revision"] == 1
    @test all_kinds["measurement_kinds"] == ["minimum", "maximum", "mean", "median", "peak_to_peak", "rms"]
    @test all_kinds["displays"][1]["measurement_kinds"] == all_kinds["measurement_kinds"]
    items = all_kinds["measurements"]["items"]
    @test [item["id"] for item in items] == all_kinds["measurement_kinds"]
    @test [item["value"] for item in items][1:5] == [-2.0, 10.0, 2.4, 2.0, 12.0]
    @test items[6]["value"] ≈ sqrt(128 / 5)
    @test items[1]["sample_index"] == 0 && items[1]["time_s"] == 0.0 # first of tied minima
    @test items[2]["sample_index"] == 1 && items[2]["time_s"] == 0.1
    @test all(item -> item["sample_index"] === nothing && item["time_s"] === nothing, items[3:end])
    no_op = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 1, "measurement_kinds" => reverse(all_kinds["measurement_kinds"]),
    ))
    @test no_op["state_revision"] == 1

    empty = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 1, "measurement_kinds" => String[]))
    @test empty["state_revision"] == 2
    @test empty["measurement_kinds"] == String[]
    @test empty["measurements"]["signal_name"] == signal.name
    @test empty["measurements"]["ordinate"] == "real"
    @test empty["measurements"]["items"] == Any[]

    created = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 2, "operation" => "create"))
    @test created["active_display_id"] == "display-2"
    @test created["measurement_kinds"] == ["minimum", "maximum", "mean"]
    @test created["displays"][1]["measurement_kinds"] == String[] # inactive preference is untouched
    first = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 3, "operation" => "select", "display_id" => "display-1"))
    @test first["measurement_kinds"] == String[]
    cleared = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 4, "visible_signals" => String[]))
    @test cleared["measurement_kinds"] == String[]
    @test cleared["measurements"]["signal_name"] === nothing
    @test cleared["measurements"]["items"] == Any[]
    readded = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 5, "visible_signals" => [signal.name]))
    @test readded["measurement_kinds"] == String[]
    @test readded["measurements"]["signal_name"] == signal.name
    @test readded["measurements"]["items"] == Any[]
end

@testset "Cascade 8 metric edge mathematics and ordinate provenance" begin
    service = SA.SignalMeasurementsService()
    all_selection = SA.SignalMeasurementSelection(collect(SA.SIGNAL_MEASUREMENT_CANONICAL_KINDS))
    even = SA.AnalysedSignal("even", "#111111", 10.0, ComplexF64[1, 10, 2, 7], false, true)
    even_snapshot = SA.signal_measurements_snapshot(service, 0, even, SA.SignalTimeLimits(0, 0.3), all_selection)
    @test [item.value for item in even_snapshot.items] ≈ [1.0, 10.0, 5.0, 4.5, 9.0, sqrt(154 / 4)]
    @test all(item -> item.position === nothing, even_snapshot.items[3:end])

    complex_signal = SA.AnalysedSignal("complex", "#222222", 10.0, ComplexF64[3 + 4im, 5 + 12im, 8 + 15im], true, true)
    complex_snapshot = SA.signal_measurements_snapshot(service, 0, complex_signal, SA.SignalTimeLimits(0, 0.2), all_selection)
    @test complex_snapshot.ordinate == SA.MAGNITUDE_ORDINATE
    @test [item.value for item in complex_snapshot.items] ≈ [5.0, 17.0, 35 / 3, 13.0, 12.0, sqrt(483 / 3)]
    @test complex_snapshot.items[1].position.sample_index == 0
    @test complex_snapshot.items[2].position.sample_index == 2

    # The scale-normalized RMS implementation must remain finite where direct
    # squaring of finite Float64 samples would overflow.
    huge = SA.AnalysedSignal("huge", "#333333", 10.0, ComplexF64[floatmax(Float64) / 2, -floatmax(Float64) / 2], false, true)
    rms_selection = SA.SignalMeasurementSelection([SA.RMS_MEASUREMENT])
    huge_snapshot = SA.signal_measurements_snapshot(service, 0, huge, SA.SignalTimeLimits(0, 0.1), rms_selection)
    @test isfinite(only(huge_snapshot.items).value)
    @test only(huge_snapshot.items).value == floatmax(Float64) / 2

    # Empty selection never resolves raw data: invalid samples cannot turn a
    # selected-empty Measurements request into a hidden validation/DSP call.
    invalid = SA.AnalysedSignal("invalid-empty", "#444444", 10.0, ComplexF64[NaN, 1], false, true)
    empty_snapshot = SA.signal_measurements_snapshot(service, 0, invalid, SA.SignalTimeLimits(0, 0.1), SA.SignalMeasurementSelection(SA.SignalMeasurementKind[]))
    @test empty_snapshot.signal_name == invalid.name
    @test empty_snapshot.ordinate == SA.REAL_ORDINATE
    @test isempty(empty_snapshot.items)
end

@testset "Cascade 9 Spectrum settings provider and mutation contract" begin
    SA.reset_pspectrum_double!()
    empty!(SA.SPECTRUM_CALLS)
    state = SA.default_signal_analyser_state()
    initial = SA.signal_analyser_snapshot(state)
    @test initial["spectrum_settings"] == Dict("scale" => "db", "frequency_scale" => "linear", "leakage" => 0.5, "frequency_limits" => nothing)
    @test initial["displays"][1]["spectrum_settings"] == initial["spectrum_settings"]
    @test length(SA.SPECTRUM_CALLS) == 2
    @test SA.SPECTRUM_CALLS[1].topology == SA.ONE_SIDED_SPECTRUM
    @test SA.SPECTRUM_CALLS[2].topology == SA.CENTERED_TWO_SIDED_SPECTRUM
    @test all(value -> value isa ComplexF64, SA.SPECTRUM_CALLS[2].values)
    before = SA.signal_analyser_snapshot(state)
    invalid = try SA.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "spectrum_settings" => Dict("scale" => "db", "frequency_scale" => "linear", "leakage" => 2.0, "frequency_limits" => nothing))); nothing catch e; e end
    @test invalid isa SA.SignalAnalyserValidationError
    @test haskey(invalid.fields, "spectrum_settings")
    @test SA.signal_analyser_snapshot(state) == before
    linear = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "spectrum_settings" => Dict("scale" => "linear", "frequency_scale" => "linear", "leakage" => 0.5, "frequency_limits" => nothing)))
    @test linear["state_revision"] == 1
    @test linear["plots"]["spectrum"]["y"] == [1.0, 4.0]
    @test length(SA.SPECTRUM_CALLS) == 2
    noop = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 1, "spectrum_settings" => Dict("scale" => "linear", "frequency_scale" => "linear", "leakage" => 0.5, "frequency_limits" => nothing)))
    @test noop["state_revision"] == 1

    # The nested object is a strict, atomic contract.  None of these malformed
    # variants may publish a partial Display mutation or invalidate raw caches.
    before_invalid = SA.signal_analyser_snapshot(state)
    for malformed in (
        nothing,
        Dict("scale" => "db", "frequency_scale" => "linear"),
        Dict("scale" => "watts", "frequency_scale" => "linear", "leakage" => 0.5),
        Dict("scale" => "db", "frequency_scale" => "octave", "leakage" => 0.5),
        Dict("scale" => "db", "frequency_scale" => "linear", "leakage" => true),
    )
        err = try
            SA.apply_signal_analyser_view!(state, Dict("state_revision" => 1, "spectrum_settings" => malformed))
            nothing
        catch caught
            caught
        end
        @test err isa SA.SignalAnalyserValidationError
        @test haskey(err.fields, "spectrum_settings")
        @test SA.signal_analyser_snapshot(state) == before_invalid
    end

    # Scale and frequency presentation are deliberately excluded from raw
    # provider identity; leakage is part of it and must recalculate.
    db = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 1,
        "spectrum_settings" => Dict("scale" => "db", "frequency_scale" => "linear", "leakage" => 0.5, "frequency_limits" => nothing)))
    @test db["state_revision"] == 2
    @test db["plots"]["spectrum"]["y"] ≈ [0.0, 10 * log10(4.0)]
    @test length(SA.SPECTRUM_CALLS) == 2
    leakage = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 2,
        "spectrum_settings" => Dict("scale" => "db", "frequency_scale" => "linear", "leakage" => 0.25, "frequency_limits" => nothing)))
    @test leakage["state_revision"] == 3
    @test length(SA.SPECTRUM_CALLS) == 4
    @test all(query -> query.leakage == 0.25, SA.SPECTRUM_CALLS[3:4])
    stale = try
        SA.apply_signal_analyser_view!(state, Dict("state_revision" => 2,
            "spectrum_settings" => Dict("scale" => "db", "frequency_scale" => "linear", "leakage" => 0.25, "frequency_limits" => nothing)))
        nothing
    catch caught
        caught
    end
    @test stale isa SA.SignalAnalyserStaleStateError

    # A complex visible member prohibits logarithmic frequency scale, and the
    # rejected mixed mutation is atomic.
    complex_state = SA.default_signal_analyser_state()
    complex_before = SA.signal_analyser_snapshot(complex_state)
    complex_log = try
        SA.apply_signal_analyser_view!(complex_state, Dict("state_revision" => 0,
            "spectrum_settings" => Dict("scale" => "db", "frequency_scale" => "log", "leakage" => 0.5, "frequency_limits" => nothing)))
        nothing
    catch caught
        caught
    end
    @test complex_log isa SA.SignalAnalyserValidationError
    @test haskey(complex_log.fields, "spectrum_settings")
    @test SA.signal_analyser_snapshot(complex_state) == complex_before

    # Removing the complex member permits log presentation.  Creating and
    # clearing Displays preserve an independent canonical settings object.
    real_name = complex_state.signals[1].name
    log_view = SA.apply_signal_analyser_view!(complex_state, Dict("state_revision" => 0,
        "visible_signals" => [real_name],
        "spectrum_settings" => Dict("scale" => "linear", "frequency_scale" => "log", "leakage" => 0.5, "frequency_limits" => nothing)))
    @test log_view["state_revision"] == 1
    @test log_view["spectrum_settings"]["frequency_scale"] == "log"
    created = SA.apply_signal_analyser_display!(complex_state, Dict("state_revision" => 1, "operation" => "create"))
    @test created["displays"][2]["spectrum_settings"] == Dict("scale" => "db", "frequency_scale" => "linear", "leakage" => 0.5, "frequency_limits" => nothing)
    active_log = SA.apply_signal_analyser_display!(complex_state, Dict("state_revision" => 2, "operation" => "select", "display_id" => "display-1"))
    cleared = SA.apply_signal_analyser_view!(complex_state, Dict("state_revision" => 3, "visible_signals" => String[]))
    @test cleared["spectrum_settings"] == active_log["spectrum_settings"]
    @test cleared["displays"][2]["spectrum_settings"] == Dict("scale" => "db", "frequency_scale" => "linear", "leakage" => 0.5, "frequency_limits" => nothing)

    # Provider failures are prepared before publication and therefore roll back
    # the whole revisioned operation.
    SA.SPECTRUM_FAILURE[] = true
    failing_before = SA.signal_analyser_snapshot(state)
    provider_error = try
        SA.apply_signal_analyser_view!(state, Dict("state_revision" => 3,
            "spectrum_settings" => Dict("scale" => "linear", "frequency_scale" => "linear", "leakage" => 0.75, "frequency_limits" => nothing)))
        nothing
    catch caught
        caught
    end
    @test provider_error isa ArgumentError
    @test SA.signal_analyser_snapshot(state) == failing_before
    SA.SPECTRUM_FAILURE[] = false

    # Mixed-duration visible sources intersect the Display ROI independently:
    # a one-sample intersection is represented but never calls the provider,
    # while a two-sample real source remains a legitimate raw provider query.
    empty!(SA.SPECTRUM_CALLS)
    long = SA.AnalysedSignal("long", "#111111", 10.0, ComplexF64[1, 2, 3], false, true)
    short = SA.AnalysedSignal("short", "#222222", 10.0, ComplexF64[1], false, true)
    roi_state = SA.SignalAnalyserState(SA.AnalysedSignal[long, short],
        SA.SignalAnalyserViewState(0, SA.TIME_PLOT, "long"), Dict{String,Dict{String,Any}}(), ReentrantLock())
    SA.signal_analyser_snapshot(roi_state)
    @test length(SA.SPECTRUM_CALLS) == 1
    empty!(SA.SPECTRUM_CALLS)
    one_sample = SA.apply_signal_analyser_view!(roi_state, Dict("state_revision" => 0,
        "time_limits" => Dict("min_s" => 0.0, "max_s" => 0.05, "units" => "s")))
    @test one_sample["time_limits"]["max_s"] == 0.05
    @test isempty(SA.SPECTRUM_CALLS)
    two_samples = SA.apply_signal_analyser_view!(roi_state, Dict("state_revision" => 1,
        "time_limits" => Dict("min_s" => 0.0, "max_s" => 0.1, "units" => "s")))
    @test two_samples["state_revision"] == 2
    @test length(SA.SPECTRUM_CALLS) == 1
    @test SA.SPECTRUM_CALLS[1].signal_name == "long"
    @test length(SA.SPECTRUM_CALLS[1].values) == 2
end

@testset "Cascade 10 Frequency Limits typed settings and publication" begin
    auto = SA.AutomaticSignalSpectrumFrequencyLimits()
    explicit = SA.ExplicitSignalSpectrumFrequencyLimits(10, 100)
    @test SA.signal_spectrum_frequency_limits_payload(auto) === nothing
    @test SA.signal_spectrum_frequency_limits_payload(explicit) == Dict("min_hz" => 10.0, "max_hz" => 100.0, "units" => "Hz")
    @test_throws ArgumentError SA.ExplicitSignalSpectrumFrequencyLimits(1, 1)
    @test_throws ArgumentError SA.ExplicitSignalSpectrumFrequencyLimits(NaN, 1)

    SA.reset_pspectrum_double!()
    empty!(SA.SPECTRUM_CALLS)
    state = SA.default_signal_analyser_state()
    initial = SA.signal_analyser_snapshot(state)
    @test initial["spectrum_settings"] == Dict("scale" => "db", "frequency_scale" => "linear", "leakage" => 0.5, "frequency_limits" => nothing)
    @test initial["plots"]["spectrum"]["frequency_limits"]["mode"] == "auto"
    @test initial["plots"]["spectrum"]["frequency_limits"]["requested"] === nothing
    before = SA.signal_analyser_snapshot(state)
    for bad_limits in (
        true,
        Dict("min_hz" => 0.0, "max_hz" => 10.0),
        Dict("min_hz" => true, "max_hz" => 10.0, "units" => "Hz"),
        Dict("min_hz" => 10.0, "max_hz" => 10.0, "units" => "Hz"),
        Dict("min_hz" => 0.0, "max_hz" => 10.0, "units" => "kHz"),
        Dict("min_hz" => -1.0, "max_hz" => 10.0, "units" => "Hz"),
    )
        error = try
            SA.apply_signal_analyser_view!(state, Dict("state_revision" => 0,
                "spectrum_settings" => Dict("scale" => "db", "frequency_scale" => "linear", "leakage" => 0.5, "frequency_limits" => bad_limits)))
            nothing
        catch caught
            caught
        end
        @test error isa SA.SignalAnalyserValidationError
        @test haskey(error.fields, "spectrum_settings")
        @test SA.signal_analyser_snapshot(state) == before
    end
    explicit_payload = Dict("min_hz" => 10.0, "max_hz" => 100.0, "units" => "Hz")
    applied = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 0,
        "spectrum_settings" => Dict("scale" => "linear", "frequency_scale" => "linear", "leakage" => 0.5, "frequency_limits" => explicit_payload)))
    @test applied["state_revision"] == 1
    @test applied["spectrum_settings"]["frequency_limits"] == explicit_payload
    @test applied["plots"]["spectrum"]["frequency_limits"] == Dict("mode" => "explicit", "requested" => explicit_payload, "effective" => explicit_payload)
    @test all(query -> query.frequency_limits == SA.ExplicitSignalSpectrumFrequencyLimits(10, 100), SA.SPECTRUM_CALLS[3:end])
    no_op = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 1,
        "spectrum_settings" => Dict("scale" => "linear", "frequency_scale" => "linear", "leakage" => 0.5, "frequency_limits" => explicit_payload)))
    @test no_op["state_revision"] == 1

    # Requested limits validate against the analysis source, then each
    # secondary trace receives its own topology intersection.  No overlap is
    # a typed empty trace, never an invalid provider call.
    primary = SA.AnalysedSignal("primary", "#111111", 100.0, ComplexF64[1, 2, 3], false, true)
    secondary = SA.AnalysedSignal("secondary", "#222222", 10.0, ComplexF64[1, 2, 3], false, true)
    mixed = SA.SignalAnalyserState(SA.AnalysedSignal[primary, secondary],
        SA.SignalAnalyserViewState(0, SA.TIME_PLOT, "primary"), Dict{String,Dict{String,Any}}(), ReentrantLock())
    SA.signal_analyser_snapshot(mixed)
    empty!(SA.SPECTRUM_CALLS)
    mixed_result = SA.apply_signal_analyser_view!(mixed, Dict("state_revision" => 0,
        "spectrum_settings" => Dict("scale" => "db", "frequency_scale" => "linear", "leakage" => 0.5,
            "frequency_limits" => Dict("min_hz" => 10.0, "max_hz" => 20.0, "units" => "Hz"))))
    @test length(SA.SPECTRUM_CALLS) == 1
    @test only(SA.SPECTRUM_CALLS).signal_name == "primary"
    @test mixed_result["plot_payload"]["spectrum_traces"][2]["x"] == Float64[]

    # A carried explicit intent follows a source change only while it remains
    # wholly valid for the new analysis-source topology; invalid carry resets
    # to Auto in the same single revision.
    broad = SA.AnalysedSignal("broad", "#333333", 50.0, ComplexF64[1, 2, 3], false, true)
    narrow = SA.AnalysedSignal("narrow", "#444444", 20.0, ComplexF64[1, 2, 3], false, true)
    transitions = SA.SignalAnalyserState(SA.AnalysedSignal[primary, broad, narrow],
        SA.SignalAnalyserViewState(0, SA.TIME_PLOT, "primary"), Dict{String,Dict{String,Any}}(), ReentrantLock())
    carried = SA.apply_signal_analyser_view!(transitions, Dict("state_revision" => 0,
        "spectrum_settings" => Dict("scale" => "db", "frequency_scale" => "linear", "leakage" => 0.5,
            "frequency_limits" => Dict("min_hz" => 10.0, "max_hz" => 20.0, "units" => "Hz"))))
    preserved = SA.apply_signal_analyser_view!(transitions, Dict("state_revision" => 1, "analysis_signal" => "broad"))
    @test preserved["state_revision"] == 2
    @test preserved["spectrum_settings"]["frequency_limits"] == carried["spectrum_settings"]["frequency_limits"]
    reset = SA.apply_signal_analyser_view!(transitions, Dict("state_revision" => 2, "analysis_signal" => "narrow"))
    @test reset["state_revision"] == 3
    @test reset["spectrum_settings"]["frequency_limits"] === nothing
end

@testset "Cascade 11 typed Spectrogram query and raw-data invariants" begin
    real_query = SA.SignalSpectrogramQuery("real", [1.0, 2.0], 10.0, SA.ONE_SIDED_SPECTRUM)
    complex_query = SA.SignalSpectrogramQuery("complex", ComplexF64[1 + 2im, 3 + 4im], 10.0, SA.CENTERED_TWO_SIDED_SPECTRUM)
    @test real_query.values == ComplexF64[1, 2]
    @test complex_query.values == ComplexF64[1 + 2im, 3 + 4im]
    @test SA.SignalSpectrogramCacheKey(real_query) != SA.SignalSpectrogramCacheKey(complex_query)
    @test_throws ArgumentError SA.SignalSpectrogramQuery("one", [1.0], 10.0, SA.ONE_SIDED_SPECTRUM)
    @test_throws ArgumentError SA.SignalSpectrogramQuery("bad", [NaN, 1.0], 10.0, SA.ONE_SIDED_SPECTRUM)
    @test_throws ArgumentError SA.SignalSpectrogramQuery("rate", [1.0, 2.0], 0.0, SA.ONE_SIDED_SPECTRUM)
    owned_samples = ComplexF64[1, 2]
    owned_query = SA.SignalSpectrogramQuery("owned", owned_samples, 10.0, SA.ONE_SIDED_SPECTRUM)
    owned_samples[1] = 99
    @test owned_query.values[1] == 1

    data = SA.SignalSpectrogramData([0.0, 5.0], [0.1, 0.2], [0.0 1.0; 4.0 9.0], SA.ONE_SIDED_SPECTRUM)
    @test size(data.power) == (2, 2)
    @test collect(data.frequencies_hz) == [0.0, 5.0]
    zero_plot = SA.signal_analyser_spectrogram_plot(data)
    @test zero_plot["z"][1][1] == -Inf
    @test SA.json_safe(zero_plot)["z"][1][1] === nothing
    dense_axis = collect(0.0:160.0)
    dense_power = reshape(collect(0.0:(161 * 161 - 1)), 161, 161)
    dense_data = SA.SignalSpectrogramData(dense_axis, dense_axis, dense_power, SA.ONE_SIDED_SPECTRUM)
    dense_plot = SA.signal_analyser_spectrogram_plot(dense_data)
    @test size(dense_data.power) == (161, 161)
    @test length(dense_plot["x"]) == 160 && length(dense_plot["y"]) == 160
    @test length(dense_plot["z"]) == 160 && all(row -> length(row) == 160, dense_plot["z"])
    @test_throws DimensionMismatch SA.SignalSpectrogramData([0.0, 5.0], [0.1, 0.2], [0.0 1.0 2.0; 3.0 4.0 5.0], SA.ONE_SIDED_SPECTRUM)
    @test_throws ArgumentError SA.SignalSpectrogramData([5.0, 0.0], [0.1, 0.2], [0.0 1.0; 4.0 9.0], SA.ONE_SIDED_SPECTRUM)
    @test_throws ArgumentError SA.SignalSpectrogramData([0.0, 5.0], [0.2, 0.1], [0.0 1.0; 4.0 9.0], SA.ONE_SIDED_SPECTRUM)
    @test_throws ArgumentError SA.SignalSpectrogramData([0.0, 5.0], [0.1, 0.2], [0.0 -1.0; 4.0 9.0], SA.ONE_SIDED_SPECTRUM)
    @test_throws ArgumentError SA.SignalSpectrogramData([0.0, 5.0], [0.1, 0.2], ComplexF64[0 1; 4 9im], SA.ONE_SIDED_SPECTRUM)
    mismatch = InvalidSpectrogramProvider(SA.SignalSpectrogramData([-5.0, 5.0], [0.0, 0.1], [1.0 2.0; 3.0 4.0], SA.CENTERED_TWO_SIDED_SPECTRUM))
    @test_throws ArgumentError SA.signal_spectrogram_calculate(SA.SignalSpectrogramService(mismatch), real_query)
    outside_time = InvalidSpectrogramProvider(SA.SignalSpectrogramData([0.0, 5.0], [0.0, 0.2], [1.0 2.0; 3.0 4.0], SA.ONE_SIDED_SPECTRUM))
    @test_throws ArgumentError SA.signal_spectrogram_calculate(SA.SignalSpectrogramService(outside_time), real_query)
    short_center = InvalidSpectrogramProvider(SA.SignalSpectrogramData([0.0, 5.0], [0.0, 0.15], [1.0 2.0; 3.0 4.0], SA.ONE_SIDED_SPECTRUM))
    @test SA.signal_spectrogram_calculate(SA.SignalSpectrogramService(short_center), real_query).segment_centers_s[end] == 0.15
    beyond_short_center = InvalidSpectrogramProvider(SA.SignalSpectrogramData([0.0, 5.0], [0.0, 0.16], [1.0 2.0; 3.0 4.0], SA.ONE_SIDED_SPECTRUM))
    @test_throws ArgumentError SA.signal_spectrogram_calculate(SA.SignalSpectrogramService(beyond_short_center), real_query)
    outside_frequency = InvalidSpectrogramProvider(SA.SignalSpectrogramData([-1.0, 5.0], [0.0, 0.1], [1.0 2.0; 3.0 4.0], SA.ONE_SIDED_SPECTRUM))
    @test_throws ArgumentError SA.signal_spectrogram_calculate(SA.SignalSpectrogramService(outside_frequency), real_query)

    empty!(SA.SPECTROGRAM_CALLS)
    state = p0_measurement_state()
    first = SA.signal_analyser_snapshot(state)
    @test length(SA.SPECTROGRAM_CALLS) == 1
    @test only(SA.SPECTROGRAM_CALLS).topology == SA.ONE_SIDED_SPECTRUM
    @test only(SA.SPECTROGRAM_CALLS).values == state.signals[1].values
    @test size(only(values(state.spectrogram_cache)).power) == (2, 2)
    SA.signal_analyser_snapshot(state)
    @test length(SA.SPECTROGRAM_CALLS) == 1
    second = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "analysis_signal" => "raw-complex"))
    @test length(SA.SPECTROGRAM_CALLS) == 2
    @test SA.SPECTROGRAM_CALLS[2].topology == SA.CENTERED_TWO_SIDED_SPECTRUM
    @test any(value -> imag(value) != 0.0, SA.SPECTROGRAM_CALLS[2].values)
    @test second["plots"]["spectrogram"]["z"] == [0.0 10 * log10(4.0); 10 * log10(9.0) 10 * log10(16.0)] |> x -> [collect(row) for row in eachrow(x)]

    short = SA.AnalysedSignal("short-spectrogram", "#555555", 10.0, ComplexF64[1], false, true)
    calls_before_short = length(SA.SPECTROGRAM_CALLS)
    short_data = SA.signal_spectrogram_data(SA.SignalSpectrogramService(SA.EngeeDSPSpectrogramProvider()), short)
    @test length(SA.SPECTROGRAM_CALLS) == calls_before_short
    @test isempty(short_data.frequencies_hz) && size(short_data.power) == (0, 0)

    baseline = SA.signal_analyser_snapshot(state)
    empty!(state.spectrogram_cache)
    SA.SPECTROGRAM_FAILURE[] = true
    failed = try
        SA.apply_signal_analyser_view!(state, Dict("state_revision" => 1, "analysis_signal" => "raw-real"))
        nothing
    catch caught
        caught
    end
    @test failed isa ArgumentError
    @test isempty(state.spectrogram_cache)
    SA.SPECTROGRAM_FAILURE[] = false
    @test SA.signal_analyser_snapshot(state) == baseline
end

@testset "Cascade 13 typed Spectrogram settings invariants" begin
    @test SA.SignalSpectrogramSettings().overlap_percent == 50.0 && SA.SignalSpectrogramSettings().leakage == 0.5
    @test SA.SignalSpectrogramSettings(0, 0).overlap_percent == 0.0 && SA.SignalSpectrogramSettings(0, 0).leakage == 0.0
    @test SA.SignalSpectrogramSettings(75, 1).overlap_percent == 75.0 && SA.SignalSpectrogramSettings(75, 1).leakage == 1.0
    @test SA.SignalSpectrogramSettings(50, -0.0).leakage == 0.0 && !signbit(SA.SignalSpectrogramSettings(50, -0.0).leakage)
    @test_throws ArgumentError SA.SignalSpectrogramSettings(75.1, 0.5)
    @test_throws ArgumentError SA.SignalSpectrogramSettings(-1, 0.5)
    @test_throws ArgumentError SA.SignalSpectrogramSettings(50, 1.1)
    @test_throws ArgumentError SA.SignalSpectrogramSettings(50, -0.1)
    @test_throws ArgumentError SA.SignalSpectrogramSettings(50, Inf)
    @test_throws ArgumentError SA.SignalSpectrogramSettings(50, true)
    query_50 = SA.SignalSpectrogramQuery("leakage", [1.0, 2.0], 10.0, SA.ONE_SIDED_SPECTRUM, 50.0, 0.5)
    query_overlap = SA.SignalSpectrogramQuery("leakage", [1.0, 2.0], 10.0, SA.ONE_SIDED_SPECTRUM, 75.0, 0.5)
    query_leakage = SA.SignalSpectrogramQuery("leakage", [1.0, 2.0], 10.0, SA.ONE_SIDED_SPECTRUM, 50.0, 1.0)
    @test query_50.overlap_percent == 50.0 && query_50.leakage == 0.5
    @test SA.SignalSpectrogramCacheKey(query_50) != SA.SignalSpectrogramCacheKey(query_overlap)
    @test SA.SignalSpectrogramCacheKey(query_50) != SA.SignalSpectrogramCacheKey(query_leakage)
    negative_zero_key = SA.SignalSpectrogramCacheKey(SA.SignalSpectrogramQuery("leakage-zero", [1.0, 2.0], 10.0, SA.ONE_SIDED_SPECTRUM, 50.0, -0.0))
    positive_zero_key = SA.SignalSpectrogramCacheKey(SA.SignalSpectrogramQuery("leakage-zero", [1.0, 2.0], 10.0, SA.ONE_SIDED_SPECTRUM, 50.0, 0.0))
    @test negative_zero_key == positive_zero_key
    @test isequal(negative_zero_key, positive_zero_key)
    @test hash(negative_zero_key) == hash(positive_zero_key)
    zero_key_dict = Dict(negative_zero_key => :canonical)
    @test zero_key_dict[positive_zero_key] == :canonical
    state = SA.default_signal_analyser_state()
    initial = SA.signal_analyser_snapshot(state)
    @test initial["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear")
    invalid = try SA.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "spectrogram_settings" => Dict("overlap_percent" => 75.1, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear"))); nothing catch e; e end
    @test invalid isa SA.SignalAnalyserValidationError
    @test SA.signal_analyser_snapshot(state) == initial
    changed = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "spectrogram_settings" => Dict("overlap_percent" => 75.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear")))
    @test changed["state_revision"] == 1 && changed["spectrogram_settings"] == Dict("overlap_percent" => 75.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear")
end

@testset "Cascade 13 Leakage-only mutation never rebuilds Spectrum cache" begin
    SA.reset_pspectrum_double!()
    empty!(SA.SPECTROGRAM_CALLS)
    empty!(SA.SPECTRUM_CALLS)
    state = SA.default_signal_analyser_state()
    empty!(state.spectrum_cache)
    empty!(state.spectrogram_cache)
    empty!(SA.SPECTRUM_CALLS)
    empty!(SA.SPECTROGRAM_CALLS)

    changed = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 0,
        "spectrogram_settings" => Dict("overlap_percent" => 50.0, "leakage" => 1.0, "frequency_limits" => nothing, "frequency_scale" => "linear"),
    ))
    @test changed["state_revision"] == 1
    @test changed["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 1.0, "frequency_limits" => nothing, "frequency_scale" => "linear")
    @test length(SA.SPECTROGRAM_CALLS) == 1
    @test isempty(SA.SPECTRUM_CALLS)
    @test isempty(state.spectrum_cache)
    @test length(state.spectrogram_cache) == 1
end

@testset "Cascade 13 equal Spectrogram settings are cold-cache no-op" begin
    SA.reset_pspectrum_double!()
    empty!(SA.SPECTRUM_CALLS)
    empty!(SA.SPECTROGRAM_CALLS)
    state = SA.default_signal_analyser_state()
    empty!(state.spectrum_cache)
    empty!(state.spectrogram_cache)
    empty!(SA.SPECTRUM_CALLS)
    empty!(SA.SPECTROGRAM_CALLS)

    no_op = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 0,
        "spectrogram_settings" => Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear"),
    ))
    @test no_op["state_revision"] == 0
    @test no_op["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear")
    @test isempty(SA.SPECTRUM_CALLS) && isempty(state.spectrum_cache)
    @test isempty(SA.SPECTROGRAM_CALLS) && isempty(state.spectrogram_cache)
    @test no_op["plots"]["spectrum"]["type"] == "line"
    @test no_op["plots"]["spectrum"]["x"] isa Vector{Float64} && no_op["plots"]["spectrum"]["y"] isa Vector{Float64}
    @test isempty(no_op["plots"]["spectrum"]["x"]) && isempty(no_op["plots"]["spectrum"]["y"])
    @test no_op["plots"]["spectrogram"]["type"] == "heatmap"
    @test no_op["plots"]["spectrogram"]["x"] isa Vector{Float64} && no_op["plots"]["spectrogram"]["y"] isa Vector{Float64} && no_op["plots"]["spectrogram"]["z"] isa Vector{Vector{Float64}}
    @test isempty(no_op["plots"]["spectrogram"]["x"]) && isempty(no_op["plots"]["spectrogram"]["y"]) && isempty(no_op["plots"]["spectrogram"]["z"])
    @test Set(keys(no_op["plot_payload"])) == Set(["selected_signal", "visible_signals", "time_traces", "spectrum_traces", "spectrogram", "persistence"])

    materialized = SA.signal_analyser_snapshot(state)
    @test materialized["state_revision"] == 0
    @test length(SA.SPECTRUM_CALLS) == 2 && length(state.spectrum_cache) == 2
    @test length(SA.SPECTROGRAM_CALLS) == 1 && length(state.spectrogram_cache) == 1
    assert_line_plot(materialized["plots"]["spectrum"])
    assert_heatmap_plot(materialized["plots"]["spectrogram"])
end

@testset "Cascade 13 Spectrogram settings mutation, cache and display lifecycle" begin
    SA.reset_pspectrum_double!()
    empty!(SA.SPECTROGRAM_CALLS)
    SA.SPECTROGRAM_FAILURE[] = false
    state = SA.default_signal_analyser_state()
    first_name, second_name = [signal.name for signal in state.signals]
    initial = SA.signal_analyser_snapshot(state)
    @test all(display -> display["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear"), initial["displays"])
    @test !isempty(SA.SPECTROGRAM_CALLS)
    calls_at_default = length(SA.SPECTROGRAM_CALLS)

    for invalid in (
        nothing,
        "50",
        Dict{String,Any}(),
        Dict("overlap_percent" => 50.0),
        Dict("leakage" => 0.5),
        Dict("overlap_percent" => true, "leakage" => 0.5),
        Dict("overlap_percent" => 50.0, "leakage" => true),
        Dict("overlap_percent" => 50.0, "leakage" => NaN),
        Dict("overlap_percent" => 50.0, "leakage" => Inf),
        Dict("overlap_percent" => 50.0, "leakage" => -0.1),
        Dict("overlap_percent" => 50.0, "leakage" => 1.1),
        Dict("overlap_percent" => NaN, "leakage" => 0.5),
        Dict("overlap_percent" => 75.1, "leakage" => 0.5),
        Dict("overlap_percent" => 50.0, "leakage" => 0.5, "extra" => 1),
    )
        error = try
            SA.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "spectrogram_settings" => invalid))
            nothing
        catch caught
            caught
        end
        @test error isa SA.SignalAnalyserValidationError
        @test haskey(error.fields, "spectrogram_settings")
        @test SA.signal_analyser_snapshot(state) == initial
        @test length(SA.SPECTROGRAM_CALLS) == calls_at_default
    end

    overlap_75 = Dict("overlap_percent" => 75.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear")
    updated = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "spectrogram_settings" => overlap_75))
    @test updated["state_revision"] == 1
    @test updated["spectrogram_settings"] == overlap_75
    @test updated["displays"][1]["spectrogram_settings"] == overlap_75
    @test SA.SPECTROGRAM_CALLS[end].overlap_percent == 75.0 && SA.SPECTROGRAM_CALLS[end].leakage == 0.5
    calls_at_75 = length(SA.SPECTROGRAM_CALLS)
    @test SA.apply_signal_analyser_view!(state, Dict("state_revision" => 1, "spectrogram_settings" => overlap_75))["state_revision"] == 1
    @test length(SA.SPECTROGRAM_CALLS) == calls_at_75

    created = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 1, "operation" => "create"))
    @test created["displays"][2]["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear")
    selected_first = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 2, "operation" => "select", "display_id" => "display-1"))
    @test selected_first["spectrogram_settings"] == overlap_75
    selected_second = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 3, "operation" => "select", "display_id" => "display-2"))
    @test selected_second["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear")

    calls_before_clear = length(SA.SPECTROGRAM_CALLS)
    cleared = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 4, "visible_signals" => String[]))
    @test cleared["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear")
    @test length(SA.SPECTROGRAM_CALLS) == calls_before_clear
    readded = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 5, "visible_signals" => [first_name]))
    @test readded["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear")
    @test length(SA.SPECTROGRAM_CALLS) == calls_before_clear + 1
    changed_signal = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 6, "visible_signals" => [first_name, second_name], "analysis_signal" => second_name))
    @test changed_signal["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear")

    before_failure = SA.signal_analyser_snapshot(state)
    empty!(state.spectrogram_cache)
    SA.SPECTROGRAM_FAILURE[] = true
    failure = try
        SA.apply_signal_analyser_view!(state, Dict("state_revision" => 7, "spectrogram_settings" => Dict("overlap_percent" => 0.0, "leakage" => 0.0, "frequency_limits" => nothing, "frequency_scale" => "linear")))
        nothing
    catch caught
        caught
    end
    @test failure isa ArgumentError
    @test state.view.state_revision == before_failure["state_revision"]
    @test isempty(state.spectrogram_cache)
    SA.SPECTROGRAM_FAILURE[] = false
    @test SA.signal_analyser_snapshot(state) == before_failure
end

@testset "Cascade 13 Leakage cache identity and Spectrum independence" begin
    SA.reset_pspectrum_double!()
    empty!(SA.SPECTROGRAM_CALLS)
    empty!(SA.SPECTRUM_CALLS)
    SA.SPECTROGRAM_FAILURE[] = false
    SA.SPECTRUM_FAILURE[] = false
    state = SA.default_signal_analyser_state()
    first_name, second_name = [signal.name for signal in state.signals]
    initial = SA.signal_analyser_snapshot(state)
    @test initial["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear")
    initial_spectrogram_calls, initial_spectrum_calls = length(SA.SPECTROGRAM_CALLS), length(SA.SPECTRUM_CALLS)

    leakage_zero = Dict("overlap_percent" => 50.0, "leakage" => -0.0, "frequency_limits" => nothing, "frequency_scale" => "linear")
    changed = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "spectrogram_settings" => leakage_zero))
    @test changed["state_revision"] == 1
    @test changed["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.0, "frequency_limits" => nothing, "frequency_scale" => "linear")
    @test !signbit(changed["spectrogram_settings"]["leakage"])
    @test length(SA.SPECTROGRAM_CALLS) == initial_spectrogram_calls + 1
    @test length(SA.SPECTRUM_CALLS) == initial_spectrum_calls
    @test SA.SPECTROGRAM_CALLS[end].leakage == 0.0
    @test SA.apply_signal_analyser_view!(state, Dict("state_revision" => 1, "spectrogram_settings" => Dict("overlap_percent" => 50.0, "leakage" => 0.0, "frequency_limits" => nothing, "frequency_scale" => "linear")))["state_revision"] == 1
    @test length(SA.SPECTROGRAM_CALLS) == initial_spectrogram_calls + 1

    restored = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 1, "spectrogram_settings" => Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear")))
    @test restored["state_revision"] == 2
    @test length(SA.SPECTROGRAM_CALLS) == initial_spectrogram_calls + 1 # default raw cache is reused
    @test length(SA.SPECTRUM_CALLS) == initial_spectrum_calls

    created = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 2, "operation" => "create"))
    @test created["displays"][2]["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear")
    selected_a = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 3, "operation" => "select", "display_id" => "display-1"))
    @test selected_a["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear")
    leaked_a = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 4, "spectrogram_settings" => Dict("overlap_percent" => 50.0, "leakage" => 1.0, "frequency_limits" => nothing, "frequency_scale" => "linear")))
    @test leaked_a["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 1.0, "frequency_limits" => nothing, "frequency_scale" => "linear")
    selected_b = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 5, "operation" => "select", "display_id" => "display-2"))
    @test selected_b["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear")
    cleared = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 6, "visible_signals" => String[]))
    @test cleared["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear")
    calls_before_readd = length(SA.SPECTROGRAM_CALLS)
    readded = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 7, "visible_signals" => [first_name]))
    @test readded["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear")
    @test length(SA.SPECTROGRAM_CALLS) == calls_before_readd + 1 # first re-add recomputes after Clear
    source_changed = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 8, "visible_signals" => [first_name, second_name], "analysis_signal" => second_name))
    @test source_changed["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear")

    before_failure = SA.signal_analyser_snapshot(state)
    empty!(state.spectrogram_cache)
    SA.SPECTROGRAM_FAILURE[] = true
    failure = try
        SA.apply_signal_analyser_view!(state, Dict("state_revision" => 9, "spectrogram_settings" => Dict("overlap_percent" => 0.0, "leakage" => 1.0, "frequency_limits" => nothing, "frequency_scale" => "linear")))
        nothing
    catch caught
        caught
    end
    @test failure isa ArgumentError
    @test isempty(state.spectrogram_cache)
    SA.SPECTROGRAM_FAILURE[] = false
    @test SA.signal_analyser_snapshot(state) == before_failure
end

@testset "Cascade 16 Spectrogram Frequency Scale exact state, metadata and cache isolation" begin
    linear = SA.LINEAR_SPECTROGRAM_FREQUENCY_SCALE
    log = SA.LOG_SPECTROGRAM_FREQUENCY_SCALE
    default = SA.SignalSpectrogramSettings()
    @test default.frequency_scale == linear
    @test SA.SignalSpectrogramSettings(50, 0.5, SA.AutomaticSignalSpectrumFrequencyLimits(), linear) == default
    @test SA.SignalSpectrogramSettings(50, 0.5, SA.AutomaticSignalSpectrumFrequencyLimits(), log) != default
    @test SA.signal_spectrogram_provider_settings_equal(default, SA.SignalSpectrogramSettings(50, 0.5, SA.AutomaticSignalSpectrumFrequencyLimits(), log))

    SA.reset_pspectrum_double!(); empty!(SA.SPECTRUM_CALLS); empty!(SA.SPECTROGRAM_CALLS)
    state = SA.default_signal_analyser_state()
    baseline = SA.signal_analyser_snapshot(state)
    exact_linear = Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear")
    exact_log = Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "log")
    @test baseline["spectrogram_settings"] == exact_linear
    @test baseline["plots"]["spectrogram"]["frequency_scale"] == Dict("requested" => "linear", "effective" => "linear", "available" => ["linear", "log"])

    for bad in (
        Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing),
        Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => nothing),
        Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "Linear"),
        Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "LOG"),
        Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "octave"),
        Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "extra" => true),
    )
        error = try
            SA.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "spectrogram_settings" => bad))
            nothing
        catch caught
            caught
        end
        @test error isa SA.SignalAnalyserValidationError
        @test haskey(error.fields, "spectrogram_settings")
        @test SA.signal_analyser_snapshot(state) == baseline
    end

    # Scale alone advances one revision, preserves raw cache/provider identity, and yields typed-empty data when cold.
    empty!(state.spectrum_cache); empty!(state.spectrogram_cache); empty!(SA.SPECTRUM_CALLS); empty!(SA.SPECTROGRAM_CALLS)
    changed = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "spectrogram_settings" => exact_log))
    @test changed["state_revision"] == 1 && changed["spectrogram_settings"] == exact_log
    @test changed["plots"]["spectrogram"]["frequency_scale"] == Dict("requested" => "log", "effective" => "log", "available" => ["linear", "log"])
    @test isempty(SA.SPECTRUM_CALLS) && isempty(SA.SPECTROGRAM_CALLS) && isempty(state.spectrum_cache) && isempty(state.spectrogram_cache)
    @test changed["plots"]["spectrogram"]["x"] == Float64[] && changed["plots"]["spectrogram"]["y"] == Float64[] && changed["plots"]["spectrogram"]["z"] == Vector{Vector{Float64}}()
    @test SA.apply_signal_analyser_view!(state, Dict("state_revision" => 1, "spectrogram_settings" => exact_log))["state_revision"] == 1
    materialized_log = SA.signal_analyser_snapshot(state)
    calls_after_get = (length(SA.SPECTRUM_CALLS), length(SA.SPECTROGRAM_CALLS))
    raw_cache_after_get = (length(state.spectrum_cache), length(state.spectrogram_cache))
    back_to_linear = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 1, "spectrogram_settings" => exact_linear))
    @test back_to_linear["state_revision"] == 2
    @test (length(SA.SPECTRUM_CALLS), length(SA.SPECTROGRAM_CALLS)) == calls_after_get
    @test (length(state.spectrum_cache), length(state.spectrogram_cache)) == raw_cache_after_get
    @test back_to_linear["plots"]["spectrogram"]["x"] == materialized_log["plots"]["spectrogram"]["x"]
    @test back_to_linear["plots"]["spectrogram"]["y"] == materialized_log["plots"]["spectrogram"]["y"]
    @test back_to_linear["plots"]["spectrogram"]["z"] == materialized_log["plots"]["spectrogram"]["z"]

    # A/B are independent; Clear preserves requested intent; source topology changes only effective metadata.
    created = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 2, "operation" => "create"))
    @test created["displays"][2]["spectrogram_settings"] == exact_linear
    selected_a = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 3, "operation" => "select", "display_id" => "display-1"))
    relogged = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 4, "spectrogram_settings" => exact_log))
    selected_b = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 5, "operation" => "select", "display_id" => "display-2"))
    @test selected_a["spectrogram_settings"] == exact_linear && relogged["spectrogram_settings"] == exact_log && selected_b["spectrogram_settings"] == exact_linear
    source_real, source_complex = state.signals[1].name, state.signals[2].name
    selected_a = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 6, "operation" => "select", "display_id" => "display-1"))
    centered = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 7, "analysis_signal" => source_complex))
    @test centered["spectrogram_settings"] == exact_log
    @test centered["plots"]["spectrogram"]["frequency_scale"] == Dict("requested" => "log", "effective" => "linear", "available" => ["linear"])
    restored = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 8, "analysis_signal" => source_real))
    @test restored["plots"]["spectrogram"]["frequency_scale"] == Dict("requested" => "log", "effective" => "log", "available" => ["linear", "log"])
    cleared = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 9, "visible_signals" => String[]))
    @test cleared["spectrogram_settings"] == exact_log
    @test cleared["plots"]["spectrogram"]["frequency_scale"] == Dict("requested" => "log", "effective" => nothing, "available" => String[])

    # A combined presentation/provider mutation delegates only for the provider field, never Spectrum.
    readded = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 10, "visible_signals" => [source_real]))
    before_combined = (length(SA.SPECTRUM_CALLS), length(SA.SPECTROGRAM_CALLS))
    combined = Dict("overlap_percent" => 25.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear")
    SA.apply_signal_analyser_view!(state, Dict("state_revision" => 11, "spectrogram_settings" => combined))
    @test length(SA.SPECTRUM_CALLS) == before_combined[1]
    @test length(SA.SPECTROGRAM_CALLS) == before_combined[2] + 1
    stale = try SA.apply_signal_analyser_view!(state, Dict("state_revision" => 11, "spectrogram_settings" => exact_log)); nothing catch caught; caught end
    @test stale isa SA.SignalAnalyserStaleStateError

    short = SA.AnalysedSignal("c16-short", "#111111", 10.0, ComplexF64[1], false, true)
    @test SA.signal_spectrogram_frequency_scale_metadata(SA.SignalSpectrogramSettings(50, 0.5, SA.AutomaticSignalSpectrumFrequencyLimits(), log), short) == Dict("requested" => "log", "effective" => "log", "available" => ["linear", "log"])
    short_calls = length(SA.SPECTROGRAM_CALLS)
    SA.signal_spectrogram_data(SA.SignalSpectrogramService(SA.EngeeDSPSpectrogramProvider()), short)
    @test length(SA.SPECTROGRAM_CALLS) == short_calls
end
