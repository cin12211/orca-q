import { operatorSets, separatorRow } from '#shared/constants';
import { DatabaseClientType } from '#shared/constants/database-client-type';
import { describe, expect, it } from 'vitest';

describe('operatorSets', () => {
  it('does not duplicate Postgres contains labels for case-insensitive variants', () => {
    const postgresLikeLabels = operatorSets[DatabaseClientType.POSTGRES]
      .filter(option => option.value !== separatorRow.value)
      .filter(option => option.value.includes('LIKE'))
      .map(option => option.label);

    expect(postgresLikeLabels).toContain('Contains');
    expect(postgresLikeLabels).toContain('Not contains');
    expect(postgresLikeLabels).not.toContain('Contains - Case insensitive');
    expect(postgresLikeLabels).not.toContain('Not contains - Case insensitive');
  });
});
