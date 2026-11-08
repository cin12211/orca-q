import { ROW_HEIGHT } from '../constants';

export const getHandPosition = (index?: number) => {
  return (index || 0) * ROW_HEIGHT - ROW_HEIGHT / 2 - 1 + 2 + 10 + ROW_HEIGHT;
};
