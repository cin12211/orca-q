import type {
  ValueFormatterParams,
  ValueParserParams,
  ValueSetterParams,
} from 'ag-grid-community';
import { describe, expect, it, vi } from 'vitest';
import {
  areCellValuesDifferent,
  coerceEditedScalar,
  formatCellValue,
  isObjectCell,
  isObjectCellValue,
  isPlaceholderCellValue,
  isSerializedBinaryValue,
  normalizeEditedCellChange,
  normalizeEditedCellValue,
  passThroughCellValueParser,
  setCellValue,
} from '~/core/helpers/cell-value';

/** JSON shape of a Node.js Buffer, as BLOB/BYTEA values reach the browser. */
const binaryValue = () => ({ type: 'Buffer', data: [222, 173, 190, 239] });

const setterParams = (
  oldValue: unknown,
  newValue: unknown,
  field = 'col'
): ValueSetterParams =>
  ({
    oldValue,
    newValue,
    data: { [field]: oldValue },
  }) as unknown as ValueSetterParams;

describe('isObjectCellValue', () => {
  it.each([
    [{ a: 1 }, true],
    [[1, 2], true],
    [binaryValue(), true],
    [null, false],
    [undefined, false],
    ['{"a":1}', false],
    [0, false],
    [false, false],
  ])('%j -> %s', (value, expected) => {
    expect(isObjectCellValue(value)).toBe(expected);
  });
});

describe('isPlaceholderCellValue', () => {
  it('marks NULL and binary summaries as placeholders', () => {
    expect(isPlaceholderCellValue(null)).toBe(true);
    expect(isPlaceholderCellValue(binaryValue())).toBe(true);
  });

  it.each([[''], ['NULL'], [0], [false], [{ a: 1 }], [[1]], [undefined]])(
    'treats %j as a real value',
    value => {
      expect(isPlaceholderCellValue(value)).toBe(false);
    }
  );
});

describe('isSerializedBinaryValue', () => {
  it('detects the JSON shape of a Node.js Buffer', () => {
    expect(isSerializedBinaryValue(binaryValue())).toBe(true);
    expect(isSerializedBinaryValue({ type: 'Buffer', data: [] })).toBe(true);
  });

  it.each([
    [{ type: 'Buffer' }],
    [{ type: 'Buffer', data: 'abc' }],
    [{ type: 'Point', data: [1] }],
    [[1, 2, 3]],
    ['deadbeef'],
    [null],
  ])('rejects %j', value => {
    expect(isSerializedBinaryValue(value)).toBe(false);
  });
});

describe('isObjectCell', () => {
  it('uses the declared type for structured columns even when NULL', () => {
    expect(isObjectCell({ fieldType: 'jsonb', value: null })).toBe(true);
    expect(isObjectCell({ fieldType: 'json', value: null })).toBe(true);
    expect(isObjectCell({ fieldType: 'text[]', value: null })).toBe(true);
  });

  it('falls back to the runtime value for non-structured declared types', () => {
    expect(isObjectCell({ fieldType: 'blob', value: binaryValue() })).toBe(
      true
    );
    expect(isObjectCell({ fieldType: 'bytea', value: binaryValue() })).toBe(
      true
    );
    expect(isObjectCell({ fieldType: '_int4', value: [1, 2] })).toBe(true);
    expect(isObjectCell({ fieldType: 'point', value: { x: 1, y: 2 } })).toBe(
      true
    );
  });

  it.each([
    ['text', 'hello'],
    ['int4', 42],
    ['bool', true],
    ['timestamp', '2024-01-01T10:00:00.000Z'],
    ['date', '2024-01-01'],
    ['uuid', '3f1c0b8e-0000-4000-8000-000000000000'],
    ['blob', null],
    ['', undefined],
  ])('keeps scalar %s cells on the plain path', (fieldType, value) => {
    expect(isObjectCell({ fieldType, value })).toBe(false);
  });
});

describe('passThroughCellValueParser', () => {
  it('passes the edited input through instead of returning null', () => {
    const original = binaryValue();

    expect(
      passThroughCellValueParser({
        newValue: original,
        oldValue: original,
      } as ValueParserParams)
    ).toBe(original);
    expect(
      passThroughCellValueParser({
        newValue: '{"a":1}',
        oldValue: { a: 2 },
      } as ValueParserParams)
    ).toBe('{"a":1}');
  });
});

describe('areCellValuesDifferent', () => {
  it('compares objects structurally even when the column is not structured', () => {
    expect(
      areCellValuesDifferent({
        oldValue: binaryValue(),
        newValue: binaryValue(),
        isObjectColumn: false,
      })
    ).toBe(false);
    expect(
      areCellValuesDifferent({
        oldValue: binaryValue(),
        newValue: { type: 'Buffer', data: [1] },
        isObjectColumn: false,
      })
    ).toBe(true);
  });

  it('treats a JSON string equal to the stored object as unchanged', () => {
    expect(
      areCellValuesDifferent({
        oldValue: { a: 1, b: [1, 2] },
        newValue: '{"a":1,"b":[1,2]}',
        isObjectColumn: true,
      })
    ).toBe(false);
  });

  it('detects real changes for structured columns', () => {
    expect(
      areCellValuesDifferent({
        oldValue: { a: 1 },
        newValue: '{"a":2}',
        isObjectColumn: true,
      })
    ).toBe(true);
    expect(
      areCellValuesDifferent({
        oldValue: { a: 1 },
        newValue: null,
        isObjectColumn: true,
      })
    ).toBe(true);
  });

  it('keeps strict comparison for scalar values', () => {
    expect(
      areCellValuesDifferent({
        oldValue: 1,
        newValue: '1',
        isObjectColumn: false,
      })
    ).toBe(true);
    expect(
      areCellValuesDifferent({
        oldValue: 'a',
        newValue: 'a',
        isObjectColumn: false,
      })
    ).toBe(false);
  });
});

describe('normalizeEditedCellValue - NULL handling', () => {
  it('returns SQL NULL (not the string "null") for structured columns', () => {
    expect(
      normalizeEditedCellValue({
        fieldType: 'jsonb',
        isObjectColumn: true,
        value: null,
      })
    ).toBeNull();
    expect(
      normalizeEditedCellValue({
        fieldType: 'blob',
        isObjectColumn: true,
        value: null,
      })
    ).toBeNull();
  });

  it('serializes objects for JSON columns', () => {
    expect(
      normalizeEditedCellValue({
        fieldType: 'jsonb',
        isObjectColumn: true,
        value: { a: 1 },
      })
    ).toBe('{"a":1}');
  });

  it('reports an unchanged JSON object as not changed', () => {
    expect(
      normalizeEditedCellChange({
        fieldType: 'jsonb',
        isObjectColumn: true,
        oldValue: { a: 1 },
        newValue: { a: 1 },
      })
    ).toEqual({ normalizedValue: '{"a":1}', hasChanged: false });
  });

  it('reports an unchanged binary value as not changed', () => {
    expect(
      normalizeEditedCellChange({
        fieldType: 'blob',
        isObjectColumn: true,
        oldValue: binaryValue(),
        newValue: binaryValue(),
      }).hasChanged
    ).toBe(false);
  });
});

describe('formatCellValue', () => {
  const format = (value: unknown, isObjectColumn: boolean) =>
    formatCellValue({ value } as ValueFormatterParams, isObjectColumn);

  it('formats every value shape without losing it', () => {
    expect(format(null, false)).toBe('NULL');
    expect(format(null, true)).toBe('NULL');
    expect(format(0, false)).toBe('0');
    expect(format(BigInt(10), false)).toBe('10');
    expect(format('text', false)).toBe('text');
    expect(format(undefined, false)).toBe('');
    expect(format({ a: 1 }, true)).toBe('{\n  "a": 1\n}');
    expect(format(binaryValue(), true)).toBe('BINARY - 4 bytes');
    expect(format(binaryValue(), false)).toBe('BINARY - 4 bytes');
  });
});

describe('setCellValue', () => {
  it('rejects writes in view-only mode', () => {
    const params = setterParams('a', 'b');
    expect(
      setCellValue({
        params,
        fieldId: 'col',
        isObjectColumn: false,
        isViewOnly: true,
      })
    ).toBe(false);
    expect(params.data.col).toBe('a');
  });

  it.each([
    ['text', 'old', 'new'],
    ['int4', 1, 2],
    ['bool', true, false],
    ['timestamp', '2024-01-01T00:00:00.000Z', '2024-02-01T00:00:00.000Z'],
    ['date', '2024-01-01', '2024-01-02'],
    ['uuid', 'a', 'b'],
  ])('stores scalar %s edits as-is', (_type, oldValue, newValue) => {
    const params = setterParams(oldValue, newValue);
    expect(
      setCellValue({ params, fieldId: 'col', isObjectColumn: false })
    ).toBe(true);
    expect(params.data.col).toBe(newValue);
  });

  it('parses JSON editor strings for object cells', () => {
    const params = setterParams({ a: 1 }, '{"a":2}');
    expect(setCellValue({ params, fieldId: 'col', isObjectColumn: true })).toBe(
      true
    );
    expect(params.data.col).toEqual({ a: 2 });
  });

  it('keeps an already-parsed object instead of failing JSON.parse', () => {
    const next = { a: 2 };
    const params = setterParams({ a: 1 }, next);
    expect(setCellValue({ params, fieldId: 'col', isObjectColumn: true })).toBe(
      true
    );
    expect(params.data.col).toBe(next);
  });

  it('rejects invalid JSON and keeps the old value', () => {
    const params = setterParams({ a: 1 }, '{oops');
    expect(setCellValue({ params, fieldId: 'col', isObjectColumn: true })).toBe(
      false
    );
    expect(params.data.col).toEqual({ a: 1 });
  });

  it('turns empty input into NULL when emptyAsNull is set', () => {
    for (const empty of ['', null, undefined]) {
      const params = setterParams('x', empty);
      expect(
        setCellValue({
          params,
          fieldId: 'col',
          isObjectColumn: false,
          emptyAsNull: true,
        })
      ).toBe(true);
      expect(params.data.col).toBeNull();
    }
  });

  describe('binary (BLOB/BYTEA) cells', () => {
    const edit = (newValue: unknown, oldValue: unknown = binaryValue()) => {
      const params = setterParams(oldValue, newValue);
      const accepted = setCellValue({
        params,
        fieldId: 'col',
        isObjectColumn: true,
      });
      return { accepted, stored: params.data.col, original: oldValue };
    };

    it('treats the untouched hex text as no change and keeps the same object', () => {
      const { accepted, stored, original } = edit('0xdeadbeef');
      expect(accepted).toBe(false);
      expect(stored).toBe(original);
    });

    it('writes new bytes from hex input in any accepted notation', () => {
      for (const input of ['0x0102ff', '0X0102FF', '\\x0102ff', '01 02 ff']) {
        const { accepted, stored } = edit(input);
        expect(accepted).toBe(true);
        expect(stored).toEqual({ type: 'Buffer', data: [1, 2, 255] });
      }
    });

    it('stores 0x as an empty binary value and blank input as NULL', () => {
      expect(edit('0x').stored).toEqual({ type: 'Buffer', data: [] });
      expect(edit('').stored).toBeNull();
      expect(edit('   ').stored).toBeNull();
    });

    it('rejects text that is not whole hex bytes, keeping the bytes', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      for (const input of [
        '[object Object]',
        JSON.stringify(binaryValue()),
        '0x123',
        'hello',
      ]) {
        const { accepted, stored, original } = edit(input);
        expect(accepted).toBe(false);
        expect(stored).toBe(original);
      }
      errorSpy.mockRestore();
    });

    it('a NULL cell of a binary column takes hex input as bytes', () => {
      const params = setterParams(null, '0x0a0b');
      expect(
        setCellValue({
          params,
          fieldId: 'col',
          isObjectColumn: false,
          isBinaryColumn: true,
        })
      ).toBe(true);
      expect(params.data.col).toEqual({ type: 'Buffer', data: [10, 11] });
    });

    it('a NULL cell of a binary column rejects non-hex text', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const params = setterParams(null, 'hello');
      expect(
        setCellValue({
          params,
          fieldId: 'col',
          isObjectColumn: false,
          isBinaryColumn: true,
        })
      ).toBe(false);
      expect(params.data.col).toBeNull();
      errorSpy.mockRestore();
    });

    it('leaves non-NULL string cells of a binary column alone (SQLite hex)', () => {
      const params = setterParams('deadbeef', 'cafe');
      setCellValue({
        params,
        fieldId: 'col',
        isObjectColumn: false,
        isBinaryColumn: true,
      });
      expect(params.data.col).toBe('cafe');
    });

    it('accepts NULL and Buffer objects (undo / paste of a copied cell)', () => {
      expect(edit(null).stored).toBeNull();
      expect(edit({ type: 'Buffer', data: [7] }).stored).toEqual({
        type: 'Buffer',
        data: [7],
      });
    });
  });

  describe('click into a cell and out again changes nothing', () => {
    // What the plain text editor hands back for an untouched cell.
    it.each([
      ['number', 42, '42'],
      ['zero', 0, '0'],
      ['negative float', -3.25, '-3.25'],
      ['boolean true', true, 'true'],
      ['boolean false', false, 'false'],
      ['text', 'hello', 'hello'],
      ['empty string', '', ''],
      ['spaces', '  padded  ', '  padded  '],
      ['CRLF text from a textarea', 'a\r\nb', 'a\nb'],
      ['big integer string', '9007199254740993', '9007199254740993'],
      ['ISO timestamp', '2024-01-15T10:20:30.000Z', '2024-01-15T10:20:30.000Z'],
    ])('%s', (_label, oldValue, editorOutput) => {
      const params = setterParams(oldValue, editorOutput);
      expect(
        setCellValue({ params, fieldId: 'col', isObjectColumn: false })
      ).toBe(false);
      expect(params.data.col).toBe(oldValue);
    });

    it('JSON confirmed without changes', () => {
      const original = { a: 1, b: [1, 2] };
      const params = setterParams(original, JSON.stringify(original));
      expect(
        setCellValue({ params, fieldId: 'col', isObjectColumn: true })
      ).toBe(false);
      expect(params.data.col).toBe(original);
    });
  });
});

describe('coerceEditedScalar', () => {
  it('restores numbers from text', () => {
    expect(coerceEditedScalar(1, '2')).toBe(2);
    expect(coerceEditedScalar(1, ' 2.5 ')).toBe(2.5);
    expect(coerceEditedScalar(1, '1e3')).toBe(1000);
    expect(coerceEditedScalar(1, '-.5')).toBe(-0.5);
  });

  it('keeps text that is not a lossless number', () => {
    expect(coerceEditedScalar(1, 'abc')).toBe('abc');
    expect(coerceEditedScalar(1, '')).toBe('');
    expect(coerceEditedScalar(1, 'Infinity')).toBe('Infinity');
    expect(coerceEditedScalar(1, '9007199254740993')).toBe('9007199254740993');
  });

  it('restores booleans from text', () => {
    expect(coerceEditedScalar(true, 'false')).toBe(false);
    expect(coerceEditedScalar(false, ' TRUE ')).toBe(true);
    expect(coerceEditedScalar(true, 'yes')).toBe('yes');
  });

  it('keeps strings and unknown originals as typed', () => {
    expect(coerceEditedScalar('a', '42')).toBe('42');
    expect(coerceEditedScalar(null, '42')).toBe('42');
    expect(coerceEditedScalar(undefined, 'x')).toBe('x');
  });
});
