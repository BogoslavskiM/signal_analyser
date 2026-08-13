const SIGNAL_ANALYSER_STARTUP_WARMUP_TIMEOUT_SECONDS::Float64 = 10.0
const SIGNAL_ANALYSER_STARTUP_WARMUP_POLL_INTERVAL_SECONDS::Float64 = 0.001

function signal_analyser_cancel_private_warmup!(
    state::SignalAnalyserState,
    worker::Union{Nothing,Task},
)::Nothing
    lock(state.lock) do
        token = state.output_manager.cancellation_token
        token === nothing || (token.cancelled[] = true)
    end
    # A timeout abandons the synchronous wait, so keep observing the private
    # task even when it races to completion immediately after cancellation.
    worker === nothing || errormonitor(worker)
    nothing
end

function signal_analyser_wait_private_warmup_worker!(
    state::SignalAnalyserState,
    deadline_seconds::Float64,
)::Nothing
    worker = lock(state.lock) do
        state.output_manager.active_task
    end
    worker === nothing && return nothing

    remaining_seconds = deadline_seconds - time()
    if remaining_seconds <= 0.0
        signal_analyser_cancel_private_warmup!(state, worker)
        throw(ErrorException("Истекло время ожидания startup-прогрева активного графика"))
    end

    wait_status = timedwait(
        () -> istaskdone(worker),
        remaining_seconds;
        pollint = min(
            SIGNAL_ANALYSER_STARTUP_WARMUP_POLL_INTERVAL_SECONDS,
            remaining_seconds,
        ),
    )
    if wait_status == :timed_out
        signal_analyser_cancel_private_warmup!(state, worker)
        throw(ErrorException("Истекло время ожидания startup-прогрева активного графика"))
    end

    # `fetch` observes a failed worker instead of leaving a failed Task silent.
    fetch(worker)
    nothing
end

"""Compile the real TIME-pane binding/output path against disposable private state."""
function signal_analyser_warmup_active_output!(;
    timeout_seconds::Real = SIGNAL_ANALYSER_STARTUP_WARMUP_TIMEOUT_SECONDS,
)::Bool
    timeout_seconds isa Bool && throw(ArgumentError(
        "Timeout startup-прогрева должен быть числом, но не Bool",
    ))
    timeout = Float64(timeout_seconds)
    isfinite(timeout) && timeout > 0.0 || throw(ArgumentError(
        "Timeout startup-прогрева должен быть положительным конечным числом",
    ))

    # This aggregate is intentionally unreachable from SIGNAL_ANALYSER_STATE,
    # sessions and public caches.  Its worker owns no production state.
    state = default_signal_analyser_state()
    display_id = state.active_display_id
    layout = signal_analyser_layout_by_display_id(state, display_id)
    pane = signal_display_active_pane(layout)
    signal_name = first(state.signals).name
    signal_name == "Гармонический сигнал" || throw(ErrorException(
        "Startup-прогрев не нашёл встроенный Гармонический сигнал",
    ))

    apply_signal_analyser_layout!(state, Dict{String,Any}(
        "state_revision" => state.view.state_revision,
        "operation" => "update_pane",
        "display_id" => display_id,
        "version" => layout.version,
        "pane_id" => pane.id,
        "plot_type" => "time",
        "signal_bindings" => String[signal_name],
    ); lightweight = true)

    deadline_seconds = time() + timeout
    output = signal_analyser_active_output(state, display_id, pane.id)
    while !(output["isready"]::Bool)
        signal_analyser_wait_private_warmup_worker!(state, deadline_seconds)
        time() <= deadline_seconds || begin
            signal_analyser_cancel_private_warmup!(state, nothing)
            throw(ErrorException("Истекло время ожидания startup-прогрева активного графика"))
        end
        output = signal_analyser_active_output(state, display_id, pane.id)
    end

    output["success"]::Bool || throw(ErrorException(
        "Startup-прогрев активного графика завершился с ошибкой: $(output["error"])",
    ))
    isempty(output["data"]::Vector{Dict{String,Any}}) && throw(ErrorException(
        "Startup-прогрев активного графика не сформировал Plotly payload",
    ))
    true
end

"""Run startup warmup without turning an optimization failure into an app outage."""
function signal_analyser_startup_warmup()::Bool
    try
        signal_analyser_warmup_active_output!()
    catch err
        @warn "Startup-прогрев Signal Analyser не выполнен; приложение продолжает запуск" exception = (
            err,
            catch_backtrace(),
        )
        false
    end
end
