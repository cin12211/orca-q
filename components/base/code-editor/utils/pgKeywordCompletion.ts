import type { Completion } from '@codemirror/autocomplete';
import { CompletionIcon } from '../constants';

const pgKeywordMeta: Record<
  string,
  { info: string; boost: number; type: CompletionIcon }
> = {
  // Core DML/DQL
  SELECT: {
    info: 'Select data from a table.\nExample: SELECT * FROM users;',
    boost: 105,
    type: CompletionIcon.Keyword,
  },
  FROM: {
    info: 'Specify the source table or view.\nExample: SELECT name FROM users;',
    boost: 104,
    type: CompletionIcon.Keyword,
  },
  WHERE: {
    info: 'Filter rows by condition.\nExample: SELECT * FROM users WHERE age > 18;',
    boost: 103,
    type: CompletionIcon.Keyword,
  },
  JOIN: {
    info: 'Combine rows from multiple tables.\nExample: SELECT * FROM users JOIN orders ON users.id = orders.user_id;',
    boost: 100,
    type: CompletionIcon.Keyword,
  },
  ON: {
    info: 'Specify the join condition.\nExample: ... JOIN orders ON users.id = orders.user_id;',
    boost: 100,
    type: CompletionIcon.Keyword,
  },
  VALUES: {
    info: "Specify rows of data for INSERT.\nExample: INSERT INTO users (name, age) VALUES ('Alice', 25);",
    boost: 95,
    type: CompletionIcon.Keyword,
  },
  RETURNING: {
    info: "Return rows affected by INSERT/UPDATE/DELETE.\nExample: INSERT INTO users (name) VALUES ('Alice') RETURNING id;",
    boost: 95,
    type: CompletionIcon.Keyword,
  },
  // INSERT/UPDATE/DELETE
  INSERT: {
    info: "Insert new rows into a table.\nExample: INSERT INTO users (name, age) VALUES ('Alice', 25);",
    boost: 90,
    type: CompletionIcon.Keyword,
  },
  UPDATE: {
    info: 'Update existing rows in a table.\nExample: UPDATE users SET age = 30 WHERE id = 1;',
    boost: 90,
    type: CompletionIcon.Keyword,
  },
  DELETE: {
    info: 'Delete rows from a table.\nExample: DELETE FROM users WHERE id = 1;',
    boost: 90,
    type: CompletionIcon.Keyword,
  },
  // ========================
  // Clauses
  // ========================
  GROUP: {
    info: 'Group rows sharing a property.\nExample: SELECT dept, COUNT(*) FROM employees GROUP BY dept;',
    boost: 95,
    type: CompletionIcon.Keyword,
  },
  HAVING: {
    info: 'Filter groups created by GROUP BY.\nExample: ... GROUP BY dept HAVING COUNT(*) > 5;',
    boost: 95,
    type: CompletionIcon.Keyword,
  },
  ORDER: {
    info: 'Sort the result set.\nExample: SELECT * FROM users ORDER BY created_at DESC;',
    boost: 95,
    type: CompletionIcon.Keyword,
  },
  LIMIT: {
    info: 'Limit the number of rows returned.\nExample: SELECT * FROM users LIMIT 10;',
    boost: 90,
    type: CompletionIcon.Keyword,
  },
  OFFSET: {
    info: 'Skip rows before returning results.\nExample: SELECT * FROM users LIMIT 10 OFFSET 20;',
    boost: 90,
    type: CompletionIcon.Keyword,
  },
  DISTINCT: {
    info: 'Remove duplicate rows.\nExample: SELECT DISTINCT country FROM users;',
    boost: 90,
    type: CompletionIcon.Keyword,
  },
  ALL: {
    info: 'Compare a value to all values in a subquery.\nExample: SELECT * FROM products WHERE price > ALL (SELECT price FROM sales);',
    boost: 70,
    type: CompletionIcon.Keyword,
  },
  ANY: {
    info: 'Compare a value to any value in a subquery.\nExample: SELECT * FROM products WHERE price = ANY (SELECT price FROM sales);',
    boost: 70,
    type: CompletionIcon.Keyword,
  },
  SOME: {
    info: 'Synonym for ANY.\nExample: SELECT * FROM items WHERE value < SOME (SELECT value FROM inventory);',
    boost: 70,
    type: CompletionIcon.Keyword,
  },
  DEFAULT: {
    info: 'Use the default value of a column.\nExample: INSERT INTO users (name) VALUES (DEFAULT);',
    boost: 70,
    type: CompletionIcon.Keyword,
  },
  // ========================
  // Operators / Boolean
  // ========================
  AND: {
    info: 'Logical AND.\nExample: SELECT * FROM users WHERE age > 18 AND active = true;',
    boost: 85,
    type: CompletionIcon.Keyword,
  },
  OR: {
    info: 'Logical OR.\nExample: SELECT * FROM users WHERE age < 18 OR active = true;',
    boost: 85,
    type: CompletionIcon.Keyword,
  },
  NOT: {
    info: 'Logical NOT.\nExample: SELECT * FROM users WHERE NOT active;',
    boost: 85,
    type: CompletionIcon.Keyword,
  },
  IN: {
    info: "Match any value in a list.\nExample: SELECT * FROM users WHERE country IN ('US', 'UK');",
    boost: 85,
    type: CompletionIcon.Keyword,
  },
  EXISTS: {
    info: 'Check if a subquery returns rows.\nExample: SELECT * FROM users WHERE EXISTS (SELECT 1 FROM orders WHERE orders.user_id = users.id);',
    boost: 85,
    type: CompletionIcon.Keyword,
  },
  BETWEEN: {
    info: 'Match a range of values.\nExample: SELECT * FROM products WHERE price BETWEEN 10 AND 20;',
    boost: 85,
    type: CompletionIcon.Keyword,
  },
  LIKE: {
    info: "Match a string with a pattern.\nExample: SELECT * FROM users WHERE name LIKE 'A%';",
    boost: 85,
    type: CompletionIcon.Keyword,
  },
  ILIKE: {
    info: "Case-insensitive string match.\nExample: SELECT * FROM users WHERE name ILIKE 'a%';",
    boost: 85,
    type: CompletionIcon.Keyword,
  },
  NULL: {
    info: 'Null value.\nExample: SELECT * FROM users WHERE phone IS NULL;',
    boost: 85,
    type: CompletionIcon.Keyword,
  },
  IS: {
    info: 'Test a value against a boolean or NULL.\nExample: SELECT * FROM users WHERE active IS TRUE;',
    boost: 80,
    type: CompletionIcon.Keyword,
  },
  // ========================
  // DDL
  // ========================
  CREATE: {
    info: 'Create a new database object.\nExample: CREATE TABLE users (id SERIAL, name TEXT);',
    boost: 80,
    type: CompletionIcon.Keyword,
  },
  ALTER: {
    info: 'Change the structure of a database object.\nExample: ALTER TABLE users ADD COLUMN email TEXT;',
    boost: 80,
    type: CompletionIcon.Keyword,
  },
  DROP: {
    info: 'Delete a database object.\nExample: DROP TABLE users;',
    boost: 80,
    type: CompletionIcon.Keyword,
  },
  TRUNCATE: {
    info: 'Remove all rows from a table quickly.\nExample: TRUNCATE TABLE users;',
    boost: 75,
    type: CompletionIcon.Keyword,
  },
  COMMENT: {
    info: "Add or change a comment.\nExample: COMMENT ON TABLE users IS 'User accounts';",
    boost: 75,
    type: CompletionIcon.Keyword,
  },
  INDEX: {
    info: 'Create or manage an index.\nExample: CREATE INDEX idx_name ON users(name);',
    boost: 70,
    type: CompletionIcon.Keyword,
  },
  SEQUENCE: {
    info: 'Generate sequential numbers.\nExample: CREATE SEQUENCE user_id_seq;',
    boost: 65,
    type: CompletionIcon.Keyword,
  },
  SCHEMA: {
    info: 'Logical grouping of database objects.\nExample: CREATE SCHEMA analytics;',
    boost: 65,
    type: CompletionIcon.Keyword,
  },
  VIEW: {
    info: 'Virtual table based on a query.\nExample: CREATE VIEW active_users AS SELECT * FROM users WHERE active = true;',
    boost: 70,
    type: CompletionIcon.Keyword,
  },
  'MATERIALIZED VIEW': {
    info: 'Physical view stored on disk.\nExample: CREATE MATERIALIZED VIEW sales_summary AS SELECT SUM(amount) FROM sales;',
    boost: 65,
    type: CompletionIcon.Keyword,
  },
  // ========================
  // DCL
  // ========================
  GRANT: {
    info: 'Grant privileges.\nExample: GRANT SELECT ON users TO analyst;',
    boost: 70,
    type: CompletionIcon.Keyword,
  },
  REVOKE: {
    info: 'Revoke privileges.\nExample: REVOKE SELECT ON users FROM analyst;',
    boost: 70,
    type: CompletionIcon.Keyword,
  },
  // ========================
  // Transaction
  // ========================
  BEGIN: {
    info: 'Start a transaction.\nExample: BEGIN;',
    boost: 65,
    type: CompletionIcon.Keyword,
  },
  COMMIT: {
    info: 'Save changes in a transaction.\nExample: COMMIT;',
    boost: 65,
    type: CompletionIcon.Keyword,
  },
  ROLLBACK: {
    info: 'Undo changes in a transaction.\nExample: ROLLBACK;',
    boost: 65,
    type: CompletionIcon.Keyword,
  },
  SAVEPOINT: {
    info: 'Set a transaction savepoint.\nExample: SAVEPOINT sp1;',
    boost: 60,
    type: CompletionIcon.Keyword,
  },
  RELEASE: {
    info: 'Release a savepoint.\nExample: RELEASE SAVEPOINT sp1;',
    boost: 60,
    type: CompletionIcon.Keyword,
  },
  LOCK: {
    info: 'Lock a table.\nExample: LOCK TABLE users IN EXCLUSIVE MODE;',
    boost: 60,
    type: CompletionIcon.Keyword,
  },
  // ========================
  // CTE & Set Ops
  // ========================
  WITH: {
    info: 'Define a Common Table Expression.\nExample: WITH cte AS (SELECT * FROM users) SELECT * FROM cte;',
    boost: 75,
    type: CompletionIcon.Keyword,
  },
  RECURSIVE: {
    info: 'Define a recursive CTE.\nExample: WITH RECURSIVE t(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM t WHERE n < 5) SELECT * FROM t;',
    boost: 70,
    type: CompletionIcon.Keyword,
  },
  UNION: {
    info: 'Combine result sets.\nExample: SELECT id FROM a UNION SELECT id FROM b;',
    boost: 75,
    type: CompletionIcon.Keyword,
  },
  INTERSECT: {
    info: 'Return rows common to both queries.\nExample: SELECT id FROM a INTERSECT SELECT id FROM b;',
    boost: 70,
    type: CompletionIcon.Keyword,
  },
  EXCEPT: {
    info: 'Return rows in the first query but not the second.\nExample: SELECT id FROM a EXCEPT SELECT id FROM b;',
    boost: 70,
    type: CompletionIcon.Keyword,
  },
  // ========================
  // CASE expression
  // ========================
  CASE: {
    info: "Conditional expression.\nExample: SELECT CASE WHEN age > 18 THEN 'adult' ELSE 'minor' END;",
    boost: 80,
    type: CompletionIcon.Keyword,
  },
  WHEN: {
    info: "Used in CASE expression.\nExample: CASE WHEN score >= 90 THEN 'A' ...;",
    boost: 80,
    type: CompletionIcon.Keyword,
  },
  THEN: {
    info: "Result in CASE expression.\nExample: CASE WHEN x > 0 THEN 'positive' END;",
    boost: 80,
    type: CompletionIcon.Keyword,
  },
  ELSE: {
    info: "Alternative result in CASE.\nExample: CASE WHEN active THEN 'yes' ELSE 'no' END;",
    boost: 80,
    type: CompletionIcon.Keyword,
  },
  END: {
    info: "End CASE expression.\nExample: CASE WHEN x=1 THEN 'one' END;",
    boost: 80,
    type: CompletionIcon.Keyword,
  },
  // Aggregate Functions
  COUNT: {
    info: 'Count number of rows.\nExample: SELECT COUNT(*) FROM users;',
    boost: 85,
    type: CompletionIcon.Function,
  },
  SUM: {
    info: 'Calculate the sum of a column.\nExample: SELECT SUM(salary) FROM employees;',
    boost: 85,
    type: CompletionIcon.Function,
  },
  AVG: {
    info: 'Calculate the average value.\nExample: SELECT AVG(score) FROM exams;',
    boost: 85,
    type: CompletionIcon.Function,
  },
  MIN: {
    info: 'Get the smallest value.\nExample: SELECT MIN(price) FROM products;',
    boost: 85,
    type: CompletionIcon.Function,
  },
  MAX: {
    info: 'Get the largest value.\nExample: SELECT MAX(price) FROM products;',
    boost: 85,
    type: CompletionIcon.Function,
  },
  ARRAY_AGG: {
    info: 'Aggregate values into an array.\nExample: SELECT ARRAY_AGG(name) FROM users;',
    boost: 80,
    type: CompletionIcon.Function,
  },
  STRING_AGG: {
    info: "Concatenate values into a string.\nExample: SELECT STRING_AGG(name, ', ') FROM users;",
    boost: 80,
    type: CompletionIcon.Function,
  },
  // System / Date-Time
  NOW: {
    info: 'Return the current date and time.\nExample: SELECT NOW();',
    boost: 80,
    type: CompletionIcon.Function,
  },
  CURRENT_DATE: {
    info: 'Return the current date.\nExample: SELECT CURRENT_DATE;',
    boost: 80,
    type: CompletionIcon.Calendar,
  },
  CURRENT_TIME: {
    info: 'Return the current time.\nExample: SELECT CURRENT_TIME;',
    boost: 80,
    type: CompletionIcon.Calendar,
  },
  CURRENT_TIMESTAMP: {
    info: 'Return the current timestamp.\nExample: SELECT CURRENT_TIMESTAMP;',
    boost: 80,
    type: CompletionIcon.Calendar,
  },
  DATE_TRUNC: {
    info: "Truncate timestamp to a specified precision.\nExample: SELECT DATE_TRUNC('month', NOW());",
    boost: 75,
    type: CompletionIcon.Function,
  },
  EXTRACT: {
    info: 'Get a field from a date/time value.\nExample: SELECT EXTRACT(YEAR FROM NOW());',
    boost: 75,
    type: CompletionIcon.Function,
  },
  TO_CHAR: {
    info: "Convert a timestamp to a string.\nExample: SELECT TO_CHAR(NOW(), 'YYYY-MM-DD');",
    boost: 70,
    type: CompletionIcon.Function,
  },
  TO_DATE: {
    info: "Convert a string to a date.\nExample: SELECT TO_DATE('2024-01-01', 'YYYY-MM-DD');",
    boost: 70,
    type: CompletionIcon.Function,
  },
  // JSON & Type-casting
  CAST: {
    info: "Convert a value from one type to another.\nExample: SELECT CAST('123' AS INT);",
    boost: 75,
    type: CompletionIcon.Function,
  },
  COALESCE: {
    info: "Return the first non-null value.\nExample: SELECT COALESCE(phone, 'N/A') FROM users;",
    boost: 75,
    type: CompletionIcon.Function,
  },
  JSONB_BUILD_OBJECT: {
    info: "Build a JSONB object.\nExample: SELECT JSONB_BUILD_OBJECT('id', 1, 'name', 'Alice');",
    boost: 70,
    type: CompletionIcon.Function,
  },
  JSONB_AGG: {
    info: 'Aggregate values into a JSONB array.\nExample: SELECT JSONB_AGG(name) FROM users;',
    boost: 70,
    type: CompletionIcon.Function,
  },
  // ========================
  // Window Functions
  // ========================
  ROW_NUMBER: {
    info: 'Assign a unique number to each row.\nExample: SELECT ROW_NUMBER() OVER (ORDER BY id) FROM users;',
    boost: 75,
    type: CompletionIcon.Function,
  },
  RANK: {
    info: 'Rank rows with gaps.\nExample: SELECT RANK() OVER (ORDER BY score DESC) FROM exams;',
    boost: 75,
    type: CompletionIcon.Function,
  },
  DENSE_RANK: {
    info: 'Rank rows without gaps.\nExample: SELECT DENSE_RANK() OVER (ORDER BY score DESC) FROM exams;',
    boost: 75,
    type: CompletionIcon.Function,
  },
  NTILE: {
    info: 'Distribute rows into a number of groups.\nExample: SELECT NTILE(4) OVER (ORDER BY score) FROM exams;',
    boost: 70,
    type: CompletionIcon.Function,
  },
  OVER: {
    info: 'Define a window for window functions.\nExample: SELECT AVG(salary) OVER (PARTITION BY dept) FROM employees;',
    boost: 70,
    type: CompletionIcon.Keyword,
  },
  'PARTITION BY': {
    info: 'Group rows within a window function.\nExample: SELECT RANK() OVER (PARTITION BY dept ORDER BY salary) FROM employees;',
    boost: 70,
    type: CompletionIcon.Keyword,
  },
  // ========================
  // Join Types
  // ========================
  'INNER JOIN': {
    info: 'Combine rows where the join condition is met.\nExample: SELECT * FROM users INNER JOIN orders ON users.id = orders.user_id;',
    boost: 100,
    type: CompletionIcon.Keyword,
  },
  'LEFT JOIN': {
    info: 'Include all rows from the left table, with matching rows from the right.\nExample: SELECT * FROM users LEFT JOIN orders ON users.id = orders.user_id;',
    boost: 100,
    type: CompletionIcon.Keyword,
  },
  'RIGHT JOIN': {
    info: 'Include all rows from the right table, with matching rows from the left.\nExample: SELECT * FROM users RIGHT JOIN orders ON users.id = orders.user_id;',
    boost: 100,
    type: CompletionIcon.Keyword,
  },
  'FULL JOIN': {
    info: 'Include all rows from both tables, with NULLs where no match exists.\nExample: SELECT * FROM users FULL JOIN orders ON users.id = orders.user_id;',
    boost: 100,
    type: CompletionIcon.Keyword,
  },
  'CROSS JOIN': {
    info: 'Produce a Cartesian product of two tables.\nExample: SELECT * FROM users CROSS JOIN orders;',
    boost: 95,
    type: CompletionIcon.Keyword,
  },
  // ========================
  // Additional Operators
  // ========================
  'IS DISTINCT FROM': {
    info: 'Compare values, treating NULL as a comparable value.\nExample: SELECT * FROM users WHERE email IS DISTINCT FROM NULL;',
    boost: 80,
    type: CompletionIcon.Keyword,
  },
  'IS NOT DISTINCT FROM': {
    info: 'Compare values, treating NULL as equal to NULL.\nExample: SELECT * FROM users WHERE email IS NOT DISTINCT FROM NULL;',
    boost: 80,
    type: CompletionIcon.Keyword,
  },
  'SIMILAR TO': {
    info: "Match a string against a pattern using regular expressions.\nExample: SELECT * FROM users WHERE name SIMILAR TO '[A-Z]%';",
    boost: 85,
    type: CompletionIcon.Keyword,
  },
  '->': {
    info: "Extract a JSON field by key.\nExample: SELECT data->'key' FROM json_table;",
    boost: 75,
    type: CompletionIcon.Keyword,
  },
  '->>': {
    info: "Extract a JSON field as text.\nExample: SELECT data->>'key' FROM json_table;",
    boost: 75,
    type: CompletionIcon.Keyword,
  },
  '#>': {
    info: "Extract a JSON field by path.\nExample: SELECT data#>ARRAY['key1', 'key2'] FROM json_table;",
    boost: 75,
    type: CompletionIcon.Keyword,
  },
  // ========================
  // Additional Aggregate Functions
  // ========================
  STDDEV: {
    info: 'Calculate the standard deviation of a column.\nExample: SELECT STDDEV(salary) FROM employees;',
    boost: 85,
    type: CompletionIcon.Function,
  },
  VARIANCE: {
    info: 'Calculate the variance of a column.\nExample: SELECT VARIANCE(salary) FROM employees;',
    boost: 85,
    type: CompletionIcon.Function,
  },
  CORR: {
    info: 'Calculate the correlation coefficient.\nExample: SELECT CORR(salary, years_experience) FROM employees;',
    boost: 80,
    type: CompletionIcon.Function,
  },
  // ========================
  // String Functions
  // ========================
  SUBSTRING: {
    info: 'Extract a substring from a string.\nExample: SELECT SUBSTRING(name FROM 1 FOR 3) FROM users;',
    boost: 80,
    type: CompletionIcon.Function,
  },
  TRIM: {
    info: "Remove leading/trailing characters from a string.\nExample: SELECT TRIM(BOTH ' ' FROM name) FROM users;",
    boost: 80,
    type: CompletionIcon.Function,
  },
  UPPER: {
    info: 'Convert a string to uppercase.\nExample: SELECT UPPER(name) FROM users;',
    boost: 80,
    type: CompletionIcon.Function,
  },
  LOWER: {
    info: 'Convert a string to lowercase.\nExample: SELECT LOWER(name) FROM users;',
    boost: 80,
    type: CompletionIcon.Function,
  },
  REPLACE: {
    info: "Replace occurrences of a substring.\nExample: SELECT REPLACE(name, 'Mr.', '') FROM users;",
    boost: 80,
    type: CompletionIcon.Function,
  },
  // ========================
  // Additional JSON/JSONB Functions
  // ========================
  JSONB_ARRAY_ELEMENTS: {
    info: "Expand a JSONB array into rows.\nExample: SELECT JSONB_ARRAY_ELEMENTS(data->'items') FROM json_table;",
    boost: 70,
    type: CompletionIcon.Function,
  },
  JSONB_EXTRACT_PATH: {
    info: "Extract a value from a JSONB object by path.\nExample: SELECT JSONB_EXTRACT_PATH(data, 'key1', 'key2') FROM json_table;",
    boost: 70,
    type: CompletionIcon.Function,
  },
  // ========================
  // Array Functions
  // ========================
  UNNEST: {
    info: 'Expand an array into a set of rows.\nExample: SELECT UNNEST(ARRAY[1, 2, 3]);',
    boost: 80,
    type: CompletionIcon.Function,
  },
  ARRAY_APPEND: {
    info: 'Append an element to an array.\nExample: SELECT ARRAY_APPEND(ARRAY[1, 2], 3);',
    boost: 75,
    type: CompletionIcon.Function,
  },
  ARRAY_PREPEND: {
    info: 'Prepend an element to an array.\nExample: SELECT ARRAY_PREPEND(1, ARRAY[2, 3]);',
    boost: 75,
    type: CompletionIcon.Function,
  },
  ARRAY_LENGTH: {
    info: 'Get the length of an array.\nExample: SELECT ARRAY_LENGTH(ARRAY[1, 2, 3], 1);',
    boost: 75,
    type: CompletionIcon.Function,
  },
  // ========================
  // Additional Date/Time Functions
  // ========================
  AGE: {
    info: 'Calculate the interval between two dates.\nExample: SELECT AGE(birth_date) FROM users;',
    boost: 80,
    type: CompletionIcon.Function,
  },
  INTERVAL: {
    info: "Specify a time interval.\nExample: SELECT NOW() + INTERVAL '1 day';",
    boost: 80,
    type: CompletionIcon.Keyword,
  },
  DATE_PART: {
    info: "Extract a part of a date/time value.\nExample: SELECT DATE_PART('year', NOW());",
    boost: 75,
    type: CompletionIcon.Function,
  },
  // ========================
  // Conditional Functions
  // ========================
  NULLIF: {
    info: 'Return NULL if two values are equal.\nExample: SELECT NULLIF(score, 0) FROM exams;',
    boost: 75,
    type: CompletionIcon.Function,
  },
  GREATEST: {
    info: 'Return the largest value among arguments.\nExample: SELECT GREATEST(10, 20, 15);',
    boost: 75,
    type: CompletionIcon.Function,
  },
  LEAST: {
    info: 'Return the smallest value among arguments.\nExample: SELECT LEAST(10, 20, 15);',
    boost: 75,
    type: CompletionIcon.Function,
  },
  // ========================
  // Table Inheritance and Partitioning
  // ========================
  INHERITS: {
    info: 'Specify table inheritance.\nExample: CREATE TABLE employees (salary INT) INHERITS (users);',
    boost: 65,
    type: CompletionIcon.Keyword,
  },
  'PARTITION OF': {
    info: "Define a table as a partition of a parent table.\nExample: CREATE TABLE sales_2023 PARTITION OF sales FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');",
    boost: 65,
    type: CompletionIcon.Keyword,
  },
  // ========================
  // Full-Text Search
  // ========================
  '@@': {
    info: "Full-text search match operator.\nExample: SELECT * FROM documents WHERE to_tsvector(content) @@ to_tsquery('search & term');",
    boost: 75,
    type: CompletionIcon.Keyword,
  },
  TO_TSVECTOR: {
    info: 'Convert text to a tsvector for full-text search.\nExample: SELECT TO_TSVECTOR(content) FROM documents;',
    boost: 75,
    type: CompletionIcon.Function,
  },
  TO_TSQUERY: {
    info: "Create a tsquery for full-text search.\nExample: SELECT TO_TSQUERY('search & term');",
    boost: 75,
    type: CompletionIcon.Function,
  },
  // ========================
  // Constraints
  // ========================
  'PRIMARY KEY': {
    info: 'Define a primary key constraint.\nExample: CREATE TABLE users (id SERIAL PRIMARY KEY);',
    boost: 80,
    type: CompletionIcon.Keyword,
  },
  'FOREIGN KEY': {
    info: 'Define a foreign key constraint.\nExample: CREATE TABLE orders (user_id INT REFERENCES users(id));',
    boost: 80,
    type: CompletionIcon.Keyword,
  },
  UNIQUE: {
    info: 'Enforce unique values in a column.\nExample: CREATE TABLE users (email TEXT UNIQUE);',
    boost: 80,
    type: CompletionIcon.Keyword,
  },
  CHECK: {
    info: 'Enforce a condition on column values.\nExample: CREATE TABLE users (age INT CHECK (age >= 18));',
    boost: 80,
    type: CompletionIcon.Keyword,
  },
  REFERENCES: {
    info: 'Specify a foreign key reference.\nExample: CREATE TABLE orders (user_id INT REFERENCES users(id));',
    boost: 80,
    type: CompletionIcon.Keyword,
  },
  // ========================
  // Additional Window Functions
  // ========================
  LAG: {
    info: 'Access the previous row in a window.\nExample: SELECT LAG(salary) OVER (PARTITION BY dept ORDER BY id) FROM employees;',
    boost: 75,
    type: CompletionIcon.Function,
  },
  LEAD: {
    info: 'Access the next row in a window.\nExample: SELECT LEAD(salary) OVER (PARTITION BY dept ORDER BY id) FROM employees;',
    boost: 75,
    type: CompletionIcon.Function,
  },
  FIRST_VALUE: {
    info: 'Get the first value in a window.\nExample: SELECT FIRST_VALUE(salary) OVER (PARTITION BY dept) FROM employees;',
    boost: 75,
    type: CompletionIcon.Function,
  },
  LAST_VALUE: {
    info: 'Get the last value in a window.\nExample: SELECT LAST_VALUE(salary) OVER (PARTITION BY dept) FROM employees;',
    boost: 75,
    type: CompletionIcon.Function,
  },
  CUME_DIST: {
    info: 'Calculate the cumulative distribution of a value.\nExample: SELECT CUME_DIST() OVER (ORDER BY salary) FROM employees;',
    boost: 70,
    type: CompletionIcon.Function,
  },
  // ========================
  // Database Maintenance
  // ========================
  VACUUM: {
    info: 'Reclaim storage and optimize tables.\nExample: VACUUM ANALYZE users;',
    boost: 65,
    type: CompletionIcon.Keyword,
  },
  ANALYZE: {
    info: 'Collect statistics for query planner.\nExample: ANALYZE users;',
    boost: 65,
    type: CompletionIcon.Keyword,
  },
  CLUSTER: {
    info: 'Physically reorder a table based on an index.\nExample: CLUSTER users USING idx_name;',
    boost: 65,
    type: CompletionIcon.Keyword,
  },
  TABLESPACE: {
    info: "Define a storage location for database objects.\nExample: CREATE TABLESPACE fast_storage LOCATION '/ssd1/pgdata';",
    boost: 60,
    type: CompletionIcon.Keyword,
  },
  // ========================
  // Triggers and Functions
  // ========================
  TRIGGER: {
    info: 'Define a trigger on a table.\nExample: CREATE TRIGGER log_update AFTER UPDATE ON users FOR EACH ROW EXECUTE FUNCTION log_user_update();',
    boost: 70,
    type: CompletionIcon.Keyword,
  },
  FUNCTION: {
    info: 'Define a stored function.\nExample: CREATE FUNCTION add(a INT, b INT) RETURNS INT AS $$ SELECT a + b; $$ LANGUAGE SQL;',
    boost: 70,
    type: CompletionIcon.Keyword,
  },
  PROCEDURE: {
    info: 'Define a stored procedure.\nExample: CREATE PROCEDURE update_salary() LANGUAGE SQL AS $$ UPDATE employees SET salary = salary * 1.1; $$;',
    boost: 70,
    type: CompletionIcon.Keyword,
  },
  EXECUTE: {
    info: 'Execute a prepared statement or function.\nExample: EXECUTE prepared_query;',
    boost: 65,
    type: CompletionIcon.Keyword,
  },
  // ========================
  // Concurrency Control
  // ========================
  'FOR UPDATE': {
    info: 'Lock rows for updating.\nExample: SELECT * FROM users WHERE id = 1 FOR UPDATE;',
    boost: 70,
    type: CompletionIcon.Keyword,
  },
  'FOR SHARE': {
    info: 'Lock rows for shared access.\nExample: SELECT * FROM users WHERE id = 1 FOR SHARE;',
    boost: 70,
    type: CompletionIcon.Keyword,
  },
  NOWAIT: {
    info: 'Avoid waiting for locked rows.\nExample: SELECT * FROM users WHERE id = 1 FOR UPDATE NOWAIT;',
    boost: 65,
    type: CompletionIcon.Keyword,
  },
};

export function pgKeywordCompletion(label: string, type: string): Completion {
  const up = label.toUpperCase();

  const meta = pgKeywordMeta[up];

  return meta
    ? { label: up, type: meta.type, info: meta.info, boost: meta.boost }
    : { label: up, type };
}
