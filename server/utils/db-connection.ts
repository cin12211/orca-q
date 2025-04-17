import { DataSource } from 'typeorm';

const AppDataSource = new DataSource({
  type: 'postgres',
  url: 'postgres://admin:admin@localhost:5432/postgres', // Your connection string
  synchronize: false, // Set to true if you want TypeORM to auto-create tables (use with caution in production)
  logging: true, // Logs SQL queries for debugging,
});

export async function healthCheckConnection() {
  try {
    if (AppDataSource.isInitialized) {
      return true;
    }

    await AppDataSource.initialize();
    console.log('Database connection successful!');
    return true;
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
