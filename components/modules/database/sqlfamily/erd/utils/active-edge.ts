import type {
  FindNode,
  FitView,
  GetViewport,
  GraphEdge,
  GraphNode,
} from '@vue-flow/core';
import { DEFAULT_FOCUS_DURATION } from '../constants';
import type { ActiveTable, ActiveEdge, LabelTableNode } from '../type';

export const buildNodeHandId = (id: string, handle: string) =>
  `${id}-${handle}`;

export const activeEdgeAnimated = (
  edge: GraphEdge,
  active: boolean,
  activeTable: ActiveTable | null,
  activeEdge: ActiveEdge | null
) => {
  const { id, sourceHandle, targetHandle, sourceNode, targetNode, selectable } =
    edge;

  // Determine if this edge should be animated
  const isEdgeActive =
    active ||
    activeEdge?.edgeId === id ||
    activeTable?.edgeIds.has(id) ||
    false;

  edge.animated = isEdgeActive;

  // Helper to update label state for a node
  const updateLabelState = (
    node: GraphNode | undefined,
    handle: string | undefined,
    condition: boolean
  ) => {
    if (!node || !handle) return;

    if (!node.label) {
      node.label = new Map<string, boolean>();
    }

    const label = node.label as LabelTableNode;

    if (condition) {
      label.set(handle, true);
    } else {
      label.delete(handle);
    }
  };

  // Compute identifiers for matching related columns
  const sourceId = buildNodeHandId(sourceNode?.id!, sourceHandle!);
  const targetId = buildNodeHandId(targetNode?.id!, targetHandle!);

  const isSourceActive =
    isEdgeActive ||
    selectable ||
    activeTable?.relatedColumnIds.has(sourceId) ||
    activeEdge?.sourceId === sourceId ||
    active;
  const isTargetActive =
    isEdgeActive ||
    selectable ||
    activeTable?.relatedColumnIds.has(targetId) ||
    activeEdge?.targetId === targetId ||
    active;

  updateLabelState(sourceNode, sourceHandle!, !!isSourceActive);
  updateLabelState(targetNode, targetHandle!, !!isTargetActive);
};

export const focusNodeById = ({
  findNode,
  fitView,
  getViewport,
  nodeId,
}: {
  nodeId: string;
  getViewport: GetViewport;
  fitView: FitView;
  findNode: FindNode;
}) => {
  const node = findNode(nodeId);

  if (!node) {
    return;
  }

  const currentZoom = getViewport().zoom;

  fitView({
    nodes: [nodeId],
    maxZoom: currentZoom,
    minZoom: currentZoom,
    duration: DEFAULT_FOCUS_DURATION,
  });
};
