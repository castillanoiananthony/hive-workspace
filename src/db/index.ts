import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Pooled (-pooler) Neon URL for the app. On Vercel Fluid compute, attachDatabasePool
// lets idle connections close cleanly before a function instance is suspended.
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
attachDatabasePool(pool);

export const db = drizzle(pool, { schema });
