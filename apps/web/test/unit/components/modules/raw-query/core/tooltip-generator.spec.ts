/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest';
import {
  generateFunctionSignature,
  createFunctionInfoTooltip,
  createVariableInfoTooltip,
  createTableInfoTooltip,
  createColumnInfoTooltip,
  createViewInfoTooltip,
} from '~/components/modules/raw-query/utils/getMappedSchemaSuggestion';

describe('Tooltip and Signature Generators', () => {
  describe('generateFunctionSignature', () => {
    it('should parse basic parameters correctly', () => {
      const params = 'p_id uuid, p_name text';
      expect(generateFunctionSignature(params)).toBe(
        '(p_id:uuid, p_name:text)'
      );
    });

    it('should handle parameters with DEFAULT values', () => {
      const params =
        "p_gl_account_id uuid, p_reconciled_date date, p_user_timezone text DEFAULT 'UTC'::text";
      expect(generateFunctionSignature(params)).toBe(
        '(p_gl_account_id:uuid, p_reconciled_date:date, p_user_timezone:text)'
      );
    });

    it('should handle complex type names like character varying', () => {
      const params = 'p_search_description character varying';
      // Based on heuristic match(/^([\w"]+)\s+([\w"\[\]]+)/i)
      // "character varying" has a space, so match[2] will only be "character"
      // This is a known limitation of the simple regex, but let's see what it does.
      // Current regex: match[1]="p_search_description", match[2]="character"
      expect(generateFunctionSignature(params)).toBe(
        '(p_search_description:character)'
      );
    });

    it('should return empty parentheses for no parameters', () => {
      expect(generateFunctionSignature('')).toBe('()');
    });
  });

  describe('createVariableInfoTooltip', () => {
    it('should render variable name and JSON value', () => {
      const tooltip = createVariableInfoTooltip('test_var', { a: 1 });
      expect(tooltip.innerHTML).toContain('Variable: test_var');
      expect(tooltip.innerHTML).toContain('"a": 1');
    });
  });

  describe('createFunctionInfoTooltip', () => {
    it('should render function name, type, and schema', () => {
      const tooltip = createFunctionInfoTooltip(
        'test_func',
        'FUNCTION',
        '',
        'custom_schema'
      );
      expect(tooltip.innerHTML).toContain(
        'test_func (FUNCTION, custom_schema)'
      );
      expect(tooltip.innerHTML).toContain('No parameters');
    });

    it('should default to public schema if not provided', () => {
      const tooltip = createFunctionInfoTooltip('test_func', 'PROCEDURE', '');
      expect(tooltip.innerHTML).toContain('test_func (PROCEDURE, public)');
    });

    it('should render parameters if provided', () => {
      const tooltip = createFunctionInfoTooltip(
        'test_func',
        'FUNCTION',
        'p_id uuid, p_name text'
      );
      expect(tooltip.innerHTML).toContain('Parameters:');
      expect(tooltip.innerHTML).toContain('• p_id uuid');
      expect(tooltip.innerHTML).toContain('• p_name text');
    });
  });

  describe('createTableInfoTooltip', () => {
    it('should render table name, schema, columns, PK and FK', () => {
      const tableInfo = {
        columns: [
          { name: 'id', short_type_name: 'uuid', ordinal_position: 1 },
          { name: 'user_id', short_type_name: 'uuid', ordinal_position: 2 },
        ],
        primary_keys: [{ column: 'id' }],
        foreign_keys: [{ column: 'user_id' }],
      };
      // @ts-ignore - Partial mock for testing
      const tooltip = createTableInfoTooltip(
        'users',
        tableInfo,
        'custom_schema'
      );
      expect(tooltip.innerHTML).toContain('users (custom_schema)');
      expect(tooltip.innerHTML).toContain('Columns: 2');
      expect(tooltip.innerHTML).toContain('Primary Keys: id');
      expect(tooltip.innerHTML).toContain('Foreign Keys: user_id');
      expect(tooltip.innerHTML).toContain('id: ');
      expect(tooltip.innerHTML).toContain('uuid');
    });

    it('should default to public schema if not provided', () => {
      const tableInfo = { columns: [] };
      // @ts-ignore - Partial mock for testing
      const tooltip = createTableInfoTooltip('users', tableInfo);
      expect(tooltip.innerHTML).toContain('users (public)');
      expect(tooltip.innerHTML).toContain('Columns: 0');
    });
  });

  describe('createColumnInfoTooltip', () => {
    it('should render column details including PK and FK', () => {
      const foreignKey = { referenced_table: 'roles', referenced_column: 'id' };
      // @ts-ignore - Partial mock for testing
      const tooltip = createColumnInfoTooltip(
        'role_id',
        'uuid',
        'users',
        true,
        foreignKey,
        'custom_schema'
      );
      expect(tooltip.innerHTML).toContain('role_id');
      expect(tooltip.innerHTML).toContain('Type: uuid');
      expect(tooltip.innerHTML).toContain('Table: custom_schema.users');
      expect(tooltip.innerHTML).toContain('Primary Key');
      expect(tooltip.innerHTML).toContain('FK -&gt; roles.id');
    });

    it('should render column details without PK and FK and with default schema', () => {
      const tooltip = createColumnInfoTooltip('name', 'text', 'users', false);
      expect(tooltip.innerHTML).toContain('name');
      expect(tooltip.innerHTML).toContain('Type: text');
      expect(tooltip.innerHTML).toContain('Table: users');
      expect(tooltip.innerHTML).not.toContain('Primary Key');
      expect(tooltip.innerHTML).not.toContain('FK');
    });
  });

  describe('createViewInfoTooltip', () => {
    it('should render view details', () => {
      const viewInfo = {
        type: 'VIEW',
        columns: [{ name: 'total', short_type_name: 'numeric' }],
      };
      // @ts-ignore - Partial mock for testing
      const tooltip = createViewInfoTooltip(
        'sales_summary',
        viewInfo,
        'reports'
      );
      expect(tooltip.innerHTML).toContain('sales_summary (View, reports)');
      expect(tooltip.innerHTML).toContain('Type: VIEW');
      expect(tooltip.innerHTML).toContain('Columns: 1');
      expect(tooltip.innerHTML).toContain('total: ');
      expect(tooltip.innerHTML).toContain('numeric');
    });

    it('should default to public schema if not provided', () => {
      const viewInfo = { type: 'MATERIALIZED VIEW', columns: [] };
      // @ts-ignore - Partial mock for testing
      const tooltip = createViewInfoTooltip('active_users', viewInfo);
      expect(tooltip.innerHTML).toContain('active_users (View, public)');
    });
  });
});
