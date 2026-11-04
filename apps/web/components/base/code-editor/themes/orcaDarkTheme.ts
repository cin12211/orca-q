import { tags as t } from '@lezer/highlight';
import { createTheme } from 'thememirror';

// ==========================================
// DRACULA FRIENDLY THEME
// ==========================================
// Background:      #282a36 (Dracula bg)
// Current Line:    #44475a (Dracula current line)
// Selection:       #44475a80 (Dracula selection + alpha)
// Foreground:      #f8f8f2 (Dracula fg)
// Comment:         #6272a4 (Dracula comment - italic)
// Red:             #ff5555 (Errors, warnings)
// Orange:          #ffb86c (Numbers, constants)
// Yellow:          #f1fa8c (Strings)
// Green:           #50fa7b (Functions, methods)
// Cyan:            #8be9fd (Classes, types, support)
// Purple:          #bd93f9 (Instance reserved words)
// Pink:            #ff79c6 (Keywords, storage)

export const orcaDarkTheme = createTheme({
  variant: 'dark',

  settings: {
    background: '#1e1e1e',
    foreground: '#e4e4e7',

    caret: '#ffffff',

    selection: '#bd93f950',
    lineHighlight: '#44475a40',

    gutterBackground: '#282a36', // Cùng màu bg
    gutterForeground: '#6272a4', // Comment color
  },

  styles: [
    // ==========================================
    // COMMENTS - Italic, muted purple
    // ==========================================
    {
      tag: t.comment,
      color: '#6272a4',
      fontStyle: 'italic',
    },

    // ==========================================
    // KEYWORDS - Pink (điểm nhấn chính)
    // ==========================================
    {
      tag: [t.keyword, t.controlKeyword, t.moduleKeyword],
      color: '#ff79c6', // Pink
      fontWeight: '500',
    },
    {
      tag: t.operatorKeyword, // instanceof, typeof...
      color: '#ff79c6',
      fontStyle: 'italic',
    },

    // ==========================================
    // VARIABLES & PROPERTIES
    // ==========================================
    {
      tag: t.variableName, // Biến thường
      color: '#f8f8f2', // Foreground
    },
    {
      tag: t.special(t.variableName), // this, self, super
      color: '#bd93f9', // Purple + Italic
      fontStyle: 'italic',
      fontWeight: '500',
    },
    {
      tag: t.propertyName, // Thuộc tính object
      color: '#8be9fd', // Cyan
    },

    // ==========================================
    // STRINGS - Yellow (nổi bật)
    // ==========================================
    {
      tag: [t.string, t.special(t.brace)],
      color: '#f1fa8c', // Yellow
    },
    {
      tag: t.character, // Character literal
      color: '#f1fa8c',
    },

    // ==========================================
    // NUMBERS & CONSTANTS - Orange
    // ==========================================
    {
      tag: [t.number, t.unit],
      color: '#ffb86c', // Orange
      fontWeight: '500',
    },
    {
      tag: [t.bool, t.null], // true, false, null
      color: '#ffb86c', // Orange (Dracula style)
      fontWeight: '500',
    },
    {
      tag: t.atom, // undefined, NULL...
      color: '#ffb86c',
    },

    // ==========================================
    // FUNCTIONS - Green (dễ phân biệt)
    // ==========================================
    {
      tag: t.function(t.variableName), // Function calls
      color: '#50fa7b', // Green
      fontWeight: '500',
    },
    {
      tag: t.definition(t.function(t.variableName)), // Function definition
      color: '#50fa7b',
      fontWeight: '500',
    },
    {
      tag: t.standard(t.name), // Built-in functions
      color: '#50fa7b',
      fontStyle: 'italic',
    },

    // ==========================================
    // TYPES & CLASSES - Cyan
    // ==========================================
    {
      tag: t.className, // Class names
      color: '#8be9fd', // Cyan
      fontWeight: '500',
    },
    {
      tag: t.typeName, // Type names
      color: '#8be9fd',
    },
    {
      tag: t.definition(t.typeName), // Type definitions
      color: '#8be9fd',
      fontWeight: '500',
    },
    {
      tag: t.special(t.typeName), // Generic types
      color: '#ffb86c', // Orange Italic (Dracula spec)
      fontStyle: 'italic',
    },

    // ==========================================
    // OPERATORS & PUNCTUATION
    // ==========================================
    {
      tag: t.operator,
      color: '#ff79c6', // Pink (giống keyword)
    },
    {
      tag: t.punctuation,
      color: '#f8f8f2', // Foreground (nhẹ nhàng)
    },
    {
      tag: [t.bracket, t.angleBracket],
      color: '#f8f8f2',
    },
    {
      tag: t.separator, // Dấu phẩy, chấm phẩy
      color: '#f8f8f2',
    },

    // ==========================================
    // HTML/XML SPECIFIC
    // ==========================================
    {
      tag: t.tagName, // <div>, <span>...
      color: '#ff79c6', // Pink
      fontWeight: '500',
    },
    {
      tag: t.attributeName, // class, id, src...
      color: '#50fa7b', // Green
      fontStyle: 'italic',
    },
    {
      tag: t.attributeValue, // "value"
      color: '#f1fa8c', // Yellow
    },

    // ==========================================
    // CSS SPECIFIC
    // ==========================================
    {
      tag: t.color, // #fff, rgb()
      color: '#ffb86c', // Orange
    },

    // ==========================================
    // SQL SPECIFIC (Bonus)
    // ==========================================
    {
      tag: t.special(t.variableName), // @variable
      color: '#ffb86c', // Orange
      fontStyle: 'italic',
    },

    // ==========================================
    // MARKDOWN & DOCUMENTATION
    // ==========================================
    {
      tag: t.heading, // # Header
      color: '#bd93f9', // Purple
      fontWeight: '700',
    },
    {
      tag: t.heading1,
      color: '#bd93f9',
      fontWeight: '700',
    },
    {
      tag: t.heading2,
      color: '#bd93f9',
      fontWeight: '500',
    },
    {
      tag: t.heading3,
      color: '#8be9fd', // Cyan
      fontWeight: '500',
    },
    {
      tag: t.link, // [text](url)
      color: '#8be9fd',
      textDecoration: 'underline',
    },
    {
      tag: t.url, // https://...
      color: '#f1fa8c',
    },
    {
      tag: t.emphasis, // *italic*
      color: '#f8f8f2',
      fontStyle: 'italic',
    },
    {
      tag: t.strong, // **bold**
      color: '#ff79c6',
      fontWeight: '600',
    },
    {
      tag: t.quote, // > quote
      color: '#6272a4',
      fontStyle: 'italic',
    },
    {
      tag: t.list, // - item, 1. item
      color: '#ff79c6',
    },

    // ==========================================
    // DIFF / GIT
    // ==========================================
    {
      tag: t.inserted, // + added
      color: '#50fa7b',
      backgroundColor: '#50fa7b20',
    },
    {
      tag: t.deleted, // - removed
      color: '#ff5555',
      backgroundColor: '#ff555520',
    },
    {
      tag: t.changed, // ~ modified
      color: '#ffb86c',
      backgroundColor: '#ffb86c20',
    },

    // ==========================================
    // REGEX & SPECIAL
    // ==========================================
    {
      tag: t.regexp, // /regex/
      color: '#f1fa8c',
    },
    {
      tag: t.escape, // \n, \t...
      color: '#ff79c6',
      fontWeight: '500',
    },
    {
      tag: t.special(t.string), // ${interpolation}
      color: '#ff79c6',
    },

    // ==========================================
    // META & INVALID
    // ==========================================
    {
      tag: t.meta, // Metadata
      color: '#6272a4',
    },
    {
      tag: t.invalid, // Lỗi syntax
      color: '#ff5555',
      textDecoration: 'underline wavy',
    },
  ],
});
