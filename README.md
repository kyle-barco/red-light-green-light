# Street Lighting Monitoring System

Municipal street lighting monitoring and management system built with Next.js, Tailwind CSS, PostgreSQL, and Prisma.

## Stack

- **Next.js 14** — App Router, Server Components, Server Actions
- **Tailwind CSS** — styling
- **PostgreSQL** — database
- **Prisma** — ORM + type generation
- **NextAuth.js** — authentication
- **React Leaflet** — interactive map

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your `DATABASE_URL` and `NEXTAUTH_SECRET`.

Generate a secret:
```bash
openssl rand -base64 32
```

### 3. Set up the database

```bash
# Push schema to your database
npm run db:push

# Generate Prisma client
npm run db:generate

# Seed with sample data
npm run db:seed
```

### 4. Run the development server

```bash
npm run dev
```

### 5. Run this to download xlsx for csv as xlsx or pdf

```bash
npm install xlsx
```
Open [http://localhost:3000](http://localhost:3000).

## Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@lgu.gov.ph | admin123 |
| Technician | tech@lgu.gov.ph | tech123 |

## Project structure

```
src/
├── app/
│   ├── (auth)/login/         ← Login page
│   ├── (dashboard)/          ← Protected pages
│   │   ├── page.tsx          ← Dashboard with map
│   │   ├── poles/            ← Pole management
│   │   ├── faults/           ← Fault reports
│   │   ├── workorders/       ← Work orders
│   │   └── reports/          ← Analytics
│   └── api/auth/             ← NextAuth handler
├── actions/                  ← Server actions (database logic)
├── components/map/           ← Leaflet map component
├── lib/                      ← Prisma client, auth config
└── types/                    ← Shared TypeScript types
```

## Key concepts

- **Server Components** — pages fetch data directly, no useEffect needed
- **Server Actions** — database mutations in `actions/`, called from components
- **Dynamic import** — the map uses `dynamic(..., { ssr: false })` to avoid SSR issues with Leaflet
- **Status audit trail** — every pole status change is logged in `StatusLog`
