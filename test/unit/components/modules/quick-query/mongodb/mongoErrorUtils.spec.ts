import { describe, expect, it } from 'vitest';
import { getMongoErrorMessage } from '~/components/modules/quick-query/mongodb/utils/mongoErrorUtils';

describe('getMongoErrorMessage', () => {
  it('returns string errors verbatim', () => {
    expect(getMongoErrorMessage('Custom error message')).toBe(
      'Custom error message'
    );
  });

  it('extracts message from error.data.message', () => {
    const error = {
      message: '[POST] "/api/mongodb/quick-query": 400 Bad Request',
      data: {
        statusCode: 400,
        message: 'Invalid MongoDB document _id: "abc"',
      },
    };
    expect(getMongoErrorMessage(error)).toBe(
      'Invalid MongoDB document _id: "abc"'
    );
  });

  it('extracts message from error.response._data.message', () => {
    const error = {
      message: '[POST] "/api/mongodb/quick-query": 500 Server Error',
      response: {
        _data: {
          statusCode: 500,
          message: 'Unsupported MongoDB filter operator: $where',
        },
      },
    };
    expect(getMongoErrorMessage(error)).toBe(
      'Unsupported MongoDB filter operator: $where'
    );
  });

  it('falls back to error.message if no data is present', () => {
    const error = new Error('Network failure');
    expect(getMongoErrorMessage(error)).toBe('Network failure');
  });

  it('falls back to default fallbackMessage when error is undefined or empty', () => {
    expect(getMongoErrorMessage(null)).toBe('Unknown error');
    expect(getMongoErrorMessage(undefined, 'Query failed')).toBe(
      'Query failed'
    );
  });
});
