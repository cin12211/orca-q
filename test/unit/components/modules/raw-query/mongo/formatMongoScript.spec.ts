import { describe, expect, it } from 'vitest';
import { formatMongoScript } from '~/components/modules/raw-query/mongo/utils/formatMongoScript';

describe('formatMongoScript', () => {
  it('formats a Mongo TypeScript script with the workspace Prettier style', async () => {
    await expect(
      formatMongoScript(
        'const users=db.collection("users");return users.find({status:"active"});'
      )
    ).resolves.toBe(
      "const users = db.collection('users');\nreturn users.find({ status: 'active' });\n"
    );
  });
});
