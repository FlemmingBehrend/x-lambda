export default {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.(ts|tsx|js)$": "ts-jest",
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(@middy/core|@middy/http-error-handler|@middy/util)/)",
  ],
  moduleNameMapper: {
    "^@middy/core$": "<rootDir>/node_modules/@middy/core",
    "^@middy/util$": "<rootDir>/node_modules/@middy/util",
    "^@middy/http-error-handler$":
      "<rootDir>/node_modules/@middy/http-error-handler",
  },
};
