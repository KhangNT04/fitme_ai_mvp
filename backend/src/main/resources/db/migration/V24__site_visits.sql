-- One row per browser (anonymous visitor id kept in localStorage) per local Asia/Ho_Chi_Minh day.
-- page_views counts route views that day; timestamps are UTC like the rest of the schema.
CREATE TABLE site_visits (
    visit_date DATE NOT NULL,
    visitor_id UUID NOT NULL,
    user_id UUID REFERENCES user_accounts(id) ON DELETE SET NULL,
    page_views INT NOT NULL DEFAULT 1,
    first_seen_at TIMESTAMP NOT NULL,
    last_seen_at TIMESTAMP NOT NULL,
    PRIMARY KEY (visit_date, visitor_id)
);

CREATE INDEX idx_site_visits_visitor ON site_visits(visitor_id, visit_date);
