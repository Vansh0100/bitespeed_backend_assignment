const { Pool } = require('pg');
const config = require('../config/config');

class Database {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DB_CONN_LINK || `postgresql://${config.database.user}:${config.database.password}@${config.database.host}:${config.database.port}/${config.database.name}`,
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
      max: config.database.poolSize,
      connectionTimeoutMillis: config.database.connectionTimeoutMillis,
      idleTimeoutMillis: config.database.idleTimeoutMillis
    });

    this.pool.on('connect', () => {
      console.log('New client connected to PostgreSQL');
    });

    this.pool.on('error', (err) => {
      console.log('Unexpected error on idle client', err);
    });
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log(`Executed query: ${text} - Duration: ${duration}ms`);
      return result;
    } catch (error) {
      console.log(`Query error: ${error.message}`, { query: text, params });
      throw error;
    }
  }

  async getClient() {
    return await this.pool.connect();
  }

  async testConnection() {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('Database connection test successful');
      return true;
    } catch (error) {
      console.log('Database connection test failed:', error);
      throw error;
    }
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async end() {
    await this.pool.end();
    console.log('Database pool has ended');
  }
}

module.exports = new Database();
