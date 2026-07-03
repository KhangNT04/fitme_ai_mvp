from app.category_mapper import is_supported, normalize_category


def test_normalize_category_aliases():
    assert normalize_category("tops") == "tops"
    assert normalize_category("one-piece") == "one-pieces"
    assert normalize_category("dress") == "one-pieces"
    assert normalize_category("shoes") is None


def test_is_supported():
    assert is_supported("tops")
    assert not is_supported("shoes")
