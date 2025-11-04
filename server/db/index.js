require('dotenv').config();
const path = require('path');

let Database;
let db;

try {
  Database = require('better-sqlite3');
  const dbPath = process.env.DATABASE_URL || './hackathon.db';
  db = new Database(dbPath);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  console.log('Database initialized successfully');
} catch (error) {
  console.error('Failed to initialize database:', error.message);
  console.error('Make sure better-sqlite3 is properly installed.');
  console.error('Run: npm rebuild better-sqlite3 (after installing Windows SDK)');
  // Create a mock database object to prevent crashes
  db = null;
}

// Helper to parse JSON fields
function parseJSON(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

// Helper to stringify JSON fields
function stringifyJSON(value) {
  if (value === null || value === undefined) return null;
  return typeof value === 'string' ? value : JSON.stringify(value);
}

// Helper to check if database is available
function checkDb() {
  if (!db) {
    throw new Error('Database not initialized. Please install better-sqlite3 and initialize the database.');
  }
}

// Database operations
const dbOperations = {
  // Admins
  getAdmins() {
    checkDb();
    return db.prepare('SELECT * FROM admins ORDER BY added_at DESC').all();
  },
  
  isAdmin(email) {
    const result = db.prepare('SELECT 1 FROM admins WHERE email = ?').get(email.toLowerCase());
    return !!result;
  },
  
  addAdmin(email, addedBy) {
    return db.prepare('INSERT INTO admins (email, added_by) VALUES (?, ?)').run(email.toLowerCase(), addedBy);
  },
  
  removeAdmin(email) {
    return db.prepare('DELETE FROM admins WHERE email = ?').run(email.toLowerCase());
  },
  
  // Audit logs
  logAudit(actorEmail, actionType, targetEntity, details) {
    return db.prepare(
      'INSERT INTO audit_logs (actor_email, action_type, target_entity, details_json) VALUES (?, ?, ?, ?)'
    ).run(actorEmail, actionType, targetEntity, stringifyJSON(details));
  },
  
  getAuditLogs(limit = 100) {
    return db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?').all(limit);
  },
  
  // Hackathons
  getHackathons() {
    checkDb();
    return db.prepare('SELECT * FROM hackathons ORDER BY start_time DESC').all();
  },
  
  getHackathon(id) {
    checkDb();
    return db.prepare('SELECT * FROM hackathons WHERE id = ?').get(id);
  },
  
  getCurrentHackathon() {
    checkDb();
    return db.prepare(`
      SELECT * FROM hackathons 
      WHERE status != 'concluded' 
      ORDER BY start_time DESC 
      LIMIT 1
    `).get();
  },
  
  createHackathon(data) {
    const { name, description, start_time, end_time, vote_expiration, banner_url, created_by } = data;
    return db.prepare(
      'INSERT INTO hackathons (name, description, start_time, end_time, vote_expiration, banner_url, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(name, description, start_time, end_time, vote_expiration, banner_url, created_by);
  },
  
  updateHackathon(id, data) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    values.push(id);
    return db.prepare(`UPDATE hackathons SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  },
  
  // Projects
  getProjectsByHackathon(hackathonId) {
    return db.prepare(`
      SELECT 
        p.*,
        COUNT(DISTINCT pv.id) as vote_count,
        COUNT(DISTINCT c.id) as comment_count
      FROM projects p
      LEFT JOIN popular_votes pv ON p.id = pv.project_id
      LEFT JOIN comments c ON p.id = c.project_id AND c.deleted = 0
      WHERE p.hackathon_id = ?
      GROUP BY p.id
      ORDER BY vote_count DESC, p.created_at DESC
    `).all(hackathonId);
  },
  
  getProject(id) {
    return db.prepare(`
      SELECT 
        p.*,
        COUNT(DISTINCT pv.id) as vote_count,
        COUNT(DISTINCT c.id) as comment_count
      FROM projects p
      LEFT JOIN popular_votes pv ON p.id = pv.project_id
      LEFT JOIN comments c ON p.id = c.project_id AND c.deleted = 0
      WHERE p.id = ?
      GROUP BY p.id
    `).get(id);
  },
  
  createProject(data) {
    const { hackathon_id, name, team_emails, created_by } = data;
    return db.prepare(
      'INSERT INTO projects (hackathon_id, name, team_emails, created_by) VALUES (?, ?, ?, ?)'
    ).run(hackathon_id, name, stringifyJSON(team_emails), created_by);
  },
  
  updateProject(id, data) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(data)) {
      if (key === 'team_emails') {
        fields.push(`${key} = ?`);
        values.push(stringifyJSON(value));
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    values.push(id);
    return db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  },
  
  // Popular votes
  getPopularVote(projectId, userEmail) {
    return db.prepare('SELECT * FROM popular_votes WHERE project_id = ? AND user_email = ?').get(projectId, userEmail.toLowerCase());
  },
  
  addPopularVote(projectId, userEmail) {
    return db.prepare('INSERT INTO popular_votes (project_id, user_email) VALUES (?, ?)').run(projectId, userEmail.toLowerCase());
  },
  
  // Judge codes
  getJudgeCode(code) {
    return db.prepare('SELECT * FROM judge_codes WHERE code = ?').get(code);
  },
  
  getJudgeCodesByHackathon(hackathonId) {
    return db.prepare('SELECT * FROM judge_codes WHERE hackathon_id = ? ORDER BY created_at DESC').all(hackathonId);
  },
  
  createJudgeCode(data) {
    const { code, judge_name, hackathon_id, created_by, expires_at } = data;
    return db.prepare(
      'INSERT INTO judge_codes (code, judge_name, hackathon_id, created_by, expires_at) VALUES (?, ?, ?, ?, ?)'
    ).run(code, judge_name, hackathon_id, created_by, expires_at);
  },
  
  revokeJudgeCode(code) {
    return db.prepare('UPDATE judge_codes SET revoked = 1 WHERE code = ?').run(code);
  },
  
  markJudgeCodeVoted(codeId) {
    return db.prepare('UPDATE judge_codes SET voted = 1, voted_at = CURRENT_TIMESTAMP WHERE id = ?').run(codeId);
  },
  
  // Judge votes
  getJudgeVotesByProject(projectId) {
    return db.prepare('SELECT * FROM judge_votes WHERE project_id = ?').all(projectId);
  },
  
  addJudgeVote(data) {
    const { judge_code_id, project_id, score, comment } = data;
    return db.prepare(
      'INSERT INTO judge_votes (judge_code_id, project_id, score, comment) VALUES (?, ?, ?, ?)'
    ).run(judge_code_id, project_id, score, comment);
  },
  
  // Comments
  getCommentsByProject(projectId) {
    return db.prepare('SELECT * FROM comments WHERE project_id = ? AND deleted = 0 ORDER BY created_at DESC').all(projectId);
  },
  
  addComment(data) {
    const { project_id, user_email, display_name, content } = data;
    return db.prepare(
      'INSERT INTO comments (project_id, user_email, display_name, content) VALUES (?, ?, ?, ?)'
    ).run(project_id, user_email.toLowerCase(), display_name, content);
  },
  
  updateComment(id, content) {
    return db.prepare('UPDATE comments SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(content, id);
  },
  
  deleteComment(id) {
    return db.prepare('UPDATE comments SET deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  },
  
  // File history
  addFileHistory(data) {
    const { project_id, version, filename, file_size, changelog, uploaded_by } = data;
    return db.prepare(
      'INSERT INTO file_history (project_id, version, filename, file_size, changelog, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(project_id, version, filename, file_size, changelog, uploaded_by);
  },
  
  getFileHistory(projectId) {
    return db.prepare('SELECT * FROM file_history WHERE project_id = ? ORDER BY version DESC').all(projectId);
  },
  
  // Transactions
  transaction(callback) {
    const transaction = db.transaction(callback);
    return transaction;
  }
};

module.exports = dbOperations;

