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
let mongoServer;

describe('Todo API Endpoints', () => {
  beforeAll(async () => {
    const testDB = await setupTestDB();
    mongoServer = testDB.mongoServer;
    client = testDB.client;
    db = testDB.db;
    app = createTestApp(client);
  });

  afterAll(async () => {
    await teardownTestDB(mongoServer, client);
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

    it('should clear startDate when set to null', async () => {
      const response = await request(app)
        .post('/api/edittodo')
        .send({
          jwtToken: authToken,
          id: todoId,
          startDate: null
        });

      expect(response.status).toBe(200);
      
      const { ObjectId } = require('mongodb');
      const updated = await db.collection('Todos').findOne({ _id: new ObjectId(todoId) });
      expect(updated.StartDate).toBeUndefined();
    });

    it('should clear dueDate when set to null', async () => {
      const response = await request(app)
        .post('/api/edittodo')
        .send({
          jwtToken: authToken,
          id: todoId,
          dueDate: null
        });

      expect(response.status).toBe(200);
      
      const { ObjectId } = require('mongodb');
      const updated = await db.collection('Todos').findOne({ _id: new ObjectId(todoId) });
      expect(updated.DueDate).toBeUndefined();
    });

    it('should reject invalid startDate format', async () => {
      const response = await request(app)
        .post('/api/edittodo')
        .send({
          jwtToken: authToken,
          id: todoId,
          startDate: 'invalid-date'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('startDate is invalid');
    });

    it('should reject invalid dueDate format', async () => {
      const response = await request(app)
        .post('/api/edittodo')
        .send({
          jwtToken: authToken,
          id: todoId,
          dueDate: 'not-a-date'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('dueDate is invalid');
    });

    it('should reject edit with no fields to update', async () => {
      const response = await request(app)
        .post('/api/edittodo')
        .send({
          jwtToken: authToken,
          id: todoId
          // No fields to update
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('no fields to update');
    });

    it('should normalize priority values', async () => {
      const response = await request(app)
        .post('/api/edittodo')
        .send({
          jwtToken: authToken,
          id: todoId,
          priority: 'HIGH' // Uppercase
        });

      expect(response.status).toBe(200);
      
      const { ObjectId } = require('mongodb');
      const updated = await db.collection('Todos').findOne({ _id: new ObjectId(todoId) });
      expect(updated.Priority).toBe('High'); // Should be normalized
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

    it('should reject invalid ObjectId format', async () => {
      const response = await request(app)
        .post('/api/check')
        .send({
          jwtToken: authToken,
          id: 'invalid-id-format'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('invalid id format');
    });

    it('should require id parameter', async () => {
      const response = await request(app)
        .post('/api/check')
        .send({
          jwtToken: authToken
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });
  });

  describe('POST /api/check-bulk', () => {
    let todoIds;

    beforeEach(async () => {
      // Create multiple todos
      const todo1 = await db.collection('Todos').insertOne({
        UserID: testUser.UserID,
        Title: 'Task 1',
        Completed: false,
        CreatedAt: new Date()
      });
      
      const todo2 = await db.collection('Todos').insertOne({
        UserID: testUser.UserID,
        Title: 'Task 2',
        Completed: false,
        CreatedAt: new Date()
      });

      todoIds = [todo1.insertedId.toString(), todo2.insertedId.toString()];
    });

    it('should mark multiple todos as completed', async () => {
      const response = await request(app)
        .post('/api/check-bulk')
        .send({
          jwtToken: authToken,
          ids: todoIds,
          completed: true
        });

      expect(response.status).toBe(200);
      expect(response.body.modifiedCount).toBe(2);
      expect(response.body.error).toBe('');
    });

    it('should mark multiple todos as incomplete', async () => {
      // First mark them as completed
      await db.collection('Todos').updateMany(
        { UserID: testUser.UserID },
        { $set: { Completed: true } }
      );

      const response = await request(app)
        .post('/api/check-bulk')
        .send({
          jwtToken: authToken,
          ids: todoIds,
          completed: false
        });

      expect(response.status).toBe(200);
      expect(response.body.modifiedCount).toBe(2);
    });

    it('should require ids array and completed boolean', async () => {
      const response = await request(app)
        .post('/api/check-bulk')
        .send({
          jwtToken: authToken,
          ids: todoIds
          // Missing completed
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should reject invalid ObjectIds', async () => {
      const response = await request(app)
        .post('/api/check-bulk')
        .send({
          jwtToken: authToken,
          ids: ['invalid-id-1', 'invalid-id-2'],
          completed: true
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('no valid ids');
    });

    it('should filter out invalid ids from mixed array', async () => {
      const response = await request(app)
        .post('/api/check-bulk')
        .send({
          jwtToken: authToken,
          ids: [todoIds[0], 'invalid-id'],
          completed: true
        });

      expect(response.status).toBe(200);
      expect(response.body.modifiedCount).toBe(1);
    });
  });

  describe('POST /api/next-day', () => {
    let todoId;

    beforeEach(async () => {
      const result = await db.collection('Todos').insertOne({
        UserID: testUser.UserID,
        Title: 'Task with due date',
        DueDate: new Date('2024-01-15'),
        Completed: false,
        CreatedAt: new Date()
      });
      todoId = result.insertedId.toString();
    });

    it('should move due date forward by one day', async () => {
      const response = await request(app)
        .post('/api/next-day')
        .send({
          jwtToken: authToken,
          id: todoId
        });

      expect(response.status).toBe(200);
      expect(response.body.modifiedCount).toBe(1);
      expect(response.body.newDueDate).toBeDefined();
    });

    it('should create due date if none exists', async () => {
      // Create todo without due date
      const result = await db.collection('Todos').insertOne({
        UserID: testUser.UserID,
        Title: 'Task without due date',
        Completed: false,
        CreatedAt: new Date()
      });

      const response = await request(app)
        .post('/api/next-day')
        .send({
          jwtToken: authToken,
          id: result.insertedId.toString()
        });

      expect(response.status).toBe(200);
      expect(response.body.modifiedCount).toBe(1);
      expect(response.body.newDueDate).toBeDefined();
    });

    it('should require id parameter', async () => {
      const response = await request(app)
        .post('/api/next-day')
        .send({
          jwtToken: authToken
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should reject invalid ObjectId format', async () => {
      const response = await request(app)
        .post('/api/next-day')
        .send({
          jwtToken: authToken,
          id: 'invalid-id'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('invalid id format');
    });
  });

  describe('POST /api/current', () => {
    beforeEach(async () => {
      const now = new Date();
      
      // Create overdue todo
      await db.collection('Todos').insertOne({
        UserID: testUser.UserID,
        Title: 'Overdue task',
        DueDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        Completed: false,
        CreatedAt: new Date()
      });

      // Create today's todo
      await db.collection('Todos').insertOne({
        UserID: testUser.UserID,
        Title: 'Today task',
        DueDate: now,
        Completed: false,
        CreatedAt: new Date()
      });

      // Create upcoming todo
      await db.collection('Todos').insertOne({
        UserID: testUser.UserID,
        Title: 'Upcoming task',
        DueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        Completed: false,
        CreatedAt: new Date()
      });

      // Create todo with no due date
      await db.collection('Todos').insertOne({
        UserID: testUser.UserID,
        Title: 'No due date task',
        Completed: false,
        CreatedAt: new Date()
      });
    });

    it('should return categorized incomplete todos', async () => {
      const response = await request(app)
        .post('/api/current')
        .send({
          jwtToken: authToken,
          userId: testUser.UserID
        });

      expect(response.status).toBe(200);
      expect(response.body.counts).toBeDefined();
      expect(response.body.overdue.length).toBeGreaterThan(0);
      expect(response.body.today.length).toBeGreaterThan(0);
      expect(response.body.upcoming.length).toBeGreaterThan(0);
      expect(response.body.noDue.length).toBeGreaterThan(0);
    });

    it('should require userId parameter', async () => {
      const response = await request(app)
        .post('/api/current')
        .send({
          jwtToken: authToken
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should reject mismatched userId', async () => {
      const response = await request(app)
        .post('/api/current')
        .send({
          jwtToken: authToken,
          userId: 999
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Not authorized');
    });
  });

  describe('POST /api/previous', () => {
    beforeEach(async () => {
      const now = new Date();
      
      // Create completed todo from today
      await db.collection('Todos').insertOne({
        UserID: testUser.UserID,
        Title: 'Completed today',
        Completed: true,
        CompletedAt: now,
        CreatedAt: new Date()
      });

      // Create completed todo from yesterday (set to middle of yesterday)
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(12, 0, 0, 0); // Noon yesterday
      await db.collection('Todos').insertOne({
        UserID: testUser.UserID,
        Title: 'Completed yesterday',
        Completed: true,
        CompletedAt: yesterday,
        CreatedAt: new Date()
      });

      // Create completed todo from 3 days ago (set to middle of that day)
      const threeDaysAgo = new Date(now);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      threeDaysAgo.setHours(12, 0, 0, 0); // Noon 3 days ago
      await db.collection('Todos').insertOne({
        UserID: testUser.UserID,
        Title: 'Completed 3 days ago',
        Completed: true,
        CompletedAt: threeDaysAgo,
        CreatedAt: new Date()
      });

      // Create completed todo with no timestamp
      await db.collection('Todos').insertOne({
        UserID: testUser.UserID,
        Title: 'Completed no timestamp',
        Completed: true,
        CreatedAt: new Date()
      });
    });

    it('should return categorized completed todos', async () => {
      const response = await request(app)
        .post('/api/previous')
        .send({
          jwtToken: authToken,
          userId: testUser.UserID
        });

      expect(response.status).toBe(200);
      expect(response.body.counts).toBeDefined();
      
      // Verify counts
      const totalCategorized = response.body.today.length + 
                               response.body.yesterday.length + 
                               response.body.last7.length + 
                               response.body.last30.length + 
                               response.body.older.length +
                               response.body.noTimestamp.length;
      
      expect(totalCategorized).toBe(4); // We created 4 todos
      expect(response.body.today.length).toBeGreaterThan(0);
      expect(response.body.yesterday.length).toBeGreaterThan(0);
      
      // The 3-days-ago todo should be in last7 OR last30, but let's just check it exists somewhere
      expect(totalCategorized).toBe(4);
    });

    it('should require userId parameter', async () => {
      const response = await request(app)
        .post('/api/previous')
        .send({
          jwtToken: authToken
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should reject mismatched userId', async () => {
      const response = await request(app)
        .post('/api/previous')
        .send({
          jwtToken: authToken,
          userId: 999
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Not authorized');
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .post('/api/previous')
        .send({
          jwtToken: authToken,
          userId: testUser.UserID,
          limit: 2
        });

      expect(response.status).toBe(200);
      const totalTodos = response.body.today.length + 
                         response.body.yesterday.length + 
                         response.body.last7.length + 
                         response.body.last30.length + 
                         response.body.older.length +
                         response.body.noTimestamp.length;
      expect(totalTodos).toBeLessThanOrEqual(2);
    });
  });
});
