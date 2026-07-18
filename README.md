# Meeting-Schedule-Dashboard

Meeting schedule dashboard with a **split architecture**:

- **Frontend** (Next.js + Bootstrap) → deployed on **Vercel**
- **Backend** (Express + Prisma) → runs **locally** on your server
- **Database** (PostgreSQL) → runs **locally**

```
Browser → Vercel (frontend) → proxy /api/* → Local backend (103.179.45.111:3100) → PostgreSQL
```

> **The local database and backend are kept always-on with [PM2](https://pm2.keymetrics.io/).**
> See [Always-on with PM2](#always-on-with-pm2). This is what keeps the Vercel
> site working and prevents the recurring `ECONNREFUSED` (database down) errors.

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

The database (Prisma Postgres / `prisma dev`) runs on port **51214**. In normal
operation it is managed by PM2 and is always running (see
[Always-on with PM2](#always-on-with-pm2)). For a one-off local session you can
also start it manually:

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

- Backend must be **running** on your server (managed by PM2 — see below)
- PostgreSQL must be **running** locally (managed by PM2 — port 51214)
- Port **3100** must be **open** on `103.179.45.111` so Vercel can reach the API

If API calls return 500 with `ECONNREFUSED` in backend logs, the database is
down. With PM2 it self-recovers; you can also force it with `pm2 restart meeting-db`.

## Always-on with PM2

The database and backend are run as PM2 processes so they survive terminal/session
closes and server reboots — this is the fix for the recurring `ECONNREFUSED`
(database-down) failures. Definitions live in `ecosystem.config.cjs`:

| PM2 process | What it runs |
|-------------|--------------|
| `meeting-db` | `scripts/run-db.mjs` → managed `prisma dev` on port **51214** |
| `meeting-backend` | `backend/scripts/start.mjs` → Express API on port **3100** |

Common commands:

```bash
pm2 start ecosystem.config.cjs   # start both (first time)
pm2 save                         # persist the list so it is restored on reboot
pm2 status                       # see meeting-db / meeting-backend
pm2 logs meeting-backend         # tail backend logs
pm2 restart meeting-backend      # restart after code changes
```

Reboot persistence: `pm2 save` writes the process list, and the **`MeetingSchedule`**
Windows scheduled task (`deploy/windows-pm2-start.ps1`) restores it on boot.

> **Do not fight the PM2 stack.** Running `npm run dev --prefix backend` now
> ensures `meeting-db` + `meeting-backend` are online under PM2 and exits — it
> no longer kills port 3100. For a true local `tsx watch` session, use
> `FORCE_LOCAL=1 npm run dev --prefix backend` (and stop PM2 first if needed).

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
