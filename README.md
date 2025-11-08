# Hackathon Management & Voting System

A complete hackathon management system for SUNY New Paltz using Hydra SSO authentication.

> **🎉 Latest Implementation (Nov 7, 2025):** Phases 2A, 3A-C, 4A-C complete!
> - **Backend:** Hackathon lifecycle, project visibility, team management, email masking ✅
> - **Frontend:** Judge category management UI, category-based voting interface, weighted results display ✅
>
> See [PHASE_2A_3ABC_COMPLETE.md](PHASE_2A_3ABC_COMPLETE.md), [PHASE_4AB_FRONTEND_COMPLETE.md](PHASE_4AB_FRONTEND_COMPLETE.md), and [PHASE_4C_RESULTS_DISPLAY_COMPLETE.md](PHASE_4C_RESULTS_DISPLAY_COMPLETE.md) for details.

## Features

### Core Features
- **Authentication**: Hydra SSO integration with `np_access` cookie
- **Admin System**: Hardcoded admin, faculty auto-admins, and manual whitelist
- **Audit Logging**: Complete audit trail of all admin actions

### Hackathon Management ✨
- **7-State Lifecycle**: upcoming → active → ended → vote_expired → review-period → concluded → archived
- **Review Period**: Optional window before public results (configurable per hackathon)
- **Archive System**: Mark old hackathons as archived with audit logging
- **Multi-Hackathon Support**: Run multiple concurrent hackathons
- **Comprehensive Validation**: Time constraints, length limits, domain validation

### Project Management ✨
- **Team Management**: Add/remove team members with validation
- **Email Masking**: Privacy-preserving display (j***e@newpaltz.edu) for non-team members
- **Visibility Control**: Role-based access (creator, team, admin, public)
- **File Uploads**: Single-file replace model with version history
- **Email Validation**: Domain enforcement (@newpaltz.edu including subdomains)

### Voting Systems
- **Popular Voting**: One vote per user per project, expiration enforcement, audit trails
- **Judge Voting**: Category-based rubric scoring with weights ⭐ NEW!
  - Dynamic categories (Innovation, Functionality, Design, Presentation)
  - Customizable weights per category (multipliers)
  - Score 1-10 per category with optional comments
  - Progress tracking (x/y projects scored)
  - Visual completion indicators (green rings, checkmarks)

### Judge Rubric System ⭐ NEW!
- **Admin Category Manager**: Add, edit, delete, reorder categories
- **Weight System**: Multipliers (0.1 to 5.0) for category importance
- **Inline Editing**: Edit categories without page reload
- **Weighted Results**: Automatic calculation of weighted average scores
- **Per-Category Comments**: Optional feedback for each criterion

### Results Display ⭐ NEW!
- **Weighted Score Rankings**: Projects ranked by category-weighted averages
- **Sort Controls**: Toggle between judge scores and popular votes
- **Score Range Display**: Min-max scores across all judges
- **Expandable Details**: Per-project category breakdown
- **Category Statistics**: Avg, min, max per category with vote counts
- **Individual Judge Scores**: Full transparency with comments and timestamps

### Other Features
- **Comments**: Real-time commenting with soft-delete
- **Data Integrity**: Comprehensive server-side validation for all inputs

## Product & UX Decisions (Authoritative)

This section captures key decisions that guide the UX and data model. Implementation will follow this source of truth.

### Homepage & Navigation
- Homepage shows:
	- Active hackathons list (card: image, total projects, total judges, prize pool like "$x in prizes")
	- Past hackathons list
	- Onboarding panel explaining what a hackathon is
- Each hackathon has its own page with full description and a Projects tab.
- Projects list layout (per-hackathon): Reddit-style row with upvote control, image, title, comment count, and team size.

### Popular Vote
- One vote per user per project (DB uniqueness on userId+projectId); users cannot vote for their own project.
- Popular voting may continue after a hackathon concludes; a snapshot of the popular vote count is captured at vote close and displayed for each project.
- Live popular vote counts are shown with polling (every 5s).
- Admins can view votes per project via an "Audit Votes" button linking to a dedicated audit page.

### Judging & Rubric
- Category scores are always 1–10.
- Weighted rubric: each category has a multiplier (default 1.0); weights are editable. Judges see the multipliers and a preview score per project.
- Judge comments per category are optional (clearly labeled that comments will be displayed).
- Judges may submit/save scores per project individually. Saved projects show a green outline and a green checkbox.
- A running counter shows progress, e.g., (x/y judgments completed) above the project list.
- Judges can edit their submitted scores until the judging phase closes.

### Teams, Notifications
- All projects are visible to all users immediately after creation.
- No notifications (no emails or in-app notifications) for any events.
- Project ownership is not transferable.

### Email Policy & Identity
- Emails are stored/compared in lowercase (SSO provides lowercase emails).
- Allowed domains include subdomains of newpaltz.edu (e.g., @alumni.newpaltz.edu).
- Public views mask emails; full emails are visible to judges, admins, and team members.

### Files & Uploads
- Single-file replace model; overwrites the previous file on successful upload.
- Existing size/type rules remain unchanged.

### Comments
- Soft-delete (content hidden but record retained).
- Max length: 2000 characters.
- No markdown support.

### Phases, Countdown, and Concurrency
- Multiple hackathons may be active concurrently; users select a specific hackathon from the homepage list.
- Countdown widgets show the nearest relevant phase deadline for the viewed context.
- Review period duration and similar timelines are hackathon-configurable.

### Security, Rate Limits, and Real-time
- No anonymous voting.
- No additional rate limiting required at this time.
- No real-time push required; polling is sufficient for live counts.

### Data Model Preferences
- Rubric categories stored in a separate table (not JSON) for admin editing and weighting.
- Hard deletes for entities (no soft-delete at the entity level), except comments which are soft-deleted.

### Error Schema & Test/Deploy
- Keep the existing error response shape as currently implemented.
- No additional testing/deployment requirements specified for now.

## Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install server dependencies:
```bash
npm install
```

2. Install client dependencies:
```bash
cd client
npm install
cd ..
```

3. Initialize database:
```bash
npm run init-db
```

4. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

5. Configure `.env`:
```env
PORT=3000
NODE_ENV=development
HYDRA_BASE_URL=https://hydra.newpaltz.edu
DATABASE_URL=./hackathon.db
UPLOAD_DIR=./uploads
```

### Running

Development mode (runs both server and client):
```bash
npm run dev
```

Server only:
```bash
npm run dev:server
```

Client only:
```bash
npm run dev:client
```

Production:
```bash
npm run build  # Build client
npm start      # Start server
```

## Base URL Configuration

All routes are mounted at `/hackathons/`:
- Homepage: `https://hydra.newpaltz.edu/hackathons/`
- Admin Dashboard: `https://hydra.newpaltz.edu/hackathons/admin/dashboard`
- Judge Voting: `https://hydra.newpaltz.edu/hackathons/{hackathonId}/judgevote?code={code}`

## Admin Access

- **Hardcoded Admin**: `gopeen1@newpaltz.edu` (always admin)
- **Auto-Admins**: All users with `faculty` role
- **Manual Admins**: Added via admin dashboard

## API Endpoints

### Hackathons
- `GET /hackathons/api/hackathons` - Get all hackathons
- `GET /hackathons/api/hackathons/:id` - Get hackathon details
- `POST /hackathons/api/hackathons` - Create hackathon (admin)
- `PUT /hackathons/api/hackathons/:id` - Update hackathon (admin)
- `POST /hackathons/api/hackathons/:id/conclude` - Conclude hackathon (admin)

### Projects
- `GET /hackathons/api/:hackathonId/projects/:projectId` - Get project
- `POST /hackathons/api/:hackathonId/projects` - Initialize project (admin)
- `PUT /hackathons/api/:hackathonId/projects/:projectId` - Update project (team)
- `POST /hackathons/api/:hackathonId/projects/:projectId/file` - Upload file (team)

### Voting
- `GET /hackathons/api/:hackathonId/projects/:projectId/vote-status` - Check vote status
- `POST /hackathons/api/:hackathonId/projects/:projectId/vote` - Cast popular vote
- `GET /hackathons/api/:hackathonId/judgevote` - Get judge voting page
- `POST /hackathons/api/:hackathonId/judgevote` - Submit judge votes

### Admin
- `GET /hackathons/api/admin/dashboard` - Admin dashboard data
- `GET /hackathons/api/admin/hackathons/:id/settings` - Hackathon settings
- `POST /hackathons/api/admin/admins` - Add admin
- `DELETE /hackathons/api/admin/admins/:email` - Remove admin
- `POST /hackathons/api/admin/hackathons/:id/judges` - Generate judge code

## Project Structure

```
hackathon-app/
├── server/
│   ├── index.js              # Main Express server
│   ├── db/                   # Database operations
│   ├── middleware/           # Auth & admin middleware
│   ├── routes/               # API routes
│   └── utils/                # Utilities
├── client/                   # Vue.js frontend
│   ├── src/
│   │   ├── views/           # Page components
│   │   ├── components/       # Reusable components
│   │   └── api/             # API client
└── uploads/                  # File uploads
```

## Database Schema

See `server/db/schema.sql` for complete schema. Key tables:
- `hackathons` - Hackathon information
- `projects` - Project submissions
- `popular_votes` - Student/faculty votes
- `judge_codes` - Judge authentication codes
- `judge_votes` - Judge scores
- `comments` - Project comments
- `admins` - Admin whitelist
- `audit_logs` - Audit trail

## Development Notes

- Uses SQLite for simplicity (can be swapped for PostgreSQL)
- File uploads delete old versions (only latest file kept)
- Popular voting continues after hackathon ends until `vote_expiration`; at close, a snapshot score is recorded and displayed per project.
- Projects may present live popular vote counts via 5s polling during active voting
- Judge codes are hackathon-specific and cryptographically secure

## Roadmap / TODOs

See `TODOS.md` for a phased implementation plan derived from the decisions above.

## License

MIT

