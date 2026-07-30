using Genie
using Genie.Requests

function public_path(parts::AbstractString...)
    joinpath(@__DIR__, "..", "public", parts...)
end

function public_file(parts::AbstractString...)
    serve_file(public_path(parts...))
end

route("/") do
    public_file("index.html")
end

route("/css/:file", method = GET) do
    public_file("css", basename(String(params(:file))))
end

route("/js/:file", method = GET) do
    public_file("js", basename(String(params(:file))))
end

route("/js/ui_blocks/:file", method = GET) do
    public_file("js", "ui_blocks", basename(String(params(:file))))
end

route("/icons/:file", method = GET) do
    public_file("icons", basename(String(params(:file))))
end

route("/fonts/:file", method = GET) do
    public_file("fonts", basename(String(params(:file))))
end

route("/api/status", method = GET) do
    api_json(status_payload())
end

route("/api/example", method = GET) do
    try
        api_json(example_payload())
    catch err
        api_error_response("Failed to build example payload", err; status = 500)
    end
end

