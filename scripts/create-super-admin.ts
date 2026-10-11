/**
 * M.GAMMON - اسکریپت امن راه‌اندازی و مدیریت حساب مدیر ارشد سامانه (Senior Admin Setup)
 * 
 * نحوه استفاده از خط فرمان (CLI):
 * npx tsx scripts/create-super-admin.ts <username> <password> "<name>" <phone> [setupKey]
 * 
 * مثال:
 * npx tsx scripts/create-super-admin.ts admin "Admin@MGammon2026!" "مجید نورایی (مالک و مدیر ارشد)" 09151111111
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SEC_FILE = path.join(DATA_DIR, 'security.json');

function hashPasswordWithSalt(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.pbkdf2Sync(password, actualSalt, 100000, 32, 'sha256').toString('hex');
  return { hash: derived, salt: actualSalt };
}

async function run() {
  const args = process.argv.slice(2);
  const username = args[0] || 'admin';
  const password = args[1] || 'Admin@MGammon2026!';
  const name = args[2] || 'مجید نورایی (مالک و مدیر ارشد)';
  const phone = args[3] || '09151111111';

  if (!password || password.length < 8) {
    console.error('❌ خطا: رمز عبور مدیر ارشد باید حداقل ۸ کاراکتر و دارای پیچیدگی کافی باشد.');
    process.exit(1);
  }

  if (!fs.existsSync(DB_FILE)) {
    console.error('❌ خطا: پایگاه‌داده db.json یافت نشد.');
    process.exit(1);
  }

  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  if (!Array.isArray(db.users)) db.users = [];

  const { hash, salt } = hashPasswordWithSalt(password);

  const existingIdx = db.users.findIndex((u: any) => u.username.toLowerCase() === username.toLowerCase() || u.id === 'usr_admin');
  const adminUser = {
    id: existingIdx >= 0 ? db.users[existingIdx].id : 'usr_admin',
    companyId: db.settings?.id || 'comp_mgommon_01',
    username: username.toLowerCase().trim(),
    name: name.trim(),
    email: `${username.toLowerCase().trim()}@mgommon.ir`,
    phone: phone.trim(),
    role: 'ADMIN',
    isSuperAdmin: true,
    workshopId: 'ws_1',
    passwordHash: hash,
    passwordSalt: salt,
    updatedAt: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    db.users[existingIdx] = { ...db.users[existingIdx], ...adminUser };
  } else {
    db.users.unshift(adminUser);
  }

  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');

  console.log('====================================================');
  console.log('✅ حساب مدیر ارشد با موفقیت راه‌اندازی و تثبیت شد:');
  console.log(`- نام کاربری: ${username}`);
  console.log(`- نام مدیر: ${name}`);
  console.log(`- الگوریتم هش: PBKDF2 (SHA-256, 100,000 دور + سالت تصادفی ۱۶ بایت)`);
  console.log(`- شناسه کاربری: ${adminUser.id}`);
  console.log('====================================================');
}

run().catch(err => {
  console.error('خطای اجرا:', err);
  process.exit(1);
});
