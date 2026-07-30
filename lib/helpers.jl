function clamp01(value::Real)
    min(max(Float64(value), 0.0), 1.0)
end

