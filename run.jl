app_dir = @__DIR__
host = get(ENV, "GENIE_HOST", "127.0.0.1")
port = parse(Int, get(ENV, "GENIE_PORT", "8000"))

using Genie

cd(app_dir) do
    Genie.loadapp()
    Genie.up(port, host; async = false)
end

