const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'crm.db');

let db;
function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrate(db);
  }
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS telecallers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      username TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'telecaller',
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      name TEXT DEFAULT '',
      status TEXT DEFAULT 'new',
      source_number TEXT NOT NULL DEFAULT '',
      assigned_to INTEGER REFERENCES telecallers(id),
      last_message TEXT DEFAULT '',
      last_activity DATETIME DEFAULT (datetime('now')),
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      direction TEXT DEFAULT 'inbound',
      content TEXT NOT NULL,
      source_number TEXT DEFAULT '',
      timestamp DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      author TEXT DEFAULT '',
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wati_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source_number);
    CREATE INDEX IF NOT EXISTS idx_messages_lead ON messages(lead_id);
    CREATE INDEX IF NOT EXISTS idx_notes_lead ON notes(lead_id);
  `);

  // Add columns incrementally if upgrading from an older version
  try { db.exec("ALTER TABLE telecallers ADD COLUMN username TEXT"); } catch(e) {}
  try { db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_telecallers_username ON telecallers(username)"); } catch(e) {}
  try { db.exec("ALTER TABLE telecallers ADD COLUMN password TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE telecallers ADD COLUMN role TEXT DEFAULT 'telecaller'"); } catch(e) {}
  try { db.exec("ALTER TABLE telecallers ADD COLUMN plain_password TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE leads ADD COLUMN source_label TEXT DEFAULT ''"); } catch(e) {}

  // Migrate old follow-up status to follow_up_1
  try { db.exec("UPDATE leads SET status = 'follow_up_1' WHERE status = 'follow-up' OR status = 'call_later'"); } catch(e) {}

  // Seed default admin if no admin exists
  const adminExists = db.prepare("SELECT id FROM telecallers WHERE role = 'admin'").get();
  if (!adminExists) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('admin', 10);
    db.prepare("INSERT INTO telecallers (name, username, password, role) VALUES ('Admin', 'admin', ?, 'admin')").run(hash);
  }
}

// ── Auth & Users ──

function getUserByUsername(username) {
  const db = getDb();
  return db.prepare('SELECT * FROM telecallers WHERE username = ?').get(username);
}

function verifyLogin(username, password) {
  const user = getUserByUsername(username);
  if (!user || !user.password) return null;
  const bcrypt = require('bcryptjs');
  if (bcrypt.compareSync(password, user.password)) {
    return { id: user.id, name: user.name, username: user.username, role: user.role };
  }
  return null;
}

function getTelecallers() {
  const db = getDb();
  return db.prepare('SELECT id, name, phone, username, plain_password, role, active, created_at FROM telecallers ORDER BY name').all();
}

function addTelecaller({ name, phone, username, password, role }) {
  const db = getDb();
  const bcrypt = require('bcryptjs');

  // Ensure column exists in case migration hadn't run yet (hot-reload safe)
  try { db.exec("ALTER TABLE telecallers ADD COLUMN plain_password TEXT"); } catch(e) {}

  if (username) {
    const existingUser = db.prepare('SELECT id FROM telecallers WHERE username = ?').get(username);
    if (existingUser) throw new Error('Username already exists');
  }

  const hash = password ? bcrypt.hashSync(password, 10) : null;
  const result = db.prepare(
    'INSERT INTO telecallers (name, phone, username, password, plain_password, role) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, phone || '', username || null, hash, password || null, role || 'telecaller');
  return { id: result.lastInsertRowid };
}

function toggleTelecaller(id) {
  const db = getDb();
  db.prepare('UPDATE telecallers SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?').run(id);
}

function updateUserPassword(id, newPassword) {
  const db = getDb();
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE telecallers SET password = ?, plain_password = ? WHERE id = ?').run(hash, newPassword, id);
}

function deleteTelecaller(id) {
  const db = getDb();
  // Ensure we clear references before deleting to avoid foreign key constraints
  db.prepare("UPDATE leads SET assigned_to = NULL WHERE assigned_to = ?").run(id);
  db.prepare("DELETE FROM telecallers WHERE id = ? AND role != 'admin'").run(id);
}

function deleteAllNonAdmins() {
  const db = getDb();
  db.prepare("UPDATE leads SET assigned_to = NULL WHERE assigned_to IN (SELECT id FROM telecallers WHERE role != 'admin')").run();
  db.prepare("DELETE FROM telecallers WHERE role != 'admin'").run();
}


// ── Lead Operations ──

function upsertLead({ phone, name, message, source_number, timestamp }) {
  const db = getDb();
  const ts = timestamp || new Date().toISOString();

  // Auto-lookup the human-friendly label for this source number
  const srcClean = String(source_number || '').replace(/\D/g, '');
  const srcRow = srcClean ? db.prepare('SELECT label FROM wati_sources WHERE phone = ?').get(srcClean) : null;
  const sourceLabel = srcRow ? srcRow.label : '';

  const existing = db.prepare('SELECT id, source_label FROM leads WHERE phone = ?').get(phone);

  if (existing) {
    db.prepare(`
      UPDATE leads SET
        name = CASE WHEN ? != '' THEN ? ELSE name END,
        last_message = ?,
        last_activity = ?,
        source_number = CASE WHEN ? != '' THEN ? ELSE source_number END,
        source_label = CASE WHEN ? != '' THEN ? ELSE source_label END,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(name || '', name || '', message, ts, source_number || '', source_number || '', sourceLabel, sourceLabel, existing.id);

    db.prepare(`
      INSERT INTO messages (lead_id, direction, content, source_number, timestamp)
      VALUES (?, 'inbound', ?, ?, ?)
    `).run(existing.id, message, source_number || '', ts);

    return { id: existing.id, created: false };
  } else {
    // ── Auto-Assignment Logic (Load balancing) ──
    let assignee = null;
    const activeTelecallers = db.prepare("SELECT id FROM telecallers WHERE active = 1 AND role = 'telecaller'").all();
    
    if (activeTelecallers.length > 0) {
      // Find the telecaller with the least number of pending (non-closed) leads
      const load = db.prepare(`
        SELECT t.id, COUNT(l.id) as pending_count
        FROM telecallers t
        LEFT JOIN leads l ON l.assigned_to = t.id AND l.status NOT IN ('closed','converted','not_interested')
        WHERE t.active = 1 AND t.role = 'telecaller'
        GROUP BY t.id
        ORDER BY pending_count ASC, RANDOM()
        LIMIT 1
      `).get();
      if (load) assignee = load.id;
    }

    const result = db.prepare(`
      INSERT INTO leads (phone, name, last_message, last_activity, source_number, source_label, assigned_to)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(phone, name || '', message, ts, source_number || '', sourceLabel, assignee);

    db.prepare(`
      INSERT INTO messages (lead_id, direction, content, source_number, timestamp)
      VALUES (?, 'inbound', ?, ?, ?)
    `).run(result.lastInsertRowid, message, source_number || '', ts);

    return { id: result.lastInsertRowid, created: true, assigned_to: assignee };
  }
}

function getLeads({ status, source, assigned, search, page = 1, limit = 50 } = {}) {
  const db = getDb();
  let where = [];
  let params = [];

  if (status && status !== 'all') {
    where.push('l.status = ?');
    params.push(status);
  }
  if (source) {
    where.push('l.source_number = ?');
    params.push(source);
  }
  if (assigned === 'unassigned') {
    where.push('l.assigned_to IS NULL');
  } else if (assigned) {
    where.push('l.assigned_to = ?');
    params.push(parseInt(assigned));
  }
  if (search) {
    where.push('(l.phone LIKE ? OR l.name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (page - 1) * limit;

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM leads l ${whereClause}`).get(...params);
  const leads = db.prepare(`
    SELECT l.*, t.name as telecaller_name
    FROM leads l
    LEFT JOIN telecallers t ON l.assigned_to = t.id
    ${whereClause}
    ORDER BY l.last_activity DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return { leads, total: countRow.total, page, limit };
}

function getLeadById(id) {
  const db = getDb();
  const lead = db.prepare(`
    SELECT l.*, t.name as telecaller_name
    FROM leads l
    LEFT JOIN telecallers t ON l.assigned_to = t.id
    WHERE l.id = ?
  `).get(id);

  if (!lead) return null;

  const messages = db.prepare(
    'SELECT * FROM messages WHERE lead_id = ? ORDER BY timestamp ASC'
  ).all(id);

  const notes = db.prepare(
    'SELECT * FROM notes WHERE lead_id = ? ORDER BY created_at DESC'
  ).all(id);

  return { ...lead, messages, notes };
}

function updateLead(id, updates) {
  const db = getDb();
  const fields = [];
  const params = [];

  if (updates.status !== undefined) { fields.push('status = ?'); params.push(updates.status); }
  if (updates.name !== undefined) { fields.push('name = ?'); params.push(updates.name); }
  if (updates.assigned_to !== undefined) {
    fields.push('assigned_to = ?');
    params.push(updates.assigned_to === null ? null : parseInt(updates.assigned_to));
  }

  // ── Auto-assign to support team when lead becomes interested ──
  if (updates.status === 'interested' && updates.assigned_to === undefined) {
    const supportLoad = db.prepare(`
      SELECT t.id, COUNT(l.id) as pending_count
      FROM telecallers t
      LEFT JOIN leads l ON l.assigned_to = t.id AND l.status IN ('interested', 'interested_no_convert')
      WHERE t.active = 1 AND t.role = 'support'
      GROUP BY t.id
      ORDER BY pending_count ASC, RANDOM()
      LIMIT 1
    `).get();
    if (supportLoad) {
      fields.push('assigned_to = ?');
      params.push(supportLoad.id);
    }
  }

  // ── Re-assign to least-loaded telecaller when forwarded back from support ──
  if (updates.status === 'interested_no_convert' && updates.assigned_to === undefined) {
    const tcLoad = db.prepare(`
      SELECT t.id, COUNT(l.id) as pending_count
      FROM telecallers t
      LEFT JOIN leads l ON l.assigned_to = t.id AND l.status NOT IN ('closed','converted','not_interested')
      WHERE t.active = 1 AND t.role = 'telecaller'
      GROUP BY t.id
      ORDER BY pending_count ASC, RANDOM()
      LIMIT 1
    `).get();
    if (tcLoad) {
      fields.push('assigned_to = ?');
      params.push(tcLoad.id);
    }
  }

  if (fields.length === 0) return false;

  fields.push("updated_at = datetime('now')");
  params.push(id);

  db.prepare(`UPDATE leads SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return true;
}

function addNote(leadId, { author, content }) {
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO notes (lead_id, author, content) VALUES (?, ?, ?)'
  ).run(leadId, author || 'System', content);
  return { id: result.lastInsertRowid };
}

// ── Analytics ──

function getAnalytics() {
  const db = getDb();

  // ── Core counts ──
  const total = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
  const today = db.prepare("SELECT COUNT(*) as count FROM leads WHERE date(created_at) = date('now')").get().count;
  const thisWeek = db.prepare("SELECT COUNT(*) as count FROM leads WHERE created_at >= datetime('now', '-7 days')").get().count;
  const lastWeek = db.prepare("SELECT COUNT(*) as count FROM leads WHERE created_at >= datetime('now', '-14 days') AND created_at < datetime('now', '-7 days')").get().count;
  const thisMonth = db.prepare("SELECT COUNT(*) as count FROM leads WHERE created_at >= datetime('now', '-30 days')").get().count;
  const lastMonth = db.prepare("SELECT COUNT(*) as count FROM leads WHERE created_at >= datetime('now', '-60 days') AND created_at < datetime('now', '-30 days')").get().count;
  const yesterday = db.prepare("SELECT COUNT(*) as count FROM leads WHERE date(created_at) = date('now', '-1 day')").get().count;

  // ── Status counts ──
  const closed = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'closed'").get().count;
  const interested = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'interested'").get().count;
  const notInterested = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'not_interested'").get().count;
  const followUp1 = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'follow_up_1'").get().count;
  const followUp2 = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'follow_up_2'").get().count;
  const interestedNoConvert = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'interested_no_convert'").get().count;
  const converted = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'converted'").get().count;
  const callLater = followUp1 + followUp2 + interestedNoConvert;
  const newLeads = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'new'").get().count;
  const contacted = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'contacted'").get().count;
  const unassigned = db.prepare("SELECT COUNT(*) as count FROM leads WHERE assigned_to IS NULL").get().count;

  // ── Distributions ──
  const statusDist = db.prepare('SELECT status, COUNT(*) as count FROM leads GROUP BY status ORDER BY count DESC').all();

  const perSource = db.prepare(
    "SELECT source_number, COUNT(*) as count FROM leads WHERE source_number != '' GROUP BY source_number ORDER BY count DESC LIMIT 10"
  ).all();

  // ── Enhanced telecaller performance ──
  const telecallerPerf = db.prepare(`
    SELECT
      t.id, t.name,
      COUNT(l.id) as total,
      SUM(CASE WHEN l.status = 'new'          THEN 1 ELSE 0 END) as new_leads,
      SUM(CASE WHEN l.status = 'contacted'    THEN 1 ELSE 0 END) as called,
      SUM(CASE WHEN l.status = 'interested'   THEN 1 ELSE 0 END) as interested,
      SUM(CASE WHEN l.status = 'not_interested' THEN 1 ELSE 0 END) as not_interested,
      SUM(CASE WHEN l.status IN ('follow_up_1','follow_up_2','interested_no_convert') THEN 1 ELSE 0 END) as call_later,
      SUM(CASE WHEN l.status = 'converted'     THEN 1 ELSE 0 END) as converted,
      SUM(CASE WHEN l.status = 'closed'       THEN 1 ELSE 0 END) as closed,
      COUNT(CASE WHEN l.created_at >= datetime('now','-7 days') THEN 1 END) as this_week,
      COUNT(CASE WHEN l.created_at >= datetime('now','-1 day')  THEN 1 END) as today
    FROM telecallers t
    LEFT JOIN leads l ON l.assigned_to = t.id
    WHERE t.active = 1 AND t.role = 'telecaller'
    GROUP BY t.id
    ORDER BY total DESC
  `).all();

  // ── Support team performance ──
  const supportPerf = db.prepare(`
    SELECT
      t.id, t.name,
      COUNT(l.id) as total,
      SUM(CASE WHEN l.status = 'interested'          THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN l.status = 'converted'           THEN 1 ELSE 0 END) as converted,
      SUM(CASE WHEN l.status = 'interested_no_convert' THEN 1 ELSE 0 END) as no_convert,
      COUNT(CASE WHEN l.updated_at >= datetime('now','-7 days') THEN 1 END) as this_week,
      COUNT(CASE WHEN l.updated_at >= datetime('now','-1 day')  THEN 1 END) as today
    FROM telecallers t
    LEFT JOIN leads l ON l.assigned_to = t.id AND l.status IN ('interested','converted','interested_no_convert')
    WHERE t.active = 1 AND t.role = 'support'
    GROUP BY t.id
    ORDER BY converted DESC
  `).all();

  // ── Daily trend (30 days) ──
  const dailyTrend = db.prepare(`
    SELECT date(created_at) as date, COUNT(*) as count
    FROM leads
    WHERE created_at >= datetime('now', '-30 days')
    GROUP BY date(created_at)
    ORDER BY date ASC
  `).all();

  // ── Hourly distribution (all time, 0-23) ──
  const hourlyRaw = db.prepare(`
    SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour, COUNT(*) as count
    FROM leads GROUP BY strftime('%H', created_at) ORDER BY hour ASC
  `).all();
  // Fill missing hours with 0
  const hourlyMap = {};
  hourlyRaw.forEach(r => { hourlyMap[r.hour] = r.count; });
  const hourlyDist = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: hourlyMap[h] || 0 }));

  // ── Day-of-week distribution (0=Sun … 6=Sat) ──
  const dowRaw = db.prepare(`
    SELECT CAST(strftime('%w', created_at) AS INTEGER) as dow, COUNT(*) as count
    FROM leads GROUP BY strftime('%w', created_at) ORDER BY dow ASC
  `).all();
  const dowMap = {};
  dowRaw.forEach(r => { dowMap[r.dow] = r.count; });
  const dowDist = Array.from({ length: 7 }, (_, d) => ({ dow: d, count: dowMap[d] || 0 }));

  // ── Total inbound messages ──
  const totalMessages = db.prepare("SELECT COUNT(*) as count FROM messages WHERE direction = 'inbound'").get().count;

  // ── Response rate: leads that moved out of 'new' ──
  const actioned = total - newLeads;
  const responseRate = total > 0 ? ((actioned / total) * 100).toFixed(1) : 0;

  return {
    total,
    today,
    yesterday,
    thisWeek,
    lastWeek,
    thisMonth,
    lastMonth,
    conversionRate: total > 0 ? ((closed / total) * 100).toFixed(1) : 0,
    interestedRate: total > 0 ? (((interested + closed) / total) * 100).toFixed(1) : 0,
    responseRate,
    statusCounts: { newLeads, contacted, interested, notInterested, callLater, closed, followUp1, followUp2, interestedNoConvert, converted },
    unassigned,
    totalMessages,
    statusDistribution: statusDist,
    perSource,
    telecallerPerformance: telecallerPerf,
    supportPerformance: supportPerf,
    dailyTrend,
    hourlyDist,
    dowDist,
  };
}

// ── Source Numbers ──

function getSourceNumbers() {
  const db = getDb();
  return db.prepare(
    "SELECT DISTINCT source_number FROM leads WHERE source_number != '' ORDER BY source_number"
  ).all().map(r => r.source_number);
}

// ── WATI Sources (multi-number management) ──

function getWatiSources() {
  const db = getDb();
  return db.prepare('SELECT * FROM wati_sources ORDER BY created_at DESC').all();
}

function addWatiSource({ phone, label }) {
  const db = getDb();
  const clean = String(phone).replace(/\D/g, '');
  const existing = db.prepare('SELECT id FROM wati_sources WHERE phone = ?').get(clean);
  if (existing) throw new Error('Phone number already registered');
  const result = db.prepare('INSERT INTO wati_sources (phone, label) VALUES (?, ?)').run(clean, label);
  return { id: result.lastInsertRowid };
}

function deleteWatiSource(id) {
  const db = getDb();
  db.prepare('DELETE FROM wati_sources WHERE id = ?').run(id);
}

function getWatiSourceLabel(phone) {
  const db = getDb();
  const clean = String(phone).replace(/\D/g, '');
  const row = db.prepare('SELECT label FROM wati_sources WHERE phone = ?').get(clean);
  return row ? row.label : '';
}

// ── Export ──

function getAllLeadsForExport() {
  const db = getDb();
  return db.prepare(`
    SELECT l.id, l.phone, l.name, l.status, l.source_number,
           t.name as assigned_to, l.last_message,
           l.last_activity, l.created_at, l.updated_at
    FROM leads l
    LEFT JOIN telecallers t ON l.assigned_to = t.id
    ORDER BY l.last_activity DESC
  `).all();
}

// ── Danger Zone ──

function deleteAllLeads() {
  const db = getDb();
  // CASCADE handles messages and notes automatically
  db.prepare('DELETE FROM notes').run();
  db.prepare('DELETE FROM messages').run();
  db.prepare('DELETE FROM leads').run();
}

function fullSystemReset() {
  const db = getDb();
  // Wipe all leads data
  db.prepare('DELETE FROM notes').run();
  db.prepare('DELETE FROM messages').run();
  db.prepare('DELETE FROM leads').run();
  // Wipe all staff except admin
  db.prepare("DELETE FROM telecallers WHERE role != 'admin'").run();
  // Wipe all WATI sources
  db.prepare('DELETE FROM wati_sources').run();
}

module.exports = {
  getDb, upsertLead, getLeads, getLeadById, updateLead, addNote,
  getAnalytics, getSourceNumbers, getTelecallers, addTelecaller,
  toggleTelecaller, updateUserPassword, deleteTelecaller, deleteAllNonAdmins, getAllLeadsForExport, getUserByUsername, verifyLogin,
  getWatiSources, addWatiSource, deleteWatiSource, getWatiSourceLabel,
  deleteAllLeads, fullSystemReset
};
