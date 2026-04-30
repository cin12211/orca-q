import { z } from 'zod';
import {
  EConnectionMethod,
  ESSHAuthMethod,
  ESSLMode,
} from '~/core/types/entities/connection.entity';
import type { RedisBrowserInput } from './redis-browser.service';

export const sslConfigSchema = z.object({
  mode: z.enum([
    ESSLMode.DISABLE,
    ESSLMode.PREFERRED,
    ESSLMode.REQUIRE,
    ESSLMode.VERIFY_CA,
    ESSLMode.VERIFY_FULL,
  ]),
  ca: z.string().optional(),
  cert: z.string().optional(),
  key: z.string().optional(),
  rejectUnauthorized: z.boolean().optional(),
});

export const sshConfigSchema = z.object({
  enabled: z.boolean(),
  host: z.string().optional(),
  port: z.number().optional(),
  username: z.string().optional(),
  authMethod: z.enum([ESSHAuthMethod.PASSWORD, ESSHAuthMethod.KEY]).optional(),
  password: z.string().optional(),
  privateKey: z.string().optional(),
  storeInKeychain: z.boolean().optional(),
  useSshKey: z.boolean().optional(),
});

export const connectionBodySchema = z.object({
  method: z.enum([
    EConnectionMethod.STRING,
    EConnectionMethod.FORM,
    EConnectionMethod.FILE,
    EConnectionMethod.MANAGED,
  ]),
  stringConnection: z.string().optional(),
  host: z.string().optional(),
  port: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  database: z.string().optional(),
  databaseIndex: z.number().int().min(0).optional(),
  ssl: sslConfigSchema.optional(),
  ssh: sshConfigSchema.optional(),
});

export type ConnectionBodyInput = z.infer<typeof connectionBodySchema>;

export function parseConnectionBody(
  body: ConnectionBodyInput
): RedisBrowserInput {
  return {
    method: body.method,
    url: body.stringConnection,
    host: body.host,
    port: body.port,
    username: body.username,
    password: body.password,
    database: body.database,
    databaseIndex: body.databaseIndex,
    ssl: body.ssl,
    ssh: body.ssh,
  };
}
