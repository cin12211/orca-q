export enum EDatabaseType {
  Postgres = 'postgres',
  MySQL = 'mysql',
  SQLite = 'sqlite',
  Mongo = 'mongo',
  SQLServer = 'mssql',
  Oracle = 'oracle',
  Redis = 'redis',
}

export enum EConnectionMethod {
  ConnectionString = 'string',
  Direct = 'direct',
  SSH = 'ssh_tunnel',
}

export enum EConnectionHealth {
  Ok = 'ok',
  Fail = 'fail',
  Unknown = 'unknown',
}
