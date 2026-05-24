import type { Meta, StoryObj } from '@storybook/vue3';
import CodeHighlightPreview from './CodeHighlightPreview.vue';

const meta = {
  title: 'Base/CodeHighlightPreview',
  component: CodeHighlightPreview,
  tags: ['autodocs'],
  decorators: [
    () => ({
      template: `
        <div class="max-w-2xl p-4 bg-background border border-border rounded-lg">
          <story />
        </div>
      `,
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: `
### CodeHighlightPreview Component

A syntax highlighter component built on top of **Shiki Core** and custom themes (Catppuccin Latte for light mode, Catppuccin Mocha for dark mode). It supports automatic dark/light mode thematic switching, realistic clipboard copy functionality, scrollable body sizing, and custom range annotations.

- **Supported Languages**: \`sql\`, \`json\`, \`yaml\`, \`xml\`, \`markdown\`, \`html\`, \`bash\`.
- **Integrations**: Integrated with \`useCopyToClipboard\` for copying code with toast/icon/tooltip status feedbacks.
`,
      },
    },
  },
  argTypes: {
    code: {
      description: 'The source code string to be highlighted and rendered',
      control: { type: 'text' },
      table: {
        type: { summary: 'string' },
        category: 'Props',
      },
    },
    language: {
      description: 'The programming language of the source code',
      control: { type: 'select' },
      options: ['sql', 'json', 'yaml', 'xml', 'markdown', 'html', 'bash'],
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: `'sql'` },
        category: 'Props',
      },
    },
    showCopyButton: {
      description:
        'Display a copy-to-clipboard button in the code preview header',
      control: { type: 'boolean' },
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'true' },
        category: 'Props',
      },
    },
    maxHeight: {
      description:
        'CSS max-height value (e.g. `200px`, `16rem`) to make the code panel body scrollable',
      control: { type: 'text' },
      table: {
        type: { summary: 'string' },
        category: 'Props',
      },
    },
    decorations: {
      description:
        'Shiki decoration array for highlighting specific code blocks, line highlights, or error lines',
      control: { type: 'object' },
      table: {
        type: { summary: 'DecorationItem[]' },
        category: 'Props',
      },
    },
  },
  args: {
    language: 'sql',
    showCopyButton: true,
    maxHeight: undefined,
    code: `SELECT 
  u.id, 
  u.first_name, 
  u.email, 
  COUNT(o.id) as total_orders
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.is_active = true 
  AND o.status = 'completed'
GROUP BY u.id
ORDER BY total_orders DESC
LIMIT 10;`,
  },
} satisfies Meta<typeof CodeHighlightPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Standard SQL rendering highlighting common query syntax, joins, groups, and filters.
 */
export const SqlQuery: Story = {
  args: {},
};

/**
 * Pretty JSON output with syntax colors indicating keys, strings, and numeric values.
 */
export const JsonPayload: Story = {
  args: {
    language: 'json',
    code: `{
  "connection": {
    "host": "production-db.internal.net",
    "port": 5432,
    "user": "orca_admin",
    "ssl": {
      "rejectUnauthorized": true,
      "ca": "-----BEGIN CERTIFICATE-----\\nMIIFdzCCBF+gAwIBAgIQC...\\n-----END CERTIFICATE-----"
    }
  },
  "pool": {
    "min": 2,
    "max": 15,
    "idleTimeoutMillis": 30000
  },
  "features": ["read-replicas", "query-caching", "explain-plan"]
}`,
  },
};

/**
 * Code preview displaying installation or configuration commands via bash shell.
 */
export const BashCommands: Story = {
  args: {
    language: 'bash',
    code: `# Install the Orca Query desktop application dependencies
bun install
 
# Build static outputs and compile TypeScript bundles
bun run nuxt:generate && bun run electron:compile
 
# Launch Electron wrapper in desktop development mode
bun run electron:dev --environment=staging`,
  },
};

/**
 * Restricts the height and makes the code pane scrollable. Excellent for query results or log viewers.
 */
export const MaxHeightScroll: Story = {
  args: {
    language: 'sql',
    maxHeight: '180px',
    code: `CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action VARCHAR(100) NOT NULL,
    target_table VARCHAR(100) NOT NULL,
    row_id UUID,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action_table ON audit_logs(action, target_table);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Trigger to record inserts
CREATE OR REPLACE FUNCTION process_audit_logging()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs(actor_id, action, target_table, row_id, old_values, new_values)
    VALUES (
        COALESCE(current_setting('app.current_user_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid),
        TG_OP,
        TG_TABLE_NAME,
        NEW.id,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;`,
  },
};

/**
 * Showcase custom line highlighting decorations in Shiki.
 */
export const WithDecorations: Story = {
  args: {
    language: 'sql',
    decorations: [
      {
        start: { line: 3, character: 0 },
        end: { line: 3, character: 30 },
        properties: {
          class: 'bg-red-500/10 border-l-2 border-red-500 w-full inline-block',
        },
      },
      {
        start: { line: 6, character: 0 },
        end: { line: 6, character: 40 },
        properties: {
          class:
            'bg-yellow-500/10 border-l-2 border-yellow-500 w-full inline-block',
        },
      },
    ],
    code: `SELECT *
FROM accounts
WHERE balance < 0  -- Highlighted line: Potential debt detection
  AND is_frozen = false
  AND risk_score > 90
ORDER BY risk_score DESC;  -- Warn line: High overhead operation`,
  },
};
