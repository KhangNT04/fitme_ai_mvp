-- Phase 6: a buy click by a signed-in customer who opted in (consent BRAND_LEAD_SHARING) becomes a lead for the
-- product's brand. Leads are stored for every brand; only Brand Plus brands see who the customer is, others see counts.
-- Name and email are never copied here: they are read from user_accounts at display time, gated by the current consent.
-- consent_records.consent_type has no CHECK constraint, so the new consent type needs no schema change.

CREATE TABLE brand_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    -- buy_click_events.product_id blocks deleting a clicked product, so this cascade only runs for products whose
    -- clicks are already gone; a lead without its product has nothing left to show.
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    -- NULL once the customer's data is erased (anonymized_at is then set).
    user_id UUID NULL REFERENCES user_accounts(id) ON DELETE SET NULL,
    buy_click_event_id UUID NULL REFERENCES buy_click_events(id) ON DELETE SET NULL,
    size VARCHAR(50),
    color VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Business day in Asia/Ho_Chi_Minh, for the one-lead-per-day rule.
    lead_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
    confirmed_sold_at TIMESTAMPTZ NULL,
    confirmed_by UUID NULL REFERENCES user_accounts(id) ON DELETE SET NULL,
    anonymized_at TIMESTAMPTZ NULL,
    -- Anonymized rows (user_id NULL) never collide: NULLs are distinct in a unique constraint.
    CONSTRAINT uq_brand_leads_user_product_day UNIQUE (user_id, product_id, lead_date)
);

CREATE INDEX idx_brand_leads_brand_created ON brand_leads(brand_id, created_at DESC);
-- Verified-purchase badge lookups by product.
CREATE INDEX idx_brand_leads_product_sold ON brand_leads(product_id, user_id) WHERE confirmed_sold_at IS NOT NULL;
-- Latest consent decision per user and type (lead creation and the read-time consent gate).
CREATE INDEX idx_consent_records_user_type_created ON consent_records(user_id, consent_type, created_at DESC);

-- Best-effort history for the brand dashboard: attribute past AI try-ons to the brands / products they contained.
-- brand_id / product_id are only set when the try-on held a single brand / product.
UPDATE analytics_events e
SET metadata = COALESCE(e.metadata, '{}'::jsonb)
                   || jsonb_build_object('brandIds', t.brand_ids, 'productIds', t.product_ids),
    brand_id = CASE WHEN jsonb_array_length(t.brand_ids) = 1 THEN (t.brand_ids ->> 0)::uuid ELSE e.brand_id END,
    product_id = CASE WHEN jsonb_array_length(t.product_ids) = 1 THEN (t.product_ids ->> 0)::uuid ELSE e.product_id END
FROM (
    SELECT ti.try_on_request_id,
           jsonb_agg(DISTINCT p.brand_id::text) AS brand_ids,
           jsonb_agg(DISTINCT ti.product_id::text) AS product_ids
    FROM try_on_items ti
    JOIN products p ON p.id = ti.product_id
    GROUP BY ti.try_on_request_id
) t
WHERE e.event_type = 'TRY_ON_GENERATED'
  AND e.try_on_request_id = t.try_on_request_id;
