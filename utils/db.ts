import mysql, { PoolOptions, Pool, RowDataPacket } from 'mysql2/promise';

// Check if we're in production mode
const isProd = process.env.NODE_ENV === 'production';

/**
 * Optimized MySQL connection pool for local production use with enhanced connection management
 */
const pool: Pool = mysql.createPool({
  // Connection parameters
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '12345678',
  database: 'karate_academy_db',

  // Connection pool optimization - UPDATED VALUES
  waitForConnections: true,
  connectionLimit: isProd ? 15 : 8, // Reduced to prevent resource exhaustion
  maxIdle: 5, // Reduced idle connections to prevent resource hogging
  idleTimeout: 30000, // Reduced to 30 seconds to release connections faster
  queueLimit: 25, // Added queue limit to prevent request pileup during traffic spikes

  // Enhanced timeout settings
  connectTimeout: 10000, // Reduced to 10 seconds

  // Keep-alive settings - optimized
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000, // Increased to reduce unnecessary pings

  // Additional stability settings
  dateStrings: true,
  namedPlaceholders: true,

  // Debug settings
  debug: process.env.DB_DEBUG === 'true',
} as PoolOptions);

// Connection monitoring (add this to track active connections)
let activeConnections = 0;

/**
 * Enhanced connection tracking wrapper
 * This helps identify connection leaks in your application
 */
export const getTrackedConnection = async () => {
  activeConnections++;
  const connection = await pool.getConnection();

  // Log connection stats periodically to help diagnose issues
  if (activeConnections > (isProd ? 10 : 5)) {
    console.warn(`⚠️ High connection count: ${activeConnections} active connections`);
  }

  // Wrap the release method to track connections
  const originalRelease = connection.release;
  connection.release = () => {
    activeConnections--;
    return originalRelease.call(connection);
  };

  return connection;
};

/**
 * Enhanced connection test with detailed diagnostics
 */
export const testConnection = async () => {
  let connection;
  try {
    // Test basic connectivity
    connection = await getTrackedConnection();
    console.log('✅ Database connection established successfully');

    // Check version and status for diagnostics
    const [rows] = await connection.query<RowDataPacket[]>('SELECT VERSION() as version');
    console.log(`📊 MySQL Server Version: ${rows[0]?.version}`);

    return {
      success: true,
      version: rows[0]?.version as string
    };
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  } finally {
    if (connection) connection.release();
  }
};

interface QueryOptions {
  retries?: number;
  logQuery?: boolean;
}

type QueryParams = any[] | Record<string, any>;

interface DbError extends Error {
  code?: string;
}

/**
 * Robust query execution with retries for offline production use
 */
export const executeQuery = async (
  sql: string,
  params: QueryParams = [],
  options: QueryOptions = {}
) => {
  const { retries = 2, logQuery = false } = options;
  let attempts = 0;

  while (attempts <= retries) {
    try {
      if (logQuery && isProd) {
        console.log(`Running query (attempt ${attempts + 1}/${retries + 1}):`, sql);
      }

      // Use execute for prepared statements (safer)
      const [results] = Array.isArray(params)
        ? await pool.execute(sql, params)
        : await pool.execute(sql, params); // Support for named parameters

      return results;
    } catch (error) {
      attempts++;

      // Type assertion for error
      const dbError = error as DbError;

      // Only retry connection errors, not query syntax errors
      const isConnectionError = [
        'PROTOCOL_CONNECTION_LOST',
        'ER_CON_COUNT_ERROR',
        'ECONNREFUSED',
        'ETIMEDOUT'
      ].includes(dbError.code || '');

      // If it's not a connection error or we're out of attempts, throw the error
      if (!isConnectionError || attempts > retries) {
        throw error;
      }

      // Otherwise, we'll retry (loop continues)
      console.warn(`Database error (attempt ${attempts}/${retries}):`, dbError.message);
    }
  }
};

/**
 * Safer query execution that automatically handles connections
 * Use this as your primary database access method
 */
export const safeQuery = async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
  const connection = await getTrackedConnection();
  try {
    const [results] = await connection.execute<T[] & RowDataPacket[]>(sql, params);
    return results;
  } finally {
    connection.release(); // Always release, even if there's an error
  }
};

/**
 * Single-use query for simple operations (no connection tracking)
 */
export const query = async (sql: string, params: any[] = []) => {
  return pool.execute(sql, params);
};

/**
 * Enhanced transaction helper with automatic connection management
 */
export const withTransaction = async <T>(callback: (connection: mysql.PoolConnection) => Promise<T>): Promise<T> => {
  const connection = await getTrackedConnection();
  await connection.beginTransaction();

  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release(); // Always release the connection
  }
};

/**
 * Health check that includes connection pool statistics
 */
export const checkDbHealth = async () => {
  let connection;
  try {
    connection = await getTrackedConnection();
    const [versionRows] = await connection.query<RowDataPacket[]>('SELECT VERSION() as version');
    const [threadRows] = await connection.query<RowDataPacket[]>('SHOW STATUS LIKE "Threads_connected"');

    return {
      success: true,
      version: versionRows[0]?.version as string,
      poolStats: {
        activeConnections,
        threadCount: threadRows[0]?.Value,
        connectionLimit: isProd ? 15 : 8
      }
    };
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    return {
      success: false,
      error: (error as Error).message,
      poolStats: { activeConnections }
    };
  } finally {
    if (connection) connection.release();
  }
};

// Default export for backward compatibility
export default pool;
