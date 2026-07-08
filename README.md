# Meeting-Schedule-Dashboard

Meeting schedule dashboard with a **split architecture**:

- **Frontend** (Next.js + Bootstrap) → deployed on **Vercel**
- **Backend** (Express + Prisma) → runs **locally** on your server
- **Database** (PostgreSQL) → runs **locally**

```
Browser → Vercel (frontend) → proxy /api/* → Local backend (103.179.45.111:3100) → PostgreSQL
```

## Project structure

```
backend/          Local Express API + database access
prisma/           Database schema and migrations
src/              Next.js frontend (deploy to Vercel)
```

## Local setup

### 1. Install dependencies

```bash
npm install
npm install --prefix backend
```

### 2. Start PostgreSQL

```bash
npx prisma dev
```

### 3. Apply database schema

```bash
npm run db:push --prefix backend
```

### 4. Start backend (terminal 1)

```bash
npm run dev --prefix backend
```

Backend runs at **http://103.179.45.111:3100**

### 5. Start frontend (terminal 2)

```bash
npm run dev
```

Frontend runs at **http://103.179.45.111:3000** and proxies API calls to the backend.

## Deploy frontend to Vercel

1. Push this repo to GitHub
2. Import in [Vercel](https://vercel.com/new)
3. Set environment variable:

| Variable | Value |
|----------|-------|
| `BACKEND_URL` | `http://103.179.45.111:3100` |

4. Deploy

### Requirements for Vercel to work

- Backend must be **running** on your server (`npm run dev --prefix backend`)
- PostgreSQL must be **running** locally (`npx prisma dev`)
- Port **3100** must be **open** on `103.179.45.111` so Vercel can reach the API

## Environment files

| File | Purpose |
|------|---------|
| `.env` | Frontend: `BACKEND_URL` |
| `backend/.env` | Backend: `DATABASE_URL`, `HOST`, `PORT`, `FRONTEND_URL` |

## Data backup / restore

Meeting and company snapshots live in `data/meetings.json` and `data/companies.json`.

Restore into PostgreSQL after a schema reset or environment change:

```bash
npm run db:restore --prefix backend
```

## Features

- Schedule grid (9 AM – 9 PM) with color-coded cells
- Status page (OK jobs only)
- Meeting modal with caller, job site, status fields
- Desktop notifications 15 minutes before meetings

## Scripts

```bash
npm run dev                  # Frontend
npm run dev --prefix backend # Backend API
npm run build                # Frontend production build
npm run test:api             # API tests (via frontend proxy)
```

## API (backend)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/meetings` | List meetings |
| GET | `/api/meetings/upcoming` | Upcoming meetings |
| POST | `/api/meetings` | Create meeting |
| GET/PATCH/DELETE | `/api/meetings/:id` | Single meeting CRUD |
