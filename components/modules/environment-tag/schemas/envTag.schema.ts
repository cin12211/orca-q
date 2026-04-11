import { z } from 'zod';
import { TagColor } from '../types/environmentTag.enums';

export const createEnvTagSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(10, 'Name must be 10 characters or fewer'),
  color: z.nativeEnum(TagColor),
  strictMode: z.boolean().default(false),
});

export type CreateEnvTagFormValues = z.infer<typeof createEnvTagSchema>;
