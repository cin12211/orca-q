import * as z from 'zod';
import { DEFAULT_WORKSPACE_ICON } from '../constants';

export const workspaceSchema = z.object({
  name: z.string({
    message: 'Workspace name is required.',
  }),
  desc: z.string().optional(),
  icon: z.string().default(DEFAULT_WORKSPACE_ICON),
});

export type WorkspaceFormValues = z.infer<typeof workspaceSchema>;
