# Engee 26.8.2-H1 `genie.send` reports success for a rejected large vector

status: confirmed  
stub_authorization: false  
reported_to_user: false

## Environment and public contract

- Environment: production `https://engee.com`; devhub/fallback were not used.
- Engee version: `26.8.2-H1`.
- Julia version: `1.12.4`.
- Public functions:
  - `engee.genie.send(wsVarName::AbstractString, value)`;
  - `engee.genie.recv(wsVarName::AbstractString; context)`.
- Production method source package: `Engee.Genie`, loaded from the production
  Engee runtime.
- Official contract source:
  <https://engee.com/helpcenter/stable/ru/feature/genie-functions.html>.

The official `send` contract declares `value::Any`, says that the supplied
value is stored in the named workspace variable, and does not document a
vector-size limit. The official `recv` contract says that the stored value is
returned from the selected context.

## Affected application call sites

- Existing generic adapter:
  `lib/adapters/engee_native_io.jl`, `native_engee_send(variable_name, value)`.
- Planned TASK-0115 derived-signal execution transport, where `init_signal`
  must be transferred into the production Engee workspace before the hidden
  `recv(...; context=Main)` operation wrapper is evaluated.

The existing adapter checks only whether `send` throws. That is insufficient
for this defect because the public call returns normally and its `status`
field still says `"change"`.

## Minimal reproduction

Run the unchanged persistent reproducer in the project-selected production
runtime:

```julia
include("test/engee/genie_recv_signal_operation_contract_tests.jl")
GenieRecvSignalOperationContractTests.run_large_send_reproducer(engee)
```

Its essential input is:

```julia
name = "__fresh_uuid_backed_name__"
value = collect(range(-1.0, 1.0; length=521_000))
send_result = engee.genie.send(name, value)
received = engee.genie.recv(name; context=Main)
```

Expected:

- `send_result` reports successful storage;
- `received` is the exact `Vector{Float64}` value.

Actual:

```text
send_result.status = "change"
send_result.result = HTTP.Exceptions.StatusError(500, "POST",
  "/api/v1/workspace/internal/change_variable_value", ...
  "syntax: expression too large")
typeof(received) = DataType
received === Nothing
```

The immediately adjacent deterministic probe with 520,000 `Float64` values
returned `result = "UInt8[0x4f, 0x4b]"` and round-tripped the exact vector.
At 521,000 and 1,000,000 values the same embedded HTTP 500 was observed while
`status` remained `"change"`.

## Persistent evidence and localization

- Regression/reproducer:
  `test/engee/genie_recv_signal_operation_contract_tests.jl`, function
  `run_large_send_reproducer`.
- Supported workaround suite in the same file:
  `run_supported_contract`.
- Production supported-suite result:

  ```text
  passed=true
  large_samples=600000
  chunk_samples=50000
  output_type=Vector{Float64}
  ```

- Production reproducer result:

  ```text
  passed=false
  error_type=Test.FallbackTestSetException
  ```

  The direct bounded probe above captures the exact embedded HTTP 500 that
  causes this intentional test failure.

- Repeatability: reproduced by direct probes at 521,000 and 1,000,000
  elements and by the uploaded byte-identical persistent reproducer.
- Isolation: serialization/expression transport in
  `change_variable_value`; the same deterministic data and operation work
  when transported in 50,000-element chunks. Computation and result types are
  not the failing layer.
- Cleanup: every scratch name was UUID-backed, preflighted in remote `Main`,
  and reset with the only public cleanup primitive
  `engee.genie.send(name, nothing)`. Engee retains a `nothing` binding
  tombstone because no public binding-delete API exists, but no signal value
  remains accessible.

## Impact and workaround

Impact:

- a common long signal cannot be transferred monolithically;
- `status == "change"` produces false success unless the caller also checks
  the result payload and performs a round trip;
- TASK-0115 custom operations would otherwise fail for signals only slightly
  larger than 520,000 deterministic real samples; complex and differently
  formatted values may hit a lower element count because the failure is tied
  to serialized expression size.

Confirmed workaround:

1. Use fresh UUID-backed input/staging/output identifiers and reject any
   remote `Main` preflight collision.
2. Send at most 50,000 samples per chunk and verify both the `send` response
   payload and the remote assignment result.
3. Assemble the input once in remote `Main`, execute the hidden operation
   once, store the result in a second temporary binding, and receive the result
   in the same bounded chunks.
4. Reset every temporary value to `nothing` in `finally` on success and error.

No unavailable stub is justified: the chunked public-API path passed the
600,000-sample production contract.

## Recovery trigger

Rerun the unchanged `run_large_send_reproducer` against a newer production
Engee runtime. Recovery requires all assertions to pass: an unambiguous
successful response, exact `Vector{Float64}` type and exact 521,000-element
round trip. There is no product stub, commented call or fake-success path to
remove. The conservative chunked transport may be simplified only in a
separate reviewed change after that recovery test passes.

## Unresolved

- The provider's byte/expression-size limit is undocumented; 520,000 versus
  521,000 is specific to the deterministic `Float64` representation used by
  this reproducer and must not be treated as a universal element cap.
- There is no public timeout/cancellation keyword on `genie.recv`; long or
  non-terminating user code remains a separate product-security concern, not
  part of this serialization defect.
