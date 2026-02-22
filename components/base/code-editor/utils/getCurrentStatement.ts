import { syntaxTree } from '@codemirror/language';
import type { EditorView } from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';
import type { SyntaxTreeNodeData } from '../extensions';

/**
 * Find the statement currently under the user's position in the code editor.
 * @param view The CodeMirror view.
 * @returns The statement currently under the user's position, or undefined if
 *   the user is not currently inside a statement.
 */
// export const getCurrentStatement = (
//   view: EditorView,
//   options?: {
//     includeSelectionRange?: boolean;
//   }
// ) => {
//   const tree = syntaxTree(view.state);
//   const selection = view.state.selection.main;

//   if (options?.includeSelectionRange && !selection.empty) {
//     const currentStatements: SyntaxTreeNodeData[] = [];

//     tree.iterate({
//       enter: node => {
//         if (node.type.name !== 'Statement') {
//           return;
//         }

//         if (node.to <= selection.from || node.from >= selection.to) {
//           return;
//         }

//         currentStatements.push({
//           type: node.type.name,
//           from: node.from,
//           to: node.to,
//           text: view.state.doc.sliceString(node.from, node.to),
//         });
//       },
//     });

//     if (currentStatements.length) {
//       return {
//         currentStatements,
//       };
//     }
//   }

//   const cursorPos = selection.head;

//   let node: SyntaxNode | null = tree.resolveInner(cursorPos, -1);
//   let statementNode: SyntaxNode | null = null;

//   while (node) {
//     if (node.type.name === 'Statement') {
//       statementNode = node;
//       break;
//     }

//     node = node.parent;
//   }

//   if (!statementNode) {
//     return {
//       currentStatements: [],
//     };
//   }

//   const currentStatements: SyntaxTreeNodeData[] = [
//     {
//       type: statementNode.type.name,
//       from: statementNode.from,
//       to: statementNode.to,
//       text: view.state.doc.sliceString(statementNode.from, statementNode.to),
//     },
//   ];

//   return {
//     currentStatements,
//   };
// };

export const getCurrentStatement = (view: EditorView) => {
  const tree = syntaxTree(view.state);
  const selection = view.state.selection.main;
  const { from, to, empty } = selection;

  // Helper to find Statement node at a given position
  const findStatementNode = (pos: number, side: -1 | 1): SyntaxNode | null => {
    let node: SyntaxNode | null = tree.resolveInner(pos, side);
    while (node) {
      if (node.type.name === 'Statement') return node;
      node = node.parent;
    }
    return null;
  };

  // Single cursor — original behavior
  if (empty) {
    const statementNode = findStatementNode(from, -1);
    if (!statementNode) return { currentStatements: [] };

    return {
      currentStatements: [
        {
          type: statementNode.type.name,
          from: statementNode.from,
          to: statementNode.to,
          text: view.state.doc.sliceString(
            statementNode.from,
            statementNode.to
          ),
        },
      ] as SyntaxTreeNodeData[],
    };
  }

  // Range selection — collect all Statement nodes overlapping the selection
  const currentStatements: SyntaxTreeNodeData[] = [];
  const seen = new Set<number>();

  tree.iterate({
    from,
    to,
    enter(node) {
      if (
        node.type.name === 'Statement' &&
        !seen.has(node.from) &&
        node.from < to && // overlaps selection end
        node.to > from // overlaps selection start
      ) {
        seen.add(node.from);
        currentStatements.push({
          type: node.type.name,
          from: node.from,
          to: node.to,
          text: view.state.doc.sliceString(node.from, node.to),
        });
      }
    },
  });

  return { currentStatements };
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
