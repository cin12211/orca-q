-- Tiny demo table so a successful SSL+SSH connect has something to query.
CREATE TABLE IF NOT EXISTS demo (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(64) NOT NULL
);
INSERT INTO demo (name) VALUES ('alpha'), ('beta'), ('gamma');
