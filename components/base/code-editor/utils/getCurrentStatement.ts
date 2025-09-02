import { syntaxTree } from '@codemirror/language';
import type { EditorView } from 'codemirror';
import type { SyntaxTreeNodeData } from '../extensions';

/**
 * Find the statement currently under the user's position in the code editor.
 * @param view The CodeMirror view.
 * @returns The statement currently under the user's position, or undefined if
 *   the user is not currently inside a statement.
 */
export const getCurrentStatement = (view: EditorView) => {
  const tree = syntaxTree(view.state);
  const treeNodes: SyntaxTreeNodeData[] = [];

  tree.iterate({
    // from: view.state.selection.main.from,
    // to: view.state.selection.main.to,
    enter: node => {
      const nodeName = node.type.name;
      const nodeText = view.state.doc.sliceString(node.from, node.to);
      treeNodes.push({
        type: nodeName,
        from: node.from,
        to: node.to,
        text: nodeText,
      });
    },
  });

  const cursorFrom = view.state.selection.main.from;
  const cursorTo = view.state.selection.main.to;

  const currentStatements = treeNodes.filter(item => {
    const isStatement = item.type == 'Statement';

    const isCursorInStatement =
      (cursorFrom >= item.from && cursorFrom <= item.to) ||
      (cursorTo >= item.from && cursorTo <= item.to);

    const isStatementInCursor =
      (item.from >= cursorFrom && item.from <= cursorTo) ||
      (item.to >= cursorFrom && item.to <= cursorTo);

    const isOverLapping = isCursorInStatement || isStatementInCursor;

    return isStatement && isOverLapping;
  });
  console.log(
    '🚀 ~ getCurrentStatement ~ currentStatements:',
    currentStatements
  );

  return {
    currentStatements,
    treeNodes,
  };
};

export const getTreeNodes = (view: EditorView) => {
  const tree = syntaxTree(view.state);
  const treeNodes: SyntaxTreeNodeData[] = [];

  tree.iterate({
    enter: node => {
      const nodeName = node.type.name;
      const nodeText = view.state.doc.sliceString(node.from, node.to);
      treeNodes.push({
        type: nodeName,
        from: node.from,
        to: node.to,
        text: nodeText,
      });
    },
  });

  return treeNodes;
};
