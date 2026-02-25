import type { CommandPrefix, CommandProvider } from './commandEngine.types';

/**
 * Registry holding all command providers keyed by prefix.
 */
export class CommandRegistry {
  private providers = new Map<string, CommandProvider>();

  register(provider: CommandProvider): void {
    this.providers.set(provider.prefix.key, provider);
  }

  getProvider(prefixKey: string): CommandProvider | undefined {
    return this.providers.get(prefixKey);
  }

  getAllProviders(): CommandProvider[] {
    return Array.from(this.providers.values());
  }

  getAllPrefixes(): CommandPrefix[] {
    return this.getAllProviders().map(p => p.prefix);
  }

  /** Providers that participate in global (no-prefix) fuzzy search */
  getGlobalProviders(): CommandProvider[] {
    return this.getAllProviders().filter(p => p.includeInGlobal);
  }
}
