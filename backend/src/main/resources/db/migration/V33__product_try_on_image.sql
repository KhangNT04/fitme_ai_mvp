-- AI try-on now renders the gallery image the brand marks as TRY_ON (one per product).
-- Existing wearable products keep working: their first image becomes the try-on image
-- until the brand picks a better one in the portal.
UPDATE product_images pi
SET image_type = 'TRY_ON'
FROM (
    SELECT DISTINCT ON (i.product_id) i.id
    FROM product_images i
    JOIN products p ON p.id = i.product_id
    WHERE COALESCE(p.category, '') NOT IN ('Phụ kiện', 'Giày')
      AND NOT EXISTS (
          SELECT 1 FROM product_images t
          WHERE t.product_id = i.product_id AND t.image_type = 'TRY_ON'
      )
    ORDER BY i.product_id, i.sort_order, i.created_at
) first_image
WHERE pi.id = first_image.id;

-- Products without a try-on image (no photos, shoes, accessories) are not offered for AI try-on.
UPDATE products p
SET ai_try_on_eligible = FALSE
WHERE ai_try_on_eligible
  AND (
      COALESCE(p.category, '') IN ('Phụ kiện', 'Giày')
      OR NOT EXISTS (
          SELECT 1 FROM product_images t
          WHERE t.product_id = p.id AND t.image_type = 'TRY_ON'
      )
  );
