import { Model } from 'pinia-orm';
import { Attr, Bool, HasMany, HasOne, Str, Uid } from 'pinia-orm/decorators';

/**
 * ============================================
 * 📦 DB Tool App – Entity Definitions (v3)
 * Decorator‑based syntax for Pinia‑ORM  ✨
 * ============================================
 */

// --------------------------------------------------
// 🔖 Enums & Type Helpers
// --------------------------------------------------
export enum DbType {
  POSTGRES = 'postgres',
  MYSQL = 'mysql',
  SQLITE = 'sqlite',
}

// Timestamp helper defaults
const now = () => Date.now();

// --------------------------------------------------
// 📁 Project
// --------------------------------------------------
export class Project extends Model {
  static override entity = 'projects';

  static override piniaOptions = { persist: true };

  // ──────────────────────────── fields ────────────────────────────
  @Uid() declare id: string;

  @Str('') declare name: string;

  @Attr(now) declare createdAt: number;
  @Attr(null) declare updatedAt: number | null;

  // relations
  @HasMany(() => ConnectionDB, 'projectId')
  declare connections: ConnectionDB[];

  @HasOne(() => Explored, 'projectId')
  declare explored: Explored | null;

  @HasMany(() => EditorTab, 'projectId')
  declare editorTabs: EditorTab[];
}

// --------------------------------------------------
// 🔌 ConnectionDB
// --------------------------------------------------
export class ConnectionDB extends Model {
  static override entity = 'connections';
  static override piniaOptions = { persist: true };

  @Uid() declare id: string;
  @Str('') declare projectId: string;

  @Str('') declare name: string;
  @Str(DbType.POSTGRES) declare type: DbType;

  @Str('localhost') declare host: string;
  @Attr(5432) declare port: number;
  @Str('') declare username: string;
  @Str('') declare database: string;

  @Attr(now) declare createdAt: number;
  @Attr(null) declare updatedAt: number | null;

  @HasMany(() => Database, 'connectionId')
  declare databases: Database[];
}

// --------------------------------------------------
// 🗄️ Database (namespace)
// --------------------------------------------------
export class Database extends Model {
  static override entity = 'databases';

  @Uid() declare id: string;
  @Str('') declare connectionId: string;

  @Str('') declare name: string;
  @Str('utf8') declare charset: string;

  @HasMany(() => Schema, 'databaseId')
  declare schemas: Schema[];
}

// --------------------------------------------------
// 📂 Schema
// --------------------------------------------------
export class Schema extends Model {
  static override entity = 'schemas';

  @Uid() declare id: string;
  @Str('') declare databaseId: string;

  @Str('') declare name: string;
  @Bool(false) declare isDefault: boolean;

  @HasMany(() => Table, 'schemaId')
  declare tables: Table[];

  @HasMany(() => View, 'schemaId')
  declare views: View[];

  @HasMany(() => DbFunction, 'schemaId')
  declare functions: DbFunction[];
}

// --------------------------------------------------
// 📝 Table
// --------------------------------------------------
export class Table extends Model {
  static override entity = 'tables';

  @Uid() declare id: string;
  @Str('') declare schemaId: string;

  @Str('') declare name: string;
  @Attr(null) declare rowCount: number | null;
}

// --------------------------------------------------
// 👁️ View
// --------------------------------------------------
export class View extends Model {
  static override entity = 'views';

  @Uid() declare id: string;
  @Str('') declare schemaId: string;

  @Str('') declare name: string;
  @Attr('') declare definition: string;
}

// --------------------------------------------------
// 🧩 DbFunction
// --------------------------------------------------
export class DbFunction extends Model {
  static override entity = 'db_functions';

  @Uid() declare id: string;
  @Str('') declare schemaId: string;

  @Str('') declare name: string;
  @Attr('') declare definition: string;
}

// --------------------------------------------------
// 📑 Explored (root folder)
// --------------------------------------------------
export class Explored extends Model {
  static override entity = 'explored_roots';

  @Uid() declare id: string;
  @Str('') declare projectId: string;

  @HasMany(() => Folder, 'exploredId')
  declare folders: Folder[];
}

// --------------------------------------------------
// 📁 Folder (nested)
// --------------------------------------------------
export class Folder extends Model {
  static override entity = 'folders';

  @Uid() declare id: string;
  @Str('') declare exploredId: string;
  @Str(null) declare parentId: string | null;

  @Str('') declare name: string;
  @Str('') declare path: string; // materialized path e.g. /queries/2025

  @HasMany(() => Folder, 'parentId')
  declare children: Folder[];

  @HasMany(() => File, 'folderId')
  declare files: File[];
}

// --------------------------------------------------
// 📄 File (SQL)
// --------------------------------------------------
export class File extends Model {
  static override entity = 'files';

  @Uid() declare id: string;
  @Str('') declare folderId: string;

  @Str('') declare name: string;
  @Str('sql') declare language: string;
  @Str('') declare content: string;

  @Attr(now) declare createdAt: number;
  @Attr(null) declare updatedAt: number | null;
}

// --------------------------------------------------
// 🖥️ EditorTab (UI state)
// --------------------------------------------------
export class EditorTab extends Model {
  static override entity = 'editor_tabs';
  static override piniaOptions = { persist: true };

  @Uid() declare id: string;
  @Str('') declare projectId: string;

  @Str(null) declare fileId: string | null;
  @Str('') declare name: string;

  @Str('') declare dirtyContent: string;
  @Bool(false) declare isDirty: boolean;
  @Bool(false) declare isActive: boolean;

  @Attr(now) declare createdAt: number;
  @Attr(null) declare updatedAt: number | null;
}
