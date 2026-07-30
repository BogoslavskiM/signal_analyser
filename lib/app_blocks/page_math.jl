function page_summary()
    payload = example_payload()
    Dict(
        "items_count" => length(payload["items"]),
        "project" => EXAMPLE_PROJECT_NAME,
    )
end

