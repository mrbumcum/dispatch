const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dispatch';
let client = null;
let db = null;

async function connectDB() {
  try {
    if (!client) {
      client = new MongoClient(MONGODB_URI);
      await client.connect();
      db = client.db();
      console.log('Connected to MongoDB');
    }
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
}

function getDB() {
  if (!db) {
    throw new Error('Database not connected. MongoDB may not be running. Start MongoDB with "mongod" or "brew services start mongodb-community"');
  }
  return db;
}

module.exports = { connectDB, closeDB, getDB };

