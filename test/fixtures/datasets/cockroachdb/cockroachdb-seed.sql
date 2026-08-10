CREATE TABLE IF NOT EXISTS customers (
  customer_id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS orders (
  order_id SERIAL PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers (customer_id),
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE VIEW IF NOT EXISTS customer_order_totals AS
SELECT
  c.customer_id,
  c.first_name,
  c.last_name,
  COALESCE(SUM(o.amount), 0) AS total_spent
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
GROUP BY c.customer_id, c.first_name, c.last_name;

INSERT INTO customers (first_name, last_name, email) VALUES
  ('Ada', 'Lovelace', 'ada@example.com'),
  ('Grace', 'Hopper', 'grace@example.com'),
  ('Alan', 'Turing', 'alan@example.com')
ON CONFLICT (email) DO NOTHING;

INSERT INTO orders (customer_id, amount)
SELECT customer_id, amount
FROM (
  SELECT 'ada@example.com' AS email, 42.50 AS amount
  UNION ALL SELECT 'ada@example.com', 15.00
  UNION ALL SELECT 'grace@example.com', 99.99
) seed
JOIN customers ON customers.email = seed.email
WHERE NOT EXISTS (
  SELECT 1 FROM orders
  WHERE orders.customer_id = customers.customer_id
    AND orders.amount = seed.amount
);
