function example_payload()
    items = default_items()
    Dict(
        "items" => [
            Dict(
                "id" => item.id,
                "title" => item.title,
                "score" => item_score(item),
            )
            for item in items
        ],
    )
end

