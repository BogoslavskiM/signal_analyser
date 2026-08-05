using Test

const ML_INTEGRATION = Main.AppTestContext

if !isdefined(ML_INTEGRATION, :SignalAnalyserSessionService)
    Base.include(ML_INTEGRATION, joinpath(ML_INTEGRATION.PROJECT_ROOT, "lib", "domain", "signal_session.jl"))
    Base.include(ML_INTEGRATION, joinpath(ML_INTEGRATION.PROJECT_ROOT, "lib", "services", "signal_session_service.jl"))
end

function task0031_resize_payload(revision::Int, rows::Int, columns::Int)
    Dict{String,Any}(
        "state_revision" => revision,
        "operation" => "resize",
        "display_id" => "display-1",
        "version" => 1,
        "variant" => "$(rows)x$(columns)",
        "rows" => rows,
        "columns" => columns,
    )
end

function task0031_layout_entry(snapshot)
    only(snapshot["layouts"])
end

function task0031_assert_envelope(snapshot)
    @test Set(keys(snapshot)) == Set([
        "ok", "state_revision", "active_display_id", "layouts", "state",
    ])
    @test snapshot["ok"] === true
    @test snapshot["state_revision"] == snapshot["state"]["state_revision"]
    @test snapshot["active_display_id"] == snapshot["state"]["active_display_id"]
    entry = task0031_layout_entry(snapshot)
    @test Set(keys(entry)) == Set(["display_id", "layout", "outputs"])
    @test entry["display_id"] == snapshot["active_display_id"]
    @test [pane["id"] for pane in entry["layout"]["panes"]] ==
        [output["pane_id"] for output in entry["outputs"]]
    snapshot
end

@testset "TASK-0031 all sixteen authoritative layout variants" begin
    for rows in 1:4, columns in 1:4
        state = ML_INTEGRATION.default_signal_analyser_state()
        response = ML_INTEGRATION.apply_signal_analyser_layout!(
            state,
            task0031_resize_payload(0, rows, columns),
        )
        task0031_assert_envelope(response)
        entry = task0031_layout_entry(response)
        layout = entry["layout"]
        pane_count = rows * columns

        @test (layout["variant"], layout["rows"], layout["columns"]) ==
            ("$(rows)x$(columns)", rows, columns)
        @test length(layout["panes"]) == pane_count == length(entry["outputs"])
        @test [pane["id"] for pane in layout["panes"]] ==
            ["pane-$index" for index in 1:pane_count]
        @test layout["active_pane_id"] == "pane-1"
        @test layout["next_pane_number"] == pane_count + 1
        @test all(Set(keys(output)) == Set([
            "pane_id", "plot_type", "signal_bindings", "analysis_signal", "output",
        ]) for output in entry["outputs"])
        @test all(Set(keys(output["output"])) == Set([
            "isready", "success", "error", "data",
        ]) for output in entry["outputs"])
        @test state.view.state_revision == (pane_count == 1 ? 0 : 1)
    end
end

@testset "TASK-0031 API GET POST 409 output shape parity" begin
    routes = ML_INTEGRATION.source("app", "routes.jl")
    @test length(collect(eachmatch(r"route\(\"/api/layouts\", method = GET\)", routes))) == 1
    @test length(collect(eachmatch(r"route\(\"/api/layouts\", method = POST\)", routes))) == 1
    @test occursin("signal_analyser_layouts_snapshot(SIGNAL_ANALYSER_STATE)", routes)
    @test occursin("apply_signal_analyser_layout!(SIGNAL_ANALYSER_STATE, jsonpayload())", routes)
    @test occursin("signal_analyser_layout_stale_response(SIGNAL_ANALYSER_STATE, err)", routes)

    state = ML_INTEGRATION.default_signal_analyser_state()
    get_snapshot = task0031_assert_envelope(
        ML_INTEGRATION.signal_analyser_layouts_snapshot(state),
    )
    post_snapshot = task0031_assert_envelope(
        ML_INTEGRATION.apply_signal_analyser_layout!(
            state,
            task0031_resize_payload(0, 2, 2),
        ),
    )
    revision = post_snapshot["state_revision"]
    before_stale = ML_INTEGRATION.signal_analyser_layouts_snapshot(state)
    stale = ML_INTEGRATION.signal_analyser_layout_stale_response(
        state,
        ML_INTEGRATION.SignalAnalyserStaleStateError(revision - 1, revision),
    )

    @test get_snapshot["state_revision"] == 0
    @test post_snapshot["state_revision"] == 1
    @test stale.status == 409
    @test Set(keys(stale.body)) == Set(["ok", "code", "error", "state", "current"])
    @test stale.body["ok"] === false && stale.body["code"] == "stale_state"
    @test stale.body["state"]["state_revision"] == revision
    @test stale.body["current"] == before_stale
    @test Set(keys(stale.body["current"])) == Set(keys(post_snapshot))
    @test [pane["id"] for pane in task0031_layout_entry(stale.body["current"])["layout"]["panes"]] ==
        [output["pane_id"] for output in task0031_layout_entry(stale.body["current"])["outputs"]]
    @test state.view.state_revision == revision
end

@testset "TASK-0031 invalid dimensions are atomic" begin
    invalid_dimensions = (
        (0, 1, "0x1"),
        (5, 1, "5x1"),
        (1, 0, "1x0"),
        (1, 5, "1x5"),
        (2, 2, "2x3"),
    )
    for (rows, columns, supplied_variant) in invalid_dimensions
        state = ML_INTEGRATION.default_signal_analyser_state()
        before = ML_INTEGRATION.signal_analyser_layouts_snapshot(state)
        payload = task0031_resize_payload(0, rows, columns)
        payload["variant"] = supplied_variant
        error = try
            ML_INTEGRATION.apply_signal_analyser_layout!(state, payload)
            nothing
        catch caught
            caught
        end
        @test error isa ML_INTEGRATION.SignalAnalyserValidationError
        @test state.view.state_revision == 0
        @test ML_INTEGRATION.signal_analyser_layouts_snapshot(state) == before
    end
end

@testset "TASK-0031 ordered preservation active fallback and session round trip" begin
    state = ML_INTEGRATION.default_signal_analyser_state()
    names = [signal.name for signal in state.signals]
    grown = ML_INTEGRATION.apply_signal_analyser_layout!(
        state,
        task0031_resize_payload(0, 4, 4),
    )
    configured = ML_INTEGRATION.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => grown["state_revision"],
        "operation" => "update_pane",
        "display_id" => "display-1",
        "version" => 1,
        "pane_id" => "pane-4",
        "plot_type" => "spectrum",
        "signal_bindings" => reverse(names),
    ))
    selected = ML_INTEGRATION.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => configured["state_revision"],
        "operation" => "select_pane",
        "display_id" => "display-1",
        "version" => 1,
        "pane_id" => "pane-16",
    ))
    shrunk = ML_INTEGRATION.apply_signal_analyser_layout!(
        state,
        task0031_resize_payload(selected["state_revision"], 2, 2),
    )
    shrunk_layout = task0031_layout_entry(shrunk)["layout"]

    @test [pane["id"] for pane in shrunk_layout["panes"]] ==
        ["pane-1", "pane-2", "pane-3", "pane-4"]
    @test shrunk_layout["active_pane_id"] == "pane-1"
    @test shrunk_layout["next_pane_number"] == 17
    @test shrunk_layout["panes"][4]["plot_type"] == "spectrum"
    @test shrunk_layout["panes"][4]["signal_bindings"] == reverse(names)

    regrown = ML_INTEGRATION.apply_signal_analyser_layout!(
        state,
        task0031_resize_payload(shrunk["state_revision"], 4, 4),
    )
    regrown_entry = task0031_layout_entry(regrown)
    @test length(regrown_entry["layout"]["panes"]) == 16
    @test [pane["id"] for pane in regrown_entry["layout"]["panes"]][1:4] ==
        ["pane-1", "pane-2", "pane-3", "pane-4"]
    @test [pane["id"] for pane in regrown_entry["layout"]["panes"]][5:end] ==
        ["pane-$index" for index in 17:28]
    @test [pane["id"] for pane in regrown_entry["layout"]["panes"]] ==
        [output["pane_id"] for output in regrown_entry["outputs"]]

    service = ML_INTEGRATION.SignalAnalyserSessionService()
    document = ML_INTEGRATION.export_signal_analyser_session(service, state)["document"]
    session_layout = only(document["state"]["displays"])["layout"]
    @test !haskey(session_layout, "outputs")
    @test Set(keys(session_layout)) == ML_INTEGRATION.SIGNAL_ANALYSER_SESSION_LAYOUT_FIELDS

    imported = ML_INTEGRATION.default_signal_analyser_state()
    ML_INTEGRATION.import_signal_analyser_session!(service, imported, Dict(
        "state_revision" => 0,
        "document" => document,
    ))
    restored = ML_INTEGRATION.signal_analyser_layouts_snapshot(imported)
    @test task0031_layout_entry(restored)["layout"] == regrown_entry["layout"]
    @test [output["pane_id"] for output in task0031_layout_entry(restored)["outputs"]] ==
        [pane["id"] for pane in regrown_entry["layout"]["panes"]]
end
