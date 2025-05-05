import type { RendererElement, RendererNode } from 'vue';
import type { DatabaseType } from 'typeorm';
import type { EDatabaseType } from '../constants';

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
