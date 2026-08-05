module GenieRuntimeLifecycleContract

using Test
import Dates
import Downloads

const TARGET_APP = "signal_analyser"
const TARGET_LOCATIONS = (
    "/genie_apps/signal_analyser",
    "/user/apps/signal_analyser/app.jl",
)
const TARGET_RUNNING_STATUSES = ("started", "running")
const TARGET_URL = "https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/"
const TARGET_REVISION = "cac83c5f445352a50f04aeeeb269b47007766d79"
const DOCUMENTED_START_KEYWORDS = (:devel, :log_file, :open_url)

function http_snapshot(url::String)
    output = IOBuffer()
    try
        response = Downloads.request(url; method = "GET", output, timeout = 20)
        body = String(take!(output))
        title_match = match(r"<title>(.*?)</title>"is, body)
        return (
            status = response.status,
            title = isnothing(title_match) ? nothing : strip(title_match.captures[1]),
            body_excerpt = first(body, min(length(body), 512)),
            error = nothing,
        )
    catch err
        return (
            status = nothing,
            title = nothing,
            body_excerpt = "",
            error = sprint(showerror, err),
        )
    end
end

function is_maintenance_response(response)
    text = lowercase(string(something(response.title, ""), '\n', response.body_excerpt))
    return occursin("server maintenance", text) || occursin("технические работы", text)
end

function observed_start_surface()
    method = only(methods(Main.engee.genie.start))
    keywords = Tuple(Base.kwarg_decl(method))
    lowered = only(code_lowered(Main.engee.genie.start, Tuple{String})).code
    default_call = lowered[4]
    defaults = default_call isa Expr && default_call.head === :call ? default_call.args : Any[]
    return (
        method = string(method),
        keywords,
        # Julia lowers the no-keyword wrapper in declared keyword order. These
        # values are evidence only; the undocumented auto_stop value is not
        # promoted to an expected public contract by this probe.
        wait = length(defaults) >= 2 ? defaults[2] : missing,
        devel = length(defaults) >= 4 ? defaults[4] : missing,
        open_url = length(defaults) >= 5 ? defaults[5] : missing,
        new_window = length(defaults) >= 6 ? defaults[6] : missing,
        auto_stop = length(defaults) >= 7 ? defaults[7] : missing,
    )
end

function runtime_snapshot()
    statuses = Main.engee.genie.list()
    matches = filter(statuses) do entry
        entry.application.location in TARGET_LOCATIONS
    end
    app_status = length(matches) == 1 ? only(matches).status : nothing
    app_location = length(matches) == 1 ? only(matches).application.location : nothing
    return (
        captured_at_utc = Dates.format(
            Dates.now(Dates.UTC), Dates.DateFormat("yyyy-mm-ddTHH:MM:SS.sssZ"),
        ),
        matching_app_count = length(matches),
        app_status,
        app_location,
        registry = [
            (status = entry.status, location = entry.application.location)
            for entry in statuses
        ],
        root = http_snapshot(TARGET_URL),
        api_status = http_snapshot(TARGET_URL * "api/status"),
    )
end

"""
Run the read-only production Genie lifecycle/recovery contract.

The caller may set `quiet_observation_seconds` after a DevOps-owned restart to
sample once immediately and once after an idle window. The function never
starts, stops, deploys, or edits an application. Set `throw_on_failure=false`
only when the caller needs the structured failing result returned by Engee MIND;
the result still contains `passed=false` and the exact `TestSetException`.
"""
function run_contract(; quiet_observation_seconds::Real = 0, throw_on_failure::Bool = true)
    quiet_observation_seconds >= 0 || throw(ArgumentError(
        "quiet_observation_seconds must be nonnegative",
    ))

    start_surface = observed_start_surface()
    snapshots = [runtime_snapshot()]
    if quiet_observation_seconds > 0
        sleep(quiet_observation_seconds)
        push!(snapshots, runtime_snapshot())
    end

    contract_error = nothing
    try
        @testset "TASK-0069 production Genie lifecycle recovery" begin
            @test all(keyword -> keyword in start_surface.keywords, DOCUMENTED_START_KEYWORDS)
            @test all(snapshot -> snapshot.matching_app_count == 1, snapshots)
            @test all(
                snapshot -> snapshot.app_status isa AbstractString &&
                            lowercase(strip(snapshot.app_status)) in TARGET_RUNNING_STATUSES,
                snapshots,
            )
            @test all(snapshot -> snapshot.root.error === nothing, snapshots)
            @test all(snapshot -> snapshot.root.status == 200, snapshots)
            @test all(snapshot -> !is_maintenance_response(snapshot.root), snapshots)
            @test all(snapshot -> snapshot.api_status.error === nothing, snapshots)
            @test all(snapshot -> snapshot.api_status.status == 200, snapshots)
            @test all(snapshot -> !is_maintenance_response(snapshot.api_status), snapshots)
            @test all(
                snapshot -> occursin(TARGET_REVISION, snapshot.api_status.body_excerpt),
                snapshots,
            )
        end
    catch err
        contract_error = err
    end

    report = (
        passed = isnothing(contract_error),
        target_app = TARGET_APP,
        target_revision = TARGET_REVISION,
        start_surface,
        quiet_observation_seconds,
        snapshots,
        error = isnothing(contract_error) ? nothing : sprint(showerror, contract_error),
    )
    if !isnothing(contract_error) && throw_on_failure
        throw(contract_error)
    end
    return report
end

if !isnothing(Base.source_path()) && abspath(PROGRAM_FILE) == abspath(Base.source_path())
    run_contract()
end

end
