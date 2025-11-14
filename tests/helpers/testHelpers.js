const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const express = require('express');
const bodyParser = require('body-parser');

let mongoServer;
let client;
let db;

/**
 * Setup in-memory MongoDB for testing
 */
async function setupTestDB() {
  const localMongoServer = await MongoMemoryServer.create();
  const uri = localMongoServer.getUri();
  
  const localClient = new MongoClient(uri);
  await localClient.connect();
  
  const localDb = localClient.db('TestTodoApp');
  
  return { mongoServer: localMongoServer, client: localClient, db: localDb };
}

/**
 * Teardown test database
 */
async function teardownTestDB(mongoServer, client) {
  if (client) {
    await client.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
}

/**
 * Clear all collections in test database
 */
async function clearTestDB(db) {
  const collections = await db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
}

/**
 * Create a test Express app with API routes
 */
function createTestApp(client) {
  const app = express();
  app.use(bodyParser.json());
  
  // Set the test database directly on app.locals so api.js uses it
  app.locals.db = client.db('TestTodoApp');
  
  // Set up API routes
  const api = require('../../api');
  api.setApp(app, client);
  
  return app;
}

/**
 * Create mock user data
 */
function createMockUser(overrides = {}) {
  return {
    UserID: 1,
    FirstName: 'Test',
    LastName: 'User',
    Login: 'testuser',
    Password: 'password123',
    Email: 'test@example.com',
    EmailVerified: true,
    CreatedAt: new Date(),
    UpdatedAt: new Date(),
    ...overrides
  };
}

/**
 * Create mock todo data
 */
function createMockTodo(userID, overrides = {}) {
  return {
    UserID: userID,
    TaskName: 'Test Task',
    Priority: 'Medium',
    Completed: false,
    TaskDate: new Date(),
    CreatedAt: new Date(),
    ...overrides
  };
}

/**
 * Insert a user into test database
 */
async function insertTestUser(db, userData) {
  const Users = db.collection('Users');
  const user = createMockUser(userData);
  const result = await Users.insertOne(user);
  return { ...user, _id: result.insertedId };
}

/**
 * Insert a todo into test database
 */
async function insertTestTodo(db, todoData) {
  const Todos = db.collection('Todos');
  const todo = createMockTodo(todoData.UserID, todoData);
  const result = await Todos.insertOne(todo);
  return { ...todo, _id: result.insertedId };
}

module.exports = {
  setupTestDB,
  teardownTestDB,
  clearTestDB,
  createTestApp,
  createMockUser,
  createMockTodo,
  insertTestUser,
  insertTestTodo
};
