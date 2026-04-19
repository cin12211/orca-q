import {
  EConnectionMethod,
  type ISSLConfig,
  type ISSHConfig,
} from '~/components/modules/connection/types';
import { DatabaseClientType } from '~/core/constants/database-client-type';

export interface Connection {
  id: string;
  workspaceId: string;
  name: string;
  type: DatabaseClientType;
  method: EConnectionMethod;
  connectionString?: string;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  database?: string;
  ssl?: ISSLConfig;
  ssh?: ISSHConfig;
  tagIds?: string[];
  createdAt: string;
  updatedAt?: string;
}
