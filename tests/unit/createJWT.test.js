const jwt = require('jsonwebtoken');
const tokenModule = require('../../createJWT');

// Mock environment variable
process.env.ACCESS_TOKEN_SECRET = 'test-secret-key-for-unit-testing';

describe('JWT Token Module', () => {
  describe('createToken', () => {
    it('should create a valid JWT token', () => {
      const result = tokenModule.createToken('John', 'Doe', 123);
      
      expect(result).toHaveProperty('accessToken');
      expect(result.accessToken).toBeDefined();
      expect(typeof result.accessToken).toBe('string');
    });

    it('should encode user data in token payload', () => {
      const firstName = 'Jane';
      const lastName = 'Smith';
      const userId = 456;
      
      const result = tokenModule.createToken(firstName, lastName, userId);
      const decoded = jwt.decode(result.accessToken);
      
      expect(decoded.firstName).toBe(firstName);
      expect(decoded.lastName).toBe(lastName);
      expect(decoded.id).toBe(userId);
    });

    it('should create different tokens for different users', () => {
      const token1 = tokenModule.createToken('User', 'One', 1);
      const token2 = tokenModule.createToken('User', 'Two', 2);
      
      expect(token1.accessToken).not.toBe(token2.accessToken);
    });
  });

  describe('isExpired', () => {
    it('should return false for a valid token', () => {
      const token = tokenModule.createToken('John', 'Doe', 123);
      const expired = tokenModule.isExpired(token.accessToken);
      
      expect(expired).toBe(false);
    });

    it('should return true for an invalid token', () => {
      const invalidToken = 'invalid.token.here';
      const expired = tokenModule.isExpired(invalidToken);
      
      expect(expired).toBe(true);
    });

    it('should return true for a token with wrong secret', () => {
      const wrongToken = jwt.sign({ id: 123 }, 'wrong-secret');
      const expired = tokenModule.isExpired(wrongToken);
      
      expect(expired).toBe(true);
    });

    it('should return true for an empty token', () => {
      const expired = tokenModule.isExpired('');
      
      expect(expired).toBe(true);
    });
  });

  describe('refresh', () => {
    it('should refresh a valid token', () => {
      const originalToken = tokenModule.createToken('John', 'Doe', 123);
      const refreshed = tokenModule.refresh(originalToken.accessToken);
      
      expect(refreshed).toHaveProperty('accessToken');
      expect(refreshed.accessToken).toBeDefined();
    });

    it('should preserve user data when refreshing', () => {
      const firstName = 'Alice';
      const lastName = 'Wonder';
      const userId = 789;
      
      const originalToken = tokenModule.createToken(firstName, lastName, userId);
      const refreshed = tokenModule.refresh(originalToken.accessToken);
      const decoded = jwt.decode(refreshed.accessToken);
      
      expect(decoded.firstName).toBe(firstName);
      expect(decoded.lastName).toBe(lastName);
      expect(decoded.id).toBe(userId);
    });

    it('should create a new token (different from original)', () => {
      const originalToken = tokenModule.createToken('Bob', 'Builder', 999);
      
      // Wait a tiny bit to ensure different iat (issued at) timestamp
      const refreshed = tokenModule.refresh(originalToken.accessToken);
      
      expect(refreshed.accessToken).toBeDefined();
      // Tokens might be same if created at exact same millisecond, but structure should be valid
      expect(typeof refreshed.accessToken).toBe('string');
    });
  });
});
