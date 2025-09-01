export enum RawQueryEditorLayout {
  horizontal = 'horizontal',
  horizontalWithVariables = 'horizontalWithVariables',
  vertical = 'vertical',
}

export const RawQueryEditorDefaultSize = {
  content: 70,
  variables: 30,
  result: 30,
} as const;
