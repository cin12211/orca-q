import { EditorView, keymap } from '@codemirror/view';
import { getCurrentStatement } from '../utils';

function findNearestNodeIndexes(
  nodes: { from: number; to: number; type: string }[],
  pos: number
): { before: number; after: number } {
  let before = 0;
  let after = 0;

  nodes.forEach((node, index) => {
    if (node.from <= pos) {
      before = index;
    }
    if (node.to >= pos && after === 0 && node.type !== 'Statement') {
      after = index;
    }
  });

  return { before, after };
}

function chooseClosestIndex({
  afterFrom,
  beforeTo,
  pos,
}: {
  beforeTo: number;
  afterFrom: number;
  pos: number;
}): 'before' | 'after' {
  const distA = Math.abs(beforeTo - pos);
  const distB = Math.abs(afterFrom - pos);
  if (distA === distB) return 'before'; // default tie-break
  return distA < distB ? 'before' : 'after';
}

export const handleFormatCode = (
  view: EditorView,
  updateFormatOnSave: (fileContent: string) => string
) => {
  const code = view.state.doc.toString();
  if (!code) return true;

  const formattedCode = updateFormatOnSave(code);

  // nothing changed → just refocus
  if (formattedCode === code) {
    view.focus();
    return true;
  }

  const cursorPos = view.state.selection.main.head;
  const { treeNodes: nodesBefore } = getCurrentStatement(view);

  // find closest nodes before and after cursor
  const nearestNodeIndexes = findNearestNodeIndexes(nodesBefore, cursorPos);
  const chosenIndex = chooseClosestIndex({
    beforeTo: nodesBefore[nearestNodeIndexes.before].to,
    afterFrom: nodesBefore[nearestNodeIndexes.after].from,
    pos: cursorPos,
  });

  const nearestNodeIndex =
    chosenIndex === 'before'
      ? nearestNodeIndexes.before
      : nearestNodeIndexes.after;

  // replace doc with formatted code
  view.dispatch({
    changes: {
      from: 0,
      to: view.state.doc.length,
      insert: formattedCode,
    },
  });

  // get new tree and find mapped nearest node
  const { treeNodes: nodesAfter } = getCurrentStatement(view);
  const nearestNode = nodesAfter[nearestNodeIndex];

  // restore cursor position
  const newCursor =
    chosenIndex === 'before' ? nearestNode.to : nearestNode.from;

  view.dispatch({
    selection: { anchor: newCursor, head: newCursor },
  });

  view.focus();
  return true;
};

/**
 * Create a shortcut that formats the current file on save.
 *
 * This extension creates a shortcut that will format the current file
 * when Ctrl-S (or Cmd-S on Mac) is pressed. It calls the provided function
 * with the current file content and then replaces the content with the
 * formatted version.
 *
 * @param updateFormatOnSave - A function that takes a string and returns a
 * formatted string.
 *
 * @returns A keymap extension that can be added to an editor.
 */
export const shortCutFormatOnSave = (
  updateFormatOnSave: (fileContent: string) => string
) =>
  keymap.of([
    {
      key: 'Ctrl-s',
      mac: 'Cmd-s',
      run: (view: EditorView) => {
        return handleFormatCode(view, updateFormatOnSave);
      },
      preventDefault: true,
    },
  ]);
