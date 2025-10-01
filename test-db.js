// test-db.js
import dotenv from 'dotenv';
dotenv.config();

import { pool } from './db.js';

async function testConnection() {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    console.log('DB connection works! Result:', rows);
  } catch (err) {
    console.error('DB connection error:', err);
  } finally {
    process.exit();
  }
}

testConnection();
