#!/usr/bin/env julia

function coverage_files(root::AbstractString)
    files = String[]
    for (dir, _, names) in walkdir(root)
        for name in names
            endswith(name, ".cov") && push!(files, joinpath(dir, name))
        end
    end
    sort(files)
end

function file_coverage(path::AbstractString)
    executable = 0
    covered = 0

    for line in eachline(path)
        match_result = match(r"^\s*(\d+)\s", line)
        match_result === nothing && continue
        count = parse(Int, only(match_result.captures))
        executable += 1
        covered += count > 0
    end

    (; path, executable, covered)
end

function coverage_summary(roots)
    rows = [file_coverage(path) for root in roots for path in coverage_files(root)]
    executable = mapreduce(row -> row.executable, +, rows; init = 0)
    covered = mapreduce(row -> row.covered, +, rows; init = 0)
    percent = executable == 0 ? 0.0 : 100 * covered / executable

    (; files = length(rows), executable, covered, percent)
end

roots = isempty(ARGS) ? ["app", "lib"] : ARGS
summary = coverage_summary(roots)
println(
    "files=$(summary.files) covered=$(summary.covered) ",
    "executable=$(summary.executable) coverage=$(round(summary.percent; digits = 2))%",
)
