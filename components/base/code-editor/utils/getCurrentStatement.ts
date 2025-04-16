import type { EditorView } from "codemirror";
import type { SyntaxTreeNodeData } from "../extensions";
import { syntaxTree } from "@codemirror/language";

/**
 * Find the statement currently under the user's position in the code editor.
 * @param view The CodeMirror view.
 * @returns The statement currently under the user's position, or undefined if
 *   the user is not currently inside a statement.
 */
export const getCurrentStatement = (view: EditorView) => {
  const tree = syntaxTree(view.state);
  const output: SyntaxTreeNodeData[] = [];

  tree.iterate({
    enter: (node) => {
      const nodeName = node.type.name;
      const nodeText = view.state.doc.sliceString(node.from, node.to);
      output.push({
        type: nodeName,
        from: node.from,
        to: node.to,
        text: nodeText,
      });
    },
  });

  const cursorPos = view.state.selection.main.head;

  const currentStatement = output.find(
    (item) =>
      item.type == "Statement" && cursorPos >= item.from && cursorPos <= item.to
  );

  return currentStatement;
};
