import mysql from "mysql2/promise";
import {
  randomBytes,
  randomUUID,
  scryptSync,
} from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000001";

function promptHidden(label) {
  return new Promise((resolve) => {
    stdout.write(label);

    const input = stdin;
    const wasRaw = input.isRaw;

    input.setRawMode?.(true);
    input.resume();

    let value = "";

    const onData = (chunk) => {
      const char = chunk.toString("utf8");

      if (char === "\u0003") {
        stdout.write("\n");
        cleanup();
        process.exit(130);
      }

      if (char === "\r" || char === "\n") {
        stdout.write("\n");
        cleanup();
        resolve(value);
        return;
      }

      if (char === "\u007f" || char === "\b") {
        value = value.slice(0, -1);
        return;
      }

      if (char >= " ") value += char;
    };

    function cleanup() {
      input.removeListener("data", onData);
      if (wasRaw !== undefined) input.setRawMode(wasRaw);
      input.pause();
    }

    input.on("data", onData);
  });
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const connectionUrl = new URL(databaseUrl);
  const db = mysql.createPool({
    host: connectionUrl.hostname,
    port: Number(connectionUrl.port || 4000),
    user: decodeURIComponent(connectionUrl.username),
    password: decodeURIComponent(connectionUrl.password),
    database: connectionUrl.pathname.replace(/^\//, ""),
    waitForConnections: true,
    connectionLimit: 2,
    timezone: "Z",
    ssl: { rejectUnauthorized: true },
  });

  const rl = createInterface({ input: stdin, output: stdout });

  try {
    console.log("\n=== RoaInstall First Admin Setup ===\n");

    const username = (await rl.question("Username: ")).trim();
    const email = (await rl.question("Email: ")).trim().toLowerCase();
    const displayName = (await rl.question("Display name: ")).trim();

    rl.close();

    if (!/^[a-zA-Z0-9._-]{3,80}$/.test(username)) {
      throw new Error("Username must be 3-80 characters: letters, numbers, dot, underscore or hyphen.");
    }

    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Invalid email address.");
    }

    if (!displayName || displayName.length > 160) {
      throw new Error("Display name must be 1-160 characters.");
    }

    const password = await promptHidden("Password (minimum 12 characters): ");
    const confirmation = await promptHidden("Confirm password: ");

    if (password.length < 12) {
      throw new Error("Password must contain at least 12 characters.");
    }

    if (password !== confirmation) {
      throw new Error("Passwords do not match.");
    }

    const salt = randomBytes(16).toString("hex");
    const digest = scryptSync(password, salt, 64).toString("hex");
    const passwordHash = `scrypt$${salt}$${digest}`;

    let connection;

    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      const [roles] = await connection.execute(
        "SELECT id FROM roles WHERE id = ? AND code = 'admin' AND is_active = TRUE FOR UPDATE",
        [ADMIN_ROLE_ID],
      );

      if (roles.length !== 1) {
        throw new Error("Active admin role not found. Apply the database migration first.");
      }

      const [existingAdmins] = await connection.execute(
        "SELECT id FROM users WHERE role_id = ? LIMIT 1",
        [ADMIN_ROLE_ID],
      );

      if (existingAdmins.length > 0) {
        throw new Error("An admin account already exists. Bootstrap cancelled.");
      }

      const [duplicates] = await connection.execute(
        "SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1",
        [username, email],
      );

      if (duplicates.length > 0) {
        throw new Error("Username or email already exists.");
      }

      await connection.execute(
        `INSERT INTO users
          (id, username, email, display_name, password_hash, role_id, is_active)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [
          randomUUID(),
          username,
          email,
          displayName,
          passwordHash,
          ADMIN_ROLE_ID,
        ],
      );

      await connection.commit();
      console.log("\nSUCCESS: First Admin account created.");
      console.log(`Username: ${username}`);
      console.log("Password: not displayed or saved.");
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      connection?.release();
    }
  } finally {
    rl.close();
    await db.end();
  }
}

main().catch((error) => {
  console.error("\nFAILED:", error.message);
  process.exitCode = 1;
});