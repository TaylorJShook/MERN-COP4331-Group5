const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './touch.env' });

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

app.use(bodyParser.json());

const url = process.env.MONGODB_URI;
const client = new MongoClient(url);

async function startServer() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const api = require('./api.js');
    api.setApp(app, client);

    const PORT = 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
}

startServer();
