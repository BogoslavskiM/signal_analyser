struct ExampleItem
    id::String
    title::String
    value::Float64
end

function item_score(item::ExampleItem)
    clamp01(item.value)
end

