import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { schema } from "@/schema/schema.js";

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
});

pool.on("error", (err) => {
    console.error("Unexpected error on idle PostgreSQL client:", err);
});

const db = drizzle(pool, { schema: schema });

export default db;
