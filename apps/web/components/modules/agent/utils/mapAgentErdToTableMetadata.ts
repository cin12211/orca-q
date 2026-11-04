import type { TableMetadata } from '~/core/types';
import type { AgentRenderErdResult } from '../types';

/**
 * Converts the agent's lightweight ERD result into the full `TableMetadata[]`
 * format expected by the existing ERD diagram components.
 */
export function mapAgentErdToTableMetadata(
  data: AgentRenderErdResult
): TableMetadata[] {
  return data.nodes.map(node => ({
    id: node.id,
    schema: node.schemaName,
    table: node.tableName,
    rows: 0,
    type: 'table',
    comment: null,
    columns: node.columns.map((col, idx) => ({
      name: col.name,
      ordinal_position: idx + 1,
      short_type_name: col.type,
      type: col.type,
      character_maximum_length: null,
      precision: null,
      nullable: !col.isPrimaryKey,
      default: null,
      collation: null,
      comment: null,
    })),
    foreign_keys: data.edges
      .filter(edge => edge.source === node.id)
      .map(edge => {
        const [refSchema, refTable] = edge.target.split('.');
        return {
          foreign_key_name: edge.id,
          column: edge.sourceColumn,
          reference_schema: refSchema,
          reference_table: refTable,
          reference_column: edge.targetColumn,
          fk_def: '',
        };
      }),
    primary_keys: node.columns
      .filter(col => col.isPrimaryKey)
      .map(col => ({
        column: col.name,
        pk_def: '',
      })),
    indexes: [],
  }));
}
