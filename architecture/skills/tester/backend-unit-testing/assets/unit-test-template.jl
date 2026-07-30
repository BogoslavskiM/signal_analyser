using Test

const C = Main.AppTestContext

@testset "lib/<module>.jl" begin
    @testset "normal" begin
        state = C.make_test_state()
        result = C.function_under_test(state, C.valid_input())

        @test result == C.expected_result()
        @test C.expected_state_change(state)
    end

    @testset "boundary" begin
        state = C.make_test_state()

        @test C.function_under_test(state, C.minimum_input()) == C.minimum_result()
        @test C.function_under_test(state, C.maximum_input()) == C.maximum_result()
    end

    @testset "invalid input does not partially mutate state" begin
        state = C.make_test_state()
        before = deepcopy(state)

        error = try
            C.function_under_test(state, C.invalid_input())
            nothing
        catch caught
            caught
        end

        @test error isa ArgumentError
        @test sprint(showerror, error) == C.expected_error_text()
        @test state == before
    end
end
