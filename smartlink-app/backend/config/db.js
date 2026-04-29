const { Pool } = require('pg');

const useSsl = process.env.DB_SSL
  ? process.env.DB_SSL === 'true'
  : process.env.NODE_ENV === 'production';

const baseConfig = process.env.DATABASE_URL
  ? {
      // Prefer the full connection string in hosted environments so
      // partially stale DB_* vars cannot override pieces of it.
      connectionString: process.env.DATABASE_URL,
    }
  : {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    };

const pool = new Pool({
  ...baseConfig,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

module.exports = pool;
