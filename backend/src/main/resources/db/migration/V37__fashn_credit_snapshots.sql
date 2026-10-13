-- Periodic FASHN API balance readings. Consumption is the sum of drops between consecutive readings,
-- so a top-up (balance going up) does not hide or distort usage.
CREATE TABLE fashn_credit_snapshots (
    id BIGSERIAL PRIMARY KEY,
    total INTEGER NOT NULL,
    subscription INTEGER NOT NULL DEFAULT 0,
    on_demand INTEGER NOT NULL DEFAULT 0,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fashn_credit_snapshots_checked ON fashn_credit_snapshots(checked_at DESC);
