using Test
using Base64

const SPA_API = Main.AppTestContext

@testset "TASK-0104 package route and request envelopes" begin
    routes = SPA_API.source("app", "routes.jl")
    for (path, method) in (
        ("/api/session/package", "GET"),
        ("/api/session/package/validate", "POST"),
        ("/api/session/package/workspace-preflight", "POST"),
        ("/api/session/package/import", "POST"),
    )
        @test length(collect(eachmatch(Regex("route\\(\\\"$path\\\", method = $method\\)"), routes))) == 1
    end
    @test occursin("validate_signal_package", routes)
    @test occursin("signal_package_validation_response", routes)
    @test occursin("signal_analyser_session_stale_response", routes)
    @test occursin("never extract files or execute scripts", routes)

    encoded = base64encode(UInt8[1, 2, 3])
    @test SPA_API.parse_signal_package_validate_request(Dict("archive_base64" => encoded)) == UInt8[1, 2, 3]
    @test_throws SPA_API.SignalPackageValidationError SPA_API.parse_signal_package_validate_request(Dict("archive_base64" => encoded, "extra" => true))
    minimal = SPA_API.parse_signal_package_import_request(Dict("state_revision" => 4, "archive_base64" => encoded))
    @test minimal == (4, UInt8[1, 2, 3], false, SPA_API.SIGNAL_PACKAGE_DEFAULT_WORKSPACE_PREFIX)
    full = SPA_API.parse_signal_package_import_request(Dict("state_revision" => 4, "archive_base64" => encoded, "publish_workspace" => true, "workspace_prefix" => "imported_"))
    @test full == (4, UInt8[1, 2, 3], true, "imported_")
    for bad in (
        Dict("state_revision" => true, "archive_base64" => encoded),
        Dict("state_revision" => 4, "archive_base64" => encoded, "publish_workspace" => "true", "workspace_prefix" => "imported_"),
        Dict("state_revision" => 4, "archive_base64" => encoded, "workspace_prefix" => "imported_"),
    )
        @test_throws SPA_API.SignalPackageValidationError SPA_API.parse_signal_package_import_request(bad)
    end
end
