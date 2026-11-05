export abstract class Migration {
  abstract readonly name: string;

  public abstract up(): Promise<void>;

  public abstract down(): Promise<void>;
}

export type MigrationConstructor = new () => Migration;
