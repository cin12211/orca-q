-- The Sakila data sets explicit ids while triggers fill new ids from sequences
-- that still start at 1, so inserts would collide with the seeded rows.
ALTER SESSION SET CONTAINER = FREEPDB1;
ALTER SESSION SET CURRENT_SCHEMA = orcaq;

BEGIN
  FOR seq IN (
    SELECT sequence_name FROM all_sequences WHERE sequence_owner = 'ORCAQ'
  ) LOOP
    EXECUTE IMMEDIATE
      'ALTER SEQUENCE orcaq.' || seq.sequence_name || ' RESTART START WITH 1000000';
  END LOOP;
END;
/
