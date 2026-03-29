import pg from 'pg';
import {
  POSTGRES_HOST,
  POSTGRES_PORT,
  POSTGRES_DB,
  POSTGRES_USER,
  POSTGRES_PASSWORD
} from '$env/static/private';

const { Pool } = pg;

let pool: pg.Pool;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      host: POSTGRES_HOST,
      port: parseInt(POSTGRES_PORT),
      database: POSTGRES_DB,
      user: POSTGRES_USER,
      password: POSTGRES_PASSWORD,
    });
  }
  return pool;
}

export async function closePostgres(): Promise<void> {
  if (pool) {
    await pool.end();
  }
}
