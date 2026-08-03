-- Align partnership order check with Java UUID.toString() lexicographic order.
-- Java UUID.compareTo is signed and can disagree with native Postgres UUID <.

ALTER TABLE brand_partnerships DROP CONSTRAINT IF EXISTS brand_partnerships_ordered;
ALTER TABLE brand_partnerships
    ADD CONSTRAINT brand_partnerships_ordered CHECK (brand_a_id::text < brand_b_id::text);
