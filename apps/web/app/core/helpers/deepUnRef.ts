import { isRef, unref } from 'vue';

const isObject = (val: unknown): val is Record<any, any> =>
  val !== null && typeof val === 'object';

/**
 * Deeply unref a value, recursing into objects and arrays.
 */
export const deepUnref = <T>(val: T): T => {
  const checkedVal = unref(val);

  if (!isObject(checkedVal)) {
    return checkedVal as T;
  }

  if (Array.isArray(checkedVal)) {
    return unrefArray(checkedVal) as unknown as T;
  }

  return unrefObject(checkedVal) as T;
};

/**
 * Unref a value, recursing into it if it's an object.
 */
const smartUnref = <T>(val: T): T => {
  // Non-ref object? Go deeper!
  if (val !== null && !isRef(val) && typeof val === 'object') {
    return deepUnref(val);
  }

  return unref(val) as T;
};

/**
 * Unref an array, recursively.
 */
const unrefArray = (arr: any[]): any[] => arr.map(smartUnref);

/**
 * Unref an object, recursively.
 */
const unrefObject = (obj: Record<string, any>): Record<string, any> => {
  const unreffed: Record<string, any> = {};

  Object.keys(obj).forEach(key => {
    unreffed[key] = smartUnref(obj[key]);
  });

  return unreffed;
};
