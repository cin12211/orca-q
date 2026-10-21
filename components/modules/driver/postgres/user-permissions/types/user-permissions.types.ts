import type { ObjectType, PrivilegeType } from '~/core/types';

export interface RoleInfo {
  isSuperuser: boolean;
  canLogin: boolean;
  canCreateDb: boolean;
  canCreateRole: boolean;
  isReplication: boolean;
  connectionLimit: number;
  validUntil: string | null;
  memberOf: string[];
}

export type PermissionDialogMode = 'grant' | 'update';

export interface PermissionChangePayload {
  objectType: ObjectType;
  schemaName: string;
  objectName: string;
  grant: PrivilegeType[];
  revoke: PrivilegeType[];
}
