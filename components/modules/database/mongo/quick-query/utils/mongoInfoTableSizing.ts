export const MONGO_INFO_TABLE_MAX_HEIGHT_PX = 320;
const MONGO_INFO_TABLE_HEADER_HEIGHT_PX = 34;
const MONGO_INFO_TABLE_ROW_HEIGHT_PX = 24;

export const getMongoInfoTableHeightPx = (rowCount: number): number => {
  if (rowCount <= 0) {
    return MONGO_INFO_TABLE_HEADER_HEIGHT_PX;
  }

  return Math.min(
    MONGO_INFO_TABLE_MAX_HEIGHT_PX,
    MONGO_INFO_TABLE_HEADER_HEIGHT_PX +
      rowCount * MONGO_INFO_TABLE_ROW_HEIGHT_PX
  );
};
