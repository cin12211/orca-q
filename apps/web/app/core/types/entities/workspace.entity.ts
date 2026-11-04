export interface Workspace {
  id: string;
  icon: string;
  name: string;
  desc?: string;
  lastOpened?: string; // ISO timestamp
  createdAt: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
}
