using Test

const ACTIVE_OUTPUT = Main.AppTestContext

if !isdefined(ACTIVE_OUTPUT, :SignalAnalyserSessionService)
    Base.include(ACTIVE_OUTPUT, joinpath(ACTIVE_OUTPUT.PROJECT_ROOT, "lib", "domain", "signal_session.jl"))
    Base.include(ACTIVE_OUTPUT, joinpath(ACTIVE_OUTPUT.PROJECT_ROOT, "lib", "services", "signal_session_service.jl"))
end

function active_output_graph_axes(payload)
    axes = String[]
    function visit(value)
        if value isa AbstractDict
            for (key, nested) in value
                String(key) in ("x", "y", "z") && push!(axes, String(key))
                visit(nested)
            end
        elseif value isa AbstractVector
            foreach(visit, value)
        end
        nothing
    end
    visit(payload)
    axes
end

function active_output_context(state)
    lock(state.lock) do
        layout = ACTIVE_OUTPUT.signal_analyser_layout_by_display_id(state, state.active_display_id)
        ACTIVE_OUTPUT.signal_analyser_output_context_unlocked(
            state,
            state.active_display_id,
            layout.active_pane_id,
        )
    end
end

function active_output_publish!(
    state,
    context;
    success::Bool = true,
    error::String = "",
    plots = Dict{String,Any}[],
    activate::Bool = true,
)
    if activate
        lock(state.lock) do
            page_id = ACTIVE_OUTPUT.signal_analyser_output_page_id(
                context.display_id,
                context.pane_id,
            )
            state.output_manager.active_context = context
            state.output_manager.active_task = nothing
            state.output_manager.cancellation_token = ACTIVE_OUTPUT.SignalAnalyserCancellationToken()
            state.output_manager.need_update_pages[page_id] = true
        end
    end
    snapshot = ACTIVE_OUTPUT.signal_analyser_clone_state_for_layout(state)
    pane = ACTIVE_OUTPUT.signal_display_active_pane(
        ACTIVE_OUTPUT.signal_analyser_layout_by_display_id(state, context.display_id),
    )
    output = ACTIVE_OUTPUT.SignalAnalyserPaneOutput(
        context.pane_id,
        context.plot_type,
        ACTIVE_OUTPUT.signal_display_pane_members(pane),
        ACTIVE_OUTPUT.signal_display_pane_analysis_name(pane),
        true,
        success,
        error,
        Dict{String,Any}[],
    )
    ACTIVE_OUTPUT.signal_analyser_publish_output_task!(
        state,
        snapshot,
        context,
        ACTIVE_OUTPUT.SignalAnalyserCancellationToken(),
        output,
        plots,
    )
end

"""Install a controlled background task without running a calculation."""
function active_output_install_task!(state, context, task; poll_count::Int = 1)
    lock(state.lock) do
        page_id = ACTIVE_OUTPUT.signal_analyser_output_page_id(
            context.display_id,
            context.pane_id,
        )
        state.output_manager.active_context = context
        state.output_manager.active_task = task
        state.output_manager.active_poll_count = poll_count
        state.output_manager.cancellation_token = ACTIVE_OUTPUT.SignalAnalyserCancellationToken()
        state.output_manager.need_update_pages[page_id] = true
        state.output_manager.output_statuses[page_id] = ACTIVE_OUTPUT.SignalAnalyserOutputStatus(
            context,
            false,
            false,
            "",
        )
    end
    nothing
end

@testset "TASK-0065 lite metadata and legacy state contracts" begin
    state = ACTIVE_OUTPUT.default_signal_analyser_state()
    lite = ACTIVE_OUTPUT.signal_analyser_state_lite(state)
    layouts = ACTIVE_OUTPUT.signal_analyser_layouts_lite_snapshot(state)
    legacy = ACTIVE_OUTPUT.signal_analyser_snapshot(state)

    @test lite["state_revision"] == 0
    @test lite["capabilities"] == Dict(
        "state_lite" => true,
        "active_output" => true,
        "background_calculation" => true,
    )
    @test isempty(active_output_graph_axes(lite))
    @test isempty(active_output_graph_axes(layouts))
    @test only(lite["layouts"])["outputs"] |> only |>(entry -> entry["output"]["data"]) == Dict{String,Any}[]
    @test layouts["state"]["state_revision"] == lite["state_revision"]
    @test layouts["state"]["active_output"]["output"]["data"] == Dict{String,Any}[]
    @test haskey(legacy, "plots") && haskey(legacy, "plot_payload")
    routes = ACTIVE_OUTPUT.source("app", "routes.jl")
    @test length(collect(eachmatch(r"route\(\"/api/state-lite\", method = GET\)", routes))) == 1
    @test occursin("signal_analyser_state_lite_api_payload(SIGNAL_ANALYSER_STATE)", routes)
    @test length(collect(eachmatch(r"route\(\"/api/outputs/active\", method = GET\)", routes))) == 1

    changed = ACTIVE_OUTPUT.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => 0, "operation" => "resize", "display_id" => "display-1",
        "version" => 1, "variant" => "1x2", "rows" => 1, "columns" => 2,
    ); lightweight = true)
    @test changed["state_revision"] == 1
    @test state.output_manager.active_task === nothing
    no_op = ACTIVE_OUTPUT.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => 1, "operation" => "select_pane", "display_id" => "display-1",
        "version" => 1, "pane_id" => "pane-1",
    ); lightweight = true)
    @test no_op["state_revision"] == 1
    @test state.output_manager.active_task === nothing
end

@testset "TASK-0065 active output pending cache and inactive contracts" begin
    ACTIVE_OUTPUT.reset_pspectrum_double!()
    empty!(ACTIVE_OUTPUT.SPECTRUM_CALLS)
    state = ACTIVE_OUTPUT.default_signal_analyser_state()
    active = active_output_context(state)

    miss = ACTIVE_OUTPUT.signal_analyser_active_output(state, active.display_id, active.pane_id)
    @test miss["isready"] === false && miss["success"] === false && isempty(miss["data"])
    task = state.output_manager.active_task
    task === nothing || wait(task)

    # A fresh dirty state isolates duplicate-polling reuse from the completed
    # first-miss task above.
    state = ACTIVE_OUTPUT.default_signal_analyser_state()
    active = active_output_context(state)
    blocker = Channel{Nothing}(1)
    parked = @async take!(blocker)
    lock(state.lock) do
        state.output_manager.active_context = active
        state.output_manager.active_task = parked
        state.output_manager.cancellation_token = ACTIVE_OUTPUT.SignalAnalyserCancellationToken()
    end
    duplicate = ACTIVE_OUTPUT.signal_analyser_active_output(state, active.display_id, active.pane_id)
    @test duplicate["isready"] === false && duplicate["success"] === false
    @test state.output_manager.active_task === parked
    put!(blocker, nothing)
    wait(parked)

    plots = Dict{String,Any}[
        Dict("data" => Dict{String,Any}[Dict("name" => "first")]),
        Dict("data" => Dict{String,Any}[Dict("name" => "second")]),
    ]
    active_output_publish!(state, active; plots = plots)
    hit = ACTIVE_OUTPUT.signal_analyser_active_output(state, active.display_id, active.pane_id)
    @test hit["isready"] === true && hit["success"] === true
    @test [only(record["data"])["name"] for record in hit["data"]] == ["first", "second"]

    inactive_error = try
        ACTIVE_OUTPUT.signal_analyser_active_output(state, "display-1", "inactive-pane")
        nothing
    catch err
        err
    end
    @test inactive_error isa ACTIVE_OUTPUT.SignalAnalyserInactiveOutputError
    inactive = ACTIVE_OUTPUT.signal_analyser_inactive_output_response(state, inactive_error)
    @test inactive.status == 409
    @test inactive.body["code"] == "inactive_output"
    @test isempty(ACTIVE_OUTPUT.SPECTRUM_CALLS) && isempty(ACTIVE_OUTPUT.PSPECTRUM_CALLS)
end

@testset "TASK-0065 stale publication error preservation and session runtime exclusion" begin
    state = ACTIVE_OUTPUT.default_signal_analyser_state()
    old_context = active_output_context(state)
    old_plots = Dict{String,Any}[Dict("data" => Dict{String,Any}[Dict("name" => "last-good")])]
    active_output_publish!(state, old_context; plots = old_plots)
    page_id = ACTIVE_OUTPUT.signal_analyser_output_page_id(old_context.display_id, old_context.pane_id)
    @test state.output_manager.plot_cache[page_id].plots == old_plots

    old_token = ACTIVE_OUTPUT.SignalAnalyserCancellationToken()
    lock(state.lock) do
        state.output_manager.active_context = old_context
        state.output_manager.active_task = Task(() -> nothing)
        state.output_manager.cancellation_token = old_token
        ACTIVE_OUTPUT.signal_analyser_invalidate_active_output_unlocked!(state)
    end
    @test old_token.cancelled[]
    fresh_context = active_output_context(state)
    @test fresh_context.calculation_revision == old_context.calculation_revision + 1
    revision_before_stale_publish = state.view.state_revision
    active_output_publish!(
        state,
        old_context;
        plots = Dict{String,Any}[Dict("data" => Dict{String,Any}[Dict("name" => "stale")])],
        activate = false,
    )
    @test state.view.state_revision == revision_before_stale_publish
    @test state.output_manager.plot_cache[page_id].plots == old_plots

    active_output_publish!(state, fresh_context; success = false, error = "deterministic output failure")
    failure = ACTIVE_OUTPUT.signal_analyser_active_output(state, fresh_context.display_id, fresh_context.pane_id)
    @test failure["isready"] === true && failure["success"] === false
    @test failure["error"] == "deterministic output failure" && isempty(failure["data"])
    @test state.output_manager.plot_cache[page_id].plots == old_plots

    document = ACTIVE_OUTPUT.export_signal_analyser_session(
        ACTIVE_OUTPUT.SignalAnalyserSessionService(), state,
    )["document"]
    serialized = sprint(show, document)
    @test !occursin("output_manager", serialized)
    @test !occursin("calculation_revision", serialized)
    @test !occursin("need_update_pages", serialized)
    @test !occursin("plot_cache", serialized)
end

@testset "TASK-0075 active output terminalizes no-wait polling without restart" begin
    # The public polling path must yield the scheduler itself: no test-side
    # wait(task) is allowed before a ready response can be observed.
    ACTIVE_OUTPUT.reset_pspectrum_double!()
    state = ACTIVE_OUTPUT.default_signal_analyser_state()
    context = active_output_context(state)
    response = ACTIVE_OUTPUT.signal_analyser_active_output(state, context.display_id, context.pane_id)
    @test response["isready"] === false && response["success"] === false && isempty(response["data"])
    for _ in 1:16
        response["isready"] && break
        response = ACTIVE_OUTPUT.signal_analyser_active_output(state, context.display_id, context.pane_id)
    end
    @test response["isready"] === true && response["success"] === true
    @test !isempty(response["data"])

    # A completed task which failed is not another pending poll and cannot
    # silently launch a replacement task.
    failed_state = ACTIVE_OUTPUT.default_signal_analyser_state()
    failed_context = active_output_context(failed_state)
    failed_task = Task(() -> error("deterministic task failure"))
    schedule(failed_task)
    yield()
    @test istaskdone(failed_task) && istaskfailed(failed_task)
    active_output_install_task!(failed_state, failed_context, failed_task)
    failed = ACTIVE_OUTPUT.signal_analyser_active_output(
        failed_state,
        failed_context.display_id,
        failed_context.pane_id,
    )
    @test failed["isready"] === true && failed["success"] === false && isempty(failed["data"])
    @test occursin("завершился с ошибкой", failed["error"])
    @test failed_state.output_manager.active_task === nothing
    failed_again = ACTIVE_OUTPUT.signal_analyser_active_output(
        failed_state,
        failed_context.display_id,
        failed_context.pane_id,
    )
    @test failed_again == failed && failed_state.output_manager.active_task === nothing

    # A normally completed task that did not publish is likewise terminal.
    unpublished_state = ACTIVE_OUTPUT.default_signal_analyser_state()
    unpublished_context = active_output_context(unpublished_state)
    unpublished_task = Task(() -> nothing)
    schedule(unpublished_task)
    yield()
    @test istaskdone(unpublished_task) && !istaskfailed(unpublished_task)
    active_output_install_task!(unpublished_state, unpublished_context, unpublished_task)
    unpublished = ACTIVE_OUTPUT.signal_analyser_active_output(
        unpublished_state,
        unpublished_context.display_id,
        unpublished_context.pane_id,
    )
    @test unpublished["isready"] === true && unpublished["success"] === false && isempty(unpublished["data"])
    @test occursin("без публикации", unpublished["error"])
    @test unpublished_state.output_manager.active_task === nothing

    # The first task counts as poll one. Exactly 63 further pending responses
    # are permitted; the 64th becomes one terminal lightweight error.
    bounded_state = ACTIVE_OUTPUT.default_signal_analyser_state()
    bounded_context = active_output_context(bounded_state)
    blocker = Channel{Nothing}(1)
    stuck_task = @async take!(blocker)
    active_output_install_task!(bounded_state, bounded_context, stuck_task; poll_count = 1)
    for _ in 1:62
        pending = ACTIVE_OUTPUT.signal_analyser_active_output(
            bounded_state,
            bounded_context.display_id,
            bounded_context.pane_id,
        )
        @test pending["isready"] === false && pending["success"] === false && isempty(pending["data"])
    end
    @test bounded_state.output_manager.active_poll_count == 63
    bounded = ACTIVE_OUTPUT.signal_analyser_active_output(
        bounded_state,
        bounded_context.display_id,
        bounded_context.pane_id,
    )
    @test bounded["isready"] === true && bounded["success"] === false && isempty(bounded["data"])
    @test bounded["error"] == ACTIVE_OUTPUT.SIGNAL_ANALYSER_ACTIVE_OUTPUT_POLL_LIMIT_ERROR
    @test bounded_state.output_manager.active_task === nothing
    @test bounded_state.output_manager.cancellation_token === nothing
    @test bounded_state.output_manager.active_poll_count == 0
    bounded_again = ACTIVE_OUTPUT.signal_analyser_active_output(
        bounded_state,
        bounded_context.display_id,
        bounded_context.pane_id,
    )
    @test bounded_again == bounded && bounded_state.output_manager.active_task === nothing
    put!(blocker, nothing)
end
