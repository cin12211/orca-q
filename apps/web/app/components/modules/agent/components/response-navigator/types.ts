export interface ResponseNavigatorItem {
  id: string;
  type: 'message' | 'tool_call' | 'tool_result';
  element: HTMLElement | null;
  preview?: string;
}

export interface ResponseNavigatorOffset {
  x?: number;
  y?: number;
}
