# Meeting-Schedule-Dashboard

A React (Next.js) dashboard for organizing meeting schedules and tracking job application status. Data is stored in PostgreSQL and deploys to Vercel.

## Features

### Schedule Page
- Weekly grid with **dates on the horizontal axis** and **time slots (9 AM – 9 PM) on the vertical axis**
- Each cell shows the company name, meeting link indicator, and job site
- Click any cell to open a modal to create or edit a meeting

### Meeting Modal
- Meeting link, company name, caller, job site, job position link
- Interviewer, contact person, chat link
- Job status and OK/REJECT condition

### Status Page
- Shows only jobs where the condition is **OK**
- Job positions listed vertically with details horizontally

### Desktop notifications
- Alerts **15 minutes before** each meeting
- Stays visible until you click close
- Optional browser desktop alerts

### Color coding
- **Light red:** REJECT or failed stage
- **Light green:** Hiring stage after casual interview
- **Light blue:** Early stage / in progress

## Tech Stack

- Next.js 16, React 19, TypeScript, Bootstrap 5
- PostgreSQL with Prisma ORM
- Vercel deployment

## Local development

```bash
npm install
cp .env.example .env
npx prisma dev          # start local Postgres (optional)
npm run db:push         # or npm run db:migrate:deploy
npm run dev             # http://103.179.45.111:3000
```

## Deploy to Vercel

### 1. Create a PostgreSQL database

Use one of:
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- [Neon](https://neon.tech)
- [Supabase](https://supabase.com)

### 2. Set environment variables in Vercel

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (`?sslmode=require` for cloud DBs) |

### 3. Import and deploy

1. Push this repo to GitHub
2. Import the project in [Vercel](https://vercel.com/new)
3. Vercel auto-detects Next.js
4. Deploy — build runs `prisma generate`, `prisma migrate deploy`, and `next build`

### 4. Verify

- Open your Vercel URL
- Go to `/schedule` and create a test meeting
- Check `/status` for OK jobs

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/meetings` | List meetings |
| GET | `/api/meetings/upcoming` | Meetings starting within 15 minutes |
| POST | `/api/meetings` | Create a meeting |
| GET/PATCH/DELETE | `/api/meetings/[id]` | Single meeting CRUD |

## Scripts

```bash
npm run dev              # Local dev server
npm run build            # Production build
npm run db:migrate:deploy # Apply migrations to production DB
npm run test:api         # API tests (local)
```
