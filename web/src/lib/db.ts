import "server-only";
import mysql, { type Pool } from "mysql2/promise";

let pool: Pool | undefined;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDatabase(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_NOT_CONFIGURED");
  if (!pool) {
    const parsed = new URL(url);
    pool = mysql.createPool({
      host: parsed.hostname,
      port: Number(parsed.port || 4000),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, ""),
      waitForConnections: true,
      connectionLimit: 10,
      enableKeepAlive: true,
      timezone: "Z",
      ssl: { rejectUnauthorized: true },
    });
  }
  return pool;
}
