import pg from 'pg';
import { config } from './config.js';

pg.types.setTypeParser(20, (value) => value);
pg.types.setTypeParser(1700, (value) => value);

export const pool = new pg.Pool({ ...config.db, max: 12 });

export async function transaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const value = await fn(client);
    await client.query('COMMIT');
    return value;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export type DbClient = pg.PoolClient;
