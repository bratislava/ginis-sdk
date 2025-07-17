import { z } from 'zod'

export function coercedArray<T extends z.ZodType>(schema: T) {
  return z.preprocess((val) => {
    if (val === undefined || Array.isArray(val)) return val
    return schema.safeParse(val).success ? [val] : val
  }, z.array(schema).default([]))
}
