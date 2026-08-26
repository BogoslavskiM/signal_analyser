using Test

const TASK0156_DISPATCH = Main.AppTestContext

mutable struct Task0156PeaksProvider <: TASK0156_DISPATCH.AbstractPeaksProvider
    started::Channel{Nothing}
    release::Channel{Nothing}
end

function TASK0156_DISPATCH.signal_peaks_detect(
    provider::Task0156PeaksProvider,
    query::TASK0156_DISPATCH.SignalPeaksQuery,
)
    put!(provider.started, nothing)
    take!(provider.release)
    TASK0156_DISPATCH.SignalPeaksProviderResult(
        [1.0], [1], [1.0], [1.0], length(query.values),
    )
end

function task0156_enabled_state()
    provider = Task0156PeaksProvider(Channel{Nothing}(1), Channel{Nothing}(1))
    state = TASK0156_DISPATCH.default_signal_analyser_state(peaks_provider = provider)
    pane = TASK0156_DISPATCH.signal_display_active_pane(
        TASK0156_DISPATCH.signal_analyser_layout_by_display_id(state, state.active_display_id),
    )
    TASK0156_DISPATCH.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => state.view.state_revision,
        "operation" => "update_pane",
        "display_id" => state.active_display_id,
        "version" => 1,
        "pane_id" => pane.id,
        "plot_type" => "time",
        "signal_bindings" => [only(state.signals).name],
    ); lightweight = true)
    TASK0156_DISPATCH.apply_signal_analyser_view!(state, Dict(
        "state_revision" => state.view.state_revision,
        "peaks_enabled" => true,
    ))
    state, provider, pane.id
end

@testset "TASK-0156 queued extrema are dispatched once an output worker relinquishes the shared slot" begin
    state, provider, pane_id = task0156_enabled_state()
    manager = state.output_manager
    context = lock(state.lock) do
        TASK0156_DISPATCH.signal_analyser_peaks_context_unlocked(
            state,
            state.active_display_id,
            pane_id,
            nothing,
        )
    end
    page_id = TASK0156_DISPATCH.signal_analyser_output_page_id(context.display_id, context.pane_id)

    # This is the exact worker-boundary state produced after an output task:
    # output work was active, then releases the only shared worker slot while
    # an explicit extrema request remains queued.
    lock(state.lock) do
        manager.active_context = nothing
        manager.active_task = nothing
        manager.active_task_is_worker = false
        manager.cancellation_token = nothing
        manager.peaks_need_update_pages[page_id] = true
        manager.peaks_poll_counts[page_id] = 1
        push!(manager.queued_peaks_contexts, context)
        manager.peaks_statuses[page_id] = TASK0156_DISPATCH.SignalAnalyserPeaksStatus(
            context, false, false, "",
        )
        @test TASK0156_DISPATCH.signal_analyser_start_peaks_worker_unlocked!(state, manager)
    end
    take!(provider.started)
    worker = manager.active_task
    @test worker isa Task
    put!(provider.release, nothing)
    wait(worker::Task)

    ready = TASK0156_DISPATCH.signal_analyser_active_peaks(state, state.active_display_id, pane_id)
    @test ready["isready"] === true && ready["success"] === true
    @test isempty(manager.queued_peaks_contexts)
    @test manager.active_task === nothing

    source = TASK0156_DISPATCH.source("lib", "services", "signal_output_service.jl")
    output_finally = source[first(findfirst("function signal_analyser_run_output_worker!", source)):first(findfirst("function signal_analyser_start_output_worker_unlocked!", source))]
    peaks_finally = source[first(findfirst("function signal_analyser_run_peaks_worker!", source)):first(findfirst("function signal_analyser_start_peaks_worker_unlocked!", source))]
    @test occursin("signal_analyser_start_peaks_worker_unlocked!(state, manager)", output_finally)
    @test occursin("signal_analyser_start_peaks_worker_unlocked!(state, manager)", peaks_finally)
end
