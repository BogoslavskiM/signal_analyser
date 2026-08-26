using Test

const STARTUP_WARMUP = Main.AppTestContext

if !isdefined(STARTUP_WARMUP, :signal_analyser_warmup_active_output!)
    Base.include(STARTUP_WARMUP, joinpath(
        STARTUP_WARMUP.PROJECT_ROOT,
        "lib", "services", "signal_analyser_startup_warmup.jl",
    ))
end

function startup_warmup_sentinel_fingerprint(state)
    layout = STARTUP_WARMUP.signal_analyser_layout_by_display_id(
        state, state.active_display_id,
    )
    manager = state.output_manager
    (
        revision = state.view.state_revision,
        active_display_id = state.active_display_id,
        active_pane_id = layout.active_pane_id,
        pane_bindings = [STARTUP_WARMUP.signal_display_pane_members(pane) for pane in layout.panes],
        visibility = [signal.visible for signal in state.signals],
        plot_cache = copy(state.plot_cache),
        spectrum_cache = copy(state.spectrum_cache),
        spectrogram_cache = copy(state.spectrogram_cache),
        persistence_cache = copy(state.persistence_cache),
        output_plot_cache = copy(manager.plot_cache),
        output_statuses = copy(manager.output_statuses),
        queued_contexts = copy(manager.queued_contexts),
        active_task = manager.active_task,
        cancellation_token = manager.cancellation_token,
    )
end

function startup_warmup_real_time_output(timeout_seconds::Float64 = 10.0)
    state = STARTUP_WARMUP.default_signal_analyser_state()
    display_id = state.active_display_id
    layout = STARTUP_WARMUP.signal_analyser_layout_by_display_id(state, display_id)
    pane = STARTUP_WARMUP.signal_display_active_pane(layout)
    signal_name = first(state.signals).name
    STARTUP_WARMUP.apply_signal_analyser_layout!(state, Dict{String,Any}(
        "state_revision" => state.view.state_revision,
        "operation" => "update_pane",
        "display_id" => display_id,
        "version" => layout.version,
        "pane_id" => pane.id,
        "plot_type" => "time",
        "signal_bindings" => String[signal_name],
    ); lightweight = true)
    pane = STARTUP_WARMUP.signal_display_active_pane(
        STARTUP_WARMUP.signal_analyser_layout_by_display_id(state, display_id),
    )
    deadline = time() + timeout_seconds
    output = STARTUP_WARMUP.signal_analyser_active_output(state, display_id, pane.id)
    while !output["isready"]
        STARTUP_WARMUP.signal_analyser_wait_private_warmup_worker!(state, deadline)
        output = STARTUP_WARMUP.signal_analyser_active_output(state, display_id, pane.id)
    end
    state, pane, signal_name, output
end

@testset "HND-0608 startup warmup compiles the real private TIME output path" begin
    sentinel = STARTUP_WARMUP.default_signal_analyser_state()
    sentinel_before = startup_warmup_sentinel_fingerprint(sentinel)
    provider_counts_before = (
        length(STARTUP_WARMUP.PSPECTRUM_CALLS),
        length(STARTUP_WARMUP.SPECTRUM_CALLS),
        length(STARTUP_WARMUP.SPECTROGRAM_CALLS),
        length(STARTUP_WARMUP.PERSISTENCE_CALLS),
    )

    @test STARTUP_WARMUP.signal_analyser_warmup_active_output!(
        timeout_seconds = 10.0,
    ) === true
    @test startup_warmup_sentinel_fingerprint(sentinel) == sentinel_before
    @test (
        length(STARTUP_WARMUP.PSPECTRUM_CALLS),
        length(STARTUP_WARMUP.SPECTRUM_CALLS),
        length(STARTUP_WARMUP.SPECTROGRAM_CALLS),
        length(STARTUP_WARMUP.PERSISTENCE_CALLS),
    ) == provider_counts_before

    private_state, pane, signal_name, output = startup_warmup_real_time_output()
    @test STARTUP_WARMUP.signal_display_pane_members(pane) == [signal_name]
    @test output["plot_type"] == "time"
    @test output["isready"] === true
    @test output["success"] === true
    @test output["error"] == ""
    @test !isempty(output["data"])
    @test all(plot -> plot isa Dict{String,Any} && haskey(plot, "data"), output["data"])
    @test private_state !== sentinel
    @test startup_warmup_sentinel_fingerprint(sentinel) == sentinel_before
end

@testset "HND-0608 startup warmup timeout validation is strict and side-effect free" begin
    sentinel = STARTUP_WARMUP.default_signal_analyser_state()
    before = startup_warmup_sentinel_fingerprint(sentinel)
    for invalid_timeout in (true, false, 0, 0.0, -1, -0.5, Inf, -Inf, NaN)
        @test_throws ArgumentError STARTUP_WARMUP.signal_analyser_warmup_active_output!(
            timeout_seconds = invalid_timeout,
        )
        @test startup_warmup_sentinel_fingerprint(sentinel) == before
    end
end

@testset "HND-0608 private worker failure and timeout are observed and isolated" begin
    failed_state = STARTUP_WARMUP.default_signal_analyser_state()
    failed_worker = Threads.@spawn error("deterministic warmup worker failure")
    lock(failed_state.lock) do
        failed_state.output_manager.active_task = failed_worker
        failed_state.output_manager.active_task_is_worker = true
    end
    @test_throws TaskFailedException STARTUP_WARMUP.signal_analyser_wait_private_warmup_worker!(
        failed_state, time() + 2.0,
    )
    @test istaskdone(failed_worker)
    @test istaskfailed(failed_worker)

    timed_state = STARTUP_WARMUP.default_signal_analyser_state()
    timed_token = STARTUP_WARMUP.SignalAnalyserCancellationToken()
    started = Channel{Nothing}(1)
    timed_worker = Threads.@spawn begin
        put!(started, nothing)
        while !timed_token.cancelled[]
            yield()
        end
        :cancelled
    end
    take!(started)
    lock(timed_state.lock) do
        timed_state.output_manager.active_task = timed_worker
        timed_state.output_manager.active_task_is_worker = true
        timed_state.output_manager.cancellation_token = timed_token
    end

    unrelated_state = STARTUP_WARMUP.default_signal_analyser_state()
    unrelated_token = STARTUP_WARMUP.SignalAnalyserCancellationToken()
    unrelated_started = Channel{Nothing}(1)
    unrelated_release = Channel{Nothing}(1)
    unrelated_worker = Threads.@spawn begin
        put!(unrelated_started, nothing)
        take!(unrelated_release)
        :released
    end
    take!(unrelated_started)
    lock(unrelated_state.lock) do
        unrelated_state.output_manager.active_task = unrelated_worker
        unrelated_state.output_manager.active_task_is_worker = true
        unrelated_state.output_manager.cancellation_token = unrelated_token
    end

    timeout_error = try
        STARTUP_WARMUP.signal_analyser_wait_private_warmup_worker!(
            timed_state, time() - 1.0,
        )
        nothing
    catch err
        err
    end
    @test timeout_error isa ErrorException
    @test occursin("Истекло время ожидания", sprint(showerror, timeout_error))
    @test timed_token.cancelled[]
    @test fetch(timed_worker) === :cancelled
    @test !unrelated_token.cancelled[]
    @test !istaskdone(unrelated_worker)
    put!(unrelated_release, nothing)
    @test fetch(unrelated_worker) === :released
end

@testset "HND-0608 bootstrap invokes safe warmup before readiness and global state" begin
    warmup_source = STARTUP_WARMUP.source(
        "lib", "services", "signal_analyser_startup_warmup.jl",
    )
    warmup_code_without_comments = join(filter(
        line -> !startswith(strip(line), "#"),
        split(warmup_source, '\n'),
    ), "\n")
    bootstrap = STARTUP_WARMUP.source("app", "bootstrap.jl")
    routes = STARTUP_WARMUP.source("app", "routes.jl")

    @test occursin("state = default_signal_analyser_state()", warmup_source)
    @test !occursin("SIGNAL_ANALYSER_STATE", warmup_code_without_comments)
    @test !occursin("SIGNAL_SESSION_SERVICE", warmup_code_without_comments)
    @test !occursin("WORKSPACE_VARIABLE_PROVIDER", warmup_code_without_comments)
    @test occursin(
        r"function signal_analyser_startup_warmup\(\)::Bool[\s\S]*?try[\s\S]*?signal_analyser_warmup_active_output!\(\)[\s\S]*?catch err[\s\S]*?@warn[\s\S]*?false[\s\S]*?end",
        warmup_source,
    )

    include_position = findfirst("signal_analyser_startup_warmup.jl", bootstrap)
    warmup_position = findfirst(
        "const SIGNAL_ANALYSER_STARTUP_WARMUP_SUCCEEDED = signal_analyser_startup_warmup()",
        bootstrap,
    )
    ready_position = findfirst("const EXAMPLE_APP_STATE", bootstrap)
    state_position = findfirst("const SIGNAL_ANALYSER_STATE", bootstrap)
    @test include_position !== nothing
    @test warmup_position !== nothing
    @test ready_position !== nothing
    @test state_position !== nothing
    @test first(include_position) < first(warmup_position) < first(ready_position) < first(state_position)
    @test occursin(r"const EXAMPLE_APP_STATE = Dict\{String,Any\}\([\s\S]*?\"ready\" => true", bootstrap)

    @test !occursin("startup_warmup", routes)
    @test !occursin("warmup", STARTUP_WARMUP.source("app", "api.jl"))
end
