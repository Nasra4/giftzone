/*
 * Create or update the admin account.
 *
 *   npm run set-admin -- "new@email.com" "NewStrongPassword123" "Display Name"
 *
 * - If an admin with the CURRENT email in the database exists it is updated; with several admins pass --old=old@email.com
 * - The name argument is optional. The password must be at least 10 characters.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

async function main() {
  const args = process.argv.slice(2);
  const oldFlag = args.find((a) => a.startsWith('--old='));
  const [email, password, name] = args.filter((a) => !a.startsWith('--'));
  if (!email || !password) throw new Error('Usage: npm run set-admin -- "email" "password" ["Display Name"] [--old=current@email.com]');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('That is not a valid email address.');
  if (password.length < 10) throw new Error('Password must be at least 10 characters.');

  const hash = await bcrypt.hash(password, 12);
  const [admins] = await pool.query('SELECT id, email FROM admins ORDER BY id');

  let target = null;
  if (oldFlag) target = admins.find((a) => a.email.toLowerCase() === oldFlag.slice(6).toLowerCase());
  else if (admins.length === 1) target = admins[0];
  else if (admins.length > 1) throw new Error(`There are ${admins.length} admins. Pass --old=<current email> to choose which one to change.`);

  if (target) {
    await pool.query('UPDATE admins SET email = ?, password_hash = ?, full_name = COALESCE(?, full_name) WHERE id = ?', [email.toLowerCase(), hash, name || null, target.id]);
    console.log(`Updated admin #${target.id}: now logs in as ${email.toLowerCase()}`);
  } else {
    await pool.query('INSERT INTO admins (full_name, email, password_hash) VALUES (?,?,?)', [name || 'GiftZone Admin', email.toLowerCase(), hash]);
    console.log(`Created admin ${email.toLowerCase()}`);
  }
}

main().then(() => pool.end()).catch((e) => { console.error(e.message); pool.end(); process.exit(1); });