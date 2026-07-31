using Test

const SA_API = Main.AppTestContext

function api_measurement_contract_state()
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
    signals = SA_API.AnalysedSignal[
        SA_API.AnalysedSignal("api-real", "#111111", 1000.0, real_values, false, true),
        SA_API.AnalysedSignal("api-complex", "#222222", 1000.0, complex_values, true, true),
    ]
    SA_API.SignalAnalyserState(
        signals,
        SA_API.SignalAnalyserViewState(0, SA_API.TIME_PLOT, "api-real"),
        Dict{String,Dict{String,Any}}(),
        ReentrantLock(),
    )
end

function api_raw_measurement_items(signal)
    ordinate = Float64.(signal.is_complex ? abs.(signal.values) : real.(signal.values))
    minimum_index = findfirst(value -> value == minimum(ordinate), ordinate) - 1
    maximum_index = findfirst(value -> value == maximum(ordinate), ordinate) - 1
    expected = Dict(
        "minimum" => Dict("id" => "minimum", "label" => "Минимум", "value" => ordinate[minimum_index + 1], "time_s" => minimum_index / signal.sample_rate_hz, "sample_index" => minimum_index),
        "maximum" => Dict("id" => "maximum", "label" => "Максимум", "value" => ordinate[maximum_index + 1], "time_s" => maximum_index / signal.sample_rate_hz, "sample_index" => maximum_index),
        "mean" => Dict("id" => "mean", "label" => "Среднее", "value" => sum(ordinate) / length(ordinate), "time_s" => nothing, "sample_index" => nothing),
    )
    [expected["minimum"], expected["maximum"], expected["mean"]]
end

function assert_api_snapshot_measurements(snapshot, signal)
    @test haskey(snapshot, "measurements")
    haskey(snapshot, "measurements") || return
    payload = get(snapshot, "measurements", Dict{String,Any}())
    @test Set(keys(payload)) == Set(["state_revision", "signal_name", "ordinate", "units", "items"])
    @test payload["state_revision"] == snapshot["state_revision"]
    @test payload["signal_name"] == signal.name == snapshot["selected_signal"]
    @test payload["ordinate"] == (signal.is_complex ? "magnitude" : "real")
    @test payload["units"] == Dict("time" => "s", "value" => "1")
    @test payload["items"] == api_raw_measurement_items(signal)
    @test payload["items"][3]["time_s"] === nothing
    @test payload["items"][3]["sample_index"] === nothing
end

@testset "Signal Analyser API route registration" begin
    routes_source = SA_API.source("app", "routes.jl")
    state_routes = collect(eachmatch(r"route\(\"/api/state\", method = GET\)", routes_source))
    view_routes = collect(eachmatch(r"route\(\"/api/view\", method = POST\)", routes_source))
    display_routes = collect(eachmatch(r"route\(\"/api/displays\", method = POST\)", routes_source))
    measurement_routes = collect(eachmatch(r"route\(\"/api/measurements\"", routes_source))
    peaks_routes = collect(eachmatch(r"route\(\"/api/peaks\"", routes_source))

    @test length(state_routes) == 1
    @test length(view_routes) == 1
    @test length(display_routes) == 1
    @test isempty(measurement_routes)
    @test isempty(peaks_routes)
    @test occursin("api_json(signal_analyser_snapshot(SIGNAL_ANALYSER_STATE))", routes_source)
    @test occursin("api_json(apply_signal_analyser_view!(SIGNAL_ANALYSER_STATE, jsonpayload()))", routes_source)
    @test occursin("api_json(apply_signal_analyser_display!(SIGNAL_ANALYSER_STATE, jsonpayload()))", routes_source)
    @test !occursin("signal_analyser_measurements", routes_source)
    @test occursin("\"visible_signals\"", SA_API.source("lib", "services", "signal_analyser_service.jl"))
    @test occursin("signal_analyser_validation_response(err)", routes_source)
    @test occursin("signal_analyser_stale_response(SIGNAL_ANALYSER_STATE, err)", routes_source)
    @test !occursin("signal_analyser_unavailable_response", routes_source)
end

@testset "Signal Analyser API Peaks boolean view contract" begin
    SA_API.reset_pspectrum_double!()
    state = SA_API.default_signal_analyser_state()
    before = SA_API.signal_analyser_snapshot(state)
    for payload in (
        Dict("state_revision" => 0, "peaks_enabled" => 1),
        Dict("state_revision" => 0, "peaks_enabled" => "true"),
        Dict("state_revision" => 0, "peaks_enabled" => nothing),
        Dict("state_revision" => 0, "peaks_enabled" => false, "unexpected" => true),
    )
        err = try SA_API.apply_signal_analyser_view!(state, payload) catch caught; caught end
        @test err isa SA_API.SignalAnalyserValidationError
        @test haskey(err.fields, haskey(payload, "unexpected") ? "body" : "peaks_enabled")
        @test SA_API.signal_analyser_snapshot(state) == before
    end
    no_op = SA_API.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "peaks_enabled" => false))
    @test no_op["state_revision"] == 0
    stale = try SA_API.apply_signal_analyser_view!(state, Dict("state_revision" => 1, "peaks_enabled" => false)) catch caught; caught end
    @test stale isa SA_API.SignalAnalyserStaleStateError
    @test SA_API.signal_analyser_snapshot(state) == before
    non_time = try SA_API.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "active_plot" => "spectrum", "peaks_enabled" => true)) catch caught; caught end
    @test non_time isa SA_API.SignalAnalyserValidationError
    @test haskey(non_time.fields, "peaks_enabled")
end

@testset "Signal Analyser API Display payload contract" begin
    SA_API.reset_pspectrum_double!()
    state = SA_API.default_signal_analyser_state()
    first_name, second_name = [signal.name for signal in state.signals]

    created = SA_API.apply_signal_analyser_display!(state, Dict("state_revision" => 0, "operation" => "create"))
    @test created["state_revision"] == 1
    @test created["active_display_id"] == "display-2"
    @test [display["id"] for display in created["displays"]] == ["display-1", "display-2"]

    changed = SA_API.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 1,
        "active_plot" => "persistence",
        "selected_signal" => second_name,
        "visible_signals" => [second_name],
    ))
    @test changed["state_revision"] == 2

    selected = SA_API.apply_signal_analyser_display!(state, Dict(
        "state_revision" => 2,
        "operation" => "select",
        "display_id" => "display-1",
    ))
    @test selected["state_revision"] == 3
    @test selected["active_display_id"] == "display-1"
    @test selected["active_plot"] == "time"
    @test selected["selected_signal"] == first_name
    @test selected["visible_signals"] == [first_name, second_name]

    stale_response = SA_API.signal_analyser_stale_response(
        state,
        SA_API.SignalAnalyserStaleStateError(2, 3),
    )
    @test stale_response.status == 409
    @test stale_response.body["code"] == "stale_state"
    @test stale_response.body["current"]["active_display_id"] == "display-1"
    @test length(stale_response.body["current"]["displays"]) == 2

    before_invalid = SA_API.signal_analyser_snapshot(state)
    invalid = try
        SA_API.apply_signal_analyser_display!(state, Dict(
            "state_revision" => 3,
            "operation" => "close",
            "display_id" => "missing",
        ))
        nothing
    catch caught
        caught
    end
    @test invalid isa SA_API.SignalAnalyserValidationError
    @test haskey(invalid.fields, "display_id")
    @test SA_API.signal_analyser_snapshot(state) == before_invalid
end

@testset "Signal Analyser API error envelopes" begin
    validation = SA_API.SignalAnalyserValidationError(
        "Некорректный запрос отображения",
        Dict("state_revision" => "Требуется целое число"),
    )
    validation_response = SA_API.signal_analyser_validation_response(validation)
    @test validation_response.status == 422
    @test Set(keys(validation_response.body)) == Set(["ok", "code", "error"])
    @test validation_response.body["ok"] === false
    @test validation_response.body["code"] == "invalid_request"
    @test Set(keys(validation_response.body["error"])) == Set(["code", "message", "fields"])
    @test validation_response.body["error"] == Dict(
        "code" => "invalid_request",
        "message" => "Некорректный запрос отображения",
        "fields" => Dict("state_revision" => "Требуется целое число"),
    )

    SA_API.reset_pspectrum_double!()
    state = SA_API.default_signal_analyser_state()
    first_name = state.signals[1].name
    SA_API.apply_signal_analyser_view!(
        state,
        Dict("state_revision" => 0, "active_plot" => "spectrum", "visible_signals" => [first_name]),
    )
    stale_response = SA_API.signal_analyser_stale_response(state, SA_API.SignalAnalyserStaleStateError(0, 1))
    expected_snapshot = SA_API.signal_analyser_snapshot(state)
    @test stale_response.status == 409
    @test Set(keys(stale_response.body)) == Set(["ok", "code", "error", "state", "current"])
    @test stale_response.body["ok"] === false
    @test stale_response.body["code"] == "stale_state"
    @test stale_response.body["error"] == Dict(
        "code" => "stale_state",
        "message" => "Состояние устарело: ожидалась ревизия 0, текущая ревизия 1",
    )
    @test stale_response.body["state"] == expected_snapshot
    @test stale_response.body["current"] == expected_snapshot
    @test stale_response.body["state"] == stale_response.body["current"]
    @test stale_response.body["current"]["visible_signals"] == [first_name]
    @test stale_response.body["current"]["plot_payload"]["visible_signals"] == [first_name]
end

@testset "Cascade 7 API Time Limits validation envelope" begin
    SA_API.reset_pspectrum_double!()
    state = SA_API.default_signal_analyser_state()
    baseline = SA_API.signal_analyser_snapshot(state)
    for invalid_limits in (
        "not-an-object",
        Dict("min_s" => 0.0, "max_s" => 0.1),
        Dict("min_s" => 0.0, "max_s" => 0.1, "units" => "ms"),
        Dict("min_s" => 0.1, "max_s" => 0.1, "units" => "s"),
        Dict("min_s" => -0.1, "max_s" => 0.1, "units" => "s"),
        Dict("min_s" => 0.0, "max_s" => 99.0, "units" => "s"),
    )
        err = try
            SA_API.apply_signal_analyser_view!(state, Dict(
                "state_revision" => 0, "time_limits" => invalid_limits,
            ))
            nothing
        catch caught
            caught
        end
        @test err isa SA_API.SignalAnalyserValidationError
        @test Set(keys(err.fields)) == Set(["time_limits"])
        envelope = SA_API.signal_analyser_validation_response(err)
        @test envelope.status == 422
        @test envelope.body == Dict(
            "ok" => false,
            "code" => "invalid_request",
            "error" => Dict(
                "code" => "invalid_request",
                "message" => "Некорректный запрос отображения",
                "fields" => err.fields,
            ),
        )
        @test SA_API.signal_analyser_snapshot(state) == baseline
    end

    accepted = SA_API.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 0,
        "time_limits" => Dict("min_s" => 0.0, "max_s" => 0.1, "units" => "s"),
    ))
    @test accepted["state_revision"] == 1
    @test accepted["time_limits"] == Dict("min_s" => 0.0, "max_s" => 0.1, "units" => "s")
end

@testset "Cascade 8 API measurement_kinds is strict, canonical and atomic" begin
    SA_API.reset_pspectrum_double!()
    state = SA_API.default_signal_analyser_state()
    baseline = SA_API.signal_analyser_snapshot(state)
    @test baseline["measurement_kinds"] == ["minimum", "maximum", "mean"]
    for invalid_kinds in (
        nothing,
        "minimum",
        ["minimum", "minimum"],
        ["minimum", "unknown"],
        ["minimum", 1],
    )
        err = try
            SA_API.apply_signal_analyser_view!(state, Dict(
                "state_revision" => 0, "measurement_kinds" => invalid_kinds,
            ))
            nothing
        catch caught
            caught
        end
        @test err isa SA_API.SignalAnalyserValidationError
        @test Set(keys(err.fields)) == Set(["measurement_kinds"])
        envelope = SA_API.signal_analyser_validation_response(err)
        @test envelope.status == 422
        @test envelope.body["error"]["fields"] == err.fields
        @test SA_API.signal_analyser_snapshot(state) == baseline
    end

    canonical = SA_API.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 0, "measurement_kinds" => ["rms", "minimum", "median"],
    ))
    @test canonical["state_revision"] == 1
    @test canonical["measurement_kinds"] == ["minimum", "median", "rms"]
    preserved_when_absent = SA_API.apply_signal_analyser_view!(state, Dict("state_revision" => 1))
    @test preserved_when_absent["state_revision"] == 1
    @test preserved_when_absent["measurement_kinds"] == canonical["measurement_kinds"]
    stale = try
        SA_API.apply_signal_analyser_view!(state, Dict(
            "state_revision" => 0, "measurement_kinds" => String[],
        ))
        nothing
    catch caught
        caught
    end
    @test stale isa SA_API.SignalAnalyserStaleStateError
end

@testset "Cascade 9 API Spectrum settings envelope and revision contract" begin
    SA_API.reset_pspectrum_double!()
    state = SA_API.default_signal_analyser_state()
    baseline = SA_API.signal_analyser_snapshot(state)
    @test baseline["spectrum_settings"] == Dict("scale" => "db", "frequency_scale" => "linear", "leakage" => 0.5, "frequency_limits" => nothing)
    @test all(display -> display["spectrum_settings"] isa Dict, baseline["displays"])

    for invalid_settings in (
        nothing,
        Dict("scale" => "db", "frequency_scale" => "linear"),
        Dict("scale" => "invalid", "frequency_scale" => "linear", "leakage" => 0.5),
        Dict("scale" => "db", "frequency_scale" => "linear", "leakage" => Inf),
    )
        err = try
            SA_API.apply_signal_analyser_view!(state, Dict(
                "state_revision" => 0, "spectrum_settings" => invalid_settings,
            ))
            nothing
        catch caught
            caught
        end
        @test err isa SA_API.SignalAnalyserValidationError
        @test Set(keys(err.fields)) == Set(["spectrum_settings"])
        envelope = SA_API.signal_analyser_validation_response(err)
        @test envelope.status == 422
        @test envelope.body["error"]["fields"] == err.fields
        @test SA_API.signal_analyser_snapshot(state) == baseline
    end

    canonical = SA_API.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 0,
        "spectrum_settings" => Dict("scale" => "linear", "frequency_scale" => "linear", "leakage" => 0.25, "frequency_limits" => nothing),
    ))
    @test canonical["state_revision"] == 1
    @test canonical["spectrum_settings"] == Dict("scale" => "linear", "frequency_scale" => "linear", "leakage" => 0.25, "frequency_limits" => nothing)
    @test SA_API.apply_signal_analyser_view!(state, Dict("state_revision" => 1))["state_revision"] == 1
    stale = try
        SA_API.apply_signal_analyser_view!(state, Dict(
            "state_revision" => 0,
            "spectrum_settings" => Dict("scale" => "db", "frequency_scale" => "linear", "leakage" => 0.5, "frequency_limits" => nothing),
        ))
        nothing
    catch caught
        caught
    end
    @test stale isa SA_API.SignalAnalyserStaleStateError
    stale_envelope = SA_API.signal_analyser_stale_response(state, stale)
    @test stale_envelope.status == 409
    @test stale_envelope.body["current"] == canonical
end

@testset "Cascade 10 API Frequency Limits envelope and lifecycle" begin
    SA_API.reset_pspectrum_double!()
    state = SA_API.default_signal_analyser_state()
    initial = SA_API.signal_analyser_snapshot(state)
    auto = Dict("scale" => "db", "frequency_scale" => "linear", "leakage" => 0.5, "frequency_limits" => nothing)
    @test initial["spectrum_settings"] == auto
    @test all(display -> display["spectrum_settings"] == auto, initial["displays"])

    for invalid_limits in (
        true,
        Dict("min_hz" => 0.0, "max_hz" => 10.0),
        Dict("min_hz" => true, "max_hz" => 10.0, "units" => "Hz"),
        Dict("min_hz" => 0.0, "max_hz" => Inf, "units" => "Hz"),
        Dict("min_hz" => 10.0, "max_hz" => 10.0, "units" => "Hz"),
        Dict("min_hz" => 0.0, "max_hz" => 10.0, "units" => "kHz"),
        Dict("min_hz" => -1.0, "max_hz" => 10.0, "units" => "Hz"),
    )
        error = try
            SA_API.apply_signal_analyser_view!(state, Dict("state_revision" => 0,
                "spectrum_settings" => Dict("scale" => "db", "frequency_scale" => "linear", "leakage" => 0.5, "frequency_limits" => invalid_limits)))
            nothing
        catch caught
            caught
        end
        @test error isa SA_API.SignalAnalyserValidationError
        response = SA_API.signal_analyser_validation_response(error)
        @test response.status == 422
        @test response.body["error"]["fields"] == error.fields
        @test SA_API.signal_analyser_snapshot(state) == initial
    end

    limits = Dict("min_hz" => 10.0, "max_hz" => 100.0, "units" => "Hz")
    explicit_settings = Dict("scale" => "db", "frequency_scale" => "linear", "leakage" => 0.5, "frequency_limits" => limits)
    explicit = SA_API.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "spectrum_settings" => explicit_settings))
    @test explicit["state_revision"] == 1
    @test explicit["spectrum_settings"] == explicit_settings
    @test explicit["displays"][1]["spectrum_settings"] == explicit_settings
    @test explicit["plots"]["spectrum"]["frequency_limits"] == Dict("mode" => "explicit", "requested" => limits, "effective" => limits)
    no_op = SA_API.apply_signal_analyser_view!(state, Dict("state_revision" => 1, "spectrum_settings" => explicit_settings))
    @test no_op["state_revision"] == 1
    restored = SA_API.apply_signal_analyser_view!(state, Dict("state_revision" => 1, "spectrum_settings" => auto))
    @test restored["state_revision"] == 2
    @test restored["spectrum_settings"] == auto

    created = SA_API.apply_signal_analyser_display!(state, Dict("state_revision" => 2, "operation" => "create"))
    @test created["displays"][2]["spectrum_settings"] == auto
    selected = SA_API.apply_signal_analyser_display!(state, Dict("state_revision" => 3, "operation" => "select", "display_id" => "display-1"))
    cleared = SA_API.apply_signal_analyser_view!(state, Dict("state_revision" => 4, "visible_signals" => String[]))
    @test cleared["spectrum_settings"] == selected["spectrum_settings"]
    readded = SA_API.apply_signal_analyser_view!(state, Dict("state_revision" => 5, "visible_signals" => [state.signals[1].name]))
    @test readded["spectrum_settings"] == auto
end

@testset "Signal Analyser API view payload contract" begin
    SA_API.reset_pspectrum_double!()
    state = SA_API.default_signal_analyser_state()
    names = [signal.name for signal in state.signals]
    first_name, second_name = names

    success = SA_API.apply_signal_analyser_view!(
        state,
        Dict(
            "state_revision" => 0,
            "active_plot" => "spectrum",
            "selected_signal" => second_name,
            "visible_signals" => [second_name, first_name],
        ),
    )
    @test success["state_revision"] == 1
    @test success["active_plot"] == "spectrum"
    @test success["selected_signal"] == second_name
    @test success["visible_signals"] == [first_name, second_name]
    @test [trace["name"] for trace in success["plot_payload"]["time_traces"]] == [first_name, second_name]
    @test [trace["color"] for trace in success["plot_payload"]["time_traces"]] == ["#2563eb", "#dc2626"]
    @test [trace["name"] for trace in success["plot_payload"]["spectrum_traces"]] == [first_name, second_name]
    @test success["plot_payload"]["spectrogram"]["signal"] == second_name
    @test success["plot_payload"]["persistence"]["signal"] == second_name

    fallback = SA_API.apply_signal_analyser_view!(
        state,
        Dict(
            "state_revision" => 1,
            "visible_signals" => [first_name],
        ),
    )
    @test fallback["state_revision"] == 2
    @test fallback["selected_signal"] == first_name
    @test fallback["visible_signals"] == [first_name]
end

@testset "Signal Analyser API view validation rejects malformed visibility payloads" begin
    for (payload, field) in (
        (Dict("state_revision" => 0, "visible_signals" => nothing), "visible_signals"),
        (Dict("state_revision" => 0, "visible_signals" => "Гармонический сигнал"), "visible_signals"),
        (Dict("state_revision" => 0, "visible_signals" => ["Гармонический сигнал", 1]), "visible_signals"),
        (Dict("state_revision" => 0, "visible_signals" => ["Гармонический сигнал", "Гармонический сигнал"]), "visible_signals"),
        (Dict("state_revision" => 0, "visible_signals" => ["Гармонический сигнал", "missing"]), "visible_signals"),
        (Dict("state_revision" => 0, "visible_signals" => ["Гармонический сигнал"], "extra" => true), "body"),
        (Dict("state_revision" => "0", "visible_signals" => ["Гармонический сигнал"]), "state_revision"),
        (Dict("state_revision" => true, "visible_signals" => ["Гармонический сигнал"]), "state_revision"),
    )
        SA_API.reset_pspectrum_double!()
        state = SA_API.default_signal_analyser_state()
        before = SA_API.signal_analyser_snapshot(state)
        err = try
            SA_API.apply_signal_analyser_view!(state, payload)
            nothing
        catch caught
            caught
        end
        @test err isa SA_API.SignalAnalyserValidationError
        @test haskey(err.fields, field)
        response = SA_API.signal_analyser_validation_response(err)
        @test response.status == 422
        @test response.body["ok"] === false
        @test response.body["code"] == "invalid_request"
        @test haskey(response.body["error"]["fields"], field)
        @test SA_API.signal_analyser_snapshot(state) == before
    end
end

@testset "Signal Analyser API snapshot raw-sample measurements contract" begin
    SA_API.reset_pspectrum_double!()
    state = api_measurement_contract_state()
    real_snapshot = SA_API.signal_analyser_snapshot(state)
    @test length(real_snapshot["plot_payload"]["time_traces"][1]["y"]) <= 1024
    assert_api_snapshot_measurements(real_snapshot, state.signals[1])
    @test real_snapshot["measurements"]["items"][1]["sample_index"] == 1050
    @test real_snapshot["measurements"]["items"][2]["sample_index"] == 1025
    repeated = SA_API.signal_analyser_snapshot(state)
    @test repeated["state_revision"] == real_snapshot["state_revision"]
    @test repeated["measurements"] == real_snapshot["measurements"]

    complex_snapshot = SA_API.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "selected_signal" => "api-complex"))
    @test complex_snapshot["state_revision"] == 1
    assert_api_snapshot_measurements(complex_snapshot, state.signals[2])
    @test complex_snapshot["measurements"]["items"][1]["sample_index"] == 1050
    @test complex_snapshot["measurements"]["items"][2]["sample_index"] == 1025

    fallback = SA_API.apply_signal_analyser_view!(
        state,
        Dict("state_revision" => 1, "visible_signals" => ["api-real"]),
    )
    @test fallback["state_revision"] == 2
    @test fallback["selected_signal"] == "api-real"
    assert_api_snapshot_measurements(fallback, state.signals[1])
end

@testset "Cascade 5 API accepts empty Display membership and separates aliases" begin
    SA_API.reset_pspectrum_double!()
    state = SA_API.default_signal_analyser_state()
    first_name, second_name = [signal.name for signal in state.signals]

    row_selected = SA_API.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 0,
        "row_selected_signal" => second_name,
        "analysis_signal" => first_name,
    ))
    @test row_selected["state_revision"] == 1
    @test row_selected["row_selected_signal"] == second_name
    @test row_selected["analysis_signal"] == first_name == row_selected["selected_signal"]
    @test row_selected["visible_signals"] == [first_name, second_name]

    cleared = SA_API.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 1,
        "row_selected_signal" => second_name,
        "analysis_signal" => nothing,
        "selected_signal" => nothing,
        "visible_signals" => String[],
        "peaks_enabled" => false,
    ))
    @test cleared["state_revision"] == 2
    @test cleared["row_selected_signal"] == second_name
    @test cleared["analysis_signal"] === nothing
    @test cleared["selected_signal"] === nothing
    @test cleared["visible_signals"] == String[]
    @test cleared["measurements"] == Dict(
        "state_revision" => 2,
        "signal_name" => nothing,
        "ordinate" => nothing,
        "units" => Dict("time" => "s", "value" => "1"),
        "items" => Any[],
    )
    @test cleared["peaks"] == Dict(
        "enabled" => false,
        "state_revision" => 2,
        "display_id" => "display-1",
        "signal_name" => nothing,
        "ordinate" => nothing,
        "units" => Dict("value" => "1", "time" => "s", "width" => "samples", "prominence" => "1"),
        "items" => Any[],
    )
    @test cleared["plot_payload"]["time_traces"] == Any[]
    @test cleared["plot_payload"]["spectrum_traces"] == Any[]
    @test all(cleared["plots"][key]["type"] == "heatmap" && cleared["plots"][key]["x"] == Any[] && cleared["plots"][key]["y"] == Any[] && cleared["plots"][key]["z"] == Any[] for key in ("spectrogram", "persistence"))

    no_op = SA_API.apply_signal_analyser_view!(state, Dict("state_revision" => 2, "visible_signals" => String[]))
    @test no_op["state_revision"] == 2

    before_conflict = SA_API.signal_analyser_snapshot(state)
    conflict = try
        SA_API.apply_signal_analyser_view!(state, Dict(
            "state_revision" => 2,
            "analysis_signal" => first_name,
            "selected_signal" => second_name,
        ))
        nothing
    catch caught
        caught
    end
    @test conflict isa SA_API.SignalAnalyserValidationError
    @test haskey(conflict.fields, "analysis_signal") || haskey(conflict.fields, "selected_signal")
    @test SA_API.signal_analyser_snapshot(state) == before_conflict

    stale = try
        SA_API.apply_signal_analyser_view!(state, Dict("state_revision" => 1, "visible_signals" => [first_name]))
        nothing
    catch caught
        caught
    end
    @test stale isa SA_API.SignalAnalyserStaleStateError
    @test SA_API.signal_analyser_snapshot(state) == before_conflict
end
