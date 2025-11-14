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
let mongoServer;

describe('Password Reset API Endpoints', () => {
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
  });

  describe('POST /api/request-password-reset', () => {
    it('should send password reset email for valid user', async () => {
      await insertTestUser(db, {
        Login: 'testuser',
        Email: 'test@example.com',
        EmailVerified: true
      });

      const response = await request(app)
        .post('/api/request-password-reset')
        .send({
          email: 'test@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.sent).toBe(true);
      expect(response.body.error).toBe('');

      // Verify reset code was created
      const user = await db.collection('Users').findOne({ Email: 'test@example.com' });
      expect(user.ResetCode).toBeDefined();
      expect(user.ResetToken).toBeDefined();
      expect(user.ResetExpires).toBeDefined();
    });

    it('should reject reset request for non-existent email', async () => {
      const response = await request(app)
        .post('/api/request-password-reset')
        .send({
          email: 'nonexistent@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.sent).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should require email parameter', async () => {
      const response = await request(app)
        .post('/api/request-password-reset')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });
  });

  describe('POST /api/verify-reset-code', () => {
    it('should verify valid reset code', async () => {
      const resetCode = '123456';
      const resetToken = 'valid-reset-token-12345';
      await insertTestUser(db, {
        Login: 'testuser',
        Email: 'test@example.com',
        ResetCode: resetCode,
        ResetToken: resetToken,
        ResetExpires: new Date(Date.now() + 15 * 60 * 1000)
      });

      const response = await request(app)
        .post('/api/verify-reset-code')
        .send({
          email: 'test@example.com',
          code: resetCode
        });

      expect(response.status).toBe(200);
      expect(response.body.verified).toBe(true);
      expect(response.body.resetToken).toBe(resetToken);
      expect(response.body.error).toBe('');
    });

    it('should reject wrong reset code', async () => {
      await insertTestUser(db, {
        Login: 'testuser',
        Email: 'test@example.com',
        ResetCode: '123456',
        ResetExpires: new Date(Date.now() + 15 * 60 * 1000)
      });

      const response = await request(app)
        .post('/api/verify-reset-code')
        .send({
          email: 'test@example.com',
          code: '999999'
        });

      expect(response.status).toBe(200);
      expect(response.body.verified).toBe(false);
      expect(response.body.error).toContain('invalid');
    });

    it('should reject expired reset code', async () => {
      await insertTestUser(db, {
        Login: 'testuser',
        Email: 'test@example.com',
        ResetCode: '123456',
        ResetExpires: new Date(Date.now() - 1000) // Expired
      });

      const response = await request(app)
        .post('/api/verify-reset-code')
        .send({
          email: 'test@example.com',
          code: '123456'
        });

      expect(response.status).toBe(200);
      expect(response.body.verified).toBe(false);
      expect(response.body.error).toContain('expired');
    });
  });

  describe('POST /api/reset-password-with-token', () => {
    it('should reset password with valid token', async () => {
      const resetToken = 'valid-reset-token-12345';
      await insertTestUser(db, {
        Login: 'testuser',
        Email: 'test@example.com',
        Password: 'oldpassword',
        ResetToken: resetToken,
        ResetExpires: new Date(Date.now() + 15 * 60 * 1000)
      });

      const response = await request(app)
        .post('/api/reset-password-with-token')
        .send({
          email: 'test@example.com',
          token: resetToken,
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.error).toBe('');

      // Verify password was changed
      const user = await db.collection('Users').findOne({ Email: 'test@example.com' });
      expect(user.Password).toBe('newpassword123');
      expect(user.ResetToken).toBeUndefined();
    });

    it('should reject password reset with invalid token', async () => {
      await insertTestUser(db, {
        Login: 'testuser',
        Email: 'test@example.com',
        Password: 'oldpassword',
        ResetToken: 'valid-token',
        ResetExpires: new Date(Date.now() + 15 * 60 * 1000)
      });

      const response = await request(app)
        .post('/api/reset-password-with-token')
        .send({
          email: 'test@example.com',
          token: 'invalid-token',
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.error).toBeDefined();

      // Verify password was NOT changed
      const user = await db.collection('Users').findOne({ Email: 'test@example.com' });
      expect(user.Password).toBe('oldpassword');
    });

    it('should reject password reset with expired token', async () => {
      await insertTestUser(db, {
        Login: 'testuser',
        Email: 'test@example.com',
        Password: 'oldpassword',
        ResetToken: 'valid-token',
        ResetExpires: new Date(Date.now() - 1000) // Expired
      });

      const response = await request(app)
        .post('/api/reset-password-with-token')
        .send({
          email: 'test@example.com',
          token: 'valid-token',
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.error).toContain('expired');

      // Verify password was NOT changed
      const user = await db.collection('Users').findOne({ Email: 'test@example.com' });
      expect(user.Password).toBe('oldpassword');
    });

    it('should require all parameters', async () => {
      const response = await request(app)
        .post('/api/reset-password-with-token')
        .send({
          email: 'test@example.com'
          // Missing token and newPassword
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should handle user with no email address', async () => {
      await insertTestUser(db, {
        Login: 'testuser',
        Email: null
      });

      const response = await request(app)
        .post('/api/request-password-reset')
        .send({
          login: 'testuser'
        });

      expect(response.status).toBe(200);
      expect(response.body.sent).toBe(false);
      expect(response.body.error).toContain('no email');
    });
  });

  describe('POST /api/reset-password-with-code', () => {
    it('should reset password with valid code', async () => {
      await insertTestUser(db, {
        Login: 'testuser',
        Email: 'test@example.com',
        Password: 'oldpassword',
        ResetCode: '123456',
        ResetToken: 'some-token',
        ResetExpires: new Date(Date.now() + 15 * 60 * 1000)
      });

      const response = await request(app)
        .post('/api/reset-password-with-code')
        .send({
          email: 'test@example.com',
          code: '123456',
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.error).toBe('');

      // Verify password was changed
      const user = await db.collection('Users').findOne({ Email: 'test@example.com' });
      expect(user.Password).toBe('newpassword123');
      expect(user.ResetCode).toBeUndefined();
      expect(user.ResetToken).toBeUndefined();
    });

    it('should work with login instead of email', async () => {
      await insertTestUser(db, {
        Login: 'testuser',
        Email: 'test@example.com',
        Password: 'oldpassword',
        ResetCode: '123456',
        ResetExpires: new Date(Date.now() + 15 * 60 * 1000)
      });

      const response = await request(app)
        .post('/api/reset-password-with-code')
        .send({
          login: 'testuser',
          code: '123456',
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.error).toBe('');
    });

    it('should reject invalid code', async () => {
      await insertTestUser(db, {
        Login: 'testuser',
        Email: 'test@example.com',
        Password: 'oldpassword',
        ResetCode: '123456',
        ResetExpires: new Date(Date.now() + 15 * 60 * 1000)
      });

      const response = await request(app)
        .post('/api/reset-password-with-code')
        .send({
          email: 'test@example.com',
          code: '999999',
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.error).toContain('invalid');
    });

    it('should require all parameters', async () => {
      const response = await request(app)
        .post('/api/reset-password-with-code')
        .send({
          email: 'test@example.com'
          // Missing code and newPassword
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });
  });
});
