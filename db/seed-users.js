/**
 * Seeds the users table with one account per role.
 * Run once after migration_add_users.sql:
 *   node db/seed-users.js
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const pool   = require('../config/database');

const SALT_ROUNDS = 12;

const users = [
  { full_name: 'System Admin',      username: 'admin',    password: 'admin123',    role: 'admin'    },
  { full_name: 'Store Manager',     username: 'manager',  password: 'manager123',  role: 'manager'  },
  { full_name: 'Warehouse Receiver',username: 'receiver', password: 'receiver123', role: 'receiver' },
];

(async () => {
  console.log('Seeding users...\n');
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, SALT_ROUNDS);
    await pool.query(
      `INSERT INTO users (full_name, username, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (username) DO UPDATE
         SET full_name=EXCLUDED.full_name, password_hash=EXCLUDED.password_hash,
             role=EXCLUDED.role, updated_at=NOW()`,
      [u.full_name, u.username, hash, u.role]
    );
    console.log(`  ✔  ${u.role.padEnd(10)} → username: ${u.username.padEnd(12)} password: ${u.password}`);
  }
  console.log('\nDone. You can now log in at /auth/login');
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });
