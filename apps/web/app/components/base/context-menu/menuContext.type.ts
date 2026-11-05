enum ContextMenuItemType {
  ACTION = 'action',
  LABEL = 'label',
  SEPARATOR = 'separator',
  SUBMENU = 'submenu',
}

type ContextMenuItemAction = {
  title: string;
  icon: string;
  desc?: string;
  shortcut?: string;
  type: ContextMenuItemType.ACTION;
  select?: () => void;
  condition?: boolean;
  disabled?: boolean;
};

type ContextMenuItemLabel = {
  title: string;
  icon?: string;
  type: ContextMenuItemType.LABEL;
  condition?: boolean;
};

type ContextMenuItemSeparator = {
  type: ContextMenuItemType.SEPARATOR;
  condition?: boolean;
};

type ContextMenuItemSubMenu = {
  title: string;
  icon?: string;
  desc?: string;
  type: ContextMenuItemType.SUBMENU;
  items: (
    | ContextMenuItemAction
    | ContextMenuItemLabel
    | ContextMenuItemSeparator
    | ContextMenuItemSubMenu
  )[];
  condition?: boolean;
  disabled?: boolean;
};

type ContextMenuItem =
  | ContextMenuItemAction
  | ContextMenuItemLabel
  | ContextMenuItemSeparator
  | ContextMenuItemSubMenu;

export { ContextMenuItemType };

export type {
  ContextMenuItemAction,
  ContextMenuItemLabel,
  ContextMenuItemSeparator,
  ContextMenuItemSubMenu,
  ContextMenuItem,
};
