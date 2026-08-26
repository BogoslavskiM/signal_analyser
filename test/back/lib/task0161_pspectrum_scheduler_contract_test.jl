using Test

const TASK0161_OUTPUT = Main.AppTestContext

function task0161_function_block(source::String, marker::String)
    start = findfirst(marker, source)
    start === nothing && return ""
    tail = source[first(start):end]
    next_function = findnext("\nfunction ", tail, length(marker) + 1)
    next_function === nothing ? tail : tail[1:first(next_function)]
end

@testset "TASK-0161 pspectrum providers use scalar sample rate without a time vector" begin
    source = TASK0161_OUTPUT.source("lib", "services", "signal_analyser_service.jl")
    for marker in (
        "function signal_spectrum_calculate(\n    ::EngeeDSPSpectrumProvider",
        "function signal_spectrogram_calculate(\n    ::EngeeDSPSpectrogramProvider",
        "function signal_persistence_calculate(\n    ::EngeeDSPPersistenceProvider",
    )
        provider = task0161_function_block(source, marker)
        @test !isempty(provider)
        @test occursin("query.sample_rate_hz", provider)
        @test occursin("signal_analyser_pspectrum(", provider)
        @test !occursin("times = collect(0:(length(query.values) - 1))", provider)
        @test !occursin("collect(0:(length(query.values) - 1)) ./", provider)
    end
    spectrum = task0161_function_block(source, "function signal_spectrum_calculate(\n    ::EngeeDSPSpectrumProvider")
    spectrogram = task0161_function_block(source, "function signal_spectrogram_calculate(\n    ::EngeeDSPSpectrogramProvider")
    persistence = task0161_function_block(source, "function signal_persistence_calculate(\n    ::EngeeDSPPersistenceProvider")
    @test occursin("\"Leakage\",\n        query.leakage", spectrum)
    @test occursin("\"OverlapPercent\",\n        query.overlap_percent", spectrogram)
    @test occursin("\"NumPowerBins\",\n        query.num_power_bins", persistence)
end

@testset "TASK-0161 one-lane scheduler gives explicit valid peaks priority over output B" begin
    source = TASK0161_OUTPUT.source("lib", "services", "signal_output_service.jl")
    output_worker = task0161_function_block(source, "function signal_analyser_run_output_worker!")
    peaks_worker = task0161_function_block(source, "function signal_analyser_run_peaks_worker!")
    start_peaks = task0161_function_block(source, "function signal_analyser_start_peaks_worker_unlocked!")
    publish_output = task0161_function_block(source, "function signal_analyser_publish_output_task!")

    @test occursin("isempty(manager.queued_peaks_contexts) || return nothing", output_worker)
    @test occursin("signal_analyser_start_peaks_worker_unlocked!(state, manager)", output_worker)
    @test occursin("signal_analyser_start_peaks_worker_unlocked!(state, manager)", peaks_worker)
    @test occursin("signal_analyser_peaks_context_is_current_unlocked(state, context) || continue", start_peaks)
    @test occursin("get(manager.peaks_need_update_pages, page_id, true) || continue", start_peaks)
    @test occursin("isempty(manager.queued_contexts) || return signal_analyser_start_output_worker_unlocked!", start_peaks)
    @test occursin("manager.active_task === nothing || return false", start_peaks)

    @test occursin("token.cancelled[] && return nothing", publish_output)
    @test occursin("manager.active_context == context || return nothing", publish_output)
    @test occursin("current_context == context || return nothing", publish_output)
    @test occursin("get(manager.need_update_pages, page_id, true) || return nothing", publish_output)
end
