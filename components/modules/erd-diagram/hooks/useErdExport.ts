import { ref, type Ref } from 'vue';
import { useVueFlow } from '@vue-flow/core';
import type { Edge } from '@vue-flow/core';
import type { TableNode } from '../type';


// ─── Mermaid ────────────────────────────────────────────────────────────────

function buildMermaidText(nodes: TableNode[], edges: Edge[]): string {
  const lines: string[] = ['erDiagram'];

  // Entity definitions
  for (const node of nodes) {
    const { table, columns = [], primary_keys = [] } = node.data;
    const pkSet = new Set(primary_keys.map((pk: { column: string }) => pk.column));
    const safeTable = table.replace(/[^a-zA-Z0-9_]/g, '_');

    lines.push(`  ${safeTable} {`);
    for (const col of columns) {
      const safeName = col.name.replace(/[^a-zA-Z0-9_]/g, '_');
      const safeType = (col.type || 'string')
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .replace(/\s+/g, '_');
      const pk = pkSet.has(col.name) ? ' PK' : '';
      lines.push(`    ${safeType} ${safeName}${pk}`);
    }
    lines.push('  }');
  }

  // Relationships from edges
  const addedRelations = new Set<string>();
  for (const edge of edges) {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    if (!sourceNode || !targetNode) continue;

    const srcTable = sourceNode.data.table.replace(/[^a-zA-Z0-9_]/g, '_');
    const tgtTable = targetNode.data.table.replace(/[^a-zA-Z0-9_]/g, '_');
    const relKey = `${srcTable}--${tgtTable}`;

    if (!addedRelations.has(relKey)) {
      addedRelations.add(relKey);
      lines.push(`  ${srcTable} }o--|| ${tgtTable} : ""`);
    }
  }

  return lines.join('\n');
}

// ─── JSON ────────────────────────────────────────────────────────────────────

function buildJsonData(nodes: TableNode[], edges: Edge[]): string {
  const data = {
    tables: nodes.map(n => ({
      id: n.id,
      table: n.data.table,
      schema: n.data.schema,
      columns: n.data.columns,
      primary_keys: n.data.primary_keys,
      foreign_keys: n.data.foreign_keys,
    })),
    relationships: edges.map(e => ({
      id: e.id,
      source: e.source,
      sourceHandle: e.sourceHandle,
      target: e.target,
      targetHandle: e.targetHandle,
    })),
    meta: {
      exportedAt: new Date().toISOString(),
      tableCount: nodes.length,
      relationCount: edges.length,
    },
  };
  return JSON.stringify(data, null, 2);
}

// ─── Download helper ─────────────────────────────────────────────────────────

function downloadText(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

// ─── Composable ──────────────────────────────────────────────────────────────

export function useErdExport(containerRef?: Ref<HTMLElement | null | { $el?: HTMLElement }>) {
  const { getNodes, getEdges } = useVueFlow();
  const isExporting = ref(false);

  /** Resolves the actual HTMLElement from a ref that may point to a Vue component instance */
  const resolveElement = (): HTMLElement | null => {
    const value = containerRef?.value;
    if (!value) return null;
    if (value instanceof HTMLElement) return value;
    // Vue component instance exposes $el
    const el = (value as { $el?: HTMLElement }).$el;
    return el instanceof HTMLElement ? el : null;
  };

  const getSchemaName = () => {
    const nodes = getNodes.value as TableNode[];
    return nodes[0]?.data?.schema || 'erd';
  };

  // Export as Mermaid (.mmd)
  const exportMermaid = () => {
    const nodes = getNodes.value as TableNode[];
    const edges = getEdges.value;
    const text = buildMermaidText(nodes, edges);
    const schema = getSchemaName();
    downloadText(text, `${schema}-erd.mmd`, 'text/plain');
  };

  // Export as JSON (.json)
  const exportJson = () => {
    const nodes = getNodes.value as TableNode[];
    const edges = getEdges.value;
    const json = buildJsonData(nodes, edges);
    const schema = getSchemaName();
    downloadText(json, `${schema}-erd.json`, 'application/json');
  };

  // Export as PNG image using html2canvas
  const exportImage = async () => {
    const container = resolveElement();
    if (!container) return;

    isExporting.value = true;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(container, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const schema = getSchemaName();
      downloadDataUrl(dataUrl, `${schema}-erd.png`);
    } catch (err) {
      console.error('[ErdExport] image export failed', err);
    } finally {
      isExporting.value = false;
    }
  };

  // Export as PDF via print dialog
  const exportPdf = async () => {
    const container = resolveElement();
    if (!container) return;

    isExporting.value = true;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(container, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png');

      const win = window.open('', '_blank');
      if (!win) return;

      win.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>ERD Diagram</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: white; }
              img { max-width: 100%; height: auto; }
              @media print {
                body { min-height: unset; }
                img { max-width: 100vw; }
              }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" />
            <script>
              window.onload = () => { window.print(); window.close(); }
            <\/script>
          </body>
        </html>
      `);
      win.document.close();
    } catch (err) {
      console.error('[ErdExport] PDF export failed', err);
    } finally {
      isExporting.value = false;
    }
  };

  return {
    isExporting,
    exportMermaid,
    exportJson,
    exportImage,
    exportPdf,
  };
}
