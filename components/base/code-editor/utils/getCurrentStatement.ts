import { PostgreSQL, sql } from '@codemirror/lang-sql';
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';
import type { SyntaxTreeNodeData } from '../extensions';

const statementParserExtensions = [sql({ dialect: PostgreSQL })];
const parserStateCacheByDoc = new WeakMap<object, EditorState>();

function getStatementTree(view: EditorView, upto: number) {
  const docKey = view.state.doc as unknown as object;
  let parserState = parserStateCacheByDoc.get(docKey);

  if (!parserState) {
    parserState = EditorState.create({
      doc: view.state.doc,
      extensions: statementParserExtensions,
    });
    parserStateCacheByDoc.set(docKey, parserState);
  }

  const ensuredTree = ensureSyntaxTree(parserState, upto, 200);
  if (ensuredTree) {
    return ensuredTree;
  }

  return PostgreSQL.language.parser.parse(view.state.doc.toString());
}

/**
 * Find the statement currently under the user's position in the code editor.
 * @param view The CodeMirror view.
 * @returns The statement currently under the user's position, or undefined if
 *   the user is not currently inside a statement.
 */
export const getCurrentStatement = (view: EditorView) => {
  const selection = view.state.selection.main;
  const { from, to, empty } = selection;
  const tree = getStatementTree(view, view.state.doc.length);

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
        node.from < to &&
        node.to > from
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
