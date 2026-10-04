-- Part of a captured PayOS payment that belongs to cancelled seller orders and must be returned to the customer.
ALTER TABLE orders ADD COLUMN refund_due_vnd BIGINT NOT NULL DEFAULT 0;
