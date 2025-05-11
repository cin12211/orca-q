import { type DatabaseType, DataSource } from 'typeorm';

let currentDBConnectionString = '';
let databaseSource: DataSource | null = null;

const AppDataSource = new DataSource({
  type: 'postgres',
  url: 'postgres://admin:admin@localhost:5432/postgres', // Your connection string
  synchronize: false, // Set to true if you want TypeORM to auto-create tables (use with caution in production)
  logging: true, // Logs SQL queries for debugging,
});

//TODO: only support postgres
export const getDatabaseSource = async ({
  dbConnectionString,
  type,
}: {
  dbConnectionString: string;
  type: DatabaseType;
}) => {
  if (dbConnectionString !== currentDBConnectionString || !databaseSource) {
    databaseSource = new DataSource({
      type: 'postgres', // Ensure the type is explicitly set to 'postgres'
      url: dbConnectionString, // Your connection string
      synchronize: false, // Set to true if you want TypeORM to auto-create tables (use with caution in production)
      logging: true, // Logs SQL queries for debugging
    });

    await databaseSource.initialize();

    currentDBConnectionString = dbConnectionString;

    return databaseSource;
  }

  return databaseSource;
};

export async function healthCheckConnection({ url }: { url: string }) {
  try {
    const connection = new DataSource({
      type: 'postgres', // Ensure the type is explicitly set to 'postgres'
      url, // Your connection string
      synchronize: false, // Set to true if you want TypeORM to auto-create tables (use with caution in production)
      logging: true, // Logs SQL queries for debugging
      entities: [], // Add entities if required
    });

    await connection.initialize();

    return connection.isConnected;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
