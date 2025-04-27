import { Model } from 'pinia-orm';
import { Attr, HasMany, BelongsTo } from 'pinia-orm/decorators';
import { EConnectionMethod, EDatabaseType } from '../../appState/interface';

/**
 * App Model
 */
export class Project extends Model {
  static override entity = 'projects';
  static override piniaOptions = { persist: true };

  @Attr('') declare id: string;
  @Attr('') declare createdAt: string;
  @Attr(null) declare selectedWorkspaceId: string | null;

  // Relations
  @HasMany(() => Workspace, 'projectId')
  declare workspaces: Workspace[];
}

/**
 * Workspace Model
 */
export class Workspace extends Model {
  static override entity = 'workspaces';
  static override piniaOptions = { persist: true };

  @Attr('') declare id: string;
  @Attr('') declare icon: string;
  @Attr('') declare name: string;
  @Attr(null) declare desc: string | null;
  @Attr(null) declare lastOpened: string | null;
  @Attr('') declare createdAt: string;
  @Attr('') declare projectId: string;
  @Attr(null) declare selectedConnectionId: string | null;

  // Relations
  @BelongsTo(() => Project, 'projectId')
  declare project: Project | null;

  @HasMany(() => Connection, 'workspaceId')
  declare connections: Connection[];
}

/**
 * Connection Model
 */
export class Connection extends Model {
  static override entity = 'connections';
  static override primaryKey = 'id';

  static override piniaOptions = { persist: true };

  @Attr('') declare workspaceId: string;
  @Attr('') declare id: string;
  @Attr('') declare name: string;
  @Attr(EDatabaseType.PG) declare type: EDatabaseType;
  @Attr(EConnectionMethod.STRING) declare method: EConnectionMethod;
  @Attr(null) declare connectionString: string | null;
  @Attr(null) declare host: string | null;
  @Attr(null) declare port: number | null;
  @Attr(null) declare username: string | null;
  @Attr(null) declare password: string | null;
  @Attr(null) declare database: string | null;
  @Attr(new Date()) declare createdAt: Date;
  @Attr(null) declare selectedSchemaName: string | null;

  // Relations
  @BelongsTo(() => Workspace, 'workspaceId')
  declare workspace: Workspace | null;

  @HasMany(() => Schema, 'connectionId')
  declare schemas: Schema[];
}

/**
 * Schema Model
 */
export class Schema extends Model {
  static override entity = 'schemas';
  static override primaryKey = ['connectionId', 'name'];

  static override piniaOptions = { persist: true };

  @Attr('') declare connectionId: string;
  @Attr('') declare name: string;
  @Attr([]) declare entities: string[];
  @Attr([]) declare tables: string[];
  @Attr([]) declare views: string[];
  @Attr([]) declare functions: string[];

  // Relations
  @BelongsTo(() => Connection, 'connectionId')
  declare connection: Connection | null;
}
