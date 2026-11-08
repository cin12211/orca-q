-- Sample data for shop.duckdb. Values derive from hash(i) rather than random()
-- so regenerating gives the same rows whatever the thread count.

-- hash() is unsigned while list indexes must be signed.
CREATE TEMP MACRO pick(options, seed) AS
  options[1 + CAST(seed % len(options) AS INTEGER)];

-- Parents go first: DuckDB checks the self-referencing key per statement.
INSERT INTO sales.category VALUES
  (1, 'Electronics', NULL),
  (4, 'Home', NULL),
  (6, 'Books', NULL);

INSERT INTO sales.category VALUES
  (2, 'Phones', 1),
  (3, 'Laptops', 1),
  (5, 'Kitchen', 4);

INSERT INTO sales.product (
  id, sku, name, category_id, price, weight_kg, tags, attributes, is_active, created_at
)
SELECT
  i,
  printf('SKU-%05d', i),
  pick(['Basic', 'Plus', 'Pro', 'Max'], hash(i, 'tier')) || ' item ' || i,
  2 + hash(i, 'category') % 5,
  CAST(5 + hash(i, 'price') % 200000 / 100.0 AS DECIMAL(10, 2)),
  CASE WHEN i % 7 = 0 THEN NULL ELSE 0.1 + hash(i, 'weight') % 500 / 100.0 END,
  CASE WHEN i % 5 = 0 THEN [] ELSE ['new', 'sale', 'eco'][1:CAST(1 + hash(i, 'tags') % 3 AS INTEGER)] END,
  MAP {'color': pick(['black', 'white', 'red'], hash(i, 'color')), 'warranty': (12 * (1 + i % 3))::VARCHAR},
  i % 17 <> 0,
  TIMESTAMP '2023-01-01 08:00:00' + INTERVAL (hash(i, 'created') % 500) DAY
FROM range(1, 301) t(i);

INSERT INTO inventory.warehouse VALUES
  (1, 'North Hub', 'Hanoi'),
  (2, 'Central Hub', 'Da Nang'),
  (3, 'South Hub', 'Saigon');

INSERT INTO inventory.stock
SELECT
  w,
  p,
  hash(w, p, 'quantity') % 500,
  TIMESTAMP '2024-06-01 00:00:00' + INTERVAL (hash(w, p, 'updated') % 180) DAY
FROM range(1, 4) a(w), range(1, 301) b(p);

INSERT INTO sales.customer
SELECT
  i,
  CAST(regexp_replace(md5('customer-' || i), '^(.{8})(.{4})(.{4})(.{4})(.{12})$', '\1-\2-\3-\4-\5') AS UUID),
  pick(['An', 'Binh', 'Chi', 'Dung', 'Giang', 'Hoa', 'Khoa', 'Linh'], hash(i, 'first'))
    || ' ' || pick(['Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Vu'], hash(i, 'last')),
  CASE WHEN i % 11 = 0 THEN NULL ELSE 'customer' || i || '@example.com' END,
  pick(['Hanoi', 'Saigon', 'Da Nang', 'Hue', 'Can Tho', NULL], hash(i, 'city')),
  CASE WHEN i % 9 = 0 THEN NULL ELSE {
    'street': (hash(i, 'street') % 300 + 1) || ' Le Loi',
    'ward': 'Ward ' || (hash(i, 'ward') % 12 + 1),
    'postal_code': printf('%05d', hash(i, 'postal') % 90000 + 10000)
  } END,
  CASE WHEN i = 1 THEN CAST('170141183460469231731687303715884105727' AS HUGEINT) ELSE hash(i, 'ltv') % 100000000 END,
  DATE '2022-01-01' + CAST(hash(i, 'joined') % 1000 AS INTEGER),
  CAST(json_object('theme', ['light', 'dark'][1 + i % 2], 'newsletter', i % 3 = 0) AS JSON)
FROM range(1, 501) t(i);

INSERT INTO sales.orders
SELECT
  i,
  1 + hash(i, 'customer') % 500,
  CAST(pick(['pending', 'paid', 'shipped', 'shipped', 'shipped', 'cancelled'], hash(i, 'status')) AS sales.order_status),
  TIMESTAMP '2024-01-01 00:00:00' + INTERVAL (hash(i, 'placed') % 525600) MINUTE,
  CASE WHEN hash(i, 'status') % 6 BETWEEN 2 AND 4
    THEN TIMESTAMPTZ '2024-01-03 00:00:00+00' + INTERVAL (hash(i, 'placed') % 525600) MINUTE
  END,
  CASE WHEN i % 13 = 0 THEN 'Gift wrap, không đóng giá' END
FROM range(1, 2001) t(i);

INSERT INTO sales.order_item
SELECT
  o,
  line_no,
  p,
  1 + hash(o, line_no, 'quantity') % 5,
  (SELECT price FROM sales.product WHERE id = p),
  CASE WHEN hash(o, line_no, 'discount') % 4 = 0 THEN 10 ELSE 0 END
FROM (
  SELECT
    o,
    line_no,
    1 + hash(o, line_no, 'product') % 300 AS p
  FROM range(1, 2001) a(o), range(1, 5) b(line_no)
  WHERE line_no <= 1 + hash(o, 'lines') % 4
);

INSERT INTO analytics.event
SELECT
  i,
  CASE WHEN i % 8 = 0 THEN NULL ELSE 1 + hash(i, 'customer') % 500 END,
  pick(['page_view', 'search', 'add_to_cart', 'checkout'], hash(i, 'name')),
  TIMESTAMP '2024-01-01 00:00:00' + INTERVAL (hash(i, 'at') % 31536000) SECOND,
  INTERVAL (hash(i, 'duration') % 600) SECOND,
  CAST(json_object('path', '/p/' || (i % 300), 'mobile', i % 2 = 0) AS JSON),
  CASE WHEN i % 50 = 0 THEN encode('event-' || i) END
FROM range(1, 5001) t(i);

INSERT INTO main.all_types VALUES
  (
    1, TRUE, -128, 32767, 2147483647, 9223372036854775807,
    '170141183460469231731687303715884105727', 18446744073709551615,
    1.5, 3.141592653589793, 12345.6789, 'Xin chào 🦆', '\xAA\xBB\xCC'::BLOB,
    '101010', DATE '2024-02-29', TIME '23:59:59.123', TIMESTAMP '2024-02-29 23:59:59.123456',
    TIMESTAMPTZ '2024-02-29 23:59:59+07', INTERVAL 1 YEAR + INTERVAL 2 DAY,
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8', '{"nested": {"ok": true}, "list": [1, 2]}',
    'shipped', [1, 2, 3], [0.5, 1.5, 2.5], {'name': 'duck', 'score': 42},
    MAP {'a': 1, 'b': 2}, union_value(label := 'text')
  ),
  (2, FALSE, 0, 0, 0, 0, 0, 0, 0, 0, 0, '', ''::BLOB, '0', DATE '1970-01-01', TIME '00:00:00',
    TIMESTAMP '1970-01-01 00:00:00', TIMESTAMPTZ '1970-01-01 00:00:00+00', INTERVAL 0 SECOND,
    '00000000-0000-0000-0000-000000000000', '{}', 'pending', [], [0, 0, 0],
    {'name': '', 'score': 0}, MAP {}, union_value(num := 0)),
  (3, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
