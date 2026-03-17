import { hashSync, compareSync } from "bcrypt";
import { existsSync, readFileSync, writeFileSync } from "fs";
const saltRounds = 10;
const password = process.argv[2];
import "dotenv/config";
import { Pool } from "pg";

const errLine = console.log;
console.log = (...args) => {
  const err = new Error();
  const stack = err.stack.split("\n")[2];
  const match =
    stack.match(/\((.*):(\d+):(\d+)\)/) || stack.match(/at (.*):(\d+):(\d+)/);
  const line = match ? `${match[1].split("/").pop()}:${match[2]}` : "";
  errLine(`[${line}]`, ...args);
};

const pool = new Pool({
  connectionString: `${process.env.DB_URL}`,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function initDatabase() {
  console.log("Initializing database...");

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users_users(
    id SERIAL PRIMARY KEY,
    user_name TEXT NOT NULL,
    email TEXT NOT NULL,               
    password TEXT NOT NULL,
    adding_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
    `;
  try {
    const res = await pool.query(createTableQuery);
  } catch (err) {
    console.error("Error initializing database:", err.message);
    console.error("Full error:", err);
    throw err;
  }
}

async function addPassword(name, email, password) {
  const hashedPassword = hashSync(password, saltRounds);
  const query = `
        INSERT INTO users_users (
            user_name, email, password
        ) 
        VALUES ($1, $2, $3) 
        RETURNING *`;

  const values = [name, email, hashedPassword];
  try {
    const res = await pool.query(query, values);
    console.log("User is added! Check the table!");
  } catch (err) {
    console.error("Error:", err.message);
  }
}

async function showAll() {
  const res = await pool.query("SELECT * FROM users_users ORDER BY id ASC");
  console.log("the whole list of users' users_users:");
  console.table(res.rows);
}

async function deletePassword(id) {
  await pool.query("DELETE FROM users_users WHERE id = $1", [id]);
  console.log(`The user with ID ${id} is deleted from the database.`);
}

function getArgv() {
  const args = {};
  for (let i = 3; i < process.argv.length; i += 2) {
    const key = process.argv[i];
    const value = process.argv[i + 1];
    if (key && value) {
      args[key] = value;
    }
  }
  return args;
}

async function login(email, inputPassword) {
  const query = `SELECT * FROM users_users WHERE email = $1`;
  try {
    const res = await pool.query(query, [email]);
    if (res.rows.length === 0) {
      console.log("User not found!");
      return;
    }

    const user = res.rows[0];
    const isMatch = compareSync(inputPassword, user.password);

    if (isMatch) {
      console.log(`Welcome, ${user.user_name}! Authorized successfully.`);
    } else {
      console.log("Incorrect password!");
    }
  } catch (err) {
    console.error("Login error:", err.message);
  }
}

const command = process.argv[2];

async function run() {
  try {
    await initDatabase();
    const argv = getArgv();

    switch (command) {
      case "list":
        await showAll();
        break;

      case "add":
        await addPassword(argv.name, argv.email, argv.password);
        break;

      case "login":
        if (argv.email && argv.password) {
          await login(argv.email, argv.password);
        } else {
          console.log(
            "Usage: node filename.js login email [value] password [value]",
          );
        }
        break;

      case "delete":
        const id = process.argv[3];
        if (id !== null || id !== undefined) {
          await deletePassword(id);
        } else {
          console.log("Please provide a valid ID: node filename.js delete 1");
        }
        break;

      default:
        console.log("Available commands: node filename.js list");
        console.log("node filename.js delete [id]");
        console.log(
          'node filename.js add name ["value"] email [value] password [value]',
        );
        console.log("node filename.js login email [value] password [value]");
    }
  } catch (err) {
    console.error("Failed to start application:", err);
  } finally {
    await pool.end();
  }
}
run();
