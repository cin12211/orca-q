-- Tiny demo table so a successful SSL+SSH connect has something to query.
CREATE TABLE IF NOT EXISTS demo (
  id   serial PRIMARY KEY,
  name text NOT NULL
);
INSERT INTO demo (name) VALUES ('alpha'), ('beta'), ('gamma');
