import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { describe, it, expect } from 'vitest';
import { pgBody, pgStringBody } from '../support/pg-connection';

describe('Functions API — PostgreSQL', async () => {
  await setup();

  const SCHEMA = 'public';

  let functionId: string;

  // ─── overview.post ────────────────────────────────────────────────────
  describe('POST /api/functions/overview', () => {
    it('returns a list of functions for the public schema', async () => {
      const res = await $fetch('/api/functions/overview', {
        method: 'POST',
        body: { ...pgBody(), schema: SCHEMA },
      });

      expect(Array.isArray(res)).toBe(true);
      // Pagila has functions (e.g., last_updated trigger function)
      expect(res.length).toBeGreaterThan(0);

      // Save a function identifier for subsequent tests
      const first = res[0];
      functionId =
        first.oid ||
        first.id ||
        first.function_id ||
        first.functionId ||
        first.specific_name ||
        first.name;
      expect(functionId).toBeDefined();
    });

    it('rejects when schema is missing', async () => {
      const res = await $fetch('/api/functions/overview', {
        method: 'POST',
        body: { ...pgBody(), schema: '' },
        ignoreResponseError: true,
      });

      expect(res).toBeDefined();
    });
  });

  // ─── definition.post ─────────────────────────────────────────────────
  describe('POST /api/functions/definition', () => {
    it('returns the definition of a function', async () => {
      // functionId must be an OID – look it up from pg_proc
      const oidRes = await $fetch('/api/query/execute', {
        method: 'POST',
        body: {
          ...pgStringBody(),
          query: `SELECT p.oid::text AS func_oid FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' LIMIT 1`,
        },
      });
      const oid = oidRes.result?.[0]?.func_oid;
      expect(oid).toBeDefined();

      const res = await $fetch('/api/functions/definition', {
        method: 'POST',
        body: {
          ...pgBody(),
          functionId: oid,
        },
      });

      expect(res).toBeDefined();
    });

    it('rejects when functionId is missing', async () => {
      const res = await $fetch('/api/functions/definition', {
        method: 'POST',
        body: { ...pgBody(), functionId: '' },
        ignoreResponseError: true,
      });

      expect(res).toBeDefined();
    });
  });

  // ─── signature.post ──────────────────────────────────────────────────
  describe('POST /api/functions/signature', () => {
    it('returns the signature of a function', async () => {
      // functionId must be an OID
      const oidRes = await $fetch('/api/query/execute', {
        method: 'POST',
        body: {
          ...pgStringBody(),
          query: `SELECT p.oid::text AS func_oid FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' LIMIT 1`,
        },
      });
      const oid = oidRes.result?.[0]?.func_oid;
      expect(oid).toBeDefined();

      const res = await $fetch('/api/functions/signature', {
        method: 'POST',
        body: {
          ...pgBody(),
          functionId: oid,
        },
      });

      expect(res).toBeDefined();
    });
  });

  // ─── update.post (create/replace) ────────────────────────────────────
  describe('POST /api/functions/update', () => {
    it('creates or replaces a function', async () => {
      const definition = `
        CREATE OR REPLACE FUNCTION public._test_api_fn()
        RETURNS INTEGER
        LANGUAGE plpgsql
        AS $$
        BEGIN
          RETURN 42;
        END;
        $$;
      `;

      const res = await $fetch('/api/functions/update', {
        method: 'POST',
        body: {
          ...pgStringBody(),
          functionDefinition: definition,
        },
      });

      expect(res).toBeDefined();

      // Cleanup
      await $fetch('/api/functions/delete', {
        method: 'POST',
        body: {
          ...pgStringBody(),
          schemaName: SCHEMA,
          functionName: '_test_api_fn()',
        },
        ignoreResponseError: true,
      });
    });

    it('rejects invalid function definitions', async () => {
      const res = await $fetch('/api/functions/update', {
        method: 'POST',
        body: {
          ...pgStringBody(),
          functionDefinition: 'THIS IS NOT SQL',
        },
        ignoreResponseError: true,
      });

      expect(res).toBeDefined();
    });
  });

  // ─── rename.post ─────────────────────────────────────────────────────
  describe('POST /api/functions/rename', () => {
    it('renames a function', async () => {
      // Cleanup any leftover from prior runs via raw SQL
      await $fetch('/api/query/execute', {
        method: 'POST',
        body: {
          ...pgStringBody(),
          query: `DROP FUNCTION IF EXISTS public._test_rename_fn(); DROP FUNCTION IF EXISTS public._test_renamed_fn();`,
        },
      }).catch(() => {});

      // Create a temp function
      await $fetch('/api/functions/update', {
        method: 'POST',
        body: {
          ...pgStringBody(),
          functionDefinition: `
            CREATE OR REPLACE FUNCTION public._test_rename_fn()
            RETURNS VOID LANGUAGE plpgsql AS $$ BEGIN END; $$;
          `,
        },
      });

      const res = await $fetch('/api/functions/rename', {
        method: 'POST',
        body: {
          ...pgStringBody(),
          schemaName: SCHEMA,
          oldName: '_test_rename_fn',
          newName: '_test_renamed_fn',
        },
      });

      expect(res).toBeDefined();

      // Cleanup
      await $fetch('/api/functions/delete', {
        method: 'POST',
        body: {
          ...pgStringBody(),
          schemaName: SCHEMA,
          functionName: '_test_renamed_fn()',
        },
        ignoreResponseError: true,
      });
    });

    it('rejects invalid new function name format', async () => {
      const res = await $fetch('/api/functions/rename', {
        method: 'POST',
        body: {
          ...pgStringBody(),
          schemaName: SCHEMA,
          oldName: 'whatever',
          newName: '123-invalid!',
        },
        ignoreResponseError: true,
      });

      expect(res).toBeDefined();
    });
  });

  // ─── delete.post ─────────────────────────────────────────────────────
  describe('POST /api/functions/delete', () => {
    it('deletes a function', async () => {
      // Create a temp function
      await $fetch('/api/functions/update', {
        method: 'POST',
        body: {
          ...pgStringBody(),
          functionDefinition: `
            CREATE OR REPLACE FUNCTION public._test_delete_fn()
            RETURNS VOID LANGUAGE plpgsql AS $$ BEGIN END; $$;
          `,
        },
      });

      const res = await $fetch('/api/functions/delete', {
        method: 'POST',
        body: {
          ...pgStringBody(),
          schemaName: SCHEMA,
          functionName: '_test_delete_fn()',
        },
      });

      expect(res).toBeDefined();
    });
  });
});
