using Test
using SHA

const SPA = Main.AppTestContext

@testset "TASK-0104 .sazip archive integrity and safe ZIP boundary" begin
    entries = SPA.SignalPackageArchiveEntry[
        SPA.SignalPackageArchiveEntry("manifest.json", Vector{UInt8}(codeunits("{}"))),
        SPA.SignalPackageArchiveEntry("scripts/reproduce.jl", Vector{UInt8}(codeunits("# informational\n"))),
    ]
    first_archive = SPA.write_signal_package_archive(entries)
    @test first_archive == SPA.write_signal_package_archive(entries)
    restored = SPA.read_signal_package_archive(first_archive)
    @test [(entry.name, entry.bytes) for entry in restored] == [(entry.name, entry.bytes) for entry in entries]
    @test SPA.signal_package_crc32(Vector{UInt8}(codeunits("123456789"))) == 0xcbf43926

    for unsafe in ("../escape", "/absolute", "C:/drive", "a\\b", "a//b", "a/./b", "a/../b", "")
        error = try SPA.signal_package_validate_entry_name(unsafe); nothing catch err; err end
        @test error isa SPA.SignalPackageArchiveError
        @test error.code == "unsafe_entry_name"
    end
    duplicate = [entries[1], SPA.SignalPackageArchiveEntry("manifest.json", UInt8[1])]
    @test_throws SPA.SignalPackageArchiveError SPA.write_signal_package_archive(duplicate)
    @test_throws SPA.SignalPackageArchiveError SPA.write_signal_package_archive([entries[1], SPA.SignalPackageArchiveEntry("Manifest.json", UInt8[1])])

    crc_tampered = copy(first_archive); crc_tampered[31] = xor(crc_tampered[31], 0x01)
    err = try SPA.read_signal_package_archive(crc_tampered); nothing catch value; value end
    @test err isa SPA.SignalPackageArchiveError
    @test err.code in ("zip_crc_mismatch", "invalid_zip")
end
