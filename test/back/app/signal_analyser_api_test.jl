using Test

const SA_API = Main.AppTestContext

@testset "Settings API retains the narrow settings route boundary" begin
    routes_source = SA_API.source("app", "routes.jl")

    @test length(collect(eachmatch(r"route\(\"/api/settings\", method = GET\)", routes_source))) == 1
    @test length(collect(eachmatch(r"route\(\"/api/settings\", method = POST\)", routes_source))) == 1
    @test length(collect(eachmatch(r"route\(\"/api/settings/apply\", method = POST\)", routes_source))) == 1
    @test occursin("signal_settings_document", routes_source)
    @test occursin("apply_signal_setting!", routes_source)
    @test occursin("apply_signal_settings!", routes_source)
    @test occursin("signal_setting_validation_response", routes_source)
    @test occursin("signal_analyser_stale_response", routes_source)

    state = SA_API.default_signal_analyser_state()
    service = SA_API.SignalSettingsService()
    @test hasmethod(SA_API.parse_signal_setting_command, Tuple{SA_API.SignalSettingsService, typeof(state), Any})
    command = SA_API.parse_signal_setting_command(service, state, Dict(
        "state_revision" => 7,
        "display_id" => "display-1",
        "field_id" => "time.units",
        "value" => "minutes",
    ))
    @test command isa SA_API.UpdateSignalSettingCommand
    @test command.state_revision == 7 && command.display_id == "display-1" && command.field_id == "time.units"
    for invalid in (
        Dict{String,Any}(),
        Dict("state_revision" => true, "display_id" => "display-1", "field_id" => "time.units", "value" => "seconds"),
        Dict("state_revision" => 0, "display_id" => "", "field_id" => "time.units", "value" => "seconds"),
        Dict("state_revision" => 0, "display_id" => "display-1", "field_id" => "", "value" => "seconds"),
        Dict("state_revision" => 0, "display_id" => "display-1", "field_id" => "time.units", "value" => "seconds", "extra" => true),
    )
        @test_throws SA_API.SignalSettingValidationError SA_API.parse_signal_setting_command(service, state, invalid)
    end

    # Apply is deliberately a separate, exact command boundary: the already
    # stored draft is the only calculation snapshot it may consume.
    @test hasmethod(SA_API.parse_signal_settings_apply_command, Tuple{typeof(state), Any})
    apply_command = SA_API.parse_signal_settings_apply_command(state, Dict(
        "state_revision" => 7, "display_id" => "display-1",
    ))
    @test apply_command isa SA_API.ApplySignalSettingsCommand
    @test apply_command.state_revision == 7 && apply_command.display_id == "display-1"
    for invalid in (
        Dict{String,Any}(),
        Dict("state_revision" => true, "display_id" => "display-1"),
        Dict("state_revision" => 7, "display_id" => ""),
        Dict("state_revision" => 7, "display_id" => "display-1", "field_id" => "spectrum.leakage"),
        Dict("state_revision" => 7, "display_id" => "display-1", "settings" => Dict()),
    )
        # Apply accepts no semantic settings payload.  Its malformed request
        # boundary is an API type error (the route maps it to HTTP 500), while
        # semantic draft validation remains a successful typed Apply response.
        @test_throws SA_API.SignalSettingApiTypeError SA_API.parse_signal_settings_apply_command(state, invalid)
    end
end

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
    @test haskey(snapshot, "measurement_rows")
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
    rows = get(snapshot, "measurement_rows", Dict{String,Any}[])
    matching_rows = filter(row -> get(row, "signal_name", nothing) == signal.name, rows)
    @test length(matching_rows) == 1
    isempty(matching_rows) || begin
        @test matching_rows[1]["items"] == payload["items"]
        @test matching_rows[1]["error"] === nothing
        @test Set(keys(matching_rows[1])) == Set(["state_revision", "signal_name", "ordinate", "units", "items", "time_limits", "error"])
    end
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
    @test occursin(r"apply_signal_analyser_view!\(\s*SIGNAL_ANALYSER_STATE,\s*jsonpayload\(\);\s*lightweight = true,\s*\)", routes_source)
    @test occursin(r"apply_signal_analyser_display!\(\s*SIGNAL_ANALYSER_STATE,\s*jsonpayload\(\);\s*lightweight = true,\s*\)", routes_source)
    @test !occursin("signal_analyser_measurements", routes_source)
    @test occursin("\"visible_signals\"", SA_API.source("lib", "services", "signal_analyser_service.jl"))
    @test occursin("signal_analyser_validation_response(err)", routes_source)
    @test occursin("signal_analyser_stale_response(SIGNAL_ANALYSER_STATE, err)", routes_source)
    @test !occursin("signal_analyser_unavailable_response", routes_source)
    @test !occursin("/api/persistence", routes_source)
    @test occursin("persistence_settings", SA_API.source("lib", "services", "signal_analyser_service.jl"))
    # `num_power_bins` is required as an internal immutable provider-query
    # invariant; only a serialized/request wire key is forbidden in C18.
    @test !occursin("\"num_power_bins\"", SA_API.source("lib", "services", "signal_analyser_service.jl"))
end

@testset "TASK-0037 bootstrap and Layout update_pane API contract" begin
    routes_source = SA_API.source("app", "routes.jl")
    bootstrap_source = SA_API.source("app", "bootstrap.jl")

    @test length(collect(eachmatch(r"route\(\"/\"\) do", routes_source))) == 1
    @test length(collect(eachmatch(r"route\(\"/api/status\", method = GET\)", routes_source))) == 1
    @test length(collect(eachmatch(r"route\(\"/api/state\", method = GET\)", routes_source))) == 1
    @test length(collect(eachmatch(r"route\(\"/api/layouts\", method = GET\)", routes_source))) == 1
    @test length(collect(eachmatch(r"route\(\"/api/layouts\", method = POST\)", routes_source))) == 1
    @test occursin("const SIGNAL_ANALYSER_STATE = default_signal_analyser_state()", bootstrap_source)
    @test occursin("signal_analyser_layouts_lite_snapshot(SIGNAL_ANALYSER_STATE)", routes_source)
    @test occursin("lightweight = true", routes_source)

    state = SA_API.test_state_with_complex_signal()
    names = [signal.name for signal in state.signals]
    before = SA_API.signal_analyser_snapshot(state)
    original_pane = SA_API.signal_display_active_pane(state.display_layouts["display-1"])

    preserved = SA_API.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => 0,
        "operation" => "update_pane",
        "display_id" => "display-1",
        "version" => 1,
        "pane_id" => "pane-1",
        "plot_type" => "spectrum",
        "signal_bindings" => names,
    ))
    preserved_pane = SA_API.signal_display_active_pane(state.display_layouts["display-1"])
    @test preserved["state_revision"] == 1
    @test preserved_pane.plot_type == SA_API.SPECTRUM_PLOT
    @test SA_API.signal_display_pane_members(preserved_pane) == names
    @test preserved_pane.time_limits == original_pane.time_limits
    @test preserved_pane.measurement_selection == original_pane.measurement_selection
    @test preserved_pane.spectrum_settings == original_pane.spectrum_settings
    @test preserved_pane.spectrogram_settings == original_pane.spectrogram_settings
    @test preserved_pane.persistence_settings == original_pane.persistence_settings
    @test preserved_pane.stored_settings == original_pane.stored_settings
    @test preserved_pane.peaks_enabled === false

    rebound = SA_API.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => 1,
        "operation" => "update_pane",
        "display_id" => "display-1",
        "version" => 1,
        "pane_id" => "pane-1",
        "plot_type" => "time",
        "signal_bindings" => [names[2]],
    ))
    rebound_pane = SA_API.signal_display_active_pane(state.display_layouts["display-1"])
    @test rebound["state_revision"] == 2
    @test SA_API.signal_display_pane_analysis_name(rebound_pane) == names[2]
    @test rebound_pane.time_limits == SA_API.signal_full_time_limits(state.measurements_service, state.signals[2])

    emptied = SA_API.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => 2,
        "operation" => "update_pane",
        "display_id" => "display-1",
        "version" => 1,
        "pane_id" => "pane-1",
        "plot_type" => "time",
        "signal_bindings" => String[],
    ))
    empty_pane = SA_API.signal_display_active_pane(state.display_layouts["display-1"])
    @test emptied["state_revision"] == 3
    @test isempty(SA_API.signal_display_pane_members(empty_pane))
    @test SA_API.signal_display_pane_analysis_name(empty_pane) === nothing
    @test empty_pane.time_limits === nothing && empty_pane.peaks_enabled === false
    @test before["state_revision"] == 0
end

@testset "/api/layouts bootstrap retains lite and nested compatibility fields" begin
    routes_source = SA_API.source("app", "routes.jl")
    api_source = SA_API.source("app", "api.jl")
    compatibility_fields = [
        "state_revision", "calculation_revision", "active_display_id", "signals",
        "displays", "layouts", "active_output", "need_update_pages", "capabilities",
    ]
    @test occursin("function signal_analyser_layouts_bootstrap_payload", api_source)
    @test occursin("merge!(payload, snapshot)", api_source)
    @test length(collect(eachmatch(r"route\(\"/api/layouts\", method = GET\)", routes_source))) == 1
    @test length(collect(eachmatch(r"route\(\"/api/layouts\", method = POST\)", routes_source))) == 1
    @test length(collect(eachmatch(r"signal_analyser_layouts_bootstrap_payload\(", routes_source))) == 2
    @test length(collect(eachmatch(r"\[\"Cache-Control\" => \"no-store\"\]", routes_source))) >= 2

    SA_API.reset_pspectrum_double!()
    empty!(SA_API.SPECTROGRAM_CALLS)
    empty!(SA_API.PERSISTENCE_CALLS)
    state = SA_API.default_signal_analyser_state()
    provider_calls = (
        length(SA_API.SPECTRUM_CALLS), length(SA_API.SPECTROGRAM_CALLS),
        length(SA_API.PERSISTENCE_CALLS), length(SA_API.PSPECTRUM_CALLS),
    )
    get_payload = SA_API.signal_analyser_layouts_bootstrap_payload(
        SA_API.signal_analyser_layouts_lite_snapshot(state),
    )
    @test get_payload["ok"] === true
    @test get_payload["state"] isa Dict{String,Any}
    @test all(key -> haskey(get_payload, key) && get_payload[key] == get_payload["state"][key], compatibility_fields)
    @test isempty(get_payload["active_output"]["output"]["data"])
    @test state.output_manager.active_task === nothing
    @test (
        length(SA_API.SPECTRUM_CALLS), length(SA_API.SPECTROGRAM_CALLS),
        length(SA_API.PERSISTENCE_CALLS), length(SA_API.PSPECTRUM_CALLS),
    ) == provider_calls

    pane_id = state.display_layouts["display-1"].active_pane_id
    post_payload = SA_API.signal_analyser_layouts_bootstrap_payload(
        SA_API.apply_signal_analyser_layout!(state, Dict(
            "state_revision" => state.view.state_revision,
            "operation" => "select_pane",
            "display_id" => "display-1",
            "version" => 1,
            "pane_id" => pane_id,
        ); lightweight = true),
    )
    @test post_payload["ok"] === true
    @test post_payload["state_revision"] == get_payload["state_revision"]
    @test all(key -> post_payload[key] == post_payload["state"][key], compatibility_fields)
    @test state.output_manager.active_task === nothing
    @test (
        length(SA_API.SPECTRUM_CALLS), length(SA_API.SPECTROGRAM_CALLS),
        length(SA_API.PERSISTENCE_CALLS), length(SA_API.PSPECTRUM_CALLS),
    ) == provider_calls

    stale = SA_API.signal_analyser_layout_stale_response(
        state,
        SA_API.SignalAnalyserStaleStateError(-1, state.view.state_revision),
    )
    @test stale.status == 409
    @test Set(keys(stale.body)) == Set(["ok", "code", "error", "state", "current"])
    @test stale.body["ok"] === false && stale.body["code"] == "stale_state"
end

@testset "Signals inspector API route and adapter boundary" begin
    routes_source = SA_API.source("app", "routes.jl")
    domain_source = SA_API.source("lib", "domain", "signal_inventory.jl")
    adapter_source = SA_API.source("lib", "adapters", "engee_workspace_signal_source.jl")
    signals_routes = collect(eachmatch(r"route\(\"/api/signals\", method = POST\)", routes_source))

    @test length(signals_routes) == 1
    @test occursin("apply_signal_inventory!", routes_source)
    @test occursin("jsonpayload()", routes_source)
    @test occursin("signal_analyser_validation_response", routes_source)
    @test occursin("signal_analyser_stale_response", routes_source)
    @test occursin("ImportWorkspaceSignalCommand", domain_source)
    @test occursin("DuplicateSignalCommand", domain_source)
    @test occursin("ExtractTimeLimitsSignalCommand", domain_source)
    @test occursin("DeleteSignalCommand", domain_source)
    @test occursin("AbstractWorkspaceSignalSource", domain_source)
    @test occursin("EngeeWorkspaceSignalSource", adapter_source)
    @test occursin("workspace_variable_value", adapter_source)
    @test !occursin("engee.genie.eval", adapter_source)
    @test !occursin("Core.eval", adapter_source)
end

@testset "Signals inspector parser is a strict operation union" begin
    @test SA_API.parse_signal_inventory_command(Dict("state_revision" => 3, "operation" => "import_workspace", "variable_name" => "x", "signal_name" => nothing, "sample_rate_hz" => 10.0)) isa SA_API.ImportWorkspaceSignalCommand
    @test SA_API.parse_signal_inventory_command(Dict("state_revision" => 3, "operation" => "duplicate", "signal_name" => "x")) isa SA_API.DuplicateSignalCommand
    @test SA_API.parse_signal_inventory_command(Dict("state_revision" => 3, "operation" => "extract_time_limits", "display_id" => "display-1")) isa SA_API.ExtractTimeLimitsSignalCommand
    @test SA_API.parse_signal_inventory_command(Dict("state_revision" => 3, "operation" => "delete", "signal_name" => "x")) isa SA_API.DeleteSignalCommand

    for payload in (
        Dict{String,Any}(),
        Dict("state_revision" => 3, "operation" => "unknown"),
        Dict("state_revision" => 3, "operation" => "import_workspace", "variable_name" => "x", "sample_rate_hz" => 10.0),
        Dict("state_revision" => 3, "operation" => "import_workspace", "variable_name" => "x", "signal_name" => "", "sample_rate_hz" => 10.0),
        Dict("state_revision" => 3, "operation" => "import_workspace", "variable_name" => "x", "signal_name" => nothing, "sample_rate_hz" => true),
        Dict("state_revision" => 3, "operation" => "duplicate", "signal_name" => "x", "extra" => true),
        Dict("state_revision" => 3, "operation" => "extract_time_limits", "display_id" => "display-1", "signal_name" => "x"),
        Dict("state_revision" => 3, "operation" => "delete", "signal_name" => "   "),
        Dict("state_revision" => 3.0, "operation" => "delete", "signal_name" => "x"),
        Dict("state_revision" => true, "operation" => "delete", "signal_name" => "x"),
    )
        @test_throws SA_API.SignalAnalyserValidationError SA_API.parse_signal_inventory_command(payload)
    end
end

@testset "Cascade 19 API Persistence Leakage wire contract" begin
    SA_API.reset_pspectrum_double!()
    state = SA_API.default_signal_analyser_state()
    settings = SA_API.SignalSettingsService()
    initial = SA_API.signal_analyser_snapshot(state)
    @test initial["persistence_settings"] == Dict("leakage" => 0.5)
    @test initial["displays"][1]["persistence_settings"] == Dict("leakage" => 0.5)

    draft = SA_API.apply_signal_setting!(settings, state, Dict(
        "state_revision" => 0,
        "display_id" => "display-1",
        "field_id" => "persistence.leakage",
        "value" => 0.25,
    ))
    @test draft["state"]["state_revision"] == 1
    @test SA_API.signal_analyser_snapshot(state)["persistence_settings"] == Dict("leakage" => 0.5)
    @test isempty(SA_API.PSPECTRUM_CALLS)

    applied = SA_API.apply_signal_settings!(settings, state, Dict(
        "state_revision" => 1, "display_id" => "display-1",
    ))
    @test applied == Dict{String,Any}("success" => true, "state_revision" => 2)
    @test SA_API.signal_analyser_snapshot(state)["persistence_settings"] == Dict("leakage" => 0.25)
    @test isempty(SA_API.PSPECTRUM_CALLS)

    for invalid in (nothing, "0.5", true, NaN, -Inf)
        # Non-JSON-number field values fail at the API type boundary.  A
        # finite but out-of-range JSON number is retained as a draft and is
        # reported by explicit Apply as a semantic validation response.
        @test_throws SA_API.SignalSettingApiTypeError SA_API.apply_signal_setting!(
            settings, state, Dict(
                "state_revision" => 2, "display_id" => "display-1",
                "field_id" => "persistence.leakage", "value" => invalid,
            ),
        )
    end
    @test_throws SA_API.SignalAnalyserStaleStateError SA_API.apply_signal_setting!(
        settings, state, Dict(
            "state_revision" => 1, "display_id" => "display-1",
            "field_id" => "persistence.leakage", "value" => 0.5,
        ),
    )
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
    state = SA_API.test_state_with_complex_signal()
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
    expected_state_lite = SA_API.signal_analyser_state_lite(state)
    @test stale_response.status == 409
    @test Set(keys(stale_response.body)) == Set(["ok", "code", "error", "state", "current"])
    @test stale_response.body["ok"] === false
    @test stale_response.body["code"] == "stale_state"
    @test stale_response.body["error"] == Dict(
        "code" => "stale_state",
        "message" => "Состояние устарело: ожидалась ревизия 0, текущая ревизия 1",
    )
    @test stale_response.body["state"] == expected_state_lite
    @test stale_response.body["current"] == expected_state_lite
    @test stale_response.body["state"] == stale_response.body["current"]
    @test stale_response.body["current"]["state_revision"] == 1
    @test stale_response.body["current"]["visible_signals"] == [first_name]
    @test stale_response.body["current"]["active_output"]["signal_bindings"] == [first_name]
    @test stale_response.body["current"]["active_output"]["output"]["data"] == Dict{String,Any}[]
    @test only(only(stale_response.body["current"]["layouts"])["outputs"])["output"]["data"] == Dict{String,Any}[]
    @test !haskey(stale_response.body["current"], "plot_payload")
    @test !haskey(stale_response.body["current"], "plots")
end

@testset "Cascade 7 API Time Limits validation envelope" begin
    SA_API.reset_pspectrum_double!()
    state = SA_API.default_signal_analyser_state()
    settings = SA_API.SignalSettingsService()
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
            SA_API.apply_signal_setting!(settings, state, Dict(
                "state_revision" => 0, "display_id" => "display-1",
                "field_id" => "time.x_limits", "value" => invalid_limits,
            ))
            nothing
        catch caught
            caught
        end
        # The draft wire shape is exactly null or {min,max}; malformed JSON
        # values are API type errors, not semantic Apply failures.
        @test err isa SA_API.SignalSettingApiTypeError
        @test err.field_id == "time.x_limits"
        @test SA_API.signal_analyser_snapshot(state) == baseline
    end

    draft = SA_API.apply_signal_setting!(settings, state, Dict(
        "state_revision" => 0, "display_id" => "display-1",
        "field_id" => "time.x_limits",
        "value" => Dict("min" => 0.0, "max" => 0.1),
    ))
    @test draft["state"]["state_revision"] == 1
    @test SA_API.signal_analyser_snapshot(state)["time_limits"] !== Dict("min_s" => 0.0, "max_s" => 0.1, "units" => "s")
    accepted = SA_API.apply_signal_settings!(settings, state, Dict(
        "state_revision" => 1, "display_id" => "display-1",
    ))
    @test accepted == Dict{String,Any}("success" => true, "state_revision" => 2)
    @test SA_API.signal_analyser_snapshot(state)["time_limits"] == Dict("min_s" => 0.0, "max_s" => 0.1, "units" => "s")
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
    empty!(SA_API.SPECTRUM_CALLS)
    state = SA_API.default_signal_analyser_state()
    settings = SA_API.SignalSettingsService()
    baseline = SA_API.signal_analyser_snapshot(state)
    @test baseline["spectrum_settings"] == Dict("scale" => "db", "frequency_scale" => "linear", "leakage" => 0.5, "frequency_limits" => nothing)
    @test all(display -> display["spectrum_settings"] isa Dict, baseline["displays"])

    draft = SA_API.apply_signal_setting!(settings, state, Dict(
        "state_revision" => 0, "display_id" => "display-1",
        "field_id" => "spectrum.scale", "value" => "linear",
    ))
    @test draft["state"]["state_revision"] == 1
    draft = SA_API.apply_signal_setting!(settings, state, Dict(
        "state_revision" => 1, "display_id" => "display-1",
        "field_id" => "spectrum.leakage", "value" => 0.25,
    ))
    @test draft["state"]["state_revision"] == 2
    @test isempty(SA_API.SPECTRUM_CALLS)
    canonical = SA_API.apply_signal_settings!(settings, state, Dict(
        "state_revision" => 2, "display_id" => "display-1",
    ))
    @test canonical == Dict{String,Any}("success" => true, "state_revision" => 3)
    @test SA_API.signal_analyser_snapshot(state)["spectrum_settings"] == Dict("scale" => "linear", "frequency_scale" => "linear", "leakage" => 0.25, "frequency_limits" => nothing)
    @test isempty(SA_API.SPECTRUM_CALLS)
    active = SA_API.signal_analyser_active_output(state, "display-1", "pane-1")
    @test active["isready"] === false && active["success"] === false && isempty(active["data"])
    task = state.output_manager.active_task
    @test task !== nothing
    wait(task)

    stale = try
        SA_API.apply_signal_settings!(settings, state, Dict(
            "state_revision" => 2, "display_id" => "display-1",
        ))
        nothing
    catch caught
        caught
    end
    @test stale isa SA_API.SignalAnalyserStaleStateError
    stale_envelope = SA_API.signal_analyser_stale_response(state, stale)
    expected_state_lite = SA_API.signal_analyser_state_lite(state)
    @test stale_envelope.status == 409
    @test stale_envelope.body["state"] == expected_state_lite
    @test stale_envelope.body["current"] == expected_state_lite
    @test stale_envelope.body["current"]["state_revision"] >= canonical["state_revision"]
    @test stale_envelope.body["current"]["spectrum_settings"]["scale"] == "linear"
    @test !haskey(stale_envelope.body["current"], "plot_payload")
    @test !haskey(stale_envelope.body["current"], "plots")
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

    settings = SA_API.SignalSettingsService()
    draft = SA_API.apply_signal_setting!(settings, state, Dict(
        "state_revision" => 0, "display_id" => "display-1",
        "field_id" => "spectrum.frequency_limits",
        "value" => Dict("min" => 10.0, "max" => 100.0),
    ))
    @test draft["state"]["state_revision"] == 1
    @test SA_API.signal_analyser_snapshot(state)["spectrum_settings"] == auto
    applied = SA_API.apply_signal_settings!(settings, state, Dict(
        "state_revision" => 1, "display_id" => "display-1",
    ))
    @test applied == Dict{String,Any}("success" => true, "state_revision" => 2)
    @test SA_API.signal_analyser_snapshot(state)["spectrum_settings"]["frequency_limits"] == Dict("min_hz" => 10.0, "max_hz" => 100.0, "units" => "Hz")
    @test state.output_manager.need_update_pages[state.output_manager.active_page_id]
end

@testset "Cascade 13 API Spectrogram settings envelope and lifecycle" begin
    SA_API.reset_pspectrum_double!()
    empty!(SA_API.SPECTROGRAM_CALLS)
    SA_API.SPECTROGRAM_FAILURE[] = false
    state = SA_API.default_signal_analyser_state()
    first_name = state.signals[1].name
    initial = SA_API.signal_analyser_snapshot(state)
    default_settings = Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing)
    @test initial["spectrogram_settings"] == default_settings
    @test all(display -> display["spectrogram_settings"] == default_settings, initial["displays"])

    for invalid in (
        nothing,
        "50",
        Dict{String,Any}(),
        Dict("overlap_percent" => 50.0),
        Dict("leakage" => 0.5),
        Dict("overlap_percent" => true, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing),
        Dict("overlap_percent" => 50.0, "leakage" => true, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing),
        Dict("overlap_percent" => 50.0, "leakage" => "0.5", "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing),
        Dict("overlap_percent" => NaN, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing),
        Dict("overlap_percent" => 50.0, "leakage" => NaN, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing),
        Dict("overlap_percent" => 50.0, "leakage" => Inf, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing),
        Dict("overlap_percent" => 50.0, "leakage" => -0.1, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing),
        Dict("overlap_percent" => 50.0, "leakage" => 1.1, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing),
        Dict("overlap_percent" => -1.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing),
        Dict("overlap_percent" => 75.1, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing),
        Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "extra" => true),
    )
        error = try
            SA_API.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "spectrogram_settings" => invalid))
            nothing
        catch caught
            caught
        end
        @test error isa SA_API.SignalAnalyserValidationError
        @test haskey(error.fields, "spectrogram_settings")
        response = SA_API.signal_analyser_validation_response(error)
        @test response.status == 422
        @test response.body["error"]["fields"] == error.fields
        @test SA_API.signal_analyser_snapshot(state) == initial
    end

    settings = SA_API.SignalSettingsService()
    draft = SA_API.apply_signal_setting!(settings, state, Dict(
        "state_revision" => 0, "display_id" => "display-1",
        "field_id" => "spectrogram.overlap_percent", "value" => 75.0,
    ))
    @test draft["state"]["state_revision"] == 1
    @test isempty(SA_API.SPECTROGRAM_CALLS)
    changed = SA_API.apply_signal_settings!(settings, state, Dict(
        "state_revision" => 1, "display_id" => "display-1",
    ))
    @test changed == Dict{String,Any}("success" => true, "state_revision" => 2)
    @test SA_API.signal_analyser_snapshot(state)["spectrogram_settings"]["overlap_percent"] == 75.0
    @test isempty(SA_API.SPECTROGRAM_CALLS)

    stale = try
        SA_API.apply_signal_settings!(settings, state, Dict(
            "state_revision" => 1, "display_id" => "display-1",
        ))
        nothing
    catch caught
        caught
    end
    @test stale isa SA_API.SignalAnalyserStaleStateError
    @test SA_API.signal_analyser_stale_response(state, stale).status == 409
end

@testset "Cascade 17 API Spectrogram Power Limits envelope and atomicity" begin
    SA_API.reset_pspectrum_double!(); empty!(SA_API.SPECTRUM_CALLS); empty!(SA_API.SPECTROGRAM_CALLS)
    state = SA_API.default_signal_analyser_state()
    settings = SA_API.SignalSettingsService()
    draft = SA_API.apply_signal_setting!(settings, state, Dict(
        "state_revision" => 0, "display_id" => "display-1",
        "field_id" => "spectrogram.power_limits",
        "value" => Dict("min" => -80.0, "max" => -20.0),
    ))
    @test draft["state"]["state_revision"] == 1
    @test isempty(SA_API.SPECTROGRAM_CALLS)
    applied = SA_API.apply_signal_settings!(settings, state, Dict(
        "state_revision" => 1, "display_id" => "display-1",
    ))
    @test applied == Dict{String,Any}("success" => true, "state_revision" => 2)
    @test SA_API.signal_analyser_snapshot(state)["spectrogram_settings"]["power_limits"] == Dict("min_db" => -80.0, "max_db" => -20.0, "units" => "dB")
    @test isempty(SA_API.SPECTROGRAM_CALLS)
    active = SA_API.signal_analyser_active_output(state, "display-1", "pane-1")
    @test active["isready"] isa Bool && active["success"] isa Bool && active["data"] isa AbstractVector
    task = state.output_manager.active_task
    task === nothing || wait(task)
    stale = try SA_API.apply_signal_settings!(settings, state, Dict("state_revision" => 1, "display_id" => "display-1")); nothing catch caught; caught end
    @test stale isa SA_API.SignalAnalyserStaleStateError && SA_API.signal_analyser_stale_response(state, stale).status == 409
end

@testset "Signal Analyser API view payload contract" begin
    SA_API.reset_pspectrum_double!()
    state = SA_API.test_state_with_complex_signal()
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
    @test [trace["name"] for trace in success["plot_payload"]["time_traces"]] == [
        first_name, "$(second_name) (Real)", "$(second_name) (Imaginary)",
    ]
    @test [trace["color"] for trace in success["plot_payload"]["time_traces"]] == ["#2563eb", "#dc2626", "#dc2626"]
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
    state = SA_API.test_state_with_complex_signal()
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
        "mode" => "maxima",
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

@testset "Cascade 16 API rejects non-exact Spectrogram Frequency Scale settings atomically" begin
    SA_API.reset_pspectrum_double!()
    state = SA_API.default_signal_analyser_state()
    settings = SA_API.SignalSettingsService()
    draft = SA_API.apply_signal_setting!(settings, state, Dict(
        "state_revision" => 0, "display_id" => "display-1",
        "field_id" => "spectrogram.frequency_scale", "value" => "log",
    ))
    @test draft["state"]["state_revision"] == 1
    @test only(filter(field -> field["id"] == "spectrogram.frequency_scale", draft["settings"]["fields"]))["value"] == "log"
    @test_throws SA_API.SignalSettingValidationError SA_API.apply_signal_setting!(
        settings, state, Dict(
            "state_revision" => 1, "display_id" => "display-1",
            "field_id" => "spectrogram.frequency_scale", "value" => "Log",
        ),
    )
    accepted = SA_API.apply_signal_settings!(settings, state, Dict(
        "state_revision" => 1, "display_id" => "display-1",
    ))
    @test accepted == Dict{String,Any}("success" => true, "state_revision" => 2)
    @test SA_API.signal_analyser_snapshot(state)["spectrogram_settings"]["frequency_scale"] == "log"
    stale = try SA_API.apply_signal_settings!(settings, state, Dict("state_revision" => 0, "display_id" => "display-1")); nothing catch caught; caught end
    @test stale isa SA_API.SignalAnalyserStaleStateError
    @test SA_API.signal_analyser_stale_response(state, stale).status == 409
end

@testset "DEC-039 workspace catalog route and batch-import source contract" begin
    routes_source = SA_API.source("app", "routes.jl")
    api_source = SA_API.source("app", "api.jl")
    domain_source = SA_API.source("lib", "domain", "workspace_catalog.jl")
    adapter_source = SA_API.source("lib", "adapters", "engee_workspace_variable_provider.jl")

    @test occursin("/api/workspace/variables", routes_source)
    @test occursin("Cache-Control", routes_source)
    @test occursin("no-store", routes_source)
    @test occursin("params(:refresh)", routes_source)
    @test occursin("refresh_value == \"true\"", routes_source)
    @test occursin("latest_workspace_catalog!", routes_source)
    @test occursin("import_workspace_batch", api_source)
    @test occursin("catalog_revision", api_source)
    @test occursin("selections", api_source)
    @test occursin("WorkspaceCatalog", domain_source)
    @test occursin("WorkspaceVariable", domain_source)
    @test occursin("ENGEE_WORKSPACE_CATALOG_INTROSPECTION", adapter_source)
    @test occursin("engee.genie.eval", adapter_source)
    @test occursin("engee.genie.recv", adapter_source)
    @test !occursin("engee.genie.send", adapter_source)
    introspection = match(r"const ENGEE_WORKSPACE_CATALOG_INTROSPECTION = \"\"\"(.*?)\"\"\""s, adapter_source)
    @test introspection !== nothing && !occursin("\$", introspection.captures[1])
    @test introspection !== nothing && occursin(r"names\s*\(\s*catalog_module\s*;(?=[^)]*\ball\s*=\s*false)(?=[^)]*\bimported\s*=\s*false)[^)]*\)", introspection.captures[1])
    @test occursin("context = Main", adapter_source)
    @test occursin("Base.invokelatest(evaluate, ENGEE_WORKSPACE_CATALOG_INTROSPECTION)", adapter_source)
end

@testset "DEC-039 batch API parser, error mapping and legacy coexistence" begin
    revision = "wc_00000000-0000-4000-8000-000000000000"
    variable_id = SA_API.workspace_variable_id(revision, "base")
    valid = Dict{String,Any}(
        "operation" => "import_workspace_batch", "state_revision" => 0,
        "catalog_revision" => revision,
        "selections" => Any[Dict("variable_id" => variable_id, "sample_rate_hz" => 48_000.0)],
    )
    command = SA_API.parse_signal_inventory_command(valid)
    @test command isa SA_API.ImportWorkspaceBatchCommand && command.catalog_revision == revision
    legacy = SA_API.parse_signal_inventory_command(Dict{String,Any}(
        "operation" => "import_workspace", "state_revision" => 0,
        "variable_name" => "base", "signal_name" => nothing, "sample_rate_hz" => 48_000.0,
    ))
    @test legacy isa SA_API.ImportWorkspaceSignalCommand
    malformed = Any[
        merge(copy(valid), Dict("catalog_revision" => "wc_bad")),
        merge(copy(valid), Dict("selections" => Any[])),
        merge(copy(valid), Dict("selections" => Any[Dict("variable_id" => variable_id, "sample_rate_hz" => true)])),
        merge(copy(valid), Dict("selections" => Any[Dict("variable_id" => variable_id, "sample_rate_hz" => 1.0), Dict("variable_id" => variable_id, "sample_rate_hz" => 1.0)])),
        merge(copy(valid), Dict("unexpected" => true)),
    ]
    for body in malformed
        err = try SA_API.parse_signal_inventory_command(body); nothing catch caught; caught end
        @test err isa SA_API.SignalAnalyserValidationError
        response = SA_API.signal_analyser_validation_response(err)
        @test response.status == 422 && response.body["code"] == "invalid_request"
    end
    for (error, status, code) in ((SA_API.WorkspaceProviderError("bad"), 502, "workspace_provider_error"), (SA_API.WorkspaceUnavailableError("gone"), 503, "workspace_unavailable"), (SA_API.WorkspaceChangedError(revision, "changed"), 409, "workspace_changed"), (SA_API.StaleWorkspaceCatalogError(revision), 409, "stale_workspace_catalog"))
        response = SA_API.workspace_api_error_response(code, error; status = status)
        @test response.status == status && response.body["code"] == code && response.body["error"]["code"] == code
    end
end
