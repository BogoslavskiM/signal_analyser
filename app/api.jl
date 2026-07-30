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

function status_payload()
    Dict(
        "ok" => true,
        "project" => EXAMPLE_APP_STATE["project_name"],
        "ready" => EXAMPLE_APP_STATE["ready"],
    )
end

