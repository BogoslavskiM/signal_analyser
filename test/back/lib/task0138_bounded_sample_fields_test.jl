using Test

const TASK0138 = Main.AppTestContext

function task0138_state()
    real_values = ComplexF64[4.0, 0.0, -9.0, 1.0e200]
    append!(real_values, fill(ComplexF64(1.0), 497))
    real = TASK0138.AnalysedSignal(
        "task-0138-real", "TASK-0138 real", "#2563eb", 100.0, real_values, false, true,
    )
    complex = TASK0138.AnalysedSignal(
        "task-0138-complex", "TASK-0138 complex", "#dc2626", 100.0,
        ComplexF64[3 + 4im, 1 - 1im], true, true,
    )
    TASK0138.SignalAnalyserState(
        [real, complex],
        TASK0138.SignalAnalyserViewState(0, TASK0138.TIME_PLOT, real.name),
        Dict{String,Dict{String,Any}}(), ReentrantLock(),
    )
end

@testset "TASK-0138 bounded samples expose derived roots without losing canonical fields" begin
    state = task0138_state()
    real, complex = state.signals

    page = TASK0138.signal_inventory_samples_payload(state, real.id, 0, 500)
    @test page["cursor"] == 0
    @test page["limit"] == 500
    @test length(page["rows"]) == 500
    @test page["next_cursor"] == 500
    @test page["total"] == 501

    positive, zero, negative, overflow = page["rows"][1:4]
    @test positive["sample_index"] == 0
    @test positive["value"] == 4.0
    @test positive["magnitude"] == 4.0
    @test positive["square"] == 16.0
    @test positive["square_root"] == 2.0
    @test positive["signed_square_root_magnitude"] == 2.0

    @test zero["value"] == 0.0
    @test zero["magnitude"] == 0.0
    @test zero["square"] == 0.0
    @test zero["square_root"] == 0.0
    @test zero["signed_square_root_magnitude"] == 0.0

    @test negative["value"] == -9.0
    @test negative["magnitude"] == 9.0
    @test negative["square"] == 81.0
    @test negative["square_root"] === nothing
    @test negative["signed_square_root_magnitude"] == -3.0

    @test overflow["value"] == 1.0e200
    @test overflow["magnitude"] == 1.0e200
    @test overflow["square"] === nothing
    @test overflow["square_root"] == 1.0e100
    @test overflow["signed_square_root_magnitude"] == 1.0e100

    final_page = TASK0138.signal_inventory_samples_payload(state, real.id, 500, 500)
    @test length(final_page["rows"]) == 1
    @test only(final_page["rows"])["sample_index"] == 500
    @test final_page["next_cursor"] === nothing

    complex_row = only(TASK0138.signal_inventory_samples_payload(state, complex.id, 0, 1)["rows"])
    @test complex_row["value"] == string(ComplexF64(3 + 4im))
    @test complex_row["magnitude"] == 5.0
    @test complex_row["square"] == string(ComplexF64(3 + 4im)^2)
    @test complex_row["square_root"] == string(sqrt(ComplexF64(3 + 4im)))
    @test complex_row["signed_square_root_magnitude"] === nothing

    @test_throws TASK0138.SignalAnalyserValidationError TASK0138.signal_inventory_samples_payload(
        state, real.id, 0, 501,
    )
end
