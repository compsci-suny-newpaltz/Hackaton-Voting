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
- Projects sorted by popular vote count in all displays
- Popular voting continues after hackathon ends until `vote_expiration`
- Judge codes are hackathon-specific and cryptographically secure

## License

MIT

