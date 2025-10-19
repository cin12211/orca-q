import { ref } from 'vue';
import {
  useVueFlow,
  type EdgeChange,
  type EdgeMouseEvent,
  type NodeChange,
  type NodeMouseEvent,
  type NodeSelectionChange,
  type VueFlowStore,
} from '@vue-flow/core';
import type {
  ActiveEdge,
  ActiveTable,
  BackGroundGridStatus,
  ErdDiagramProps,
} from '../type';
import { activeEdgeAnimated, buildNodeHandId, focusNodeById } from '../utils';

export function useErdFlow(props: ErdDiagramProps) {
  const isHand = ref(false);
  const isUseMiniMap = ref(true);
  const isUseBgGrid = ref<BackGroundGridStatus>('dots');

  const activeTable = ref<ActiveTable | null>({
    tableId: '',
    relatedColumnIds: new Set<string>(),
    edgeIds: new Set<string>(),
  });

  const activeEdge = ref<ActiveEdge | null>({
    edgeId: '',
    sourceId: '',
    targetId: '',
  });

  const { getEdges, findEdge, findNode, fitView, getViewport, getNodes } =
    useVueFlow();

  const onInitVueFlow = (instance: VueFlowStore) => {
    if (!props.focusTableId) return;

    const node = instance.findNode(props.focusTableId);
    if (!node) return;

    const edgeIds = new Set<string>();
    const relatedColumnIds = new Set<string>();
    const isSelected = true;

    node.selected = true;

    getEdges.value.forEach(edge => {
      if (edge.sourceNode.id === node.id || edge.targetNode.id === node.id) {
        const sourceId = buildNodeHandId(
          edge.sourceNode.id!,
          edge.sourceHandle!
        );
        const targetId = buildNodeHandId(
          edge.targetNode.id!,
          edge.targetHandle!
        );

        relatedColumnIds.add(sourceId);
        relatedColumnIds.add(targetId);
        edgeIds.add(edge.id);

        activeEdgeAnimated(
          edge,
          isSelected,
          activeTable.value,
          activeEdge.value
        );
      }
    });

    activeTable.value = { tableId: node.id, edgeIds, relatedColumnIds };
  };

  const onNodesChange = (nodes: NodeChange[]) => {
    const orderedNodes = (nodes as NodeSelectionChange[]).sort(
      (a, b) => Number(a.selected) - Number(b.selected) // false first
    );

    orderedNodes.forEach(node => {
      if (node.type !== 'select') return;

      const isSelected = node.selected;
      getEdges.value.forEach(edge => {
        const connected =
          edge.sourceNode.id === node.id || edge.targetNode.id === node.id;
        if (!connected) return;

        const sourceId = buildNodeHandId(
          edge.sourceNode.id!,
          edge.sourceHandle!
        );
        const targetId = buildNodeHandId(
          edge.targetNode.id!,
          edge.targetHandle!
        );

        if (isSelected) {
          activeTable.value?.relatedColumnIds.add(sourceId);
          activeTable.value?.relatedColumnIds.add(targetId);
          activeTable.value?.edgeIds.add(edge.id);
        } else {
          activeTable.value?.relatedColumnIds.delete(sourceId);
          activeTable.value?.relatedColumnIds.delete(targetId);
          activeTable.value?.edgeIds.delete(edge.id);
        }

        activeEdgeAnimated(
          edge,
          isSelected,
          activeTable.value,
          activeEdge.value
        );
      });
    });
  };

  const onEdgesChange = (edgeChanges: EdgeChange[]) => {
    edgeChanges.forEach(edge => {
      if (edge.type !== 'select') return;

      const edgeGraph = findEdge(edge.id);
      if (!edgeGraph) return;

      const isSelected = edge.selected;
      const sourceId = buildNodeHandId(
        edgeGraph.sourceNode.id!,
        edgeGraph.sourceHandle!
      );
      const targetId = buildNodeHandId(
        edgeGraph.targetNode.id!,
        edgeGraph.targetHandle!
      );

      activeEdge.value = isSelected
        ? { edgeId: edge.id, sourceId, targetId }
        : null;

      activeEdgeAnimated(
        edgeGraph,
        isSelected,
        activeTable.value,
        activeEdge.value
      );
    });
  };

  const onNodeMouseEnter = ({ node }: NodeMouseEvent) => {
    if (node.selected) return;

    getEdges.value.forEach(edge => {
      if (edge.sourceNode.id === node.id || edge.targetNode.id === node.id) {
        activeEdgeAnimated(edge, true, activeTable.value, activeEdge.value);
      }
    });
  };

  const onNodeMouseLeave = ({ node }: NodeMouseEvent) => {
    if (node.selected) return;

    getEdges.value.forEach(edge => {
      if (edge.sourceNode.id === node.id || edge.targetNode.id === node.id) {
        activeEdgeAnimated(edge, false, activeTable.value, activeEdge.value);
      }
    });
  };

  const handleEdgeMouseEnter = ({ edge }: EdgeMouseEvent) => {
    if (!edge.selected)
      activeEdgeAnimated(edge, true, activeTable.value, activeEdge.value);
  };

  const handleEdgeMouseLeave = ({ edge }: EdgeMouseEvent) => {
    if (!edge.selected)
      activeEdgeAnimated(edge, false, activeTable.value, activeEdge.value);
  };

  const onDoubleClickEdge = ({ edge }: EdgeMouseEvent) => {
    edge.selected = true;

    focusNodeById({
      nodeId: edge.source,
      findNode,
      fitView,
      getViewport,
    });
  };

  const onfocusNode = (nodeId: string) => {
    focusNodeById({
      nodeId,
      findNode,
      fitView,
      getViewport,
    });

    const node = findNode(nodeId);

    if (!node) {
      return;
    }

    node.selected = true;

    onNodesChange([
      {
        id: nodeId,
        type: 'select',
        selected: true,
      },
    ]);
  };

  return {
    isUseBgGrid,
    isUseMiniMap,
    isHand,
    activeTable,
    activeEdge,
    onInitVueFlow,
    onNodesChange,
    onEdgesChange,
    onNodeMouseEnter,
    onNodeMouseLeave,
    handleEdgeMouseEnter,
    handleEdgeMouseLeave,
    onDoubleClickEdge,
    getNodes,
    fitView,
    onfocusNode,
  };
}
