-- Compact Sakila-style dataset for the CockroachDB fixture.
-- Kept small and generated in-database so the fixture boots in seconds.

CREATE DATABASE IF NOT EXISTS sakila;
USE sakila;

CREATE USER IF NOT EXISTS orcaq;
GRANT ALL ON DATABASE sakila TO orcaq;
ALTER DEFAULT PRIVILEGES GRANT ALL ON TABLES TO orcaq;

CREATE TABLE IF NOT EXISTS language (
  language_id INT8 PRIMARY KEY DEFAULT unique_rowid(),
  name STRING(20) NOT NULL,
  last_update TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS category (
  category_id INT8 PRIMARY KEY,
  name STRING(25) NOT NULL,
  last_update TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS actor (
  actor_id INT8 PRIMARY KEY,
  first_name STRING(45) NOT NULL,
  last_name STRING(45) NOT NULL,
  last_update TIMESTAMPTZ NOT NULL DEFAULT now(),
  INDEX idx_actor_last_name (last_name)
);

CREATE TABLE IF NOT EXISTS film (
  film_id INT8 PRIMARY KEY,
  title STRING(255) NOT NULL,
  description STRING,
  release_year INT4,
  language_id INT8 NOT NULL REFERENCES language (language_id),
  rental_rate DECIMAL(4, 2) NOT NULL DEFAULT 4.99,
  length INT4,
  rating STRING(10) DEFAULT 'G',
  special_features STRING[],
  metadata JSONB,
  last_update TIMESTAMPTZ NOT NULL DEFAULT now(),
  INDEX idx_title (title),
  INDEX idx_fk_language_id (language_id)
);

COMMENT ON TABLE film IS 'Films available for rent';
COMMENT ON COLUMN film.title IS 'Display title';

CREATE TABLE IF NOT EXISTS film_actor (
  actor_id INT8 NOT NULL REFERENCES actor (actor_id),
  film_id INT8 NOT NULL REFERENCES film (film_id),
  last_update TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, film_id),
  INDEX idx_fk_film_id (film_id)
);

CREATE TABLE IF NOT EXISTS film_category (
  film_id INT8 NOT NULL REFERENCES film (film_id),
  category_id INT8 NOT NULL REFERENCES category (category_id),
  last_update TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (film_id, category_id)
);

CREATE TABLE IF NOT EXISTS customer (
  customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name STRING(45) NOT NULL,
  last_name STRING(45) NOT NULL,
  email STRING(50) UNIQUE,
  active BOOL NOT NULL DEFAULT true,
  create_date DATE NOT NULL DEFAULT current_date(),
  last_update TIMESTAMPTZ
);

-- No primary key on purpose: exercises the hidden `rowid` column.
CREATE TABLE IF NOT EXISTS payment_log (
  customer_email STRING,
  amount DECIMAL(5, 2) NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note STRING
);

INSERT INTO language (language_id, name)
VALUES (1, 'English'), (2, 'Italian'), (3, 'Japanese'), (4, 'Mandarin'), (5, 'French'), (6, 'German')
ON CONFLICT DO NOTHING;

INSERT INTO category (category_id, name)
SELECT i, (ARRAY['Action', 'Animation', 'Children', 'Classics', 'Comedy', 'Documentary', 'Drama', 'Family', 'Foreign', 'Games', 'Horror', 'Music', 'New', 'Sci-Fi', 'Sports', 'Travel'])[i]
FROM generate_series(1, 16) AS g(i)
ON CONFLICT DO NOTHING;

INSERT INTO actor (actor_id, first_name, last_name)
SELECT i, 'ACTOR_' || i::STRING, 'LAST_' || (i % 37)::STRING
FROM generate_series(1, 200) AS g(i)
ON CONFLICT DO NOTHING;

INSERT INTO film (film_id, title, description, release_year, language_id, rental_rate, length, rating, special_features, metadata)
SELECT
  i,
  'FILM ' || i::STRING,
  CASE WHEN i % 7 = 0 THEN NULL ELSE 'A story about film number ' || i::STRING END,
  2000 + (i % 25),
  1 + (i % 6),
  (0.99 + (i % 5))::DECIMAL(4, 2),
  60 + (i % 120),
  (ARRAY['G', 'PG', 'PG-13', 'R', 'NC-17'])[1 + (i % 5)],
  ARRAY['Trailers', 'Deleted Scenes'],
  json_build_object('views', i * 3, 'featured', i % 10 = 0)
FROM generate_series(1, 1000) AS g(i)
ON CONFLICT DO NOTHING;

INSERT INTO film_actor (actor_id, film_id)
SELECT 1 + (i % 200), i
FROM generate_series(1, 1000) AS g(i)
ON CONFLICT DO NOTHING;

INSERT INTO film_category (film_id, category_id)
SELECT i, 1 + (i % 16)
FROM generate_series(1, 1000) AS g(i)
ON CONFLICT DO NOTHING;

INSERT INTO customer (first_name, last_name, email, active)
SELECT 'CUSTOMER_' || i::STRING, 'LAST_' || i::STRING, 'customer' || i::STRING || '@example.com', i % 9 <> 0
FROM generate_series(1, 300) AS g(i)
ON CONFLICT DO NOTHING;

INSERT INTO payment_log (customer_email, amount, note)
SELECT 'customer' || (1 + i % 300)::STRING || '@example.com', (1 + i % 9)::DECIMAL(5, 2), CASE WHEN i % 4 = 0 THEN NULL ELSE 'note ' || i::STRING END
FROM generate_series(1, 500) AS g(i);

CREATE VIEW IF NOT EXISTS film_list AS
SELECT f.film_id, f.title, c.name AS category, f.rental_rate, f.length, f.rating
FROM film f
JOIN film_category fc ON fc.film_id = f.film_id
JOIN category c ON c.category_id = fc.category_id;

CREATE SCHEMA IF NOT EXISTS reporting;

CREATE TABLE IF NOT EXISTS reporting.daily_rentals (
  day DATE PRIMARY KEY,
  rentals INT8 NOT NULL DEFAULT 0
);

GRANT ALL ON ALL TABLES IN SCHEMA public TO orcaq;
GRANT ALL ON SCHEMA reporting TO orcaq;
GRANT ALL ON ALL TABLES IN SCHEMA reporting TO orcaq;
