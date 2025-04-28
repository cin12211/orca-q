import { type DatabaseType, DataSource } from 'typeorm';

let currentConnectionUrl = '';
let databaseSource: DataSource | null = null;

const AppDataSource = new DataSource({
  type: 'postgres',
  url: 'postgres://admin:admin@localhost:5432/postgres', // Your connection string
  synchronize: false, // Set to true if you want TypeORM to auto-create tables (use with caution in production)
  logging: true, // Logs SQL queries for debugging,
});

//TODO: only support postgres
export const getDatabaseSource = async ({
  connectionUrl,
  type,
}: {
  connectionUrl: string;
  type: DatabaseType;
}) => {
  if (connectionUrl !== currentConnectionUrl || !databaseSource) {
    databaseSource = new DataSource({
      type: 'postgres', // Ensure the type is explicitly set to 'postgres'
      url: connectionUrl, // Your connection string
      synchronize: false, // Set to true if you want TypeORM to auto-create tables (use with caution in production)
      logging: true, // Logs SQL queries for debugging
    });

    await databaseSource.initialize();

    currentConnectionUrl = connectionUrl;

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

// Function to run a simple query
export async function executeQuery(query: string) {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const result = await AppDataSource.query(query);
    console.log('Query result:', result);
    return result;
  } catch (error) {
    console.error('Query failed:', error);
    return error;
  }
}
