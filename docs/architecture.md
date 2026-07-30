# Architecture

`example_project` separates UI routing, application services, domain logic, persistence, and static frontend assets.

Keep computational code in `lib/domain` where possible. Use `lib/services` for workflows that coordinate several modules, and keep HTTP-specific behavior in `app/api.jl` and `app/routes.jl`.

