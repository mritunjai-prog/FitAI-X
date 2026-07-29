module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: false,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
