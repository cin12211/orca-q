import type { GraphEdge } from '@vue-flow/core';

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

export const onFocusNode = (nodeId: string) => {
  //TODO:
  // const node = document.getElementById(nodeId);
  // if (node) {
  //   node.scrollIntoView({ behavior: 'smooth', block: 'center' });
  // }
};
