export const STRUCTURE_TABLE_MAX_HEIGHT_PX = 320;
export const STRUCTURE_TABLE_HEADER_HEIGHT_PX = 34;
export const STRUCTURE_TABLE_ROW_HEIGHT_PX = 24;

export const getStructureTableHeightPx = (rowCount: number): number => {
  if (rowCount <= 0) {
    return STRUCTURE_TABLE_HEADER_HEIGHT_PX;
  }

  return Math.min(
    STRUCTURE_TABLE_MAX_HEIGHT_PX,
    STRUCTURE_TABLE_HEADER_HEIGHT_PX + rowCount * STRUCTURE_TABLE_ROW_HEIGHT_PX
  );
};
