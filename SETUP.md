# Quick Setup Guide

## Initial Setup

1. **Install dependencies:**
```bash
# Root directory
npm install

# Client directory
cd client
npm install
cd ..
```

2. **Initialize database:**
```bash
npm run init-db
```

3. **Create `.env` file:**
```bash
cp .env.example .env
```

Edit `.env` and set:
- `HYDRA_BASE_URL=https://hydra.newpaltz.edu`
- `DATABASE_URL=./hackathon.db`
- Other values as needed

4. **Create upload directories:**
```bash
mkdir -p uploads/temp
```

## Running the Application

### Development Mode
```bash
npm run dev
```
This runs both the server (port 3000) and client dev server (Vite).

### Production Build
```bash
# Build client
cd client
npm run build
cd ..

# Start server
npm start
```

## First Admin Access

1. The hardcoded admin `gopeen1@newpaltz.edu` is automatically an admin
2. Any user with `faculty` role is automatically an admin
3. Access admin dashboard at: `/hackathons/admin/dashboard`

## Creating Your First Hackathon

1. Log in as admin
2. Go to Admin Dashboard
3. Create a new hackathon via API or through the admin interface
4. Initialize projects for teams
5. Generate judge codes when ready

## Key URLs

- Homepage: `https://hydra.newpaltz.edu/hackathons/`
- Admin Dashboard: `https://hydra.newpaltz.edu/hackathons/admin/dashboard`
- Judge Voting: `https://hydra.newpaltz.edu/hackathons/{id}/judgevote?code={code}`

## Troubleshooting

### Database Issues
- Delete `hackathon.db` and run `npm run init-db` again

### Upload Issues
- Ensure `uploads/` and `uploads/temp/` directories exist
- Check file permissions

### Authentication Issues
- Ensure `HYDRA_BASE_URL` is correct in `.env`
- Verify Hydra SSO is accessible

