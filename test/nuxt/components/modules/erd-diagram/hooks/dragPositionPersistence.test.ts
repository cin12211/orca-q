import { createApp, defineComponent, h, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { useErdFlow } from '~/components/modules/erd-diagram/hooks/useErdControl';
import { useExpandableErd } from '~/components/modules/erd-diagram/hooks/useExpandableErd';
import type { ErdDiagramProps } from '~/components/modules/erd-diagram/type';
import type { TableMetadata } from '~/core/types';

// ---------------------------------------------------------------------------
// withSetup helper — provides component context for composables (useVueFlow)
// ---------------------------------------------------------------------------

function withSetup<T>(composable: () => T): T {
  let result!: T;
  const app = createApp(
    defineComponent({
      setup() {
        result = composable();
        return () => h('div');
      },
    })
  );
  app.mount(document.createElement('div'));
  return result;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const buildTable = (
  overrides: Partial<TableMetadata> & { schema: string; table: string }
): TableMetadata => ({
  id: `${overrides.schema}.${overrides.table}`,
  schema: overrides.schema,
  table: overrides.table,
  rows: 0,
  type: 'table',
  comment: null,
  columns: overrides.columns ?? [
    {
      name: 'id',
      ordinal_position: 1,
      type: 'int',
      character_maximum_length: null,
      precision: null,
      nullable: false,
      default: null,
      collation: null,
      comment: null,
    },
  ],
  foreign_keys: overrides.foreign_keys ?? [],
  primary_keys: overrides.primary_keys ?? [{ column: 'id', pk_def: '' }],
  indexes: overrides.indexes ?? [],
});

const buildFixtureTables = (): TableMetadata[] => {
  const customers = buildTable({ schema: 'public', table: 'customers' });
  const orders = buildTable({
    schema: 'public',
    table: 'orders',
    foreign_keys: [
      {
        foreign_key_name: 'fk_orders_customer',
        column: 'customer_id',
        reference_schema: 'public',
        reference_table: 'customers',
        reference_column: 'id',
        fk_def: '',
      },
    ],
  });

  return [customers, orders];
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ERD drag position persistence across collapse-header toggle', () => {
  it('keeps a dragged node position after toggling another node collapse header', () => {
    const allTables = ref(buildFixtureTables());
    const initialTableId = ref<string | undefined>('public.orders');

    const { visibleNodes, toggleCollapseHeader, updateNodePosition } =
      useExpandableErd({ allTables, initialTableId, autoExpandInitial: true });

    const draggedNodeId = 'public.customers';
    const originalPosition = visibleNodes.value.find(
      n => n.id === draggedNodeId
    )?.position;
    expect(originalPosition).toBeDefined();

    // Simulate a drag: the user moves the customers node.
    const draggedPosition = { x: 987, y: 654 };
    updateNodePosition(draggedNodeId, draggedPosition);

    // The drag alone must already be reflected in visibleNodes.
    expect(
      visibleNodes.value.find(n => n.id === draggedNodeId)?.position
    ).toEqual(draggedPosition);

    // Toggle the *other* node's header collapse state. This forces
    // visibleNodes to fully rebuild (collapsedHeaderTables is a dependency),
    // which is exactly the trigger that used to discard the drag.
    toggleCollapseHeader('public.orders');

    const nodeAfterToggle = visibleNodes.value.find(
      n => n.id === draggedNodeId
    );
    expect(nodeAfterToggle?.position).toEqual(draggedPosition);
    expect(nodeAfterToggle?.position).not.toEqual(originalPosition);
  });

  it('discards the drag override once clearDraggedPositions runs (Arrange reset)', () => {
    const allTables = ref(buildFixtureTables());
    const initialTableId = ref<string | undefined>('public.orders');

    const {
      visibleNodes,
      toggleCollapseHeader,
      updateNodePosition,
      clearDraggedPositions,
    } = useExpandableErd({
      allTables,
      initialTableId,
      autoExpandInitial: true,
    });

    const draggedNodeId = 'public.customers';
    const originalPosition = visibleNodes.value.find(
      n => n.id === draggedNodeId
    )?.position;

    updateNodePosition(draggedNodeId, { x: 111, y: 222 });
    expect(
      visibleNodes.value.find(n => n.id === draggedNodeId)?.position
    ).toEqual({ x: 111, y: 222 });

    // Simulate what onArrangeDiagram triggers: drop the drag override.
    clearDraggedPositions();

    // A later recompute (collapse toggle) must not resurrect the discarded
    // drag — it should fall back to the originally-computed layout.
    toggleCollapseHeader('public.orders');

    expect(
      visibleNodes.value.find(n => n.id === draggedNodeId)?.position
    ).toEqual(originalPosition);
  });

  it('writes dragged positions back via onNodesChange position-type changes', () => {
    const received: Array<{
      tableId: string;
      position: { x: number; y: number };
    }> = [];

    const props: ErdDiagramProps = {
      nodes: [],
      edges: [],
      isShowFilter: false,
      tables: [],
    };

    const { onNodesChange } = withSetup(() =>
      useErdFlow(props, {
        onNodePositionChange: (tableId, position) => {
          received.push({ tableId, position });
        },
      })
    );

    onNodesChange([
      {
        id: 'public.customers',
        type: 'position',
        position: { x: 42, y: 84 },
        from: { x: 0, y: 0 },
        dragging: true,
      },
    ]);

    expect(received).toEqual([
      { tableId: 'public.customers', position: { x: 42, y: 84 } },
    ]);
  });

  it('does not call the position callback for non-position node changes', () => {
    const received: Array<{
      tableId: string;
      position: { x: number; y: number };
    }> = [];

    const props: ErdDiagramProps = {
      nodes: [],
      edges: [],
      isShowFilter: false,
      tables: [],
    };

    const { onNodesChange } = withSetup(() =>
      useErdFlow(props, {
        onNodePositionChange: (tableId, position) => {
          received.push({ tableId, position });
        },
      })
    );

    onNodesChange([{ id: 'public.customers', type: 'select', selected: true }]);

    expect(received).toEqual([]);
  });
});
