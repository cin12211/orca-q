import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { describe, it, expect } from 'vitest';
import { pgStringBody } from '../support/pg-connection';

describe('Database Roles API — PostgreSQL', async () => {
  await setup();

  const TEST_ROLE = '_test_api_role';

  // ─── get-roles ────────────────────────────────────────────────────────
  describe('POST /api/database-roles/get-roles', () => {
    it('returns a list of database roles', async () => {
      const res = await $fetch('/api/database-roles/get-roles', {
        method: 'POST',
        body: pgStringBody(),
      });

      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBeGreaterThan(0);

      // Should have at least the orcaq user
      const roleNames = res.map((r: any) =>
        (r.rolname || r.roleName || r.name || '').toLowerCase()
      );
      expect(roleNames).toContain('orcaq');
    });
  });

  // ─── get-role ─────────────────────────────────────────────────────────
  describe('POST /api/database-roles/get-role', () => {
    it('returns details for a specific role', async () => {
      const res = await $fetch('/api/database-roles/get-role', {
        method: 'POST',
        body: { ...pgStringBody(), roleName: 'orcaq' },
      });

      expect(res).toBeDefined();
      const name = (
        res.rolname ||
        res.roleName ||
        res.name ||
        ''
      ).toLowerCase();
      expect(name).toBe('orcaq');
    });
  });

  // ─── create-role → get-role → delete-role lifecycle ───────────────────
  describe('Role lifecycle (create → verify → delete)', () => {
    it('creates a new role', async () => {
      // Cleanup if leftover from previous run
      await $fetch('/api/database-roles/delete-role', {
        method: 'POST',
        body: { ...pgStringBody(), roleName: TEST_ROLE },
        ignoreResponseError: true,
      });

      const res = await $fetch('/api/database-roles/create-role', {
        method: 'POST',
        body: {
          ...pgStringBody(),
          roleName: TEST_ROLE,
          canLogin: true,
          password: 'test_password_123',
        },
      });

      expect(res).toBeDefined();
      expect(res.success).toBe(true);
    });

    it('verifies the created role exists', async () => {
      const res = await $fetch('/api/database-roles/get-role', {
        method: 'POST',
        body: { ...pgStringBody(), roleName: TEST_ROLE },
      });

      expect(res).toBeDefined();
      const name = (
        res.rolname ||
        res.roleName ||
        res.name ||
        ''
      ).toLowerCase();
      expect(name).toBe(TEST_ROLE);
    });

    it('deletes the role', async () => {
      const res = await $fetch('/api/database-roles/delete-role', {
        method: 'POST',
        body: { ...pgStringBody(), roleName: TEST_ROLE },
      });

      expect(res).toBeDefined();
      expect(res.success).toBe(true);
    });
  });

  // ─── get-permissions ─────────────────────────────────────────────────
  describe('POST /api/database-roles/get-permissions', () => {
    it('returns permissions for the orcaq role', async () => {
      const res = await $fetch('/api/database-roles/get-permissions', {
        method: 'POST',
        body: { ...pgStringBody(), roleName: 'orcaq' },
      });

      expect(res).toBeDefined();
    });
  });

  // ─── get-databases ───────────────────────────────────────────────────
  describe('POST /api/database-roles/get-databases', () => {
    it('returns a list of databases', async () => {
      const res = await $fetch('/api/database-roles/get-databases', {
        method: 'POST',
        body: pgStringBody(),
      });

      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBeGreaterThan(0);

      // Should include the pagila database
      const dbNames = res.map((d: any) =>
        (d.databaseName || d.datname || d.name || '').toLowerCase()
      );
      expect(dbNames).toContain('pagila');
    });
  });

  // ─── get-databases-with-permissions ──────────────────────────────────
  describe('POST /api/database-roles/get-databases-with-permissions', () => {
    it('returns databases with permission details for a role', async () => {
      const res = await $fetch(
        '/api/database-roles/get-databases-with-permissions',
        {
          method: 'POST',
          body: { ...pgStringBody(), roleName: 'orcaq' },
        }
      );

      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBeGreaterThan(0);
    });
  });

  // ─── get-schemas ─────────────────────────────────────────────────────
  describe('POST /api/database-roles/get-schemas', () => {
    it('returns a list of schemas', async () => {
      const res = await $fetch('/api/database-roles/get-schemas', {
        method: 'POST',
        body: pgStringBody(),
      });

      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBeGreaterThan(0);

      // Should include "public"
      const schemaNames = res.map((s: any) =>
        (
          s.schema_name ||
          s.schemaName ||
          s.name ||
          s.nspname ||
          ''
        ).toLowerCase()
      );
      expect(schemaNames).toContain('public');
    });
  });

  // ─── get-schema-objects ──────────────────────────────────────────────
  describe('POST /api/database-roles/get-schema-objects', () => {
    it('returns objects in the public schema', async () => {
      const res = await $fetch('/api/database-roles/get-schema-objects', {
        method: 'POST',
        body: { ...pgStringBody(), schemaName: 'public' },
      });

      expect(res).toBeDefined();
      // Should have tables, views, functions, or sequences
      const hasObjects =
        res.tables?.length > 0 ||
        res.views?.length > 0 ||
        res.functions?.length > 0 ||
        (Array.isArray(res) && res.length > 0);
      expect(hasObjects).toBe(true);
    });
  });

  // ─── get-role-inheritance ────────────────────────────────────────────
  describe('POST /api/database-roles/get-role-inheritance', () => {
    it('returns role inheritance tree', async () => {
      const res = await $fetch('/api/database-roles/get-role-inheritance', {
        method: 'POST',
        body: { ...pgStringBody(), roleName: 'orcaq' },
      });

      expect(Array.isArray(res)).toBe(true);
    });
  });

  // ─── grant-permission / revoke-permission ────────────────────────────
  describe('Grant / Revoke permission lifecycle', () => {
    const PERM_ROLE = '_test_perm_role';

    it('creates a role, grants, then revokes a permission', async () => {
      // Cleanup
      await $fetch('/api/database-roles/delete-role', {
        method: 'POST',
        body: { ...pgStringBody(), roleName: PERM_ROLE },
        ignoreResponseError: true,
      });

      // Create
      await $fetch('/api/database-roles/create-role', {
        method: 'POST',
        body: { ...pgStringBody(), roleName: PERM_ROLE },
      });

      // Grant SELECT on actor table
      const grantRes = await $fetch('/api/database-roles/grant-permission', {
        method: 'POST',
        body: {
          ...pgStringBody(),
          roleName: PERM_ROLE,
          objectType: 'table',
          schemaName: 'public',
          objectName: 'actor',
          privileges: ['SELECT'],
        },
      });

      expect(grantRes).toBeDefined();
      expect(grantRes.success).toBe(true);

      // Revoke
      const revokeRes = await $fetch('/api/database-roles/revoke-permission', {
        method: 'POST',
        body: {
          ...pgStringBody(),
          roleName: PERM_ROLE,
          objectType: 'table',
          schemaName: 'public',
          objectName: 'actor',
          privileges: ['SELECT'],
        },
      });

      expect(revokeRes).toBeDefined();
      expect(revokeRes.success).toBe(true);

      // Cleanup
      await $fetch('/api/database-roles/delete-role', {
        method: 'POST',
        body: { ...pgStringBody(), roleName: PERM_ROLE },
        ignoreResponseError: true,
      });
    });
  });

  // ─── grant-bulk-permissions ──────────────────────────────────────────
  describe('POST /api/database-roles/grant-bulk-permissions', () => {
    const BULK_ROLE = '_test_bulk_perm_role';

    it('grants multiple permissions at once', async () => {
      // Cleanup
      await $fetch('/api/database-roles/delete-role', {
        method: 'POST',
        body: { ...pgStringBody(), roleName: BULK_ROLE },
        ignoreResponseError: true,
      });

      // Create role
      await $fetch('/api/database-roles/create-role', {
        method: 'POST',
        body: { ...pgStringBody(), roleName: BULK_ROLE },
      });

      const res = await $fetch('/api/database-roles/grant-bulk-permissions', {
        method: 'POST',
        body: {
          ...pgStringBody(),
          roleName: BULK_ROLE,
          databaseGrants: [],
          schemaGrants: [
            {
              schemaName: 'public',
              objectType: 'table',
              objectName: 'actor',
              privileges: ['SELECT', 'INSERT'],
            },
          ],
        },
      });

      expect(res).toBeDefined();

      // Cleanup
      await $fetch('/api/database-roles/delete-role', {
        method: 'POST',
        body: { ...pgStringBody(), roleName: BULK_ROLE },
        ignoreResponseError: true,
      });
    });
  });
});
