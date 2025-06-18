export interface Position {
  x: number;
  y: number;
}

export interface TableData {
  table: string;
  foreign_keys: ForeignKey[];
  [key: string]: any;
}

export interface ForeignKey {
  column: string;
  reference_table: string;
}

export interface TableNode {
  id: string;
  type: string;
  position: Position;
  data: { value: TableData };
}

export interface Edge {
  id: string;
  type: string;
  source: string;
  target: string;
  sourceHandle: string;
}
