const { Pool } = require("pg");
require("dotenv").config();

const poolConfig = {
    connectionString: process.env.DATABASE_URL
};

if (process.env.DB_SSL === "true") {
    poolConfig.ssl = {
        rejectUnauthorized: false
    };
}

const pool = new Pool(poolConfig);

module.exports = pool;