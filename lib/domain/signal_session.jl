const SIGNAL_ANALYSER_SESSION_SCHEMA = "signal-analyser-session"
const SIGNAL_ANALYSER_SESSION_VERSION = 2
const SIGNAL_ANALYSER_LEGACY_SESSION_VERSION = 1

"""Validated, versioned snapshot of the server-owned session aggregate."""
struct SignalAnalyserSessionDocument
    schema::String
    version::Int
    source_revision::Int
    signals::Vector{AnalysedSignal}
    row_selection::GlobalSignalSelection
    displays::Vector{SignalAnalyserDisplayState}
    display_layouts::Dict{String,SignalDisplayLayoutState}
    active_display_id::String
    next_display_number::Int
end

struct ImportSignalAnalyserSessionCommand
    expected_revision::Int
    document::SignalAnalyserSessionDocument
end

struct SignalAnalyserSessionValidationError <: Exception
    code::String
    message::String
    fields::Dict{String,String}
end

Base.showerror(io::IO, err::SignalAnalyserSessionValidationError) = print(io, err.message)
