using Test

const SPS = Main.AppTestContext

struct SignalPackageNoSendPublisher <: SPS.AbstractSignalPackageWorkspacePublisher end
const PACKAGE_RECV_CALLS = String[]
SPS.signal_package_workspace_receive(::SignalPackageNoSendPublisher, name::String) = (push!(PACKAGE_RECV_CALLS, name); nothing)
SPS.signal_package_workspace_send(::SignalPackageNoSendPublisher, name::String, value) = error("send must not be called by preflight")

@testset "TASK-0104 package export validate import and workspace preflight" begin
    state = SPS.test_state_with_complex_signal()
    service = SPS.SignalPackageService(SPS.PROJECT_ROOT, SignalPackageNoSendPublisher())
    archive = SPS.export_signal_package(service, state)
    package = SPS.validate_signal_package(service, archive)
    @test package.document.version == 3
    @test package.signals == state.signals
    @test package.entry_count == package.checksum_count + 1
    entries = SPS.signal_package_entry_map(SPS.read_signal_package_archive(archive))
    @test Set(SPS.SIGNAL_PACKAGE_REQUIRED_ENTRIES) \u2286 Set(keys(entries))
    @test occursin("time_s,real,imag", String(entries["signals/$(SPS.signal_package_signal_id(state.signals[1])).csv"]))
    @test occursin(",", String(entries["signals/$(SPS.signal_package_signal_id(state.signals[2])).csv"]))
    @test entries["scripts/reproduce.jl"] == SPS.signal_package_reproduce_script(package.signals, ["signals/$(SPS.signal_package_signal_id(s)).csv" for s in package.signals])
    @test SPS.signal_package_validation_payload(package)["contents"]["reproduce_script"] == "validated_never_executed"

    empty!(PACKAGE_RECV_CALLS)
    preflight = SPS.preflight_signal_package_workspace(service, archive, "imported_")
    @test preflight["ok"] && length(PACKAGE_RECV_CALLS) == length(package.signals)
    @test length(preflight["items"]) == length(package.signals)

    original_revision = state.view.state_revision
    response = SPS.import_signal_package!(service, state, package, original_revision)
    @test response["ok"] && response["state_revision"] == original_revision + 1
    @test response["workspace"]["requested"] == false
    before = state.view.state_revision
    @test_throws SPS.SignalAnalyserStaleStateError SPS.import_signal_package!(service, state, package, original_revision)
    @test state.view.state_revision == before
end
