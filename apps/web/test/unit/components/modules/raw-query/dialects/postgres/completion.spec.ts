/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest';
import { SQLDialectSupport } from '~/components/base/code-editor/constants';
import { createCteAwareCompletionSource } from '~/components/modules/raw-query/utils/cteAwareCompletionSource';
import {
  createTestState,
  getCompletionResult,
  hasOption,
  getOption,
} from '../../helpers/test-editor-setup';

describe('PostgreSQL Completion', () => {
  const highlightDialect = SQLDialectSupport.PostgreSQLHighlightDialect;

  const mockSchemas: any[] = [
    {
      name: 'public',
      tableDetails: {
        actor: {
          columns: [
            {
              name: 'actor_id',
              short_type_name: 'integer',
              ordinal_position: 1,
            },
            {
              name: 'first_name',
              short_type_name: 'varchar',
              ordinal_position: 2,
            },
            {
              name: 'last_name',
              short_type_name: 'varchar',
              ordinal_position: 3,
            },
            {
              name: 'last_update',
              short_type_name: 'timestamp',
              ordinal_position: 4,
            },
          ],
          primary_keys: [{ column: 'actor_id' }],
        },
        film: {
          columns: [
            {
              name: 'film_id',
              short_type_name: 'integer',
              ordinal_position: 1,
            },
            { name: 'title', short_type_name: 'varchar', ordinal_position: 2 },
            {
              name: 'description',
              short_type_name: 'text',
              ordinal_position: 3,
            },
            {
              name: 'release_year',
              short_type_name: 'year',
              ordinal_position: 4,
            },
            {
              name: 'language_id',
              short_type_name: 'integer',
              ordinal_position: 5,
            },
            {
              name: 'rental_rate',
              short_type_name: 'numeric',
              ordinal_position: 6,
            },
            {
              name: 'rating',
              short_type_name: 'mpaa_rating',
              ordinal_position: 7,
            },
          ],
          primary_keys: [{ column: 'film_id' }],
          foreign_keys: [
            {
              column: 'language_id',
              referenced_table: 'language',
              referenced_column: 'language_id',
            },
          ],
        },
        film_actor: {
          columns: [
            {
              name: 'actor_id',
              short_type_name: 'integer',
              ordinal_position: 1,
            },
            {
              name: 'film_id',
              short_type_name: 'integer',
              ordinal_position: 2,
            },
          ],
          primary_keys: [{ column: 'actor_id' }, { column: 'film_id' }],
          foreign_keys: [
            {
              column: 'actor_id',
              referenced_table: 'actor',
              referenced_column: 'actor_id',
            },
            {
              column: 'film_id',
              referenced_table: 'film',
              referenced_column: 'film_id',
            },
          ],
        },
        customer: {
          columns: [
            {
              name: 'customer_id',
              short_type_name: 'integer',
              ordinal_position: 1,
            },
            {
              name: 'store_id',
              short_type_name: 'integer',
              ordinal_position: 2,
            },
            {
              name: 'first_name',
              short_type_name: 'varchar',
              ordinal_position: 3,
            },
            {
              name: 'last_name',
              short_type_name: 'varchar',
              ordinal_position: 4,
            },
            { name: 'email', short_type_name: 'varchar', ordinal_position: 5 },
            {
              name: 'address_id',
              short_type_name: 'integer',
              ordinal_position: 6,
            },
            {
              name: 'activebool',
              short_type_name: 'boolean',
              ordinal_position: 7,
            },
          ],
          primary_keys: [{ column: 'customer_id' }],
          foreign_keys: [
            {
              column: 'address_id',
              referenced_table: 'address',
              referenced_column: 'address_id',
            },
          ],
        },
        rental: {
          columns: [
            {
              name: 'rental_id',
              short_type_name: 'integer',
              ordinal_position: 1,
            },
            {
              name: 'rental_date',
              short_type_name: 'timestamp',
              ordinal_position: 2,
            },
            {
              name: 'inventory_id',
              short_type_name: 'integer',
              ordinal_position: 3,
            },
            {
              name: 'customer_id',
              short_type_name: 'integer',
              ordinal_position: 4,
            },
            {
              name: 'return_date',
              short_type_name: 'timestamp',
              ordinal_position: 5,
            },
            {
              name: 'staff_id',
              short_type_name: 'integer',
              ordinal_position: 6,
            },
          ],
          primary_keys: [{ column: 'rental_id' }],
        },
      },
    },
  ];

  const completionSource = createCteAwareCompletionSource({
    schemas: mockSchemas,
    defaultSchemaName: 'public',
    fileVariables: JSON.stringify({
      user_id: 123,
      limit: 10,
      start_date: '2023-01-01',
    }),
  });

  it('1. should suggest columns for a table via alias', async () => {
    const sqlText = `SELECT f.! FROM film f`;
    const { state, pos } = createTestState(sqlText, highlightDialect);

    const result = await getCompletionResult(state, pos, completionSource);
    expect(hasOption(result, 'film_id')).toBe(true);
    expect(hasOption(result, 'title')).toBe(true);
  });

  it('2. should correctly suggest variable using colon prefix', async () => {
    const sqlText = `SELECT * FROM actor WHERE actor_id = :!`;
    const { state, pos } = createTestState(sqlText, highlightDialect);

    const result = await getCompletionResult(state, pos, completionSource);
    expect(hasOption(result, ':user_id')).toBe(true);
    expect(hasOption(result, ':limit')).toBe(true);
  });

  it('3. should provide rich tooltip for variables with their current JSON values', async () => {
    const sqlText = `SELECT :!`;
    const { state, pos } = createTestState(sqlText, highlightDialect);

    const result = await getCompletionResult(state, pos, completionSource);
    const option = getOption(result, ':start_date');

    const tooltip = (option?.info as Function)() as HTMLElement;
    expect(tooltip.textContent).toContain('Variable: start_date');
    expect(tooltip.textContent).toContain('2023-01-01');
  });

  it('4. should suggest multiple aliases if defined in query', async () => {
    const sqlText = `SELECT * FROM actor a JOIN film f ON a.actor_id = f.film_id WHERE f.!`;
    const { state, pos } = createTestState(sqlText, highlightDialect);

    const result = await getCompletionResult(state, pos, completionSource);
    expect(hasOption(result, 'title')).toBe(true);
    expect(hasOption(result, 'actor_id')).toBe(false);
  });

  it('5. should suggest alias columns when used inside an aggregate function', async () => {
    const sqlText = `SELECT MAX(f.!) FROM film f`;
    const { state, pos } = createTestState(sqlText, highlightDialect);

    const result = await getCompletionResult(state, pos, completionSource);
    expect(hasOption(result, 'rental_rate')).toBe(true);
  });

  it('6. should correctly provide tooltips indicating Primary Keys', async () => {
    const sqlText = `SELECT a.! FROM actor a`;
    const { state, pos } = createTestState(sqlText, highlightDialect);

    const result = await getCompletionResult(state, pos, completionSource);
    const option = getOption(result, 'actor_id');
    const tooltip = (option?.info as Function)() as HTMLElement;
    expect(tooltip.textContent).toContain('Primary Key');
  });

  it('7. should correctly provide tooltips indicating Foreign Keys', async () => {
    const sqlText = `SELECT f.! FROM film_actor f`;
    const { state, pos } = createTestState(sqlText, highlightDialect);

    const result = await getCompletionResult(state, pos, completionSource);
    const option = getOption(result, 'film_id');
    const tooltip = (option?.info as Function)() as HTMLElement;
    expect(tooltip.textContent).toContain('FK -> film.film_id');
  });

  it('8. should complete column names with proper type indicators (e.g. timestamp)', async () => {
    const sqlText = `SELECT r.! FROM rental r`;
    const { state, pos } = createTestState(sqlText, highlightDialect);

    const result = await getCompletionResult(state, pos, completionSource);
    const option = getOption(result, 'rental_date');
    expect(option?.detail).toBe('timestamp');
  });

  it('9. should handle table name itself if no alias is used but referenced', async () => {
    const sqlText = `SELECT actor.! FROM actor`;
    const { state, pos } = createTestState(sqlText, highlightDialect);

    const result = await getCompletionResult(state, pos, completionSource);
    expect(hasOption(result, 'actor_id')).toBe(true);
  });

  it('10. should ignore stop words as aliases', async () => {
    const sqlText = `SELECT * FROM actor join !`;
    const { state, pos } = createTestState(sqlText, highlightDialect);
    // Here we make sure 'join' doesn't act as an alias for actor
    const result = await getCompletionResult(state, pos, completionSource);
    expect(result).toBeNull();
  });

  it('11. should support table name with schema prefix', async () => {
    const sqlText = `SELECT p.! FROM public.actor p`;
    const { state, pos } = createTestState(sqlText, highlightDialect);

    const result = await getCompletionResult(state, pos, completionSource);
    expect(hasOption(result, 'actor_id')).toBe(true);
  });

  it('12. should not suggest columns if cursor is before the dot', async () => {
    const sqlText = `SELECT f! FROM film f`;
    const { state, pos } = createTestState(sqlText, highlightDialect);

    const result = await getCompletionResult(state, pos, completionSource);
    expect(result).toBeNull();
  });

  it('13. should handle double quoted table references correctly', async () => {
    const sqlText = `SELECT c.! FROM "customer" c`;
    const { state, pos } = createTestState(sqlText, highlightDialect);

    const result = await getCompletionResult(state, pos, completionSource);
    expect(hasOption(result, 'email')).toBe(true);
  });

  it('14. should not suggest inside strings', async () => {
    const sqlText = `SELECT 'a.! ' FROM actor a`;
    const { state, pos } = createTestState(sqlText, highlightDialect);

    const result = await getCompletionResult(state, pos, completionSource);
    expect(result).toBeNull();
  });

  it('15. should handle alias with trailing spaces', async () => {
    const sqlText = `SELECT f .! FROM film f`;
    const { state, pos } = createTestState(sqlText, highlightDialect);

    const result = await getCompletionResult(state, pos, completionSource);
    expect(hasOption(result, 'release_year')).toBe(true);
  });

  it('16. should provide column completion correctly ordered by ordinal position', async () => {
    const sqlText = `SELECT a.! FROM actor a`;
    const { state, pos } = createTestState(sqlText, highlightDialect);

    const result = await getCompletionResult(state, pos, completionSource);
    expect(result?.options[0].label).toBe('actor_id');
    expect(result?.options[1].label).toBe('first_name');
  });

  it('17. should suggest alias columns inside a nested subquery', async () => {
    const sqlText = `SELECT *
FROM (
  SELECT a.! FROM actor a
) sub`;
    const { state, pos } = createTestState(sqlText, highlightDialect);

    const result = await getCompletionResult(state, pos, completionSource);
    expect(hasOption(result, 'actor_id')).toBe(true);
    expect(hasOption(result, 'first_name')).toBe(true);
  });

  it('18. should resolve outer query aliases inside a correlated subquery', async () => {
    const sqlText = `SELECT *
FROM customer c
WHERE EXISTS (
  SELECT 1
  FROM rental r
  WHERE r.customer_id = c.!
)`;
    const { state, pos } = createTestState(sqlText, highlightDialect);

    const result = await getCompletionResult(state, pos, completionSource);
    expect(hasOption(result, 'customer_id')).toBe(true);
    expect(hasOption(result, 'email')).toBe(true);
    expect(hasOption(result, 'rental_id')).toBe(false);
  });

  it('19. should prefer inner aliases when completion happens inside nested subquery scope', async () => {
    const sqlText = `SELECT *
FROM customer c
WHERE EXISTS (
  SELECT 1
  FROM rental r
  WHERE r.!
)`;
    const { state, pos } = createTestState(sqlText, highlightDialect);

    const result = await getCompletionResult(state, pos, completionSource);
    expect(hasOption(result, 'rental_id')).toBe(true);
    expect(hasOption(result, 'customer_id')).toBe(true);
    expect(hasOption(result, 'email')).toBe(false);
  });

  it('20. should support schema-qualified table aliases inside subqueries', async () => {
    const sqlText = `SELECT *
FROM (
  SELECT a.! FROM public.actor a
) sub`;
    const { state, pos } = createTestState(sqlText, highlightDialect);

    const result = await getCompletionResult(state, pos, completionSource);
    expect(hasOption(result, 'actor_id')).toBe(true);
    expect(hasOption(result, 'last_name')).toBe(true);
  });

  it('21. should not suggest completion inside strings within a subquery', async () => {
    const sqlText = `SELECT *
FROM actor a
WHERE EXISTS (
  SELECT 'r.!'
  FROM rental r
)`;
    const { state, pos } = createTestState(sqlText, highlightDialect);

    const result = await getCompletionResult(state, pos, completionSource);
    expect(result).toBeNull();
  });

  it.todo(
    '22. should resolve derived table aliases from nested subqueries like FROM (SELECT ...) sub'
  );
});
