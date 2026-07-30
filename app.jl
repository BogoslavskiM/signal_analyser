module App

using Genie
using Genie.Requests

include("app/bootstrap.jl")
include("app/api.jl")
include("app/routes.jl")

end

