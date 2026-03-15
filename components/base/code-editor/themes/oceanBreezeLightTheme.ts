import { tags as t } from '@lezer/highlight';
import { createTheme } from 'thememirror';

// ==========================================
// OCEAN BREEZE LIGHT THEME
// ==========================================
// Background:      #f8fafc (Xanh rất nhạt)
// Surface:         #ffffff
// Current Line:    #f1f5f9
// Selection:       #bfdbfe40 (Xanh nhạt)
//
// Foreground:      #1e293b (Slate đậm)
// Muted:           #64748b (Slate nhạt)
//
// Syntax:
// Teal:            #0d9488 (Keywords - thay cho đỏ)
// Blue:            #2563eb (Control flow)
// Indigo:          #4f46e5 (Functions)
// Cyan:            #0891b2 (Types, classes)
// Green:           #059669 (Strings)
// Amber:           #d97706 (Numbers)
// Purple:          #7c3aed (Special vars)
// Rose:            #e11d48 (Chỉ dùng cho errors)

export const oceanBreezeLightTheme = createTheme({
  variant: 'light',

  settings: {
    background: '#f8fafc', // Slate 50 - xanh rất nhạt
    foreground: '#1e293b', // Slate 800

    caret: '#0d9488', // Teal cursor
    selection: '#bfdbfe50', // Blue 200 với alpha
    lineHighlight: '#f1f5f9', // Slate 100

    gutterBackground: '#f8fafc',
    gutterForeground: '#94a3b8', // Slate 400
  },

  styles: [
    // ==========================================
    // COMMENTS - Slate nhạt, italic
    // ==========================================
    {
      tag: t.comment,
      color: '#94a3b8',
      fontStyle: 'italic',
    },

    // ==========================================
    // KEYWORDS - Teal (thay cho đỏ)
    // ==========================================
    {
      tag: [t.keyword, t.controlKeyword],
      color: '#0d9488', // Teal 500
      fontWeight: '500',
    },
    {
      tag: t.moduleKeyword, // import, export
      color: '#0d9488',
      fontWeight: '500',
    },
    {
      tag: t.operatorKeyword, // typeof, instanceof
      color: '#0891b2', // Cyan 500 + italic
      fontStyle: 'italic',
    },

    // ==========================================
    // CONTROL FLOW - Blue (if, else, return,...)
    // ==========================================
    {
      tag: [t.controlKeyword],
      color: '#2563eb', // Blue 500
      fontWeight: '500',
    },

    // ==========================================
    // VARIABLES
    // ==========================================
    {
      tag: t.variableName,
      color: '#334155', // Slate 600
    },
    {
      tag: t.special(t.variableName), // this, self, super
      color: '#7c3aed', // Purple 500 + italic
      fontStyle: 'italic',
      fontWeight: '500',
    },
    {
      tag: t.definition(t.variableName),
      color: '#1e40af', // Blue 800
      fontWeight: '500',
    },

    // ==========================================
    // PROPERTIES - Cyan nhạt
    // ==========================================
    {
      tag: t.propertyName,
      color: '#0891b2', // Cyan 500
    },
    {
      tag: t.attributeName, // HTML attributes
      color: '#059669', // Emerald 500
      fontStyle: 'italic',
    },

    // ==========================================
    // STRINGS - Green (tự nhiên, dễ nhìn)
    // ==========================================
    {
      tag: [t.string, t.special(t.brace)],
      color: '#059669', // Emerald 500
    },
    {
      tag: t.character,
      color: '#059669',
    },
    {
      tag: t.special(t.string), // ${interpolation}
      color: '#0d9488',
      fontWeight: '500',
    },

    // ==========================================
    // NUMBERS - Amber (ấm, không chói)
    // ==========================================
    {
      tag: [t.number, t.unit],
      color: '#d97706', // Amber 500
      fontWeight: '500',
    },
    {
      tag: [t.bool, t.null],
      color: '#4f46e5', // Indigo 500
      fontWeight: '500',
    },
    {
      tag: t.atom,
      color: '#4f46e5',
    },

    // ==========================================
    // FUNCTIONS - Indigo (nổi bật, professional)
    // ==========================================
    {
      tag: t.function(t.variableName),
      color: '#4f46e5', // Indigo 500
      fontWeight: '500',
    },
    {
      tag: t.definition(t.function(t.variableName)),
      color: '#4338ca', // Indigo 600
      fontWeight: '600',
    },
    {
      tag: t.standard(t.name), // Built-in
      color: '#6366f1', // Indigo 500
      fontStyle: 'italic',
    },

    // ==========================================
    // TYPES & CLASSES - Cyan
    // ==========================================
    {
      tag: t.className,
      color: '#0891b2', // Cyan 500
      fontWeight: '600',
    },
    {
      tag: t.typeName,
      color: '#0891b2',
      fontWeight: '500',
    },
    {
      tag: t.definition(t.typeName),
      color: '#0e7490', // Cyan 600
      fontWeight: '600',
    },
    {
      tag: t.special(t.typeName), // Generics <T>
      color: '#d97706', // Amber + italic
      fontStyle: 'italic',
    },

    // ==========================================
    // OPERATORS - Teal nhạt
    // ==========================================
    {
      tag: t.operator,
      color: '#14b8a6', // Teal 500
    },
    {
      tag: t.punctuation,
      color: '#475569', // Slate 500
    },
    {
      tag: [t.bracket, t.angleBracket],
      color: '#94a3b8', // Slate 400
    },

    // ==========================================
    // HTML/XML
    // ==========================================
    {
      tag: t.tagName,
      color: '#059669', // Emerald 500
      fontWeight: '500',
    },
    {
      tag: t.attributeValue,
      color: '#059669',
    },

    // ==========================================
    // CSS
    // ==========================================
    {
      tag: t.color,
      color: '#d97706',
    },

    // ==========================================
    // SQL
    // ==========================================
    {
      tag: t.special(t.variableName),
      color: '#d97706',
      fontStyle: 'italic',
    },

    // ==========================================
    // MARKDOWN
    // ==========================================
    {
      tag: t.heading,
      color: '#0891b2',
      fontWeight: '600',
    },
    {
      tag: t.heading1,
      color: '#0891b2',
      fontWeight: '800',
    },
    {
      tag: t.heading2,
      color: '#0891b2',
      fontWeight: '600',
    },
    {
      tag: t.heading3,
      color: '#4f46e5',
      fontWeight: '500',
    },
    {
      tag: t.link,
      color: '#2563eb',
      textDecoration: 'underline',
    },
    {
      tag: t.url,
      color: '#2563eb',
    },
    {
      tag: t.emphasis,
      color: '#334155',
      fontStyle: 'italic',
    },
    {
      tag: t.strong,
      color: '#0d9488',
      fontWeight: '600',
    },
    {
      tag: t.quote,
      color: '#64748b',
      fontStyle: 'italic',
      borderLeft: '3px solid #cbd5e1',
    },
    {
      tag: t.list,
      color: '#0d9488',
    },

    // ==========================================
    // DIFF
    // ==========================================
    {
      tag: t.inserted,
      color: '#059669',
      backgroundColor: '#d1fae5',
    },
    {
      tag: t.deleted,
      color: '#dc2626', // Đỏ chỉ dùng ở đây
      backgroundColor: '#fee2e2',
    },
    {
      tag: t.changed,
      color: '#d97706',
      backgroundColor: '#fef3c7',
    },

    // ==========================================
    // REGEX & SPECIAL
    // ==========================================
    {
      tag: t.regexp,
      color: '#7c3aed',
      backgroundColor: '#f3e8ff',
    },
    {
      tag: t.escape,
      color: '#0d9488',
      fontWeight: '500',
    },

    // ==========================================
    // DECORATORS
    // ==========================================
    {
      tag: t.annotation,
      color: '#7c3aed',
      fontWeight: '500',
    },
    {
      tag: t.modifier,
      color: '#0d9488',
      fontStyle: 'italic',
    },

    // ==========================================
    // ERRORS (chỗ duy nhất dùng đỏ)
    // ==========================================
    {
      tag: t.invalid,
      color: '#dc2626',
      textDecoration: 'underline wavy #dc2626',
    },
  ],
});
