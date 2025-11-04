require('dotenv').config();
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DATABASE_URL || './hackathon.db';
const schemaPath = path.join(__dirname, 'schema.sql');

console.log('Initializing database...');

// Remove existing database if it exists (for fresh start)
if (fs.existsSync(dbPath)) {
  console.log('Existing database found. Backing up...');
  fs.copyFileSync(dbPath, `${dbPath}.backup`);
}

const db = new Database(dbPath);

// Read and execute schema
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

console.log('Database initialized successfully!');
console.log(`Database location: ${path.resolve(dbPath)}`);

// Close connection
db.close();

