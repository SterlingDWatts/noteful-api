require("dotenv").congig();

module.exports = {
  migrationsDirectory: "migrations",
  driver: "pg",
  password: "pass",
  connectionString:
    process.env.NODE_ENV === "test"
      ? process.env.TEST_DB_URL
      : process.env.DB_URL
};
