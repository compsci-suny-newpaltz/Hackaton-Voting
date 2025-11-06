# Hackathon Management System - TODOs

This document tracks incomplete features and missing functionality based on the README specification.

---

## 🔴 Critical Missing Features

### 1. Project Initialization UI (Admin)
**Status**: Missing  
**Priority**: High  
**Description**: Admins cannot initialize/create projects from the UI

**Current State**:
- API endpoint exists: `POST /hackathons/api/:hackathonId/projects`
- `api.createProject()` exists in client
- No UI in `HackathonSettings.vue` to create projects

**Required**:
- Add "Initialize Project" form in `HackathonSettings.vue`
- Fields: Project name, Team member emails (comma-separated or multi-input)
- Show list of existing projects with team info

**Files to modify**:
- `client/src/views/HackathonSettings.vue`

---

### 2. Team Project Management Interface
**Status**: Missing  
**Priority**: High  
**Description**: Team members have no way to edit their projects or upload files

**Current State**:
- API endpoints exist:
  - `PUT /hackathons/api/:hackathonId/projects/:projectId` (update project)
  - `POST /hackathons/api/:hackathonId/projects/:projectId/file` (file upload)
- Client API methods exist (`updateProject`, `uploadProjectFile`)
- No dedicated UI for team members to manage their project

**Required**:
- Create new view: `ProjectEdit.vue` or add edit mode to `ProjectDetail.vue`
- Features needed:
  - Edit project name, description, GitHub link
  - Upload/replace project file with changelog
  - Upload banner/image URLs
  - Show file upload history
  - Only accessible to team members
  - Respect hackathon deadline (unless override enabled)

**Files to create/modify**:
- Create: `client/src/views/ProjectEdit.vue` OR
- Modify: `client/src/views/ProjectDetail.vue` (add edit mode)
- Update: `client/src/main.js` (add route if new view)

---

### 3. Judge Results Display
**Status**: Partially Implemented  
**Priority**: High  
**Description**: Judge scores are collected but never displayed

**Current State**:
- Judge votes are stored in `judge_votes` table
- `HackathonDetail.vue` shows "🏆 Results - Judge results are now public!" for concluded hackathons
- No actual judge scores, rankings, or comments are shown
- No API endpoint to retrieve judge results

**Required**:
- Add API endpoint: `GET /hackathons/api/:hackathonId/results` or `GET /hackathons/api/:hackathonId/projects/:projectId/scores`
- Display on concluded hackathons:
  - Average judge score per project
  - Individual judge scores and comments (optional: anonymize judge names)
  - Ranking/leaderboard based on judge scores
  - Combined view: Popular votes + Judge scores
- Consider admin-only preview before hackathon is concluded

**Files to create/modify**:
- Create: `server/routes/results.js` (new API endpoints)
- Update: `server/db/index.js` (add `getJudgeResults()`, `getProjectScores()`)
- Update: `client/src/api/index.js` (add results methods)
- Update: `client/src/views/HackathonDetail.vue` (show results)
- Update: `client/src/views/ProjectDetail.vue` (show project-specific scores)

---

### 4. Comment Edit/Delete Functionality
**Status**: Backend Only  
**Priority**: Medium  
**Description**: Users can post comments but cannot edit or delete them

**Current State**:
- API endpoints exist:
  - `PUT /hackathons/api/:hackathonId/projects/:projectId/comments/:commentId`
  - `DELETE /hackathons/api/:hackathonId/projects/:projectId/comments/:commentId`
- Client API methods exist (`updateComment`, `deleteComment`)
- UI only shows comments and add comment form
- No edit/delete buttons

**Required**:
- Add edit/delete buttons to comments (only for comment author)
- Implement inline editing or modal for comment updates
- Add confirmation dialog for delete
- Show "edited" indicator if comment was modified

**Files to modify**:
- `client/src/views/ProjectDetail.vue`

---

## 🟡 Medium Priority Features

### 5. File History Display
**Status**: Backend Only  
**Priority**: Medium  
**Description**: File upload history is tracked but never shown to users

**Current State**:
- `file_history` table stores all uploads
- `db.getFileHistory(projectId)` retrieves history
- Server includes file history in project detail response
- Client doesn't display it

**Required**:
- Display file history on project detail or project edit page
- Show: version number, filename, size, changelog, uploader, upload date
- Allow downloading previous versions (if files are kept)

**Files to modify**:
- `client/src/views/ProjectDetail.vue` OR
- `client/src/views/ProjectEdit.vue` (when created)

---

### 6. Popular Vote Removal
**Status**: Not Implemented  
**Priority**: Low  
**Description**: API endpoint stubbed but not implemented

**Current State**:
- `DELETE /hackathons/api/:hackathonId/projects/:projectId/vote` returns 501 Not Implemented
- May be intentional (votes should be permanent)

**Decision needed**:
- Should users be able to unvote?
- If yes: implement database method and complete endpoint
- If no: remove endpoint or keep as 403 Forbidden

**Files to modify (if implementing)**:
- `server/db/index.js` (add `removePopularVote()`)
- `server/routes/voting.js` (implement DELETE endpoint)

---

### 7. Authentication Improvements
**Status**: Incomplete  
**Priority**: Medium  
**Description**: Auth flow relies on Hydra SSO but has inconsistencies

**Current Issues**:
- `ProjectDetail.vue` directly calls Hydra `/check` instead of using app's `/api/auth/status`
- Login/logout URLs hardcoded throughout the app
- No centralized auth state management

**Recommended**:
- Centralize auth in Vuex/Pinia store or composable
- Use app's `/api/auth/status` consistently
- Consider adding auth redirect helper to avoid URL encoding everywhere

**Files to review/modify**:
- `client/src/views/ProjectDetail.vue` (use `/api/auth/status`)
- `client/src/App.vue` (already uses correct endpoint)
- Consider creating `client/src/composables/useAuth.js`

---

### 8. Deadline Override Clarity
**Status**: Working but unclear UX  
**Priority**: Low  
**Description**: Deadline override toggle exists but users don't know what it does

**Current State**:
- Checkbox in `HackathonSettings.vue` to enable override per project
- No explanation of what it does
- Teams don't see when override is enabled

**Recommended**:
- Add tooltip or help text explaining deadline override
- Show override status on project detail page for team members
- Consider admin message/notification to team when enabled

---

## 🟢 Nice-to-Have Enhancements

### 9. Markdown Preview
**Status**: Missing  
**Priority**: Low  
**Description**: Descriptions support markdown but no live preview when editing

**Recommended**:
- Add markdown preview in hackathon/project edit forms
- Split-screen editor/preview or tabs

---

### 10. Search/Filter Projects
**Status**: Missing  
**Priority**: Low  
**Description**: No way to search or filter projects

**Recommended**:
- Search by project name, team member, description
- Filter by vote count, submission status
- Especially useful for hackathons with many projects

---

### 11. Export Results
**Status**: Missing  
**Priority**: Low  
**Description**: No way to export votes, scores, or audit logs

**Recommended**:
- CSV export for judge scores
- CSV export for popular votes
- PDF report generation for concluded hackathons

---

### 12. Email Notifications
**Status**: Not Implemented  
**Priority**: Low  
**Description**: No notifications for important events

**Recommended**:
- Notify judges when code is created
- Notify teams when hackathon starts/ends
- Notify teams when they receive comments
- Notify admins of important actions

---

## 📋 Documentation & DevOps

### 13. Missing Setup Clarification
**Status**: Incomplete  
**Priority**: Medium

**Current Issues**:
- README shows `PORT=3000` but actual setup uses `45821`
- Apache reverse proxy config is in setup notes but should be documented better
- Docker setup is complete but not mentioned in README

**Recommended**:
- Update README with Docker instructions
- Document Apache reverse proxy setup properly
- Add deployment guide
- Document environment variables comprehensively

---

### 14. Error Handling
**Status**: Basic  
**Priority**: Medium  
**Description**: Most errors show generic alerts

**Recommended**:
- Better error messages
- Toast notifications instead of alerts
- Proper error pages (404, 403, 500)
- Validation feedback on forms

---

### 15. Testing
**Status**: None  
**Priority**: Medium  
**Description**: No tests exist

**Recommended**:
- Unit tests for database operations
- Integration tests for API endpoints
- E2E tests for critical user flows
- Add testing setup to README

---

## Summary

### Must Complete Before Production:
1. ✅ Admin can create hackathons (Completed)
2. ✅ Admin can initialize projects (Completed)
3. ✅ Teams can edit projects and upload files (Completed)
4. ✅ Judge results are displayed (Completed)

### Should Complete Soon:
5. ✅ Comment edit/delete (Completed)
6. ⚠️ File history display (Backend complete, shown in ProjectEdit)
7. ⚠️ Auth consistency improvements (ProjectDetail fixed to use /api/auth/status)

### Can Wait:
8. Everything in "Nice-to-Have Enhancements"

---

## ✅ Recently Completed (Nov 5, 2025)

### 1. Project Initialization UI ✅
**Completed**: HackathonSettings.vue now has a form to create projects
- Fields: Project name, team emails (comma-separated)
- Email validation
- Auto-refreshes project list after creation
- Shows empty state when no projects exist

### 2. Team Project Management Interface ✅
**Completed**: Created ProjectEdit.vue with full project management
- Team-only access control (checks if user is team member)
- Edit project name, description, GitHub link, banner/image URLs
- File upload with changelog support
- File history display (all versions shown)
- Deadline enforcement with override support
- Route: `/hackathons/:id/projects/:projectId/edit`
- Edit button added to ProjectDetail.vue for team members

### 3. Judge Results Display ✅
**Completed**: Full results system implemented
- Backend API endpoints:
  - `GET /api/:hackathonId/results` - Full hackathon results
  - `GET /api/:hackathonId/projects/:projectId/scores` - Individual project scores
- Database methods: `getJudgeResultsByHackathon()`, `getProjectScoresSummary()`
- Results only public when hackathon concluded (admin preview available)
- HackathonDetail.vue shows:
  - Final rankings table with avg scores
  - Popular votes and judge vote counts
  - Medal icons for top 3
  - Individual judge scores and comments for each project
- ProjectDetail.vue shows:
  - Project-specific judge scores
  - Statistics (avg, min, max, count)
  - Individual judge comments

### 4. Comment Edit/Delete ✅
**Completed**: Full comment management in ProjectDetail.vue
- Edit/delete buttons appear for comment authors only
- Inline editing with save/cancel
- Delete confirmation dialog
- "edited" indicator shown for modified comments
- Uses existing backend endpoints (already implemented)

---

**Last Updated**: November 5, 2025  
**Reviewed Against**: README.md v1.0  
**Status**: All critical features completed and deployed
