import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { schema } from "../schema/schema.js";

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema: schema });

export default db;
