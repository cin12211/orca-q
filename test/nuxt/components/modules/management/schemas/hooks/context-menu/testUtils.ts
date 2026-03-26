import type { FlattenedTreeFileSystemItem } from '~/components/base/Tree';
import type { Schema } from '~/core/stores/useSchemaStore';
import { TabViewType } from '~/core/stores/useTabViewsStore';
import { ViewSchemaEnum, type SchemaColumnMetadata } from '~/core/types';

export const makeConnection = () =>
  ({
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'secret',
    database: 'hera',
    type: 'postgresql',
  }) as any;

export const makeColumn = (
  overrides: Partial<SchemaColumnMetadata> = {}
): SchemaColumnMetadata => ({
  name: 'id',
  ordinal_position: 1,
  type: 'integer',
  short_type_name: 'int4',
  is_nullable: false,
  default_value: null,
  ...overrides,
});

export const makeSchema = (overrides: Partial<Schema> = {}): Schema => ({
  id: 'schema-1',
  connectionId: 'conn-1',
  workspaceId: 'ws-1',
  name: 'public',
  tables: [],
  views: [],
  functions: [],
  tableDetails: {},
  viewDetails: {},
  ...overrides,
});

export const makeSelectedItem = (
  tabViewType: TabViewType,
  name = 'users',
  id = 'item-1',
  extra: Record<string, unknown> = {}
): FlattenedTreeFileSystemItem['value'] => ({
  id,
  name,
  title: name,
  path: `/${name}`,
  isFolder: false,
  tabViewType,
  icon: '',
  iconClass: '',
  ...extra,
});

export const makeView = (
  overrides: {
    name?: string;
    oid?: string;
    type?: ViewSchemaEnum;
  } = {}
) => ({
  name: 'user_view',
  oid: 'view-1',
  type: ViewSchemaEnum.View,
  ...overrides,
});
