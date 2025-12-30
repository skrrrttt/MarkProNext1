# MarkPro - Field Service Management

A modern field service management platform built with Next.js 14, Supabase, and TypeScript.

## Features

### Field App (Mobile-Optimized)
- 📱 Touch-friendly UI with large buttons for gloved hands
- 📷 Before/after photo capture with compression
- ✅ Interactive checklists with offline support
- 🗺️ One-tap navigation to job sites
- 📴 Full offline support with IndexedDB

### Admin CRM
- 📊 Kanban-style job pipeline
- 👥 Customer profiles with tags and history
- 💰 Invoice management (Stripe integration coming)
- 🔧 Shop tasks and equipment tracking
- 📈 Dashboard with key metrics

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (PostgreSQL)
- **State:** Zustand
- **Data Fetching:** SWR with offline support
- **Offline Storage:** IndexedDB (via idb)
- **Styling:** Tailwind CSS
- **Icons:** Lucide React

## Getting Started

### 1. Clone and Install

```bash
git clone <your-repo>
cd markpro-next
npm install
```

### 2. Set Up Supabase

1. Go to your Supabase project
2. Open SQL Editor
3. Run the schema from `database/schema.sql`
4. Create a storage bucket called `job-photos` (public)

### 3. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Deploy to Vercel

```bash
vercel
```

## Project Structure

```
markpro-next/
├── app/
│   ├── (admin)/          # Admin CRM routes
│   │   ├── dashboard/
│   │   ├── jobs/
│   │   ├── customers/
│   │   ├── invoices/
│   │   ├── shop/
│   │   └── settings/
│   ├── (field)/          # Field worker routes
│   │   └── jobs/
│   ├── layout.tsx
│   ├── page.tsx          # Login
│   └── globals.css
├── components/           # Reusable components
├── lib/
│   ├── supabase/        # Supabase client
│   ├── offline/         # IndexedDB & SWR
│   └── store.ts         # Zustand stores
├── types/
│   └── database.ts      # Supabase types
└── public/
    ├── sw.js            # Service worker
    └── manifest.json    # PWA manifest
```

## Login Credentials

- **Admin:** `markproadmin`
- **Field:** `markpro2025`

(Change these in Settings after first login)

## Offline Support

The app uses a stale-while-revalidate strategy:

1. Data is cached in IndexedDB
2. UI shows cached data immediately
3. Fresh data is fetched in background
4. Pending changes are queued and synced when online

## Future Integrations

- [ ] Stripe for invoice payments
- [ ] Microsoft Graph API for Outlook emails
- [ ] Push notifications
- [ ] GPS tracking

## License

Private - All rights reserved
