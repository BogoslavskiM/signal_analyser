const EXAMPLE_PROJECT_NAME = "example_project"

const SIGNAL_ANALYSER_RUNTIME_REVISION_PATTERN = r"\A[0-9a-f]{40}\z"

struct RuntimeRevision
    sha::String

    function RuntimeRevision(sha::String)
        occursin(SIGNAL_ANALYSER_RUNTIME_REVISION_PATTERN, sha) || throw(ArgumentError(
            "Runtime revision must be an exact lowercase 40-hex Git SHA",
        ))
        new(sha)
    end
end

function runtime_revision_from_git_checkout(application_root::String)::RuntimeRevision
    root = normpath(abspath(application_root))
    raw_revision::String = readchomp(`git -C $root rev-parse --verify "HEAD^{commit}"`)
    runtime_changes::Vector{UInt8} = read(
        `git -C $root status --porcelain=v1 -z --untracked-files=all --ignore-submodules=none -- app lib public run.jl`,
    )
    isempty(runtime_changes) || throw(ArgumentError(
        "Git runtime surface must be clean: app, lib, public, run.jl",
    ))
    RuntimeRevision(raw_revision)
end
