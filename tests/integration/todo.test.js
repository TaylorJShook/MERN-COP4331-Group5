const request = require('supertest');
const tokenModule = require('../../createJWT');
const {
  setupTestDB,
  teardownTestDB,
  clearTestDB,
  createTestApp,
  insertTestUser,
  insertTestTodo
} = require('../helpers/testHelpers');

// Mock environment variables
process.env.ACCESS_TOKEN_SECRET = 'test-secret-key';
process.env.SENDGRID_API_KEY = '';

let app;
let client;
let db;
let testUser;
let authToken;

describe('Todo API Endpoints', () => {
  beforeAll(async () => {
    const testDB = await setupTestDB();
    client = testDB.client;
    db = testDB.db;
    app = createTestApp(client);
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB(db);
    
    // Create a test user and get auth token
    testUser = await insertTestUser(db, {
      UserID: 1,
      Login: 'testuser',
      Password: 'password123',
      EmailVerified: true
    });
    
    const tokenResult = tokenModule.createToken(
      testUser.FirstName,
      testUser.LastName,
      testUser.UserID
    );
    authToken = tokenResult.accessToken;
  });

  describe('POST /api/addtodo', () => {
    it('should add a new todo with valid data', async () => {
      const response = await request(app)
        .post('/api/addtodo')
        .send({
          jwtToken: authToken,
          userId: testUser.UserID,
          title: 'New Task',
          priority: 'High',
          dueDate: '2025-11-15'
        });

      expect(response.status).toBe(200);
      expect(response.body.error).toBe('');
      expect(response.body).toHaveProperty('jwtToken');

      // Verify todo was created
      const todos = await db.collection('Todos').find({ UserID: testUser.UserID }).toArray();
      expect(todos.length).toBe(1);
      expect(todos[0].Title).toBe('New Task');
      expect(todos[0].Priority).toBe('High');
    });

    it('should reject todo without authentication', async () => {
      const response = await request(app)
        .post('/api/addtodo')
        .send({
          userId: testUser.UserID,
          title: 'New Task',
          priority: 'High'
        });

      expect(response.status).toBe(200);
      expect(response.body.error).toContain('JWT');
    });

    it('should reject todo with missing title', async () => {
      const response = await request(app)
        .post('/api/addtodo')
        .send({
          jwtToken: authToken,
          userId: testUser.UserID,
          priority: 'High'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should default priority to Low if not provided', async () => {
      const response = await request(app)
        .post('/api/addtodo')
        .send({
          jwtToken: authToken,
          userId: testUser.UserID,
          title: 'Task with default priority'
        });

      expect(response.status).toBe(200);
      
      const todo = await db.collection('Todos').findOne({ Title: 'Task with default priority' });
      expect(todo.Priority).toBe('Low');
    });

    it('should normalize priority values', async () => {
      const response = await request(app)
        .post('/api/addtodo')
        .send({
          jwtToken: authToken,
          userId: testUser.UserID,
          title: 'Task with lowercase priority',
          priority: 'medium'
        });

      expect(response.status).toBe(200);
      
      const todo = await db.collection('Todos').findOne({ Title: 'Task with lowercase priority' });
      expect(todo.Priority).toBe('Medium');
    });
  });

  describe('POST /api/gettodos', () => {
    beforeEach(async () => {
      // Clear and re-setup for this specific test suite
      await clearTestDB(db);
      
      // Recreate test user
      testUser = await insertTestUser(db, {
        UserID: 1,
        Login: 'testuser',
        Password: 'password123',
        EmailVerified: true
      });
      
      const tokenResult = tokenModule.createToken(
        testUser.FirstName,
        testUser.LastName,
        testUser.UserID
      );
      authToken = tokenResult.accessToken;
      
      // Add some test todos using new schema
      await db.collection('Todos').insertOne({
        UserID: testUser.UserID,
        Title: 'Task 1',
        Description: '',
        Priority: 'High',
        DueDate: new Date('2025-11-15'),
        Completed: false,
        CreatedAt: new Date()
      });
      await db.collection('Todos').insertOne({
        UserID: testUser.UserID,
        Title: 'Task 2',
        Description: '',
        Priority: 'Low',
        DueDate: new Date('2025-11-15'),
        Completed: true,
        CreatedAt: new Date()
      });
      await db.collection('Todos').insertOne({
        UserID: testUser.UserID,
        Title: 'Task 3',
        Description: '',
        Priority: 'Medium',
        DueDate: new Date('2025-11-16'),
        Completed: false,
        CreatedAt: new Date()
      });
    });

    it('should get all todos for user', async () => {
      const response = await request(app)
        .post('/api/gettodos')
        .send({
          jwtToken: authToken,
          userId: testUser.UserID
        });

      expect(response.status).toBe(200);
      expect(response.body.error).toBe('');
      expect(response.body.results).toHaveLength(3);
      expect(response.body.results[0].title).toBeDefined();
    });

    it('should return empty array when user has no todos', async () => {
      // Clear todos only
      await db.collection('Todos').deleteMany({});

      const response = await request(app)
        .post('/api/gettodos')
        .send({
          jwtToken: authToken,
          userId: testUser.UserID
        });

      expect(response.status).toBe(200);
      expect(response.body.results).toHaveLength(0);
    });

    it('should not return todos from other users', async () => {
      // Create another user and their todo
      const otherUser = await insertTestUser(db, {
        UserID: 2,
        Login: 'otheruser',
        Email: 'other@example.com'
      });
      await db.collection('Todos').insertOne({
        UserID: otherUser.UserID,
        Title: 'Other User Task',
        Description: '',
        Priority: 'Medium',
        Completed: false,
        CreatedAt: new Date()
      });

      const response = await request(app)
        .post('/api/gettodos')
        .send({
          jwtToken: authToken,
          userId: testUser.UserID
        });

      expect(response.status).toBe(200);
      expect(response.body.results).toHaveLength(3); // Only test user's todos
      expect(response.body.results.every(t => t.title !== 'Other User Task')).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/gettodos')
        .send({
          userId: testUser.UserID
        });

      expect(response.status).toBe(200);
      expect(response.body.error).toContain('JWT');
    });
  });

  describe('POST /api/edittodo', () => {
    let todoId;

    beforeEach(async () => {
      // Clear and re-setup for this specific test suite
      await clearTestDB(db);
      
      // Recreate test user
      testUser = await insertTestUser(db, {
        UserID: 1,
        Login: 'testuser',
        Password: 'password123',
        EmailVerified: true
      });
      
      const tokenResult = tokenModule.createToken(
        testUser.FirstName,
        testUser.LastName,
        testUser.UserID
      );
      authToken = tokenResult.accessToken;
      
      const result = await db.collection('Todos').insertOne({
        UserID: testUser.UserID,
        Title: 'Original Task',
        Description: '',
        Priority: 'Low',
        DueDate: new Date('2025-11-15'),
        Completed: false,
        CreatedAt: new Date()
      });
      todoId = result.insertedId.toString();
    });

    it('should edit an existing todo', async () => {
      const response = await request(app)
        .post('/api/edittodo')
        .send({
          jwtToken: authToken,
          id: todoId,
          title: 'Updated Task',
          priority: 'High'
        });

      expect(response.status).toBe(200);
      expect(response.body.error).toBe('');

      // Verify todo was updated
      const { ObjectId } = require('mongodb');
      const updated = await db.collection('Todos').findOne({ _id: new ObjectId(todoId) });
      expect(updated.Title).toBe('Updated Task');
      expect(updated.Priority).toBe('High');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/edittodo')
        .send({
          id: todoId,
          title: 'Updated Task'
        });

      expect(response.status).toBe(200);
      expect(response.body.error).toContain('JWT');
    });

    it('should reject edit with invalid todo id', async () => {
      const response = await request(app)
        .post('/api/edittodo')
        .send({
          jwtToken: authToken,
          id: 'invalid-id',
          title: 'Updated Task'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('invalid');
    });

    it('should not allow editing another user\'s todo', async () => {
      // Create another user and their todo
      const otherUser = await insertTestUser(db, {
        UserID: 2,
        Login: 'otheruser',
        Email: 'other@example.com'
      });
      const otherResult = await db.collection('Todos').insertOne({
        UserID: otherUser.UserID,
        Title: 'Other User Task',
        Description: '',
        Priority: 'Medium',
        Completed: false,
        CreatedAt: new Date()
      });

      const response = await request(app)
        .post('/api/edittodo')
        .send({
          jwtToken: authToken,
          id: otherResult.insertedId.toString(),
          title: 'Hacked Task'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('authorized');
    });
  });

  describe('POST /api/deletetodo', () => {
    let todoId;

    beforeEach(async () => {
      // Clear and re-setup for this specific test suite
      await clearTestDB(db);
      
      // Recreate test user
      testUser = await insertTestUser(db, {
        UserID: 1,
        Login: 'testuser',
        Password: 'password123',
        EmailVerified: true
      });
      
      const tokenResult = tokenModule.createToken(
        testUser.FirstName,
        testUser.LastName,
        testUser.UserID
      );
      authToken = tokenResult.accessToken;
      
      const result = await db.collection('Todos').insertOne({
        UserID: testUser.UserID,
        Title: 'Task to Delete',
        Description: '',
        Priority: 'Medium',
        Completed: false,
        CreatedAt: new Date()
      });
      todoId = result.insertedId.toString();
    });

    it('should delete an existing todo', async () => {
      const response = await request(app)
        .post('/api/deletetodo')
        .send({
          jwtToken: authToken,
          id: todoId
        });

      expect(response.status).toBe(200);
      expect(response.body.error).toBe('');

      // Verify todo was deleted
      const { ObjectId } = require('mongodb');
      const deleted = await db.collection('Todos').findOne({ _id: new ObjectId(todoId) });
      expect(deleted).toBeNull();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/deletetodo')
        .send({
          id: todoId
        });

      expect(response.status).toBe(200);
      expect(response.body.error).toContain('JWT');
    });

    it('should reject delete with invalid todo id', async () => {
      const response = await request(app)
        .post('/api/deletetodo')
        .send({
          jwtToken: authToken,
          id: 'invalid-id'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('invalid');
    });
  });

  describe('POST /api/check', () => {
    let todoId;

    beforeEach(async () => {
      // Clear and re-setup for this specific test suite
      await clearTestDB(db);
      
      // Recreate test user
      testUser = await insertTestUser(db, {
        UserID: 1,
        Login: 'testuser',
        Password: 'password123',
        EmailVerified: true
      });
      
      const tokenResult = tokenModule.createToken(
        testUser.FirstName,
        testUser.LastName,
        testUser.UserID
      );
      authToken = tokenResult.accessToken;
      
      const result = await db.collection('Todos').insertOne({
        UserID: testUser.UserID,
        Title: 'Task to Check',
        Description: '',
        Priority: 'Medium',
        Completed: false,
        CreatedAt: new Date()
      });
      todoId = result.insertedId.toString();
    });

    it('should toggle todo completion status', async () => {
      // First check (mark as completed)
      let response = await request(app)
        .post('/api/check')
        .send({
          jwtToken: authToken,
          id: todoId
        });

      expect(response.status).toBe(200);
      expect(response.body.error).toBe('');

      const { ObjectId } = require('mongodb');
      let todo = await db.collection('Todos').findOne({ _id: new ObjectId(todoId) });
      expect(todo.Completed).toBe(true);

      // Second check (mark as not completed)
      response = await request(app)
        .post('/api/check')
        .send({
          jwtToken: authToken,
          id: todoId
        });

      expect(response.status).toBe(200);
      
      todo = await db.collection('Todos').findOne({ _id: new ObjectId(todoId) });
      expect(todo.Completed).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/check')
        .send({
          id: todoId
        });

      expect(response.status).toBe(200);
      expect(response.body.error).toContain('JWT');
    });
  });
});
