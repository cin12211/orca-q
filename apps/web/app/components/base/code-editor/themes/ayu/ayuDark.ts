import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';

const colors = {
  common: {
    bg: '#0f1419',
    fg: '#bfbdb6',
    accent: '#e6b450',
    error: '#f07178',
    warning: '#ffcc66',
    success: '#7ee787',
    info: '#39bae6',
    ui: '#565b66',
    border: '#11151c',
  },
  syntax: {
    keyword: '#ff8f40',
    operator: '#f29668',
    namespace: '#b8cfe6',
    variable: '#bfbdb6',
    variableConstant: '#39bae6',
    function: '#ffb454',
    string: '#c2d94c',
    stringSpecial: '#95e6cb',
    comment: '#5c6773',
    docComment: '#5c6773',
    number: '#39bae6',
    boolean: '#ff8f40',
    property: '#39bae6',
    type: '#39bae6',
    class: '#39bae6',
    tag: '#39bae6',
    attribute: '#ffb454',
    link: '#39bae6',
    regexp: '#95e6cb',
    escape: '#95e6cb',
  },
  editor: {
    lineHighlight: '#131721',
    selection: '#253340',
    selectionMatch: '#253340',
    gutter: '#0f1419',
    gutterFg: '#5c6773',
    gutterActiveFg: '#bfbdb6',
    gutterBorder: '#11151c',
  },
};

const theme = EditorView.theme(
  {
    '&': {
      backgroundColor: colors.common.bg,
      color: colors.common.fg,
      fontFamily:
        'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
      fontSize: '14px',
      lineHeight: '1.6',
    },
    '.cm-content': { caretColor: colors.common.accent, padding: '10px 0' },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: colors.common.accent,
      borderLeftWidth: '2px',
    },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
      { backgroundColor: colors.editor.selection },
    '.cm-selectionMatch': {
      backgroundColor: colors.editor.selectionMatch,
      outline: `1px solid ${colors.common.ui}40`,
    },
    '.cm-activeLine': { backgroundColor: colors.editor.lineHighlight },
    '.cm-gutters': {
      backgroundColor: colors.editor.gutter,
      color: colors.editor.gutterFg,
      border: 'none',
      borderRight: `1px solid ${colors.editor.gutterBorder}`,
    },
    '.cm-activeLineGutter': {
      backgroundColor: colors.editor.lineHighlight,
      color: colors.editor.gutterActiveFg,
    },
    '.cm-foldPlaceholder': {
      backgroundColor: colors.common.bg,
      border: `1px solid ${colors.common.ui}`,
      color: colors.common.fg,
      borderRadius: '3px',
      padding: '0 4px',
    },
    '.cm-foldGutter span': { color: colors.common.ui, fontSize: '0.8em' },
    '.cm-tooltip': {
      backgroundColor: colors.common.bg,
      border: `1px solid ${colors.common.border}`,
      borderRadius: '4px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
    },
    '.cm-tooltip.cm-tooltip-autocomplete': {
      '& > ul > li': { padding: '4px 12px' },
      '& > ul > li[aria-selected]': {
        backgroundColor: colors.editor.selection,
        color: colors.common.fg,
      },
    },
    '.cm-tooltip.cm-tooltip-hover': {
      padding: '6px 10px',
      backgroundColor: colors.common.bg,
      borderColor: colors.common.border,
    },
    '.cm-searchMatch': {
      backgroundColor: `${colors.common.accent}30`,
      outline: `1px solid ${colors.common.accent}60`,
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: `${colors.common.accent}50`,
    },
    '.cm-panel': {
      backgroundColor: colors.common.bg,
      borderTop: `1px solid ${colors.common.border}`,
    },
    '.cm-button': {
      backgroundColor: colors.common.bg,
      border: `1px solid ${colors.common.ui}`,
      color: colors.common.fg,
      borderRadius: '4px',
      padding: '4px 12px',
      cursor: 'pointer',
      '&:hover': { backgroundColor: colors.editor.lineHighlight },
    },
    '.cm-textfield': {
      backgroundColor: colors.common.bg,
      border: `1px solid ${colors.common.ui}`,
      color: colors.common.fg,
      borderRadius: '4px',
      padding: '4px 8px',
      '&:focus': { outline: `1px solid ${colors.common.accent}` },
    },
    '.cm-diagnostic': {
      '&.cm-diagnostic-error': { color: colors.common.error },
      '&.cm-diagnostic-warning': { color: colors.common.warning },
      '&.cm-diagnostic-info': { color: colors.common.info },
    },
    '.cm-lintRange': {
      '&.cm-lintRange-error': {
        textDecoration: `underline wavy ${colors.common.error}`,
      },
      '&.cm-lintRange-warning': {
        textDecoration: `underline wavy ${colors.common.warning}`,
      },
      '&.cm-lintRange-info': {
        textDecoration: `underline wavy ${colors.common.info}`,
      },
    },
    '.cm-matchingBracket, .cm-nonmatchingBracket': {
      backgroundColor: `${colors.common.accent}20`,
      borderRadius: '2px',
    },
    '.cm-nonmatchingBracket': { backgroundColor: `${colors.common.error}20` },
  },
  { dark: true }
);

const highlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: colors.syntax.keyword, fontWeight: '500' },
  {
    tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName],
    color: colors.syntax.variable,
  },
  {
    tag: [t.function(t.variableName), t.labelName],
    color: colors.syntax.function,
  },
  {
    tag: [t.color, t.constant(t.name), t.standard(t.name)],
    color: colors.syntax.variableConstant,
  },
  { tag: [t.definition(t.name), t.separator], color: colors.syntax.variable },
  {
    tag: [
      t.typeName,
      t.className,
      t.number,
      t.changed,
      t.annotation,
      t.modifier,
      t.self,
      t.namespace,
    ],
    color: colors.syntax.type,
  },
  {
    tag: [
      t.operator,
      t.operatorKeyword,
      t.url,
      t.escape,
      t.regexp,
      t.link,
      t.special(t.string),
    ],
    color: colors.syntax.operator,
  },
  {
    tag: [t.meta, t.comment],
    color: colors.syntax.comment,
    fontStyle: 'italic',
  },
  { tag: t.strong, fontWeight: '500' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, color: colors.syntax.link, textDecoration: 'underline' },
  { tag: t.heading, fontWeight: '500', color: colors.syntax.keyword },
  {
    tag: [t.atom, t.bool, t.special(t.variableName)],
    color: colors.syntax.boolean,
  },
  {
    tag: [t.processingInstruction, t.string, t.inserted],
    color: colors.syntax.string,
  },
  { tag: t.invalid, color: colors.common.error },
  { tag: t.punctuation, color: colors.syntax.variable },
  { tag: t.bracket, color: colors.syntax.variable },
  { tag: t.squareBracket, color: colors.syntax.variable },
  { tag: t.paren, color: colors.syntax.variable },
  { tag: t.angleBracket, color: colors.syntax.variable },
  { tag: t.tagName, color: colors.syntax.tag },
  { tag: t.attributeName, color: colors.syntax.attribute },
  { tag: t.attributeValue, color: colors.syntax.string },
]);

export const ayuDark = [theme, syntaxHighlighting(highlightStyle)];
