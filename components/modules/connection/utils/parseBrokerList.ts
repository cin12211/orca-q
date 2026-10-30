/** Split "a:9092, b:9092\nc:9092" into a clean broker list. */
export const parseBrokerList = (value: string) =>
  value
    .split(/[\s,]+/)
    .map(item => item.trim())
    .filter(Boolean);
