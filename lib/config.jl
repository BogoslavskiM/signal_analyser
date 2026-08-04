const EXAMPLE_PROJECT_NAME = "example_project"

const SIGNAL_ANALYSER_RUNTIME_REVISION_ENV = "SIGNAL_ANALYSER_RUNTIME_REVISION"
const SIGNAL_ANALYSER_RUNTIME_REVISION_PATTERN = r"\A[0-9a-f]{40}\z"

struct RuntimeRevision
    sha::String

    function RuntimeRevision(sha::String)
        occursin(SIGNAL_ANALYSER_RUNTIME_REVISION_PATTERN, sha) || throw(ArgumentError(
            "$SIGNAL_ANALYSER_RUNTIME_REVISION_ENV must be an exact lowercase 40-hex Git SHA",
        ))
        new(sha)
    end
end

function runtime_revision_from_environment()::RuntimeRevision
    raw_revision::Union{Nothing,String} = get(
        ENV,
        SIGNAL_ANALYSER_RUNTIME_REVISION_ENV,
        nothing,
    )
    raw_revision === nothing && throw(ArgumentError(
        "$SIGNAL_ANALYSER_RUNTIME_REVISION_ENV is required",
    ))
    RuntimeRevision(raw_revision)
end
