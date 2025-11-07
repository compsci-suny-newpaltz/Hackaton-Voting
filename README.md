# Hackathon Management & Voting System

A complete hackathon management system for SUNY New Paltz using Hydra SSO authentication.

## Features

- **Authentication**: Hydra SSO integration with `np_access` cookie
- **Admin System**: Hardcoded admin, faculty auto-admins, and manual whitelist
- **Hackathon Management**: Create, manage, and conclude hackathons
- **Project Management**: Team-based project submissions with file uploads
- **Popular Voting**: Student/faculty voting system with expiration dates
- **Judge Voting**: Code-based judge authentication and scoring
- **Comments**: Real-time commenting system
- **Audit Logging**: Complete audit trail of all admin actions

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

### Drafts, Teams, Notifications
- Draft projects are visible only to the creator until published (not visible to teammates until published).
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

