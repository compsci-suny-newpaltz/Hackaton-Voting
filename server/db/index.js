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
  
  // Future migrations can be added here if needed
  
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
      WHERE concluded_at IS NULL 
      ORDER BY start_time DESC 
      LIMIT 1
    `).get();
  },
  
  createHackathon(data) {
    checkDb();
    const { name, description, start_time, end_time, vote_expiration, review_ends_at, banner_url, created_by } = data;
    const result = db.prepare(
      'INSERT INTO hackathons (name, description, start_time, end_time, vote_expiration, review_ends_at, banner_url, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(name, description, start_time, end_time, vote_expiration, review_ends_at || null, banner_url, created_by);

    // Automatically create default judge categories for new hackathon
    const hackathonId = result.lastInsertRowid;
    const defaultCategories = [
      { name: 'Innovation / Creativity', description: 'Is the idea original or a novel approach to an existing problem?', weight: 1.0, order: 0 },
      { name: 'Functionality', description: 'Does the application work as intended? Are features implemented well and reliably?', weight: 1.0, order: 1 },
      { name: 'Design / Polish', description: 'Is the user experience smooth? Is it accessible? Is the UI easy to use? Does it look good?', weight: 1.0, order: 2 },
      { name: 'Presentation / Demo', description: 'Was the team able to clearly communicate their idea, goals, and implementation?', weight: 1.0, order: 3 }
    ];

    const insertCategory = db.prepare(`
      INSERT INTO judge_categories (hackathon_id, name, description, weight, display_order)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const cat of defaultCategories) {
      insertCategory.run(hackathonId, cat.name, cat.description, cat.weight, cat.order);
    }

    return result;
  },
  
  updateHackathon(id, data) {
    checkDb();
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    // Fail loudly if no fields to update
    if (fields.length === 0) {
      throw new Error('updateHackathon: No fields provided to update');
    }
    
    values.push(id);
    return db.prepare(`UPDATE hackathons SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  },
  
  deleteHackathon(id) {
    checkDb();
    // Foreign key constraints will cascade delete related projects, votes, comments
    return db.prepare('DELETE FROM hackathons WHERE id = ?').run(id);
  },
  
  // Projects
  getProjectsByHackathon(hackathonId) {
    const query = `
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
    `;

    return db.prepare(query).all(hackathonId);
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
    checkDb();
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
    
    if (fields.length === 0) {
      throw new Error('No fields to update');
    }
    
    values.push(id);
    return db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  },

  deleteProject(id) {
    checkDb();
    // Foreign key constraints will cascade delete related votes, comments, judges
    return db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  },
  
  // Popular votes
  getPopularVote(projectId, userEmail) {
    return db.prepare('SELECT * FROM popular_votes WHERE project_id = ? AND user_email = ?').get(projectId, userEmail.toLowerCase());
  },

  addPopularVote(projectId, userEmail) {
    return db.prepare('INSERT INTO popular_votes (project_id, user_email) VALUES (?, ?)').run(projectId, userEmail.toLowerCase());
  },

  removePopularVote(projectId, userEmail) {
    return db.prepare('DELETE FROM popular_votes WHERE project_id = ? AND user_email = ?').run(projectId, userEmail.toLowerCase());
  },

  getUserVotesInHackathon(hackathonId, userEmail) {
    checkDb();
    const query = `
      SELECT pv.*, p.name as project_name, p.id as project_id
      FROM popular_votes pv
      JOIN projects p ON pv.project_id = p.id
      WHERE p.hackathon_id = ? AND pv.user_email = ?
    `;
    return db.prepare(query).all(hackathonId, userEmail.toLowerCase());
  },
  
  // Judge codes
  getJudgeCode(code) {
    return db.prepare('SELECT * FROM judge_codes WHERE code = ?').get(code);
  },
  
  getJudgeCodesByHackathon(hackathonId) {
    return db.prepare('SELECT * FROM judge_codes WHERE hackathon_id = ? ORDER BY created_at DESC').all(hackathonId);
  },
  
  createJudgeCode(data) {
    const { code, judge_name, hackathon_id, created_by, expires_at, anonymous_responses } = data;
    return db.prepare(
      'INSERT INTO judge_codes (code, judge_name, hackathon_id, created_by, expires_at, anonymous_responses) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(code, judge_name, hackathon_id, created_by, expires_at, anonymous_responses || 0);
  },

  updateJudgeCode(id, data) {
    checkDb();
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      throw new Error('updateJudgeCode: No fields provided to update');
    }

    values.push(id);
    return db.prepare(`UPDATE judge_codes SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  },

  revokeJudgeCode(code) {
    return db.prepare('UPDATE judge_codes SET revoked = 1 WHERE code = ?').run(code);
  },
  
  markJudgeCodeVoted(codeId) {
    return db.prepare('UPDATE judge_codes SET voted = 1, voted_at = CURRENT_TIMESTAMP WHERE id = ?').run(codeId);
  },
  
  // Judge votes
  getJudgeVotesByProject(projectId) {
    checkDb();
    // Return category-based votes (new system)
    const categoryVotes = db.prepare(`
      SELECT
        jcv.*,
        jc.name as category_name,
        jc.weight as category_weight,
        jcode.judge_name
      FROM judge_category_votes jcv
      JOIN judge_categories jc ON jcv.category_id = jc.id
      JOIN judge_codes jcode ON jcv.judge_code_id = jcode.id
      WHERE jcv.project_id = ?
      ORDER BY jc.display_order, jcode.judge_name
    `).all(projectId);

    // If no category votes, check for old-style votes (backward compatibility)
    if (categoryVotes.length === 0) {
      return db.prepare('SELECT * FROM judge_votes WHERE project_id = ?').all(projectId);
    }

    return categoryVotes;
  },

  getJudgeResultsByHackathon(hackathonId) {
    checkDb();
    // Get category-based results with weighted scores
    return db.prepare(`
      SELECT
        p.id as project_id,
        p.name as project_name,
        jcode.judge_name,
        jcv.category_id,
        jcat.name as category_name,
        jcat.weight as category_weight,
        jcat.display_order,
        jcv.score,
        jcv.comment,
        jcv.voted_at
      FROM projects p
      LEFT JOIN judge_category_votes jcv ON p.id = jcv.project_id
      LEFT JOIN judge_codes jcode ON jcv.judge_code_id = jcode.id
      LEFT JOIN judge_categories jcat ON jcv.category_id = jcat.id
      WHERE p.hackathon_id = ?
      ORDER BY p.id, jcode.judge_name, jcat.display_order
    `).all(hackathonId);
  },

  getProjectScoresSummary(hackathonId) {
    checkDb();
    // Calculate weighted average scores from category votes
    const results = db.prepare(`
      SELECT
        p.id,
        p.name,
        COUNT(DISTINCT pv.id) as popular_votes,
        COUNT(DISTINCT jcv.judge_code_id) as judge_vote_count
      FROM projects p
      LEFT JOIN popular_votes pv ON p.id = pv.project_id
      LEFT JOIN judge_category_votes jcv ON p.id = jcv.project_id
      WHERE p.hackathon_id = ?
      GROUP BY p.id
    `).all(hackathonId);

    // Calculate weighted scores for each project
    return results.map(project => {
      const categoryScores = db.prepare(`
        SELECT
          jcat.weight,
          AVG(jcv.score) as avg_score
        FROM judge_category_votes jcv
        JOIN judge_categories jcat ON jcv.category_id = jcat.id
        WHERE jcv.project_id = ?
        GROUP BY jcat.id
      `).all(project.id);

      if (categoryScores.length === 0) {
        return {
          ...project,
          avg_judge_score: null,
          min_judge_score: null,
          max_judge_score: null
        };
      }

      // Calculate weighted average
      const totalWeight = categoryScores.reduce((sum, cat) => sum + cat.weight, 0);
      const weightedSum = categoryScores.reduce((sum, cat) => sum + (cat.avg_score * cat.weight), 0);
      const avg_judge_score = totalWeight > 0 ? weightedSum / totalWeight : null;

      // Get min/max across all category votes
      const allScores = db.prepare(`
        SELECT score FROM judge_category_votes WHERE project_id = ?
      `).all(project.id).map(v => v.score);

      return {
        ...project,
        avg_judge_score: avg_judge_score ? parseFloat(avg_judge_score.toFixed(2)) : null,
        min_judge_score: allScores.length > 0 ? Math.min(...allScores) : null,
        max_judge_score: allScores.length > 0 ? Math.max(...allScores) : null
      };
    }).sort((a, b) => {
      // Sort by avg_judge_score DESC, then popular_votes DESC
      if (a.avg_judge_score === b.avg_judge_score) {
        return b.popular_votes - a.popular_votes;
      }
      if (a.avg_judge_score === null) return 1;
      if (b.avg_judge_score === null) return -1;
      return b.avg_judge_score - a.avg_judge_score;
    });
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

  // Judge Categories
  getJudgeCategories(hackathonId) {
    checkDb();
    return db.prepare('SELECT * FROM judge_categories WHERE hackathon_id = ? ORDER BY display_order ASC').all(hackathonId);
  },

  createJudgeCategory(data) {
    checkDb();
    const { hackathon_id, name, description, weight, display_order } = data;
    return db.prepare(
      'INSERT INTO judge_categories (hackathon_id, name, description, weight, display_order) VALUES (?, ?, ?, ?, ?)'
    ).run(hackathon_id, name, description || null, weight || 1.0, display_order || 0);
  },

  updateJudgeCategory(id, data) {
    checkDb();
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return;
    values.push(id);
    return db.prepare(`UPDATE judge_categories SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  },

  deleteJudgeCategory(id) {
    checkDb();
    return db.prepare('DELETE FROM judge_categories WHERE id = ?').run(id);
  },

  // Judge Category Votes
  addJudgeCategoryVote(data) {
    checkDb();
    const { judge_code_id, project_id, category_id, score, comment } = data;
    return db.prepare(`
      INSERT INTO judge_category_votes (judge_code_id, project_id, category_id, score, comment)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(judge_code_id, project_id, category_id) DO UPDATE SET
        score = excluded.score,
        comment = excluded.comment,
        voted_at = CURRENT_TIMESTAMP
    `).run(judge_code_id, project_id, category_id, score, comment || null);
  },

  getJudgeCategoryVotes(judgeCodeId, projectId) {
    checkDb();
    return db.prepare(`
      SELECT jcv.*, jc.name as category_name, jc.weight
      FROM judge_category_votes jcv
      JOIN judge_categories jc ON jcv.category_id = jc.id
      WHERE jcv.judge_code_id = ? AND jcv.project_id = ?
      ORDER BY jc.display_order
    `).all(judgeCodeId, projectId);
  },

  getJudgeCategoryVotesByProject(projectId) {
    checkDb();
    return db.prepare(`
      SELECT jcv.*, jc.name as category_name, jc.weight, jc.display_order, jcode.judge_name
      FROM judge_category_votes jcv
      JOIN judge_categories jc ON jcv.category_id = jc.id
      JOIN judge_codes jcode ON jcv.judge_code_id = jcode.id
      WHERE jcv.project_id = ?
      ORDER BY jc.display_order, jcode.judge_name
    `).all(projectId);
  },

  // Transactions
  transaction(callback) {
    const transaction = db.transaction(callback);
    return transaction;
  }
};

module.exports = dbOperations;

