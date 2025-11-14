const request = require('supertest');
const {
  setupTestDB,
  teardownTestDB,
  clearTestDB,
  createTestApp,
  insertTestUser
} = require('../helpers/testHelpers');

// Mock environment variables
process.env.ACCESS_TOKEN_SECRET = 'test-secret-key';
process.env.SENDGRID_API_KEY = '';

let app;
let client;
let db;

describe('Authentication API Endpoints', () => {
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
  });

  describe('POST /api/login', () => {
    it('should login with valid credentials', async () => {
      // Insert a verified user
      await insertTestUser(db, {
        Login: 'johndoe',
        Password: 'password123',
        EmailVerified: true
      });

      const response = await request(app)
        .post('/api/login')
        .send({
          login: 'johndoe',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('jwtToken');
      expect(response.body.error).toBe('');
      expect(response.body.firstName).toBe('Test');
      expect(response.body.lastName).toBe('User');
      expect(response.body.id).toBeDefined();
    });

    it('should reject login with invalid credentials', async () => {
      await insertTestUser(db, {
        Login: 'johndoe',
        Password: 'password123',
        EmailVerified: true
      });

      const response = await request(app)
        .post('/api/login')
        .send({
          login: 'johndoe',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(200);
      expect(response.body.error).toContain('Invalid');
      expect(response.body.id).toBe(-1);
    });

    it('should reject login for unverified email', async () => {
      await insertTestUser(db, {
        Login: 'unverified',
        Password: 'password123',
        EmailVerified: false
      });

      const response = await request(app)
        .post('/api/login')
        .send({
          login: 'unverified',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.error).toContain('verify your email');
      expect(response.body.id).toBe(-1);
    });

    it('should reject login for non-existent user', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          login: 'nonexistent',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.error).toContain('Invalid');
      expect(response.body.id).toBe(-1);
    });
  });

  describe('POST /api/register', () => {
    it('should register a new user with valid data', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          firstName: 'Jane',
          lastName: 'Doe',
          login: 'janedoe',
          password: 'securepass123',
          email: 'jane@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('jwtToken');
      expect(response.body.error).toBe('');
      expect(response.body.firstName).toBe('Jane');
      expect(response.body.lastName).toBe('Doe');

      // Verify user was created in database
      const user = await db.collection('Users').findOne({ Login: 'janedoe' });
      expect(user).toBeDefined();
      expect(user.EmailVerified).toBe(false);
    });

    it('should reject registration with missing fields', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          firstName: 'Jane',
          lastName: 'Doe'
          // Missing login, password, email
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should reject registration with duplicate login', async () => {
      await insertTestUser(db, {
        Login: 'existinguser',
        Email: 'existing@example.com'
      });

      const response = await request(app)
        .post('/api/register')
        .send({
          firstName: 'New',
          lastName: 'User',
          login: 'existinguser',
          password: 'password123',
          email: 'newemail@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.error).toContain('login');
      expect(response.body.error).toContain('already exists');
    });

    it('should reject registration with duplicate email', async () => {
      await insertTestUser(db, {
        Login: 'user1',
        Email: 'duplicate@example.com'
      });

      const response = await request(app)
        .post('/api/register')
        .send({
          firstName: 'New',
          lastName: 'User',
          login: 'user2',
          password: 'password123',
          email: 'duplicate@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.error).toContain('email');
      expect(response.body.error).toContain('already exists');
    });

    it('should auto-increment UserID', async () => {
      // Create first user
      await insertTestUser(db, { UserID: 5 });

      // Register new user
      const response = await request(app)
        .post('/api/register')
        .send({
          firstName: 'New',
          lastName: 'User',
          login: 'newuser',
          password: 'password123',
          email: 'new@example.com'
        });

      expect(response.status).toBe(200);
      
      // Check that new user has UserID of 6
      const newUser = await db.collection('Users').findOne({ Login: 'newuser' });
      expect(newUser.UserID).toBe(6);
    });
  });

  describe('POST /api/verify-email', () => {
    it('should verify email with correct code', async () => {
      const verificationCode = '123456';
      await insertTestUser(db, {
        Login: 'testuser',
        EmailVerified: false,
        VerificationCode: verificationCode,
        VerificationExpires: new Date(Date.now() + 15 * 60 * 1000)
      });

      const response = await request(app)
        .post('/api/verify-email')
        .send({
          login: 'testuser',
          code: verificationCode
        });

      expect(response.status).toBe(200);
      expect(response.body.verified).toBe(true);
      expect(response.body.error).toBe('');

      // Verify user is now marked as verified
      const user = await db.collection('Users').findOne({ Login: 'testuser' });
      expect(user.EmailVerified).toBe(true);
    });

    it('should reject verification with wrong code', async () => {
      await insertTestUser(db, {
        Login: 'testuser',
        EmailVerified: false,
        VerificationCode: '123456',
        VerificationExpires: new Date(Date.now() + 15 * 60 * 1000)
      });

      const response = await request(app)
        .post('/api/verify-email')
        .send({
          login: 'testuser',
          code: '999999'
        });

      expect(response.status).toBe(200);
      expect(response.body.verified).toBe(false);
      expect(response.body.error).toContain('invalid');
    });

    it('should reject verification with expired code', async () => {
      await insertTestUser(db, {
        Login: 'testuser',
        EmailVerified: false,
        VerificationCode: '123456',
        VerificationExpires: new Date(Date.now() - 1000) // Expired
      });

      const response = await request(app)
        .post('/api/verify-email')
        .send({
          login: 'testuser',
          code: '123456'
        });

      expect(response.status).toBe(200);
      expect(response.body.verified).toBe(false);
      expect(response.body.error).toContain('expired');
    });

    it('should handle missing login or code', async () => {
      const response = await request(app)
        .post('/api/verify-email')
        .send({
          login: 'testuser'
          // Missing code
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });
  });
});
