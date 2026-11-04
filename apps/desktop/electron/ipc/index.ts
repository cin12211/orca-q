import { registerPersistHandlers } from './persist';
import { registerUpdaterHandlers, registerWindowHandlers } from './window';

export function registerAllIpcHandlers(
  getMainWindow: Parameters<typeof registerWindowHandlers>[0],
  onPersistMutation?: () => void
): void {
  registerPersistHandlers(() => onPersistMutation?.());
  registerWindowHandlers(getMainWindow, onPersistMutation);
  registerUpdaterHandlers();
}
