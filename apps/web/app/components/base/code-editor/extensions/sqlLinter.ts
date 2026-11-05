import { syntaxTree } from '@codemirror/language';
import { linter, type Diagnostic } from '@codemirror/lint';
import { PostgreSQL as PostgreSQLParser } from 'dt-sql-parser';

const pgParser = new PostgreSQLParser();

interface CustomRule {
  regex: RegExp;
  message: string;
  severity: Diagnostic['severity'];
}

const customRules: CustomRule[] = [
  {
    regex: /DROP\s+TABLE/gi,
    message: 'Forbidden operation: DROP TABLE',
    severity: 'warning',
  },
  {
    regex: /SELECT\s+\*/gi,
    message: 'Consider specifying columns instead of using SELECT *',
    severity: 'info',
  },
];

//TODO: close to slow to usage
export function sqlLinter() {
  return linter(view => {
    const tree = syntaxTree(view.state);
    const doc = view.state.doc.toString();
    const diagnostics: Diagnostic[] = [];

    // -----------------------------
    // 1. Regex-based document checks
    // -----------------------------

    const applyRegexRules = () => {
      customRules.forEach(rule => {
        let match: RegExpExecArray | null;
        while ((match = rule.regex.exec(doc)) !== null) {
          diagnostics.push({
            from: match.index,
            to: match.index + match[0].length,
            severity: rule.severity,
            message: rule.message,
          });
        }
      });
    };

    // -----------------------------
    // 2. AST-based statement checks
    // -----------------------------
    const applyASTRules = () => {
      tree.iterate({
        enter: node => {
          if (node.type.name !== 'Statement') return;

          const rawNodeText = view.state.doc.sliceString(node.from, node.to);

          let nodeText = rawNodeText.replaceAll('\n', ' ');

          // TODO: refection with schema to validation table
          //   const entities = pgParser.getAllEntities(nodeText);
          // const errors = pgParser.validate(nodeText);
          const tokens = pgParser.getAllTokens(nodeText);

          const hasDelete = tokens.some(t => t.text === 'DELETE');
          const hasWhere = tokens.some(t => t.text === 'WHERE');

          if (hasDelete && !hasWhere) {
            diagnostics.push({
              from: node.from,
              to: node.to,
              severity: 'warning',
              message: 'DELETE statement requires a WHERE clause',
            });
          }
        },
      });
    };

    // Run checks
    applyRegexRules();
    applyASTRules();

    return diagnostics;
  });
}
