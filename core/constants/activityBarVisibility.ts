import { ActivityBarItemType } from '../types/entities/activity-bar.entity';

/**
 * Presentation only. Which activities a database type shows is configured in
 * `core/constants/connection-capabilities.ts`.
 */
export interface ActivityItemConfig {
  id: ActivityBarItemType;
  title: string;
  icon: string;
}

export const BASE_ACTIVITY_ITEMS: readonly ActivityItemConfig[] = [
  {
    id: ActivityBarItemType.Explorer,
    title: 'Explorer',
    icon: 'hugeicons:folder-file-storage',
  },
  {
    id: ActivityBarItemType.Schemas,
    title: 'Schemas',
    icon: 'hugeicons:database',
  },
  {
    id: ActivityBarItemType.ErdDiagram,
    title: 'ErdDiagram',
    icon: 'hugeicons:hierarchy-square-02',
  },
  {
    id: ActivityBarItemType.UsersRoles,
    title: 'Users & Roles',
    icon: 'hugeicons:user-shield-01',
  },
  {
    id: ActivityBarItemType.DatabaseTools,
    title: 'Database Tools',
    icon: 'hugeicons:block-game',
  },
  {
    id: ActivityBarItemType.Agent,
    title: 'AI Agent',
    icon: 'hugeicons:robotic',
  },
];
