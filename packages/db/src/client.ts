import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
}

// A conservative per-process pool: Next.js prerenders routes across several
// concurrent build workers, each importing this module fresh, so a high
// per-client `max` multiplies into far more simultaneous connections to
// Supabase than its direct-connection limit allows — this was the cause of
// a "use cache function took too long" prerender timeout under load.
const queryClient = postgres(connectionString, { max: 3, idle_timeout: 20, connect_timeout: 10 });

export const db = drizzle(queryClient, { schema });
