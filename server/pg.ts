import pg from 'pg';
import { recordSqlEvent } from './logger.js';

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.SQL_HOST || '127.0.0.1',
  user: process.env.SQL_USER || process.env.SQL_ADMIN_USER || 'postgres',
  password: process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD,
  database: process.env.SQL_DB_NAME || 'cloud_sql_development_database',
  port: Number(process.env.SQL_PORT) || 5432,
  max: 25,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000, // Increased from 5000ms to 15000ms for Cloud Run cold starts
});

pool.on('error', (err) => {
  console.error('\x1b[41m\x1b[37m[PostgreSQL Pool Error]\x1b[0m', err);
});

function isWriteStatement(sql: string): boolean {
  const trimmed = sql.trim().toUpperCase();
  return (
    trimmed.startsWith('INSERT') ||
    trimmed.startsWith('UPDATE') ||
    trimmed.startsWith('DELETE') ||
    trimmed.startsWith('CREATE') ||
    trimmed.startsWith('DROP') ||
    trimmed.startsWith('ALTER')
  );
}

export async function query<T = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  const isWrite = isWriteStatement(text);

  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    if (isWrite) {
      recordSqlEvent({
        type: 'WRITE_QUERY',
        query: text,
        rowCount: res.rowCount ?? 0,
        durationMs: duration,
        status: 'SUCCESS'
      });
    }

    if (duration > 500) {
      console.warn(`\x1b[33m[Slow Query ${duration}ms]\x1b[0m`, text.slice(0, 100));
    }

    return res;
  } catch (err: any) {
    const duration = Date.now() - start;
    recordSqlEvent({
      type: 'SQL_ERROR',
      query: text,
      durationMs: duration,
      error: err.message || String(err),
      status: 'FAILED'
    });
    throw err;
  }
}

/**
 * Returns a PoolClient with full SQL transaction logging (BEGIN, COMMIT, ROLLBACK, and write queries).
 */
export async function getClient(): Promise<pg.PoolClient> {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);

  let txStartTime = 0;

  // Wrap query method to capture transaction lifecycle
  client.query = (async (...args: any[]) => {
    const firstArg = args[0];
    const sqlText = typeof firstArg === 'string' ? firstArg : firstArg?.text || '';
    const upper = sqlText.trim().toUpperCase();
    const start = Date.now();

    if (upper === 'BEGIN') {
      txStartTime = Date.now();
      recordSqlEvent({
        type: 'TX_BEGIN',
        query: 'BEGIN',
        status: 'SUCCESS'
      });
    }

    try {
      const result = await (originalQuery as any)(...args);
      const duration = Date.now() - start;

      if (upper === 'COMMIT') {
        const txTotalDuration = txStartTime > 0 ? Date.now() - txStartTime : duration;
        recordSqlEvent({
          type: 'TX_COMMIT',
          query: 'COMMIT',
          durationMs: txTotalDuration,
          status: 'SUCCESS'
        });
      } else if (upper === 'ROLLBACK') {
        recordSqlEvent({
          type: 'TX_ROLLBACK',
          query: 'ROLLBACK',
          durationMs: duration,
          status: 'ROLLED_BACK'
        });
      } else if (isWriteStatement(sqlText)) {
        recordSqlEvent({
          type: 'WRITE_QUERY',
          query: sqlText,
          rowCount: result?.rowCount ?? 0,
          durationMs: duration,
          status: 'SUCCESS'
        });
      }

      return result;
    } catch (err: any) {
      const duration = Date.now() - start;
      if (upper === 'COMMIT') {
        recordSqlEvent({
          type: 'TX_ROLLBACK',
          query: 'COMMIT_FAILED',
          durationMs: duration,
          error: err.message || String(err),
          status: 'FAILED'
        });
      } else {
        recordSqlEvent({
          type: 'SQL_ERROR',
          query: sqlText,
          durationMs: duration,
          error: err.message || String(err),
          status: 'FAILED'
        });
      }
      throw err;
    }
  }) as any;

  return client;
}
