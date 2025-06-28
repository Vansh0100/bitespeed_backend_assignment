const database = require('../connection');

const createContactsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      phone_number VARCHAR(20),
      email VARCHAR(255),
      linked_id INTEGER REFERENCES contacts(id),
      link_precedence VARCHAR(10) CHECK (link_precedence IN ('primary', 'secondary')) DEFAULT 'primary',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP
    );
  `;

  try {
    await database.query(query);
    console.log('Contacts table created successfully');
  } catch (error) {
    console.log('Error creating contacts table:', error);
    throw error;
  }
};

const rollback = async () => {
  const query = `
    DROP TABLE IF EXISTS contacts CASCADE;
  `;

  try {
    await database.query(query);
    console.log('Contacts table dropped successfully');
  } catch (error) {
    console.log('Error dropping contacts table:', error);
    throw error;
  }
};

module.exports = { createContactsTable, rollback };
