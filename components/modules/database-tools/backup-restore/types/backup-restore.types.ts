export type BackupRestoreTab = 'export' | 'import';

export interface BackupRestoreSection {
  id: BackupRestoreTab;
  tabLabel: string;
  subtitle: string;
  icon: string;
}

export type ToolTab = BackupRestoreTab;
export type ToolSection = BackupRestoreSection;
