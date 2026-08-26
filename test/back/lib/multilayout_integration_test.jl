using Test

const ML_INTEGRATION = Main.AppTestContext

if !isdefined(ML_INTEGRATION, :SignalAnalyserSessionService)
    Base.include(ML_INTEGRATION, joinpath(ML_INTEGRATION.PROJECT_ROOT, "lib", "domain", "signal_session.jl"))
    Base.include(ML_INTEGRATION, joinpath(ML_INTEGRATION.PROJECT_ROOT, "lib", "services", "signal_session_service.jl"))
end

function task0140_pane_identity_and_canonical_allocation!()
    state = ML_INTEGRATION.default_signal_analyser_state()
    grown = ML_INTEGRATION.apply_signal_analyser_layout!(state, task0031_resize_payload(0, 4, 4))
    layout = task0031_layout_entry(grown)["layout"]
    pane_four_name = layout["panes"][4]["name"]
    updated = ML_INTEGRATION.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => grown["state_revision"], "operation" => "update_pane",
        "display_id" => "display-1", "version" => 1, "pane_id" => "pane-4",
        "plot_type" => "spectrum", "signal_bindings" => String[],
    ))
    updated_pane = task0031_layout_entry(updated)["layout"]["panes"][4]
    @test updated_pane["id"] == "pane-4"
    @test updated_pane["name"] == pane_four_name
    @test updated_pane["plot_type"] == "spectrum"

    shrunk = ML_INTEGRATION.apply_signal_analyser_layout!(
        state, task0031_resize_payload(updated["state_revision"], 1, 4),
    )
    @test task0031_layout_entry(shrunk)["layout"]["next_pane_number"] == 5
    regrown = ML_INTEGRATION.apply_signal_analyser_layout!(
        state, task0031_resize_payload(shrunk["state_revision"], 1, 6),
    )
    @test [pane["id"] for pane in task0031_layout_entry(regrown)["layout"]["panes"]] ==
        ["pane-$index" for index in 1:6]
end

function task0140_legacy_high_water_and_sparse_ids!()
    state = ML_INTEGRATION.default_signal_analyser_state()
    layout = state.display_layouts["display-1"]
    template = only(filter(pane -> pane.id == layout.active_pane_id, layout.panes))
    legacy_panes = ML_INTEGRATION.SignalDisplayPaneState[
        ML_INTEGRATION.signal_display_pane_with_id(template, "pane-$index") for index in 1:4
    ]
    legacy = ML_INTEGRATION.SignalDisplayLayoutState(1, "1x4", 1, 4, legacy_panes, "pane-1", 17)
    legacy_grown = ML_INTEGRATION.signal_display_layout_resize(legacy, 1, 5, template)
    @test [pane.id for pane in legacy_grown.panes] == ["pane-$index" for index in 1:5]
    @test legacy_grown.next_pane_number == 6

    sparse_ids = ["pane-1", "pane-3", "pane-9", "pane-11"]
    sparse_panes = ML_INTEGRATION.SignalDisplayPaneState[
        ML_INTEGRATION.signal_display_pane_with_id(template, pane_id) for pane_id in sparse_ids
    ]
    sparse = ML_INTEGRATION.SignalDisplayLayoutState(1, "1x4", 1, 4, sparse_panes, "pane-1", 17)
    sparse_grown = ML_INTEGRATION.signal_display_layout_resize(sparse, 1, 6, template)
    @test [pane.id for pane in sparse_grown.panes] == vcat(sparse_ids, ["pane-12", "pane-13"])
    @test length(unique(pane.id for pane in sparse_grown.panes)) == 6
    @test sparse_grown.next_pane_number == 14
end

function task0031_layout_entry(snapshot)
    only(snapshot["layouts"])
end

@testset "HND-0280 pane bindings canonicalize inventory order and preserve independent main signal" begin
    state = ML_INTEGRATION.test_state_with_complex_signal()
    names = [signal.name for signal in state.signals]
    requested_order = reverse(names)
    resized = ML_INTEGRATION.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => 0,
        "operation" => "resize",
        "display_id" => "display-1",
        "version" => 1,
        "variant" => "1x1",
        "rows" => 1,
        "columns" => 1,
    ))
    response = ML_INTEGRATION.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => resized["state_revision"],
        "operation" => "update_pane",
        "display_id" => "display-1",
        "version" => 1,
        "pane_id" => "pane-1",
        "plot_type" => "time",
        "signal_bindings" => requested_order,
    ))
    entry = task0031_layout_entry(response)
    snapshot = response["state"]
    display = only(snapshot["displays"])
    output = only(entry["outputs"])

    @test response["ok"] === true && response["state_revision"] == 2
    @test only(entry["layout"]["panes"])["signal_bindings"] == names
    @test output["signal_bindings"] == names
    @test output["analysis_signal"] === nothing
    # Complex Time is intentionally represented as ordered real/imaginary
    # components, not the legacy single magnitude trace.  The pane binding
    # order therefore expands in canonical inventory order per signal.
    @test [(trace["signal"], trace["component"]) for trace in output["output"]["data"]] == [
        (names[1], ""),
        (names[2], "real"), (names[2], "imaginary"),
    ]
    @test display["visible_signals"] == names == snapshot["visible_signals"]
    @test display["analysis_signal"] === nothing
    @test display["selected_signal"] === nothing
    @test snapshot["row_selected_signal"] in names
    @test all(
        signal["visible"] == (signal["name"] in display["visible_signals"])
        for signal in snapshot["signals"]
    )

    service = ML_INTEGRATION.SignalAnalyserSessionService()
    document = ML_INTEGRATION.export_signal_analyser_session(service, state)["document"]
    restored_state = ML_INTEGRATION.default_signal_analyser_state()
    ML_INTEGRATION.import_signal_analyser_session!(service, restored_state, Dict(
        "state_revision" => 0,
        "document" => document,
    ))
    restored = ML_INTEGRATION.signal_analyser_layouts_snapshot(restored_state)
    @test only(task0031_layout_entry(restored)["layout"]["panes"])["signal_bindings"] == names
    @test only(restored["state"]["displays"])["visible_signals"] == names
    @test ML_INTEGRATION.export_signal_analyser_session(service, restored_state)["document"]["state"] ==
        document["state"]
end

@testset "HND-0280 corrupt old projection is rejected and explicitly recoverable" begin
    state = ML_INTEGRATION.test_state_with_complex_signal()
    names = [signal.name for signal in state.signals]
    # Start from a valid explicit binding. Fresh Displays are empty, so this
    # setup supplies the time limits and bindings needed by the historical
    # ordering-corruption regression below; update_pane must not promote main.
    ML_INTEGRATION.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => 0,
        "operation" => "update_pane",
        "display_id" => "display-1",
        "version" => 1,
        "pane_id" => "pane-1",
        "plot_type" => "time",
        "signal_bindings" => names,
    ))
    display = only(state.displays)
    display.membership = ML_INTEGRATION.SignalDisplayMembership(reverse(names))

    before_revision = state.view.state_revision
    error = try
        ML_INTEGRATION.signal_analyser_layouts_snapshot(state)
        nothing
    catch caught
        caught
    end
    @test error isa ArgumentError
    @test occursin("authoritative inventory order", sprint(showerror, error))
    @test state.view.state_revision == before_revision

    recovered = ML_INTEGRATION.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => before_revision,
        "operation" => "update_pane",
        "display_id" => "display-1",
        "version" => 1,
        "pane_id" => "pane-1",
        "plot_type" => "time",
        "signal_bindings" => names,
    ))
    @test recovered["ok"] === true && recovered["state_revision"] == before_revision + 1
    @test only(recovered["state"]["displays"])["visible_signals"] == names
    @test recovered["state"]["analysis_signal"] === nothing
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
    @test length(entry["outputs"]) == 1
    @test only(entry["outputs"])["pane_id"] == entry["layout"]["active_pane_id"]
    snapshot
end

@testset "TASK-0068 all one hundred authoritative layout variants expose active output only" begin
    for rows in 1:10, columns in 1:10
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
        @test length(layout["panes"]) == pane_count
        @test length(entry["outputs"]) == 1
        @test [pane["id"] for pane in layout["panes"]] ==
            ["pane-$index" for index in 1:pane_count]
        @test layout["active_pane_id"] == "pane-1"
        @test layout["next_pane_number"] == pane_count + 1
        @test Set(keys(only(entry["outputs"]))) == Set([
            "pane_id", "plot_type", "signal_bindings", "analysis_signal", "output",
        ])
        @test Set(keys(only(entry["outputs"])["output"])) == Set([
            "isready", "success", "error", "data",
        ])
        @test state.view.state_revision == (rows == 2 && columns == 2 ? 0 : 1)
    end
end

@testset "TASK-0031 API GET POST 409 output shape parity" begin
    routes = ML_INTEGRATION.source("app", "routes.jl")
    @test length(collect(eachmatch(r"route\(\"/api/layouts\", method = GET\)", routes))) == 1
    @test length(collect(eachmatch(r"route\(\"/api/layouts\", method = POST\)", routes))) == 1
    @test occursin("signal_analyser_layouts_lite_snapshot(SIGNAL_ANALYSER_STATE)", routes)
    @test occursin("lightweight = true", routes)
    @test occursin("signal_analyser_layout_stale_response(SIGNAL_ANALYSER_STATE, err)", routes)

    state = ML_INTEGRATION.default_signal_analyser_state()
    get_snapshot = task0031_assert_envelope(
        ML_INTEGRATION.signal_analyser_layouts_snapshot(state),
    )
    post_snapshot = task0031_assert_envelope(
        ML_INTEGRATION.apply_signal_analyser_layout!(
            state,
            task0031_resize_payload(0, 1, 2),
        ),
    )
    revision = post_snapshot["state_revision"]
    before_stale = ML_INTEGRATION.signal_analyser_layouts_lite_snapshot(state)
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
    @test Set(keys(stale.body["current"])) == Set(keys(before_stale))
    stale_entry = task0031_layout_entry(stale.body["current"])
    @test [output["pane_id"] for output in stale_entry["outputs"]] ==
        [pane["id"] for pane in stale_entry["layout"]["panes"]]
    @test state.view.state_revision == revision
end

@testset "TASK-0031 invalid dimensions are atomic" begin
    invalid_dimensions = (
        (0, 1, "0x1"),
        (11, 1, "11x1"),
        (1, 0, "1x0"),
        (1, 11, "1x11"),
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

@testset "TASK-0031 canonical binding preservation active fallback and session round trip" begin
    state = ML_INTEGRATION.test_state_with_complex_signal()
    names = [signal.name for signal in state.signals]
    grown = ML_INTEGRATION.apply_signal_analyser_layout!(
        state,
        task0031_resize_payload(0, 10, 10),
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
        "pane_id" => "pane-100",
    ))
    shrunk = ML_INTEGRATION.apply_signal_analyser_layout!(
        state,
        task0031_resize_payload(selected["state_revision"], 2, 2),
    )
    shrunk_layout = task0031_layout_entry(shrunk)["layout"]

    @test [pane["id"] for pane in shrunk_layout["panes"]] ==
        ["pane-1", "pane-2", "pane-3", "pane-4"]
    @test shrunk_layout["active_pane_id"] == "pane-1"
    @test shrunk_layout["next_pane_number"] == 5
    @test shrunk_layout["panes"][4]["plot_type"] == "spectrum"
    @test shrunk_layout["panes"][4]["signal_bindings"] == names

    regrown = ML_INTEGRATION.apply_signal_analyser_layout!(
        state,
        task0031_resize_payload(shrunk["state_revision"], 10, 10),
    )
    regrown_entry = task0031_layout_entry(regrown)
    @test length(regrown_entry["layout"]["panes"]) == 100
    @test [pane["id"] for pane in regrown_entry["layout"]["panes"]][1:4] ==
        ["pane-1", "pane-2", "pane-3", "pane-4"]
    @test [pane["id"] for pane in regrown_entry["layout"]["panes"]][5:end] ==
        ["pane-$index" for index in 5:100]
    @test only(regrown_entry["outputs"])["pane_id"] == "pane-1"

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
    @test only(task0031_layout_entry(restored)["outputs"])["pane_id"] == "pane-1"
    @test ML_INTEGRATION.export_signal_analyser_session(service, imported)["document"]["state"] ==
        document["state"]
end

@testset "TASK-0140 pane identity and canonical allocation survive resize" begin
    task0140_pane_identity_and_canonical_allocation!()
end

@testset "TASK-0140 legacy high-water and non-contiguous pane ids never collide" begin
    task0140_legacy_high_water_and_sparse_ids!()
end
