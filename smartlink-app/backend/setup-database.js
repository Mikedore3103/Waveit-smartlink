#!/usr/bin/env node

/**
 * Database Setup Script
 * 
 * This script sets up the database schema for the Waveit Smartlink application.
 * Run this after creating your PostgreSQL database on Render/Railway/Heroku.
 * 
 * Usage:
 *   node setup-database.js
 * 
 * Make sure your .env file is configured with the correct database credentials.
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection configuration
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function setupDatabase() {
  console.log('\n🔧 Setting up Waveit Smartlink Database...\n');
  
  try {
    // Test connection
    console.log('📡 Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful!\n');

    // Read schema file
    console.log('📄 Reading schema file...');
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log('✅ Schema file loaded\n');

    // Execute schema
    console.log('🚀 Creating database tables...');
    await pool.query(schema);
    console.log('✅ Database tables created successfully!\n');

    // Verify tables were created
    console.log('🔍 Verifying tables...');
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('\n📊 Created tables:');
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    console.log('\n✅ Database setup complete!\n');
    console.log('You can now start your backend server with: npm start\n');

  } catch (error) {
    console.error('\n❌ Error setting up database:\n');
    console.error(error.message);
    console.error('\nPlease check:');
    console.error('1. Your .env file has correct database credentials');
    console.error('2. Your database server is running');
    console.error('3. You have permission to create tables\n');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the setup
setupDatabase();
