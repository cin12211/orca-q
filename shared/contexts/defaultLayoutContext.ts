import { createContext } from "reka-ui";

export const [useDefaultLayout, provideDefaultLayoutContext] = createContext<{
  isPrimarySideBarPanelCollapsed: ComputedRef<boolean>;
  isSecondarySideBarPanelCollapsed: ComputedRef<boolean>;
  togglePrimarySideBarPanel: () => void;
  toggleSecondarySideBarPanel: () => void;
}>("DefaultLayoutContext");
