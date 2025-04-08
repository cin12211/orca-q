import { executeQuery } from "~/server/utils/db-connection";

export default defineEventHandler<{
  body: { query: string };
}>(
  async (
    event
  ): Promise<{
    result: Record<string, any>[];
  }> => {
    const body = await readBody(event);

    const result = await executeQuery(body.query);

    return {
      result,
    };
  }
);
