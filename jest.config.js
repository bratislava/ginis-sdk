module.exports = { 
  setupFiles: ['dotenv/config'],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/", // Ignore compiled files
    "\\.d\\.ts$" // Ignore TypeScript declaration files
  ], }
