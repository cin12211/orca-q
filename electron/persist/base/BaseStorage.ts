export abstract class BaseStorage<T extends { id: string }> {
  abstract readonly name: string;

  abstract getOne(id: string): Promise<T | null>;

  abstract getMany(filters?: Partial<T>): Promise<T[]>;

  abstract create(entity: T): Promise<T>;

  abstract update(entity: Partial<T> & { id: string }): Promise<T | null>;

  abstract delete(id: string): Promise<T | null>;

  abstract upsert(entity: T): Promise<T>;
}
