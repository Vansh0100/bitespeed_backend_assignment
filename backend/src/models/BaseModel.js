const database = require('../database/connection');
const { AppError } = require('../middleware/errorHandler');

class BaseModel {
  constructor(tableName) {
    this.tableName = tableName;
  }

  async findAll(options = {}) {
    const {
      where = {},
      orderBy = 'created_at',
      order = 'DESC',
      limit = 20,
      offset = 0,
      select = '*'
    } = options;

    let query = `SELECT ${select} FROM ${this.tableName}`;
    const values = [];
    let valueIndex = 1;

    // Add WHERE conditions
    if (Object.keys(where).length > 0) {
      const conditions = Object.keys(where).map(key => {
        values.push(where[key]);
        return `${key} = $${valueIndex++}`;
      });
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add ORDER BY
    query += ` ORDER BY ${orderBy} ${order}`;

    // Add LIMIT and OFFSET
    query += ` LIMIT $${valueIndex++} OFFSET $${valueIndex++}`;
    values.push(limit, offset);

    const result = await database.query(query, values);
    return result.rows;
  }

  async findById(id, select = '*') {
    const query = `SELECT ${select} FROM ${this.tableName} WHERE id = $1`;
    const result = await database.query(query, [id]);
    return result.rows[0] || null;
  }

  async findOne(where = {}, select = '*') {
    let query = `SELECT ${select} FROM ${this.tableName}`;
    const values = [];
    let valueIndex = 1;

    if (Object.keys(where).length > 0) {
      const conditions = Object.keys(where).map(key => {
        values.push(where[key]);
        return `${key} = $${valueIndex++}`;
      });
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' LIMIT 1';
    const result = await database.query(query, values);
    return result.rows[0] || null;
  }

  async create(data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, index) => `$${index + 1}`);

    const query = `
      INSERT INTO ${this.tableName} (${keys.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    const result = await database.query(query, values);
    return result.rows[0];
  }

  async update(id, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    
    if (keys.length === 0) {
      throw new AppError('No data provided for update', 400);
    }

    const setClause = keys.map((key, index) => `${key} = $${index + 1}`);
    values.push(id);

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause.join(', ')}
      WHERE id = $${values.length}
      RETURNING *
    `;

    const result = await database.query(query, values);
    
    if (result.rows.length === 0) {
      throw new AppError(`${this.tableName} not found`, 404);
    }

    return result.rows[0];
  }

  async delete(id) {
    const query = `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`;
    const result = await database.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new AppError(`${this.tableName} not found`, 404);
    }

    return result.rows[0];
  }

  async count(where = {}) {
    let query = `SELECT COUNT(*) FROM ${this.tableName}`;
    const values = [];
    let valueIndex = 1;

    if (Object.keys(where).length > 0) {
      const conditions = Object.keys(where).map(key => {
        values.push(where[key]);
        return `${key} = $${valueIndex++}`;
      });
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    const result = await database.query(query, values);
    return parseInt(result.rows[0].count);
  }

  async exists(where = {}) {
    const count = await this.count(where);
    return count > 0;
  }
}

module.exports = BaseModel;
