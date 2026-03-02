import type { FuseResultMatch } from 'fuse.js';

/** A single executable command item shown in the palette */
export interface CommandItem {
  id: string;
  label: string;
  icon: string;
  iconClass?: string;
  group: string;
  description?: string;
  initials?: string;
  matches?: readonly FuseResultMatch[];
  execute: () => void | Promise<void>;
}

/** A prefix definition for mode switching */
export interface CommandPrefix {
  key: string;
  label: string;
  placeholder: string;
  icon: string;
  iconClass?: string;
}

/** Parsed result from raw user input */
export interface ParsedInput {
  prefix: CommandPrefix | null;
  query: string;
}

/** A provider that generates commands dynamically from app context */
export interface CommandProvider {
  prefix: CommandPrefix;
  /** Whether this provider contributes to global (no-prefix) search */
  includeInGlobal: boolean;
  resolve: (query: string) => CommandItem[];
}
