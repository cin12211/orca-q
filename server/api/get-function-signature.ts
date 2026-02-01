import { getDatabaseSource } from '~/server/utils/db-connection';

export interface FunctionParameter {
  name: string;
  type: string;
  mode: 'IN' | 'OUT' | 'INOUT' | 'VARIADIC';
  has_default: boolean;
  default_value: string | null;
}

export interface FunctionSignature {
  name: string;
  schema: string;
  parameters: FunctionParameter[];
  return_type: string;
}

interface RequestBody {
  dbConnectionString: string;
  functionId: string;
}

export default defineEventHandler(
  async (event): Promise<FunctionSignature | null> => {
    const body: RequestBody = await readBody(event);

    const resource = await getDatabaseSource({
      dbConnectionString: body.dbConnectionString,
      type: 'postgres',
    });

    // Get function parameters using pg_proc - simplified query
    const result = await resource.query(
      `
      SELECT
        p.proname AS name,
        n.nspname AS schema,
        pg_get_function_result(p.oid) AS return_type,
        pg_get_function_identity_arguments(p.oid) AS identity_args,
        p.proargnames AS arg_names,
        p.proargtypes::oid[] AS arg_types,
        p.proargmodes::text[] AS arg_modes,
        p.pronargdefaults AS num_defaults
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE p.oid = $1::oid
    `,
      [body.functionId]
    );

    if (!result || result.length === 0) {
      return null;
    }

    const row = result[0];

    // Parse identity_args to extract parameter info
    const parameters: FunctionParameter[] = [];

    if (row.identity_args && row.identity_args.trim()) {
      // Parse the identity arguments string like "p_param1 uuid, p_param2 text"
      const argParts = row.identity_args
        .split(',')
        .map((s: string) => s.trim());

      for (let i = 0; i < argParts.length; i++) {
        const part = argParts[i];
        if (!part) continue;

        // Parse mode (IN, OUT, INOUT, VARIADIC) and name/type
        let mode: 'IN' | 'OUT' | 'INOUT' | 'VARIADIC' = 'IN';
        let remaining = part;

        if (remaining.startsWith('INOUT ')) {
          mode = 'INOUT';
          remaining = remaining.substring(6);
        } else if (remaining.startsWith('OUT ')) {
          mode = 'OUT';
          remaining = remaining.substring(4);
        } else if (remaining.startsWith('IN ')) {
          mode = 'IN';
          remaining = remaining.substring(3);
        } else if (remaining.startsWith('VARIADIC ')) {
          mode = 'VARIADIC';
          remaining = remaining.substring(9);
        }

        // Split into name and type
        const spaceIdx = remaining.indexOf(' ');
        let paramName: string;
        let paramType: string;

        if (spaceIdx > 0) {
          paramName = remaining.substring(0, spaceIdx);
          paramType = remaining.substring(spaceIdx + 1);
        } else {
          // No name, just type
          paramName = `param_${i + 1}`;
          paramType = remaining;
        }

        // Calculate if this param has a default
        const numParams = argParts.length;
        const numDefaults = row.num_defaults || 0;
        const hasDefault = i >= numParams - numDefaults;

        parameters.push({
          name: paramName,
          type: paramType,
          mode,
          has_default: hasDefault,
          default_value: null,
        });
      }
    }

    return {
      name: row.name,
      schema: row.schema,
      parameters,
      return_type: row.return_type,
    };
  }
);
