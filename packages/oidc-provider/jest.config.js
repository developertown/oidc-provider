module.exports = {
  transform: {
    ".(ts|tsx)$": require.resolve("ts-jest/dist"),
    ".(js|jsx)$": require.resolve("babel-jest"),
  },
  collectCoverageFrom: ["src/**/*.{js,jsx,ts,tsx}"],
  coverageReporters: ["json", "lcov", "text", "clover", "cobertura"],
};
