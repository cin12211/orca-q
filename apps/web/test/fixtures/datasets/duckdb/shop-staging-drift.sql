-- Applied on top of a copy of the schema to build shop-staging.duckdb: schema
-- drift for Schema Diff, and a second file to try with ATTACH.

ALTER TABLE sales.product ADD COLUMN supplier_code VARCHAR;
ALTER TABLE sales.customer ADD COLUMN loyalty_tier VARCHAR DEFAULT 'bronze';
ALTER TABLE analytics.event DROP COLUMN raw_bytes;
DROP VIEW analytics.top_customer;

CREATE TABLE sales.coupon (
  code VARCHAR PRIMARY KEY,
  discount_pct DECIMAL(5, 2) NOT NULL,
  expires_on DATE
);

INSERT INTO sales.coupon VALUES
  ('WELCOME10', 10, DATE '2026-12-31'),
  ('VIP20', 20, NULL);
