module Genie
module Renderer
module Json
json(payload; status::Int = 200) = (status = status, body = payload)
end
end
end

module AppTestContext

using Test

const PROJECT_ROOT = normpath(joinpath(@__DIR__, "..", "..", ".."))

"""A deterministic double for EngeeDSP.Functions.pspectrum used only by unit/API tests."""
const PSPECTRUM_CALLS = Any[]
const PSPECTRUM_FAILURE = Ref(false)

function reset_pspectrum_double!()
    empty!(PSPECTRUM_CALLS)
    PSPECTRUM_FAILURE[] = false
    nothing
end

function signal_analyser_pspectrum(
    values::Vector{ComplexF64},
    times::Vector{Float64},
    representation::AbstractString,
    options...,
)
    push!(PSPECTRUM_CALLS, (values = copy(values), times = copy(times), representation = String(representation), options = options))
    PSPECTRUM_FAILURE[] && throw(ArgumentError("deterministic EngeeDSP failure"))

    if representation == "power"
        return ([1.0, 4.0, 9.0], [-128.0, 0.0, 128.0], nothing)
    elseif representation == "spectrogram"
        # Deliberately time-by-frequency: production must orient it as frequency-by-time.
        return ([1.0 4.0 9.0; 16.0 25.0 36.0], [-128.0, 0.0, 128.0], [0.0, 0.125])
    elseif representation == "persistence"
        return ([0.0 50.0 100.0; 25.0 75.0 90.0], [-128.0, 0.0, 128.0], [0.01, 0.1])
    end
    throw(ArgumentError("unsupported deterministic pspectrum representation: $representation"))
end

include(joinpath(PROJECT_ROOT, "lib", "domain", "signal_analyser_state.jl"))
include(joinpath(PROJECT_ROOT, "lib", "services", "signal_analyser_math.jl"))
include(joinpath(PROJECT_ROOT, "lib", "services", "signal_analyser_service.jl"))

"""Deterministic Spectrum provider used by unit/API tests; real EngeeDSP stays in test/engee."""
const SPECTRUM_CALLS = Any[]
const SPECTRUM_FAILURE = Ref(false)
function signal_spectrum_calculate(::EngeeDSPSpectrumProvider, query::SignalSpectrumQuery)::SignalSpectrumData
    push!(SPECTRUM_CALLS, query)
    SPECTRUM_FAILURE[] && throw(ArgumentError("deterministic Spectrum provider failure"))
    frequencies = if query.frequency_limits isa ExplicitSignalSpectrumFrequencyLimits
        limits = query.frequency_limits::ExplicitSignalSpectrumFrequencyLimits
        [limits.min_hz, limits.max_hz]
    elseif query.topology == ONE_SIDED_SPECTRUM
        [0.0, query.sample_rate_hz / 2]
    else
        [-query.sample_rate_hz / 2, query.sample_rate_hz / 2]
    end
    SignalSpectrumData(frequencies, [1.0, 4.0], query.topology)
end

"""Deterministic typed Spectrogram provider double; EngeeDSP remains test/engee only."""
const SPECTROGRAM_CALLS = Any[]
const SPECTROGRAM_FAILURE = Ref(false)
function signal_spectrogram_calculate(::EngeeDSPSpectrogramProvider, query::SignalSpectrogramQuery)::SignalSpectrogramData
    push!(SPECTROGRAM_CALLS, query)
    SPECTROGRAM_FAILURE[] && throw(ArgumentError("deterministic Spectrogram provider failure"))
    frequencies = if query.frequency_limits isa ExplicitSignalSpectrumFrequencyLimits
        limits = query.frequency_limits::ExplicitSignalSpectrumFrequencyLimits
        [limits.min_hz, limits.max_hz]
    elseif query.topology == ONE_SIDED_SPECTRUM
        [0.0, query.sample_rate_hz / 2]
    else
        [-query.sample_rate_hz / 2, query.sample_rate_hz / 2]
    end
    SignalSpectrogramData(frequencies, [0.0, (length(query.values) - 1) / query.sample_rate_hz], [1.0 4.0; 9.0 16.0], query.topology)
end

"""Deterministic typed Persistence provider double; real EngeeDSP remains test/engee only."""
const PERSISTENCE_CALLS = Any[]
const PERSISTENCE_FAILURE = Ref(false)
function reset_persistence_double!()
    empty!(PERSISTENCE_CALLS)
    PERSISTENCE_FAILURE[] = false
    nothing
end
function signal_persistence_calculate(::EngeeDSPPersistenceProvider, query::SignalPersistenceQuery)::SignalPersistenceData
    push!(PERSISTENCE_CALLS, query)
    PERSISTENCE_FAILURE[] && throw(ArgumentError("deterministic Persistence provider failure"))
    frequencies = query.topology == ONE_SIDED_SPECTRUM ?
        [0.0, query.sample_rate_hz / 4, query.sample_rate_hz / 2] :
        [-query.sample_rate_hz / 2, 0.0, query.sample_rate_hz / 2]
    # Deliberately asymmetric power-by-frequency matrix: a renderer/service
    # transpose would be detected structurally and numerically.
    powers = collect(range(0.01, 1.0, length = query.num_power_bins))
    occurrence = [Float64(mod((row - 1) * 17 + (column - 1) * 29, 101))
                  for row in eachindex(powers), column in eachindex(frequencies)]
    SignalPersistenceData(frequencies, powers, occurrence, query.topology)
end

# The API helpers use the tiny Main.Genie renderer double above. This keeps
# route/API tests in-process and deliberately avoids starting a Genie server.
include(joinpath(PROJECT_ROOT, "app", "api.jl"))

# Keep response-envelope assertions structural and deterministic even when a
# local Genie installation is present: the helpers under test still build the
# real payload, while this more-specific serializer exposes it in-process.
function api_json(payload::Dict{String,Any}; status::Int = 200, headers = nothing)
    (status = status, body = json_safe(payload), headers = headers)
end

source(parts::AbstractString...) = read(joinpath(PROJECT_ROOT, parts...), String)
snapshot_keyset(snapshot) = Set(keys(snapshot))
all_finite(values) = all(isfinite, values)
all_finite_matrix(rows) = all(row -> all(isfinite, row), rows)

"""Build the explicit real-plus-complex fixture required by tests of complex behavior.

Production bootstrap deliberately contains one real sine only.  Tests which
exercise ordering, complex rendering, or complex-only validation must opt in
to this inventory instead of restoring a second default signal.
"""
function test_state_with_complex_signal(;
    peaks_provider::AbstractPeaksProvider = EngeeDSPPeaksProvider(),
    spectrum_provider::AbstractSignalSpectrumProvider = EngeeDSPSpectrumProvider(),
    spectrogram_provider::AbstractSignalSpectrogramProvider = EngeeDSPSpectrogramProvider(),
    persistence_provider::AbstractSignalPersistenceProvider = EngeeDSPPersistenceProvider(),
)
    signals = default_signal_catalog()
    real_signal = only(signals)
    sample_count = length(real_signal.values)
    time = collect(0:(sample_count - 1)) ./ real_signal.sample_rate_hz
    chirp_phase = @. 2pi * (90.0 * time + 0.5 * 1100.0 * time^2)
    complex_chirp = @. cis(chirp_phase) + 0.22 * cis(2pi * 510.0 * time)
    push!(signals, AnalysedSignal(
        "Комплексный ЛЧМ-сигнал",
        "#dc2626",
        real_signal.sample_rate_hz,
        ComplexF64.(complex_chirp),
        true,
        true,
    ))
    SignalAnalyserState(
        signals,
        SignalAnalyserViewState(0, TIME_PLOT, real_signal.name),
        Dict{String,Dict{String,Any}}(),
        ReentrantLock();
        peaks_provider = peaks_provider,
        spectrum_provider = spectrum_provider,
        spectrogram_provider = spectrogram_provider,
        persistence_provider = persistence_provider,
    )
end

end
