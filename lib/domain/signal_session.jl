const SIGNAL_ANALYSER_SESSION_SCHEMA = "signal-analyser-session"
const SIGNAL_ANALYSER_SESSION_FORMAT = "engee-application-session"
const SIGNAL_ANALYSER_APPLICATION_ID = "engee.signal-analyser"
const SIGNAL_ANALYSER_SESSION_VERSION = 5
const SIGNAL_ANALYSER_PREVIOUS_SESSION_VERSION = 3
const SIGNAL_ANALYSER_LEGACY_SESSION_VERSION = 1
const SIGNAL_ANALYSER_EXTREMA_SESSION_VERSION = 2
const SIGNAL_ANALYSER_CUTOFF_SESSION_VERSION = 3
const SIGNAL_ANALYSER_IDENTITY_SESSION_VERSION = 4
const SIGNAL_ANALYSER_OPERATION_HISTORY_SESSION_VERSION = 5

"""Validated, versioned snapshot of the server-owned session aggregate."""
struct SignalAnalyserSessionDocument
    format::String
    application_id::String
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
