const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './touch.env' });

const app = express();

// CORS setup
const allowedOrigins = [
  'http://localhost:5173',
  'http://cop4331-group5.xyz',
  'https://cop4331-group5.xyz'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

app.use(bodyParser.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});


// MongoDB setup
const url = process.env.MONGODB_URI;
const client = new MongoClient(url);

async function startServer() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const api = require('./api.js');
    api.setApp(app, client);

    // Serve the built frontend from ../dist
    app.use(express.static(path.join(__dirname, '../dist')));

    // Serve index.html for all other routes (SPA support)
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../dist', 'index.html'));
    });

    const PORT = 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
}

startServer();
