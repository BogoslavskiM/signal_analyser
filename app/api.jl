using Genie.Renderer.Json

json_safe(value::AbstractFloat) = isfinite(value) ? value : nothing
json_safe(value::Real) = value
json_safe(value::AbstractString) = value
json_safe(value::Bool) = value
json_safe(value::Nothing) = value
json_safe(value::AbstractVector) = Any[json_safe(item) for item in value]
json_safe(value::Tuple) = Any[json_safe(item) for item in value]
json_safe(value::AbstractDict) = Dict(string(key) => json_safe(val) for (key, val) in pairs(value))
json_safe(value::NamedTuple) = Dict(string(key) => json_safe(getproperty(value, key)) for key in keys(value))
json_safe(value) = value

function api_json(payload; status::Int = 200)
    Genie.Renderer.Json.json(json_safe(payload); status = status)
end

function api_error_response(action::AbstractString, err; status::Int = 400)
    @error action exception = (err, catch_backtrace())
    api_json(Dict(
        "ok" => false,
        "error" => string(action, ": ", sprint(showerror, err)),
    ); status = status)
end

function signal_analyser_validation_response(err::SignalAnalyserValidationError)
    api_json(Dict(
        "ok" => false,
        "code" => "invalid_request",
        "error" => Dict(
            "code" => "invalid_request",
            "message" => err.message,
            "fields" => err.fields,
        ),
    ); status = 422)
end

function signal_analyser_stale_response(state::SignalAnalyserState, err::SignalAnalyserStaleStateError)
    current = signal_analyser_snapshot(state)
    api_json(Dict(
        "ok" => false,
        "code" => "stale_state",
        "error" => Dict(
            "code" => "stale_state",
            "message" => sprint(showerror, err),
        ),
        "state" => current,
        "current" => current,
    ); status = 409)
end

function status_payload()
    Dict(
        "ok" => true,
        "project" => EXAMPLE_APP_STATE["project_name"],
        "ready" => EXAMPLE_APP_STATE["ready"],
    )
end
