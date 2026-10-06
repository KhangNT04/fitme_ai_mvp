-- FitMe no longer sells on-site: every purchase goes through the redirect flow to the brand's own store.
-- Drops the on-site commerce schema from V17 (vouchers), V19 (commerce), V20 (refunds) and V21 (orders index).
-- Indexes on the dropped tables go with them. billing_plans.freeship_* columns are kept but no longer read.

DROP TABLE IF EXISTS shipment_events CASCADE;
DROP TABLE IF EXISTS shipments CASCADE;
DROP TABLE IF EXISTS payment_transactions CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS seller_orders CASCADE;
DROP TABLE IF EXISTS seller_settlements CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS carts CASCADE;
DROP TABLE IF EXISTS shipping_addresses CASCADE;
DROP TABLE IF EXISTS user_vouchers CASCADE;

ALTER TABLE product_variants DROP COLUMN IF EXISTS stock_quantity;

ALTER TABLE brands
    DROP COLUMN IF EXISTS bank_name,
    DROP COLUMN IF EXISTS bank_account_number,
    DROP COLUMN IF EXISTS bank_account_name;
