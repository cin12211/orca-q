import type { FindNode, GraphEdge, FitView, GetViewport } from '@vue-flow/core';
import { DEFAULT_FOCUS_DURATION } from '../constants';

export const setAnimatedEdge = (edge: GraphEdge, animated: boolean) => {
  if (edge.sourceNode.selected || edge.targetNode.selected || edge.selected) {
    edge.animated = true;
    return;
  }

  edge.animated = animated;
};

export const onToggleEdgeAnimated = ({
  mapEdgeIds,
  mapNodeIds,
  edges,
}: {
  mapEdgeIds?: Map<string, boolean>;
  mapNodeIds?: Map<string, boolean>;
  edges: GraphEdge[];
}) => {
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];

    const isMatchedSourceNode = mapNodeIds?.has(edge.source);
    const isMatchedTargetNode = mapNodeIds?.has(edge.target);
    const isMatchedEdge = mapEdgeIds?.has(edge.id);

    if (isMatchedSourceNode || isMatchedEdge || isMatchedTargetNode) {
      const active =
        mapNodeIds?.get(edge.source) ||
        mapNodeIds?.get(edge.target) ||
        mapEdgeIds?.get(edge.id) ||
        false;

      setAnimatedEdge(edge, active);
    }
  }
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
