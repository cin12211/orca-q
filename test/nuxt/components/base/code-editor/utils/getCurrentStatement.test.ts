import { PostgreSQL } from '@codemirror/lang-sql';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { afterEach, describe, expect, it } from 'vitest';
import {
  getCurrentStatement,
  sqlParserConfigField,
  updateSqlParserConfigEffect,
} from '~/components/base/code-editor/utils';

describe('getCurrentStatement', () => {
  const views: EditorView[] = [];

  afterEach(() => {
    while (views.length > 0) {
      views.pop()?.destroy();
    }
  });

  const createView = (doc: string) => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc,
        extensions: [sqlParserConfigField],
      }),
    });

    views.push(view);
    return view;
  };

  it('returns the current Redis command line when parser is in line mode', () => {
    const view = createView('# comment\n  GET user:1  \nSET user:1 value');

    view.dispatch({
      selection: { anchor: 15 },
      effects: [
        updateSqlParserConfigEffect.of({
          dialect: PostgreSQL,
          isEnable: false,
          statementMode: 'line',
        }),
      ],
    });

    expect(getCurrentStatement(view).currentStatements).toEqual([
      {
        type: 'LineStatement',
        from: 12,
        to: 22,
        text: 'GET user:1',
      },
    ]);
  });

  it('collects non-empty Redis command lines across a selection in line mode', () => {
    const view = createView('PING\n\n# ignore\nSET app:mode dev\nINFO');

    view.dispatch({
      selection: { anchor: 0, head: view.state.doc.length },
      effects: [
        updateSqlParserConfigEffect.of({
          dialect: PostgreSQL,
          isEnable: false,
          statementMode: 'line',
        }),
      ],
    });

    expect(getCurrentStatement(view).currentStatements).toEqual([
      {
        type: 'LineStatement',
        from: 0,
        to: 4,
        text: 'PING',
      },
      {
        type: 'LineStatement',
        from: 15,
        to: 31,
        text: 'SET app:mode dev',
      },
      {
        type: 'LineStatement',
        from: 32,
        to: 36,
        text: 'INFO',
      },
    ]);
  });
});
