export type ValidatorFn<T> = (val: unknown) => { valid: true; value: T } | { valid: false; errors: string[] };
export type ValidatorShape = Record<string, ValidatorFn<unknown>>;
export type InferShape<T extends ValidatorShape> = { [K in keyof T]: T[K] extends ValidatorFn<infer U> ? U : never };

export const v = {
  string: (): ValidatorFn<string> => (val) => typeof val === 'string' ? { valid: true, value: val } : { valid: false, errors: ['Expected string'] },
  number: (): ValidatorFn<number> => (val) => typeof val === 'number' && Number.isFinite(val) ? { valid: true, value: val } : { valid: false, errors: ['Expected finite number'] },
  boolean: (): ValidatorFn<boolean> => (val) => typeof val === 'boolean' ? { valid: true, value: val } : { valid: false, errors: ['Expected boolean'] },
  optional: <T>(validator: ValidatorFn<T>): ValidatorFn<T | undefined> => (val) => val === undefined || val === null ? { valid: true, value: undefined } : validator(val),
  array: <T>(itemValidator: ValidatorFn<T>): ValidatorFn<T[]> => (val) => {
    if (!Array.isArray(val)) return { valid: false, errors: ['Expected array'] };
    const arr: T[] = [];
    const errs: string[] = [];
    for (let i = 0; i < val.length; i++) {
      const res = itemValidator(val[i]);
      if (res.valid) arr.push(res.value);
      else res.errors.forEach(e => errs.push(`[${i}]: ${e}`));
    }
    return errs.length > 0 ? { valid: false, errors: errs } : { valid: true, value: arr };
  },
  object: <T extends ValidatorShape>(shape: T): ValidatorFn<InferShape<T>> => (val) => {
    if (typeof val !== 'object' || val === null || Array.isArray(val)) return { valid: false, errors: ['Expected object'] };
    const obj: Partial<InferShape<T>> = {};
    const errs: string[] = [];
    for (const key of Object.keys(shape) as Array<keyof T>) {
      const res = shape[key](val[key as keyof typeof val]);
      if (res.valid) {
        if (res.value !== undefined) (obj as Record<keyof T, unknown>)[key] = res.value;
      } else {
        res.errors.forEach(e => errs.push(`.${String(key)}: ${e}`));
      }
    }
    return errs.length > 0 ? { valid: false, errors: errs } : { valid: true, value: obj as InferShape<T> };
  },
  any: (): ValidatorFn<unknown> => (val) => ({ valid: true, value: val }),
};
