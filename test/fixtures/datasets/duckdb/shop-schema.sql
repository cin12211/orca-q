-- Schema of the DuckDB sample database (shop.duckdb).
-- Covers what the OrcaQ DuckDB connection has to display: several schemas,
-- PK/FK for the ERD, secondary indexes, views, macros and DuckDB-only types.

CREATE SCHEMA inventory;
CREATE SCHEMA sales;
CREATE SCHEMA analytics;

CREATE TYPE sales.order_status AS ENUM ('pending', 'paid', 'shipped', 'cancelled');

CREATE TABLE sales.category (
  id INTEGER PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  parent_id INTEGER REFERENCES sales.category (id)
);

CREATE TABLE sales.product (
  id INTEGER PRIMARY KEY,
  sku VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  category_id INTEGER NOT NULL REFERENCES sales.category (id),
  price DECIMAL(10, 2) NOT NULL,
  weight_kg DOUBLE,
  tags VARCHAR[],
  attributes MAP(VARCHAR, VARCHAR),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT TIMESTAMP '2024-01-01 00:00:00'
);

-- DuckDB rejects foreign keys across schemas, so product_id is a plain column.
CREATE TABLE inventory.warehouse (
  id INTEGER PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  city VARCHAR NOT NULL
);

CREATE TABLE inventory.stock (
  warehouse_id INTEGER NOT NULL REFERENCES inventory.warehouse (id),
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP,
  PRIMARY KEY (warehouse_id, product_id)
);

CREATE TABLE sales.customer (
  id INTEGER PRIMARY KEY,
  public_id UUID NOT NULL UNIQUE,
  full_name VARCHAR NOT NULL,
  email VARCHAR,
  city VARCHAR,
  address STRUCT(street VARCHAR, ward VARCHAR, postal_code VARCHAR),
  lifetime_value HUGEINT,
  joined_on DATE NOT NULL,
  preferences JSON
);

CREATE TABLE sales.orders (
  id BIGINT PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES sales.customer (id),
  status sales.order_status NOT NULL,
  placed_at TIMESTAMP NOT NULL,
  shipped_at TIMESTAMPTZ,
  note VARCHAR
);

CREATE INDEX idx_orders_placed_at ON sales.orders (placed_at);

CREATE TABLE sales.order_item (
  order_id BIGINT NOT NULL REFERENCES sales.orders (id),
  line_no INTEGER NOT NULL,
  product_id INTEGER NOT NULL REFERENCES sales.product (id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL,
  discount_pct DECIMAL(5, 2) NOT NULL DEFAULT 0,
  PRIMARY KEY (order_id, line_no)
);

CREATE TABLE analytics.event (
  id BIGINT PRIMARY KEY,
  customer_id INTEGER,
  name VARCHAR NOT NULL,
  occurred_at TIMESTAMP NOT NULL,
  duration INTERVAL,
  payload JSON,
  raw_bytes BLOB
);

-- One row of every type the data grid has to render, plus an all-NULL row.
CREATE TABLE main.all_types (
  id INTEGER PRIMARY KEY,
  col_boolean BOOLEAN,
  col_tinyint TINYINT,
  col_smallint SMALLINT,
  col_integer INTEGER,
  col_bigint BIGINT,
  col_hugeint HUGEINT,
  col_ubigint UBIGINT,
  col_float FLOAT,
  col_double DOUBLE,
  col_decimal DECIMAL(18, 4),
  col_varchar VARCHAR,
  col_blob BLOB,
  col_bit BIT,
  col_date DATE,
  col_time TIME,
  col_timestamp TIMESTAMP,
  col_timestamptz TIMESTAMPTZ,
  col_interval INTERVAL,
  col_uuid UUID,
  col_json JSON,
  col_enum sales.order_status,
  col_list INTEGER[],
  col_array DOUBLE[3],
  col_struct STRUCT(name VARCHAR, score INTEGER),
  col_map MAP(VARCHAR, INTEGER),
  col_union UNION(num INTEGER, label VARCHAR)
);

CREATE MACRO sales.net_amount(unit_price, quantity, discount_pct) AS
  unit_price * quantity * (1 - discount_pct / 100);

CREATE MACRO sales.orders_of(target_customer_id) AS TABLE
  SELECT * FROM sales.orders WHERE customer_id = target_customer_id;

CREATE VIEW sales.order_total AS
SELECT
  o.id AS order_id,
  o.customer_id,
  o.status,
  o.placed_at,
  SUM(sales.net_amount(i.unit_price, i.quantity, i.discount_pct)) AS total
FROM sales.orders o
JOIN sales.order_item i ON i.order_id = o.id
GROUP BY ALL;

CREATE VIEW analytics.daily_revenue AS
SELECT
  CAST(placed_at AS DATE) AS day,
  COUNT(*) AS order_count,
  SUM(total) AS revenue
FROM sales.order_total
WHERE status <> 'cancelled'
GROUP BY ALL;

CREATE VIEW analytics.top_customer AS
SELECT
  c.id,
  c.full_name,
  c.city,
  COUNT(*) AS order_count,
  SUM(t.total) AS spent
FROM sales.customer c
JOIN sales.order_total t ON t.customer_id = c.id
GROUP BY ALL
ORDER BY spent DESC
LIMIT 20;

COMMENT ON TABLE sales.orders IS 'Customer orders; totals live in sales.order_total';
COMMENT ON COLUMN sales.customer.lifetime_value IS 'Lifetime value in minor units';
