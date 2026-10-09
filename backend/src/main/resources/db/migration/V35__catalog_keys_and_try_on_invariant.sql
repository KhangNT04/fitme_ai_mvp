-- Catalog brands and products are matched by stable keys instead of display name / list position,
-- and the startup catalog sync only touches rows nobody has edited since it last wrote them.
ALTER TABLE brands ADD COLUMN catalog_key VARCHAR(64);
ALTER TABLE brands ADD COLUMN catalog_managed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE brands ADD COLUMN catalog_hash VARCHAR(64);
CREATE UNIQUE INDEX uq_brands_catalog_key ON brands (catalog_key) WHERE catalog_key IS NOT NULL;

-- One row per name (approved first, then oldest) so duplicate names can never claim the same key.
UPDATE brands b
SET catalog_key = picked.catalog_key,
    catalog_managed = picked.managed
FROM (
    SELECT DISTINCT ON (k.catalog_key) br.id, k.catalog_key, k.managed
    FROM (VALUES
        ('teelab', 'Teelab', TRUE),
        ('dirtycoins', 'DirtyCoins', TRUE),
        ('regods', 'Regods', TRUE),
        ('ulzzang', 'ULZZANG', TRUE),
        ('lenclothing', 'Len Clothing', TRUE),
        ('hagoo', 'HAGOO', TRUE),
        ('gumac', 'GUMAC', TRUE),
        ('k-style-house', 'K-Style House', FALSE),
        ('linen-muse', 'Linen Muse', FALSE),
        ('seoul-basic', 'Seoul Basic', FALSE),
        ('urban-threads', 'Urban Threads', FALSE),
        ('khang-shop', 'Khang Shop', FALSE)
    ) AS k(catalog_key, name, managed)
    JOIN brands br ON LOWER(br.name) = LOWER(k.name)
    ORDER BY k.catalog_key, (br.status = 'APPROVED') DESC, br.created_at, br.id
) picked
WHERE b.id = picked.id;

ALTER TABLE products ADD COLUMN catalog_item_id VARCHAR(64);
ALTER TABLE products ADD COLUMN catalog_managed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products ADD COLUMN catalog_hash VARCHAR(64);
CREATE UNIQUE INDEX uq_products_brand_catalog_item
    ON products (brand_id, catalog_item_id) WHERE catalog_item_id IS NOT NULL;

UPDATE products p
SET catalog_managed = TRUE
WHERE p.name LIKE 'Sản phẩm demo %'
   OR EXISTS (
       SELECT 1 FROM product_tags t
       WHERE t.product_id = p.id AND t.tag_type = 'META' AND t.tag_value LIKE 'catalog-%'
   );

-- Exactly one TRY_ON image per wearable product: keep the first, demote the rest.
UPDATE product_images pi
SET image_type = 'DETAIL'
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY sort_order, created_at, id) AS rn
    FROM product_images
    WHERE image_type = 'TRY_ON'
) ranked
WHERE pi.id = ranked.id AND ranked.rn > 1;

-- Shoes and accessories are never rendered by AI try-on.
UPDATE product_images pi
SET image_type = CASE
    WHEN NOT EXISTS (
        SELECT 1 FROM product_images m WHERE m.product_id = pi.product_id AND m.image_type = 'MAIN'
    ) AND pi.sort_order = (
        SELECT MIN(f.sort_order) FROM product_images f WHERE f.product_id = pi.product_id
    ) THEN 'MAIN'
    ELSE 'DETAIL'
END
FROM products p
WHERE p.id = pi.product_id
  AND pi.image_type = 'TRY_ON'
  AND COALESCE(p.category, '') IN ('Phụ kiện', 'Giày');

UPDATE products
SET ai_try_on_eligible = FALSE
WHERE ai_try_on_eligible AND COALESCE(category, '') IN ('Phụ kiện', 'Giày');

CREATE UNIQUE INDEX uq_product_images_one_try_on ON product_images (product_id) WHERE image_type = 'TRY_ON';

-- Brand names are unique regardless of case. The application rejects new duplicates; the index is only
-- created when existing data is already clean (otherwise an admin resolves duplicates first).
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM brands GROUP BY LOWER(name) HAVING COUNT(*) > 1) THEN
        CREATE UNIQUE INDEX uq_brands_lower_name ON brands (LOWER(name));
    ELSE
        RAISE NOTICE 'Duplicate brand names found; uq_brands_lower_name not created';
    END IF;
END $$;
