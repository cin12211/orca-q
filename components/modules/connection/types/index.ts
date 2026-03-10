// export interface IDBSupport {
//   type: EDatabaseType;
//   name: string;
//   icon: globalThis.VNode<
//     RendererNode,
//     RendererElement,
//     {
//       [key: string]: any;
//     }
//   >;
//   isSupport: boolean;
// }

export enum EConnectionMethod {
  STRING = 'string',
  FORM = 'form',
}

export enum ESSLMode {
  DISABLE = 'disable',
  PREFER = 'prefer',
  REQUIRE = 'require',
  VERIFY_CA = 'verify-ca',
  VERIFY_FULL = 'verify-full',
}

export enum ESSHAuthMethod {
  PASSWORD = 'password',
  KEY = 'key',
}

export interface ISSLConfig {
  mode: ESSLMode;
  ca?: string;
  cert?: string;
  key?: string;
  rejectUnauthorized?: boolean;
}

export interface ISSHConfig {
  enabled: boolean;
  host?: string;
  port?: number;
  username?: string;
  authMethod?: ESSHAuthMethod;
  password?: string;
  privateKey?: string;
}
