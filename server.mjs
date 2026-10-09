import http from 'node:http';
import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { jwtVerify } from 'jose';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, 'public');
const distDir = path.join(root, 'dist');
const sourceDir = await fs.access(distDir).then(() => distDir).catch(() => publicDir);
const port = Number(process.env.PORT || 3000);
const adminEmail = String(process.env.KEMU_ADMIN_EMAIL || '').trim().toLowerCase();
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

let pool;
let databaseReady = false;

function json(res, status, payload, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(payload));
}

function text(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...headers });
  res.end(body);
}

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map(part => {
    const index = part.indexOf('=');
    if (index < 0) return ['', ''];
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(([key]) => key));
}

function cookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path || '/'}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.httpOnly !== false) parts.push('HttpOnly');
  if (options.secure !== false) parts.push('Secure');
  parts.push(`SameSite=${options.sameSite || 'None'}`);
  return parts.join('; ');
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function createId() {
  return crypto.randomUUID();
}

function safe(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function normalizeEmail(value) {
  return safe(value).toLowerCase();
}

function publicOrigin(value) {
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function databasePool() {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL || process.env.DRIZZLE_DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not available');
  const parsed = new URL(connectionString);
  pool = mysql.createPool({
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
    waitForConnections: true,
    connectionLimit: 8,
    queueLimit: 0,
    ssl: { rejectUnauthorized: false },
    namedPlaceholders: true
  });
  return pool;
}

async function initializeDatabase() {
  const db = databasePool();
  const statements = [
    `CREATE TABLE IF NOT EXISTS kemu_students (
      id CHAR(36) PRIMARY KEY,
      student_number VARCHAR(32) NOT NULL UNIQUE,
      full_name VARCHAR(120) NOT NULL,
      email VARCHAR(190) NOT NULL UNIQUE,
      programme VARCHAR(160) NOT NULL,
      year_level TINYINT UNSIGNED NOT NULL DEFAULT 1,
      campus VARCHAR(80) NOT NULL DEFAULT 'Main Campus',
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS kemu_courses (
      id CHAR(36) PRIMARY KEY,
      code VARCHAR(24) NOT NULL UNIQUE,
      title VARCHAR(180) NOT NULL,
      lecturer VARCHAR(120) NOT NULL,
      credits TINYINT UNSIGNED NOT NULL DEFAULT 3,
      capacity SMALLINT UNSIGNED NOT NULL DEFAULT 60,
      semester VARCHAR(80) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS kemu_registrations (
      id CHAR(36) PRIMARY KEY,
      student_id CHAR(36) NOT NULL,
      course_id CHAR(36) NOT NULL,
      status ENUM('registered', 'withdrawn') NOT NULL DEFAULT 'registered',
      registered_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      withdrawn_at DATETIME(3) NULL,
      UNIQUE KEY kemu_registration_unique (student_id, course_id),
      CONSTRAINT kemu_registration_student_fk FOREIGN KEY (student_id) REFERENCES kemu_students(id) ON DELETE CASCADE,
      CONSTRAINT kemu_registration_course_fk FOREIGN KEY (course_id) REFERENCES kemu_courses(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS kemu_results (
      id CHAR(36) PRIMARY KEY,
      student_id CHAR(36) NOT NULL,
      course_id CHAR(36) NOT NULL,
      semester VARCHAR(80) NOT NULL,
      marks DECIMAL(5,2) NULL,
      grade VARCHAR(8) NULL,
      grade_point DECIMAL(4,2) NULL,
      status ENUM('pending', 'published') NOT NULL DEFAULT 'pending',
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY kemu_result_unique (student_id, course_id, semester),
      CONSTRAINT kemu_result_student_fk FOREIGN KEY (student_id) REFERENCES kemu_students(id) ON DELETE CASCADE,
      CONSTRAINT kemu_result_course_fk FOREIGN KEY (course_id) REFERENCES kemu_courses(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS kemu_sessions (
      token_hash CHAR(64) PRIMARY KEY,
      open_id VARCHAR(190) NOT NULL,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(190) NOT NULL,
      expires_at DATETIME(3) NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX kemu_session_expiry (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  ];
  for (const statement of statements) await db.query(statement);
  await seedDemoData(db);
  databaseReady = true;
}

async function seedDemoData(db) {
  const seedCourses = [
    ['BIS 312', 'Management Information Systems', 'Dr. Wanjiku Njoroge', 3, 60],
    ['BIS 315', 'Database Systems', 'Mr. Brian Mwangi', 3, 60],
    ['BIS 321', 'Systems Analysis & Design', 'Dr. Faith Muthoni', 3, 60],
    ['COM 304', 'Communication Skills', 'Ms. Alice Achieng', 2, 80],
    ['BIS 326', 'Human Computer Interaction', 'Dr. Peter Kamau', 3, 55]
  ];
  for (const [code, title, lecturer, credits, capacity] of seedCourses) {
    await db.query(
      `INSERT INTO kemu_courses (id, code, title, lecturer, credits, capacity, semester)
       VALUES (?, ?, ?, ?, ?, ?, 'Semester 1, 2026/2027')
       ON DUPLICATE KEY UPDATE title = VALUES(title), lecturer = VALUES(lecturer), credits = VALUES(credits), capacity = VALUES(capacity), is_active = TRUE`,
      [createId(), code, title, lecturer, credits, capacity]
    );
  }
  const [students] = await db.query('SELECT id FROM kemu_students WHERE email = ?', ['amara.njeri@students.kemu.ac.ke']);
  let studentId = students[0]?.id;
  if (!studentId) {
    studentId = createId();
    await db.query(
      `INSERT INTO kemu_students (id, student_number, full_name, email, programme, year_level, campus)
       VALUES (?, 'KEMU/IS/2024/0142', 'Amara Njeri', 'amara.njeri@students.kemu.ac.ke', 'BSc. Information Science', 3, 'Main Campus')`,
      [studentId]
    );
  }
  const [courseRows] = await db.query('SELECT id FROM kemu_courses WHERE code IN (?, ?, ?, ?)', ['BIS 312', 'BIS 315', 'BIS 321', 'COM 304']);
  for (const course of courseRows) {
    await db.query(
      `INSERT INTO kemu_registrations (id, student_id, course_id, status)
       VALUES (?, ?, ?, 'registered')
       ON DUPLICATE KEY UPDATE status = 'registered', withdrawn_at = NULL`,
      [createId(), studentId, course.id]
    );
  }
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw Object.assign(new Error('Request body must be valid JSON'), { httpStatus: 400 }); }
}

async function userFromPreviewJwt(token) {
  const secret = process.env.MANUS_JWT_SECRET;
  if (!secret || token.split('.').length !== 3) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ['HS256'] });
    const appId = payload.appId ?? payload.app_id ?? payload.clientId;
    if (appId && process.env.MANUS_PROJECT_ID && String(appId) !== String(process.env.MANUS_PROJECT_ID)) return null;
    return {
      openId: safe(payload.openId || payload.open_id || payload.sub),
      name: safe(payload.name || payload.fullName || payload.displayName, 'KeMU user'),
      email: normalizeEmail(payload.email || payload.userEmail || payload.accountEmail)
    };
  } catch {
    return null;
  }
}

async function identityForRequest(req) {
  const token = parseCookies(req).webdev_app_session;
  if (!token || !databaseReady) return null;
  let identity = await userFromPreviewJwt(token);
  if (!identity?.email) {
    const [rows] = await databasePool().query(
      'SELECT open_id, name, email FROM kemu_sessions WHERE token_hash = ? AND expires_at > CURRENT_TIMESTAMP(3) LIMIT 1',
      [hash(token)]
    );
    if (!rows[0]) return null;
    identity = { openId: rows[0].open_id, name: rows[0].name, email: normalizeEmail(rows[0].email) };
  }
  const [studentRows] = await databasePool().query('SELECT id FROM kemu_students WHERE LOWER(email) = ? LIMIT 1', [identity.email]);
  const role = adminEmail && identity.email === adminEmail ? 'admin' : (studentRows[0] ? 'student' : 'guest');
  return { ...identity, role, studentId: studentRows[0]?.id || null };
}

async function requireIdentity(req, res) {
  const identity = await identityForRequest(req);
  if (!identity) {
    json(res, 401, { error: 'authentication_required', loginUrl: `/api/auth/login?redirect=${encodeURIComponent(requestOrigin(req))}` });
    return null;
  }
  if (identity.role === 'guest') {
    json(res, 403, { error: 'account_not_registered', message: 'Your Manus account is not linked to a KeMU student or administrator record yet.' });
    return null;
  }
  return identity;
}

async function requireAdmin(req, res) {
  const identity = await requireIdentity(req, res);
  if (!identity) return null;
  if (identity.role !== 'admin') {
    json(res, 403, { error: 'admin_required', message: 'Administrator access is restricted to the configured KeMU portal administrator.' });
    return null;
  }
  return identity;
}

function requestOrigin(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000').split(',')[0].trim();
  return `${proto}://${host}`;
}

async function handleLogin(req, res, url) {
  const origin = publicOrigin(url.searchParams.get('redirect'));
  const portal = safe(process.env.MANUS_OAUTH_PORTAL_URL);
  if (!origin || !portal || !process.env.MANUS_PROJECT_ID) {
    json(res, 503, { error: 'oauth_not_configured', message: 'Manus login is not ready in this environment.' });
    return;
  }
  const nonce = crypto.randomBytes(24).toString('base64url');
  const redirectUri = `${origin}/api/auth/callback`;
  const state = Buffer.from(JSON.stringify({ nonce, redirectUri })).toString('base64url');
  const authUrl = new URL(`${portal.replace(/\/$/, '')}/app-auth`);
  authUrl.searchParams.set('appId', process.env.MANUS_PROJECT_ID);
  authUrl.searchParams.set('redirectUri', redirectUri);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('responseType', 'code');
  res.writeHead(302, { Location: authUrl.toString(), 'Set-Cookie': cookie('kemu_oauth_nonce', nonce, { maxAge: 600 }) });
  res.end();
}

async function handleCallback(req, res, url) {
  const state = safe(url.searchParams.get('state'));
  const code = safe(url.searchParams.get('code'));
  let parsed;
  try { parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')); } catch { json(res, 400, { error: 'invalid_oauth_state' }); return; }
  const nonceCookie = parseCookies(req).kemu_oauth_nonce;
  if (!code || !parsed.nonce || parsed.nonce !== nonceCookie || !publicOrigin(parsed.redirectUri)) {
    json(res, 400, { error: 'oauth_state_mismatch' });
    return;
  }
  const api = safe(process.env.MANUS_OAUTH_API_URL);
  try {
    const exchange = await fetch(`${api}/webdev.v1.WebDevAuthPublicService/ExchangeToken`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: process.env.MANUS_PROJECT_ID, grantType: 'authorization_code', code, redirectUri: parsed.redirectUri })
    });
    if (!exchange.ok) throw new Error(`OAuth token exchange failed (${exchange.status})`);
    const token = await exchange.json();
    const info = await fetch(`${api}/webdev.v1.WebDevAuthPublicService/GetUserInfo`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token.accessToken}` }, body: JSON.stringify({ accessToken: token.accessToken }) });
    if (!info.ok) throw new Error(`OAuth identity lookup failed (${info.status})`);
    const user = await info.json();
    const sessionToken = crypto.randomBytes(32).toString('base64url');
    await databasePool().query(
      `INSERT INTO kemu_sessions (token_hash, open_id, name, email, expires_at) VALUES (?, ?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL 30 DAY))
       ON DUPLICATE KEY UPDATE open_id = VALUES(open_id), name = VALUES(name), email = VALUES(email), expires_at = VALUES(expires_at)`,
      [hash(sessionToken), safe(user.openId || user.open_id || user.id), safe(user.name || user.fullName, 'KeMU user'), normalizeEmail(user.email)]
    );
    const destination = `${publicOrigin(parsed.redirectUri)}/?auth=success`;
    res.writeHead(302, { Location: destination, 'Set-Cookie': [cookie('webdev_app_session', sessionToken, { maxAge: 2592000 }), cookie('kemu_oauth_nonce', '', { maxAge: 0 })] });
    res.end();
  } catch (error) {
    json(res, 502, { error: 'oauth_failed', message: error.message });
  }
}

async function handleLogout(req, res) {
  const token = parseCookies(req).webdev_app_session;
  if (token && databaseReady) await databasePool().query('DELETE FROM kemu_sessions WHERE token_hash = ?', [hash(token)]);
  const headers = { 'Set-Cookie': cookie('webdev_app_session', '', { maxAge: 0 }), 'Clear-Site-Data': '"cookies"' };
  if (req.method === 'GET') {
    res.writeHead(302, { ...headers, Location: '/' });
    res.end();
    return;
  }
  res.writeHead(204, headers);
  res.end();
}

async function courseRowsForStudent(studentId) {
  const [rows] = await databasePool().query(
    `SELECT c.id, c.code, c.title, c.lecturer, c.credits, c.capacity, c.semester,
      COUNT(CASE WHEN allr.status = 'registered' THEN 1 END) AS enrolled_count,
      MAX(CASE WHEN ownr.status = 'registered' THEN ownr.id END) AS registration_id
     FROM kemu_courses c
     LEFT JOIN kemu_registrations allr ON allr.course_id = c.id
     LEFT JOIN kemu_registrations ownr ON ownr.course_id = c.id AND ownr.student_id = ?
     WHERE c.is_active = TRUE
     GROUP BY c.id ORDER BY c.code`, [studentId]
  );
  return rows.map(row => ({ ...row, enrolled_count: Number(row.enrolled_count), capacity: Number(row.capacity), credits: Number(row.credits), registered: Boolean(row.registration_id), seats_remaining: Math.max(0, Number(row.capacity) - Number(row.enrolled_count)) }));
}

async function adminSnapshot() {
  const db = databasePool();
  const [students] = await db.query('SELECT id, student_number, full_name, email, programme, year_level, campus, created_at FROM kemu_students ORDER BY created_at DESC');
  const [courses] = await db.query(
    `SELECT c.id, c.code, c.title, c.lecturer, c.credits, c.capacity, c.semester, COUNT(r.id) AS enrolled_count
     FROM kemu_courses c LEFT JOIN kemu_registrations r ON r.course_id = c.id AND r.status = 'registered'
     GROUP BY c.id ORDER BY c.code`
  );
  const [registrations] = await db.query(
    `SELECT r.id, r.registered_at, s.id AS student_id, s.full_name AS student_name, s.student_number, c.id AS course_id, c.code, c.title
     FROM kemu_registrations r JOIN kemu_students s ON s.id = r.student_id JOIN kemu_courses c ON c.id = r.course_id
     WHERE r.status = 'registered' ORDER BY r.registered_at DESC`
  );
  return {
    students,
    courses: courses.map(row => ({ ...row, credits: Number(row.credits), capacity: Number(row.capacity), enrolled_count: Number(row.enrolled_count), seats_remaining: Math.max(0, Number(row.capacity) - Number(row.enrolled_count)) })),
    registrations,
    results: results.map(row => ({ ...row, marks: row.marks === null ? null : Number(row.marks), grade_point: row.grade_point === null ? null : Number(row.grade_point), credits: Number(row.credits) })),
    summary: { students: students.length, courses: courses.length, registrations: registrations.length }
  };
}

async function studentSnapshot(identity) {
  const db = databasePool();
  const [studentRows] = await db.query('SELECT id, student_number, full_name, email, programme, year_level, campus FROM kemu_students WHERE id = ?', [identity.studentId]);
  if (!studentRows[0]) throw Object.assign(new Error('Student profile was not found'), { httpStatus: 404 });
  const [registrations] = await db.query(
    `SELECT r.id, r.registered_at, c.id AS course_id, c.code, c.title, c.lecturer, c.credits, c.capacity
     FROM kemu_registrations r JOIN kemu_courses c ON c.id = r.course_id
     WHERE r.student_id = ? AND r.status = 'registered' ORDER BY c.code`, [identity.studentId]
  );
  const [results] = await db.query(
    `SELECT r.id, r.semester, r.marks, r.grade, r.grade_point, r.status, c.code, c.title, c.credits
     FROM kemu_results r JOIN kemu_courses c ON c.id = r.course_id
     WHERE r.student_id = ? ORDER BY r.semester DESC, c.code`, [identity.studentId]
  );
  return { student: studentRows[0], registrations, results: results.map(row => ({ ...row, marks: row.marks === null ? null : Number(row.marks), grade_point: row.grade_point === null ? null : Number(row.grade_point), credits: Number(row.credits) })), courses: await courseRowsForStudent(identity.studentId) };
}

async function registerStudent(studentId, courseId) {
  const connection = await databasePool().getConnection();
  try {
    await connection.beginTransaction();
    const [courseRows] = await connection.query('SELECT id, capacity FROM kemu_courses WHERE id = ? AND is_active = TRUE FOR UPDATE', [courseId]);
    if (!courseRows[0]) throw Object.assign(new Error('Course not found'), { httpStatus: 404 });
    const [existing] = await connection.query('SELECT id, status FROM kemu_registrations WHERE student_id = ? AND course_id = ? FOR UPDATE', [studentId, courseId]);
    if (existing[0]?.status === 'registered') throw Object.assign(new Error('This course is already registered'), { httpStatus: 409 });
    const [countRows] = await connection.query("SELECT COUNT(*) AS count FROM kemu_registrations WHERE course_id = ? AND status = 'registered'", [courseId]);
    if (Number(countRows[0].count) >= Number(courseRows[0].capacity)) throw Object.assign(new Error('This course is full'), { httpStatus: 409 });
    if (existing[0]) {
      await connection.query("UPDATE kemu_registrations SET status = 'registered', registered_at = CURRENT_TIMESTAMP(3), withdrawn_at = NULL WHERE id = ?", [existing[0].id]);
    } else {
      await connection.query("INSERT INTO kemu_registrations (id, student_id, course_id, status) VALUES (?, ?, ?, 'registered')", [createId(), studentId, courseId]);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function withdrawRegistration(studentId, courseId) {
  const [result] = await databasePool().query("UPDATE kemu_registrations SET status = 'withdrawn', withdrawn_at = CURRENT_TIMESTAMP(3) WHERE student_id = ? AND course_id = ? AND status = 'registered'", [studentId, courseId]);
  if (!result.affectedRows) throw Object.assign(new Error('Active registration not found'), { httpStatus: 404 });
}

async function api(req, res, url) {
  const pathname = url.pathname;
  if (pathname === '/api/health') {
    json(res, databaseReady ? 200 : 503, { ok: databaseReady, database: databaseReady ? 'ready' : 'starting' });
    return;
  }
  if (pathname === '/api/auth/login' && req.method === 'GET') return handleLogin(req, res, url);
  if (pathname === '/api/auth/callback' && req.method === 'GET') return handleCallback(req, res, url);
  if (pathname === '/api/auth/logout' && ['GET', 'POST'].includes(req.method)) return handleLogout(req, res);
  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const identity = await identityForRequest(req);
    json(res, 200, { authenticated: Boolean(identity), identity });
    return;
  }
  if (!databaseReady) { json(res, 503, { error: 'database_starting' }); return; }
  if (pathname === '/api/bootstrap' && req.method === 'GET') {
    const identity = await requireIdentity(req, res);
    if (!identity) return;
    json(res, 200, identity.role === 'admin' ? { role: 'admin', identity, ...await adminSnapshot() } : { role: 'student', identity, ...await studentSnapshot(identity) });
    return;
  }
  if (pathname === '/api/registrations' && req.method === 'POST') {
    const identity = await requireIdentity(req, res);
    if (!identity || identity.role !== 'student') { if (identity) json(res, 403, { error: 'student_required' }); return; }
    const body = await readBody(req);
    await registerStudent(identity.studentId, safe(body.course_id));
    json(res, 201, { ok: true, ...(await studentSnapshot(identity)) });
    return;
  }
  if (pathname.startsWith('/api/registrations/') && req.method === 'DELETE') {
    const identity = await requireIdentity(req, res);
    if (!identity || identity.role !== 'student') { if (identity) json(res, 403, { error: 'student_required' }); return; }
    await withdrawRegistration(identity.studentId, pathname.split('/').pop());
    json(res, 200, { ok: true, ...(await studentSnapshot(identity)) });
    return;
  }
  if (pathname === '/api/admin/students' && req.method === 'POST') {
    const identity = await requireAdmin(req, res); if (!identity) return;
    const body = await readBody(req);
    const fullName = safe(body.full_name), email = normalizeEmail(body.email), programme = safe(body.programme), campus = safe(body.campus, 'Main Campus');
    const yearLevel = Math.min(8, Math.max(1, Number(body.year_level || 1)));
    if (!fullName || !email || !programme || !email.includes('@')) throw Object.assign(new Error('Name, valid email, programme, and year are required'), { httpStatus: 400 });
    const studentNumber = safe(body.student_number) || `KEMU/${new Date().getFullYear()}/${String(crypto.randomInt(1000, 9999))}`;
    await databasePool().query('INSERT INTO kemu_students (id, student_number, full_name, email, programme, year_level, campus) VALUES (?, ?, ?, ?, ?, ?, ?)', [createId(), studentNumber, fullName, email, programme, yearLevel, campus]);
    json(res, 201, { ok: true, ...await adminSnapshot() });
    return;
  }
  if (pathname === '/api/admin/courses' && req.method === 'POST') {
    const identity = await requireAdmin(req, res); if (!identity) return;
    const body = await readBody(req);
    const code = safe(body.code).toUpperCase(), title = safe(body.title), lecturer = safe(body.lecturer), semester = safe(body.semester, 'Semester 1, 2026/2027');
    const credits = Math.min(8, Math.max(1, Number(body.credits || 3))), capacity = Math.min(1000, Math.max(1, Number(body.capacity || 60)));
    if (!code || !title || !lecturer) throw Object.assign(new Error('Course code, title, and lecturer are required'), { httpStatus: 400 });
    await databasePool().query('INSERT INTO kemu_courses (id, code, title, lecturer, credits, capacity, semester) VALUES (?, ?, ?, ?, ?, ?, ?)', [createId(), code, title, lecturer, credits, capacity, semester]);
    json(res, 201, { ok: true, ...await adminSnapshot() });
    return;
  }
  if (pathname === '/api/admin/results' && req.method === 'POST') {
    const identity = await requireAdmin(req, res); if (!identity) return;
    const body = await readBody(req);
    const studentId = safe(body.student_id), courseId = safe(body.course_id), semester = safe(body.semester, 'Semester 3, 2026');
    const grade = safe(body.grade).toUpperCase() || null;
    const marksValue = body.marks === '' || body.marks === undefined || body.marks === null ? null : Number(body.marks);
    const gradePointValue = body.grade_point === '' || body.grade_point === undefined || body.grade_point === null ? null : Number(body.grade_point);
    if (!studentId || !courseId || !semester) throw Object.assign(new Error('Student, course, and semester are required'), { httpStatus: 400 });
    if (marksValue !== null && (!Number.isFinite(marksValue) || marksValue < 0 || marksValue > 100)) throw Object.assign(new Error('Marks must be between 0 and 100, or left blank for pending'), { httpStatus: 400 });
    if (gradePointValue !== null && (!Number.isFinite(gradePointValue) || gradePointValue < 0 || gradePointValue > 4)) throw Object.assign(new Error('Grade point must be between 0 and 4, or left blank for pending'), { httpStatus: 400 });
    await databasePool().query(`INSERT INTO kemu_results (id, student_id, course_id, semester, marks, grade, grade_point, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE marks = VALUES(marks), grade = VALUES(grade), grade_point = VALUES(grade_point), status = VALUES(status)`, [createId(), studentId, courseId, semester, marksValue, grade, gradePointValue, marksValue === null && !grade ? 'pending' : 'published']);
    json(res, 201, { ok: true, ...await adminSnapshot() });
    return;
  }
  if (pathname === '/api/admin/registrations' && req.method === 'POST') {
    const identity = await requireAdmin(req, res); if (!identity) return;
    const body = await readBody(req);
    await registerStudent(safe(body.student_id), safe(body.course_id));
    json(res, 201, { ok: true, ...await adminSnapshot() });
    return;
  }
  if (pathname.startsWith('/api/admin/registrations/') && req.method === 'DELETE') {
    const identity = await requireAdmin(req, res); if (!identity) return;
    const registrationId = pathname.split('/').pop();
    const [result] = await databasePool().query("UPDATE kemu_registrations SET status = 'withdrawn', withdrawn_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND status = 'registered'", [registrationId]);
    if (!result.affectedRows) throw Object.assign(new Error('Registration not found'), { httpStatus: 404 });
    json(res, 200, { ok: true, ...await adminSnapshot() });
    return;
  }
  json(res, 404, { error: 'not_found' });
}

async function serveStatic(req, res, url) {
  const requestedPath = decodeURIComponent(url.pathname);
  const candidate = path.resolve(sourceDir, `.${requestedPath === '/' ? '/index.html' : requestedPath}`);
  if (!candidate.startsWith(`${sourceDir}${path.sep}`)) { text(res, 403, 'Forbidden'); return; }
  let filePath = candidate;
  try { await fs.access(filePath); } catch { filePath = path.join(sourceDir, 'index.html'); }
  try {
    const data = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[extension] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  } catch (error) {
    text(res, 500, `Portal server error: ${error.message}`);
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) await api(req, res, url);
    else await serveStatic(req, res, url);
  } catch (error) {
    const status = Number(error.httpStatus || (error.code === 'ER_DUP_ENTRY' ? 409 : 500));
    json(res, status, { error: error.code === 'ER_DUP_ENTRY' ? 'already_exists' : 'request_failed', message: error.message });
  }
});

try {
  await initializeDatabase();
  server.listen(port, '0.0.0.0', () => console.log(`KeMU Student Portal API listening on 0.0.0.0:${port}`));
} catch (error) {
  console.error(`Database initialization failed: ${error.message}`);
  process.exitCode = 1;
}
