const mongoose = require('mongoose');
const dns = require('dns');

// Fix for Windows DNS ECONNREFUSED when querying MongoDB Atlas SRV records
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // fallback if custom DNS set fails
}

let isConnecting = false;

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    console.error('MONGODB_URI is not defined in environment variables');
    return;
  }

  if (mongoose.connection.readyState === 1 || isConnecting) {
    return;
  }

  isConnecting = true;

  try {
    const conn = await mongoose.connect(mongoURI, {
      dbName: 'bhoomi_setu',
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });

    isConnecting = false;
    console.log('MongoDB Atlas: Connected');
    console.log(`Database: ${conn.connection.name || 'bhoomi_setu'}`);
    return conn;
  } catch (error) {
    isConnecting = false;
    console.error('MongoDB Atlas Connection Error:', error.message);
    console.log('Scheduling reconnection attempt in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error occurred:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB Atlas disconnected. Attempting reconnection in 5s...');
  setTimeout(connectDB, 5000);
});

module.exports = connectDB;
