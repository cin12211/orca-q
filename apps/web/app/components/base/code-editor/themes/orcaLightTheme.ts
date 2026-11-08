import { tags as t } from '@lezer/highlight';
import { createTheme } from 'thememirror';

// ==========================================
// FRIENDLY LIGHT THEME
// ==========================================
// Background:      #fafafa (Warm white - không gắt như #ffffff)
// Surface:         #ffffff (Pure white cho panels)
// Current Line:    #f0f0f0 (Nhẹ nhàng)
// Selection:       #b6d7f840 (Xanh nhạt trong suốt)
// Border:          #e1e4e8 (Xám nhạt)
//
// Foreground:      #24292e (Gần đen, không gắt #000)
// Muted:           #6a737d (Xám đọc được)
//
// Syntax Colors:
// Red:             #d73a49 (Keywords, operators)
// Orange:          #e36209 (Numbers, constants)
// Yellow:          #f9c513 (Strings - ấm hơn)
// Green:           #22863a (Functions, success)
// Teal:            #1b7c83 (Types, classes)
// Blue:            #0366d6 (Links, important)
// Purple:          #6f42c1 (Special words, constants)
// Pink:            #d73a9e (Decorators, tags)

export const orcaLightTheme = createTheme({
  variant: 'light',

  settings: {
    // Background & Base
    background: '#fafafa', // Warm white - dễ nhìn hơn #fff
    foreground: '#24292e', // Soft black - không gắt

    // Cursor & Selection
    caret: '#24292e', // Dark caret
    selection: '#0366d625', // Blue nhạt, trong suốt
    lineHighlight: '#f0f0f0', // Line hiện tại nhẹ nhàng

    // Gutter
    gutterBackground: '#fafafa', // Cùng màu bg
    gutterForeground: '#959da5', // Xám nhạt
  },

  styles: [
    // ==========================================
    // COMMENTS - Muted, italic
    // ==========================================
    {
      tag: t.comment,
      color: '#6a737d', // Xám đọc được
      fontStyle: 'italic',
    },

    // ==========================================
    // KEYWORDS - Red đỏ nhạt (dễ nhận biết)
    // ==========================================
    {
      tag: [t.keyword, t.controlKeyword],
      color: '#d73a49', // Red
      fontWeight: '500',
    },
    {
      tag: t.moduleKeyword, // import, export, from...
      color: '#d73a49',
      fontWeight: '500',
    },
    {
      tag: t.operatorKeyword, // typeof, instanceof...
      color: '#d73a49',
      fontStyle: 'italic',
    },

    // ==========================================
    // VARIABLES & NAMES
    // ==========================================
    {
      tag: t.variableName, // Biến thường
      color: '#24292e', // Foreground
    },
    {
      tag: t.special(t.variableName), // this, self, super
      color: '#6f42c1', // Purple + italic
      fontStyle: 'italic',
      fontWeight: '500',
    },
    {
      tag: t.definition(t.variableName), // Variable declaration
      color: '#24292e',
      fontWeight: '500',
    },

    // ==========================================
    // PROPERTIES & FIELDS
    // ==========================================
    {
      tag: t.propertyName, // obj.property
      color: '#1b7c83', // Teal - dễ phân biệt
    },
    {
      tag: t.attributeName, // HTML attributes
      color: '#22863a', // Green
      fontStyle: 'italic',
    },

    // ==========================================
    // STRINGS - Vàng ấm (không chói)
    // ==========================================
    {
      tag: [t.string, t.special(t.brace)],
      color: '#b35900', // Nâu cam - dễ đọc hơn vàng chói
    },
    {
      tag: t.character, // 'c'
      color: '#b35900',
    },
    {
      tag: t.special(t.string), // ${interpolation}
      color: '#d73a49',
      fontWeight: '500',
    },

    // ==========================================
    // NUMBERS & CONSTANTS - Orange
    // ==========================================
    {
      tag: [t.number, t.unit],
      color: '#e36209', // Orange
      fontWeight: '500',
    },
    {
      tag: [t.bool, t.null], // true, false, null
      color: '#005cc5', // Blue (giống VS Code)
      fontWeight: '500',
    },
    {
      tag: t.atom, // undefined, NaN...
      color: '#005cc5',
    },

    // ==========================================
    // FUNCTIONS - Green (dễ phân biệt)
    // ==========================================
    {
      tag: t.function(t.variableName), // Function calls
      color: '#22863a', // Green
      fontWeight: '500',
    },
    {
      tag: t.definition(t.function(t.variableName)), // function name()
      color: '#6f42c1', // Purple cho definition
      fontWeight: '600',
    },
    {
      tag: t.standard(t.name), // Built-in (console, Math...)
      color: '#22863a',
      fontStyle: 'italic',
    },

    // ==========================================
    // TYPES & CLASSES - Teal/Cyan
    // ==========================================
    {
      tag: t.className, // Class names
      color: '#1b7c83', // Teal
      fontWeight: '600',
    },
    {
      tag: t.typeName, // TypeScript types
      color: '#1b7c83',
      fontWeight: '500',
    },
    {
      tag: t.definition(t.typeName), // type, interface
      color: '#1b7c83',
      fontWeight: '600',
    },
    {
      tag: t.special(t.typeName), // Generics <T>
      color: '#e36209', // Orange + italic
      fontStyle: 'italic',
    },

    // ==========================================
    // OPERATORS & PUNCTUATION
    // ==========================================
    {
      tag: t.operator,
      color: '#d73a49', // Red giống keywords
    },
    {
      tag: t.punctuation,
      color: '#24292e', // Foreground nhẹ
    },
    {
      tag: [t.bracket, t.angleBracket],
      color: '#6a737d', // Xám - không gây mất tập trung
    },
    {
      tag: t.separator,
      color: '#6a737d',
    },

    // ==========================================
    // HTML/XML
    // ==========================================
    {
      tag: t.tagName, // <div>, <span>
      color: '#22863a', // Green
      fontWeight: '500',
    },
    {
      tag: t.attributeValue, // "value"
      color: '#b35900',
    },

    // ==========================================
    // CSS
    // ==========================================
    {
      tag: t.color, // #fff, rgb()
      color: '#e36209',
    },
    {
      tag: t.unit, // px, em, rem
      color: '#005cc5',
    },

    // ==========================================
    // SQL SPECIFIC
    // ==========================================
    {
      tag: t.special(t.variableName), // @variable
      color: '#e36209',
      fontStyle: 'italic',
    },

    // ==========================================
    // MARKDOWN
    // ==========================================
    {
      tag: t.heading, // # H1
      color: '#1b7c83', // Teal
      fontWeight: '600',
    },
    {
      tag: t.heading1,
      color: '#1b7c83',
      fontWeight: '800',
    },
    {
      tag: t.heading2,
      color: '#1b7c83',
      fontWeight: '600',
    },
    {
      tag: t.heading3,
      color: '#6f42c1', // Purple
      fontWeight: '500',
    },
    {
      tag: t.link, // [text](url)
      color: '#0366d6', // Link blue
      textDecoration: 'underline',
    },
    {
      tag: t.url, // https://...
      color: '#0366d6',
    },
    {
      tag: t.emphasis, // *italic*
      color: '#24292e',
      fontStyle: 'italic',
    },
    {
      tag: t.strong, // **bold**
      color: '#d73a49',
      fontWeight: '600',
    },
    {
      tag: t.quote, // > quote
      color: '#6a737d',
      borderLeft: '3px solid #e1e4e8',
      paddingLeft: '1em',
    },
    {
      tag: t.list, // - item
      color: '#d73a49',
    },

    // ==========================================
    // DIFF / GIT
    // ==========================================
    {
      tag: t.inserted, // + added
      color: '#22863a',
      backgroundColor: '#f0fff4',
    },
    {
      tag: t.deleted, // - removed
      color: '#d73a49',
      backgroundColor: '#ffeef0',
    },
    {
      tag: t.changed, // ~ modified
      color: '#e36209',
      backgroundColor: '#fff5eb',
    },

    // ==========================================
    // REGEX & SPECIAL
    // ==========================================
    {
      tag: t.regexp, // /regex/
      color: '#032f62', // Dark blue
      backgroundColor: '#fff5eb',
    },
    {
      tag: t.escape, // \n, \t
      color: '#d73a49',
      fontWeight: '500',
    },

    // ==========================================
    // DECORATORS & ANNOTATIONS
    // ==========================================
    {
      tag: t.annotation, // @decorator
      color: '#6f42c1', // Purple
      fontWeight: '500',
    },
    {
      tag: t.modifier, // public, private, static...
      color: '#d73a49',
      fontStyle: 'italic',
    },

    // ==========================================
    // META & INVALID
    // ==========================================
    {
      tag: t.meta, // Metadata
      color: '#6a737d',
    },
    {
      tag: t.invalid, // Syntax error
      color: '#d73a49',
      textDecoration: 'underline wavy #d73a49',
    },
  ],
});
