# Backend Unit Testing

This directory contains comprehensive unit and integration tests for the backend API.

## Test Structure

```
tests/
├── unit/                    # Unit tests for individual modules
│   └── createJWT.test.js   # JWT token creation and validation tests
├── integration/             # Integration tests for API endpoints
│   ├── auth.test.js        # Authentication endpoint tests
│   └── todo.test.js        # Todo CRUD endpoint tests
└── helpers/
    └── testHelpers.js      # Shared test utilities and helpers
```

## Setup

Install the testing dependencies:

```bash
npm install
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode (auto-rerun on file changes)
```bash
npm run test:watch
```

### Run only unit tests
```bash
npm run test:unit
```

### Run with coverage report
```bash
npm test
```

Coverage report will be generated in the `coverage/` directory.

## Test Coverage

### Unit Tests (`tests/unit/`)

- **createJWT.test.js**: Tests JWT token functionality
  - Token creation with user data
  - Token expiration validation
  - Token refresh mechanism
  - Invalid token handling

### Integration Tests (`tests/integration/`)

#### auth.test.js - Authentication Tests
- **POST /api/login**
  - ✓ Login with valid credentials
  - ✓ Reject invalid credentials
  - ✓ Reject unverified email
  - ✓ Reject non-existent user

- **POST /api/register**
  - ✓ Register new user
  - ✓ Reject missing fields
  - ✓ Reject duplicate login
  - ✓ Reject duplicate email
  - ✓ Auto-increment UserID

- **POST /api/verify-email**
  - ✓ Verify with correct code
  - ✓ Reject wrong code
  - ✓ Reject expired code
  - ✓ Handle missing parameters

#### todo.test.js - Todo Management Tests
- **POST /api/addtodo**
  - ✓ Add todo with valid data
  - ✓ Reject without authentication
  - ✓ Reject missing taskName
  - ✓ Default priority handling
  - ✓ Priority normalization

- **POST /api/gettodos**
  - ✓ Get todos for specific date
  - ✓ Return empty array for no todos
  - ✓ Isolate user's todos
  - ✓ Require authentication

- **POST /api/edittodo**
  - ✓ Edit existing todo
  - ✓ Require authentication
  - ✓ Reject invalid todo ID
  - ✓ Prevent editing other user's todos

- **POST /api/deletetodo**
  - ✓ Delete existing todo
  - ✓ Require authentication
  - ✓ Reject invalid todo ID

- **POST /api/check**
  - ✓ Toggle completion status
  - ✓ Require authentication

## Test Utilities

### testHelpers.js

Provides utility functions for test setup:

- `setupTestDB()` - Create in-memory MongoDB instance
- `teardownTestDB()` - Clean up test database
- `clearTestDB()` - Clear all collections
- `createTestApp()` - Create Express app with API routes
- `insertTestUser()` - Insert mock user data
- `insertTestTodo()` - Insert mock todo data
- `createMockUser()` - Generate mock user object
- `createMockTodo()` - Generate mock todo object

## Technologies Used

- **Jest**: Testing framework
- **Supertest**: HTTP assertion library for API testing
- **mongodb-memory-server**: In-memory MongoDB for isolated testing

## Writing New Tests

### Unit Test Example
```javascript
describe('Module Name', () => {
  it('should do something', () => {
    const result = myFunction();
    expect(result).toBe(expectedValue);
  });
});
```

### Integration Test Example
```javascript
const response = await request(app)
  .post('/api/endpoint')
  .send({ data: 'value' });

expect(response.status).toBe(200);
expect(response.body).toHaveProperty('expectedProperty');
```

## Best Practices

1. **Isolate Tests**: Each test should be independent
2. **Clean Up**: Use `beforeEach` and `afterEach` to reset state
3. **Mock External Services**: Email sending is mocked by default
4. **Use Descriptive Names**: Test names should clearly describe what they test
5. **Test Edge Cases**: Include tests for error conditions and edge cases

## Continuous Integration

These tests should be run in your CI/CD pipeline before deployment:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: npm test
```

## Troubleshooting

### MongoDB Memory Server Issues
If you encounter issues with mongodb-memory-server, ensure you have sufficient memory and permissions.

### Port Conflicts
Tests use in-memory database, so no port conflicts should occur.

### Environment Variables
Tests use mock environment variables. No `.env` file is needed for testing.

## Future Improvements

- [ ] Add tests for password reset endpoints
- [ ] Add tests for bulk operations
- [ ] Add tests for date navigation endpoints
- [ ] Add performance/load tests
- [ ] Add E2E tests with real browser automation
