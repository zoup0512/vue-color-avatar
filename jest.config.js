/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */

module.exports = {
  moduleNameMapper: {
    // 图片等静态资源映射到 stub，需放在 '@/' 别名之前，避免被别名规则先命中
    '\\.(jpg|jpeg|png|gif|webp|ico)$': '<rootDir>/src/__mocks__/fileMock.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  clearMocks: true,

  collectCoverage: false,

  coverageDirectory: 'coverage',

  testEnvironment: 'jsdom',
}
