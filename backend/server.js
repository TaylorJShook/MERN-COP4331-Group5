const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, 'touch.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`Loaded environment from ${envPath}`);
} else {
  console.error(`touch.env not found at ${envPath}`);
}

const app = express();

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://cop4331-group5.xyz',
    'https://cop4331-group5.xyz'
  ],
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

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
}

startServer();
