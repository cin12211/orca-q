import { EditorView } from '@codemirror/view';
import { format, type FormatOptions } from 'sql-formatter';
import { handleFormatCode } from '~/components/base/code-editor/extensions';
import { getCurrentStatement } from '~/components/base/code-editor/utils';

export const formatStatementSql = (
  fileContent: string,
  params?: FormatOptions['params']
) => {
  try {
    const formatted = format(fileContent, {
      language: 'postgresql',
      keywordCase: 'upper',
      linesBetweenQueries: 1,
      functionCase: 'upper',
      newlineBeforeSemicolon: true,
      paramTypes: {
        named: [':'],
      },
      params: params,
    });
    return formatted;
  } catch (error) {
    console.error('🚀 ~ onFormatCode ~ error:', error);
    return fileContent;
  }
};

export function rawQueryEditorFormat({
  getEditorView,
}: {
  getEditorView: () => EditorView | null;
}) {
  const onHandleFormatCurrentStatement = () => {
    const editorView = getEditorView();

    if (!editorView) {
      return;
    }

    const currentSelection = editorView.state.selection.main;
    const { currentStatements } = getCurrentStatement(editorView);

    if (!currentStatements.length) {
      return;
    }

    const firstStatement = currentStatements[0];
    const lastStatement = currentStatements[currentStatements.length - 1];

    const from = Math.min(firstStatement.from, currentSelection.from);
    const to = Math.max(lastStatement.to, currentSelection.to);

    const selectedContent = editorView.state.doc.sliceString(from, to);
    const formattedContent = formatStatementSql(selectedContent);

    if (formattedContent === selectedContent) {
      editorView.focus();
      return;
    }

    if (!currentSelection.empty) {
      editorView.dispatch({
        changes: {
          from,
          to,
          insert: formattedContent,
        },
        selection: {
          anchor: from,
          head: from + formattedContent.length,
        },
        effects: [EditorView.scrollIntoView(from)],
      });

      editorView.focus();
      return;
    }

    const nextCursor = from + Math.max(0, currentSelection.head - from);

    editorView.dispatch({
      changes: {
        from,
        to,
        insert: formattedContent,
      },
      selection: {
        anchor: Math.min(nextCursor, from + formattedContent.length),
        head: Math.min(nextCursor, from + formattedContent.length),
      },
      effects: [EditorView.scrollIntoView(from)],
    });

    editorView.focus();
  };

  const onHandleFormatCode = () => {
    const editorView = getEditorView();

    if (!editorView) {
      return;
    }

    handleFormatCode(editorView, formatStatementSql);
  };

  return {
    onHandleFormatCurrentStatement,
    onHandleFormatCode,
  };
}
