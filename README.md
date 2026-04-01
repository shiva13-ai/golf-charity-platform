# GolfGive — Golf Charity Subscription Platform

> Built for Digital Heroes Internship Assignment · Full Stack Developer Role

## Live Demo
- 🌐 **Live Site**: [your-project.vercel.app]
- 👤 **User Dashboard**: [your-project.vercel.app/dashboard]
- 🔐 **Admin Panel**: [your-project.vercel.app/admin]
- 📦 **GitHub**: [https://github.com/shiva13-ai/golf-charity-platform]

## Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Row Level Security)
- **Deployment**: Vercel
- **Design**: Custom dark luxury aesthetic with Playfair Display + DM Sans

## Features Implemented
✅ User signup/login with Supabase Auth  
✅ 3-step onboarding (account → plan → charity)  
✅ Monthly & Yearly subscription plans  
✅ Golf score entry (Stableford 1–45, rolling 5-score max, auto-replace oldest)  
✅ Monthly prize draw system (random & algorithmic)  
✅ Prize pool distribution (40% jackpot, 35% 4-match, 25% 3-match)  
✅ Jackpot rollover if no 5-match winner  
✅ Charity selection with configurable contribution %  
✅ User dashboard: subscription, scores, draw results, charity, winnings  
✅ Admin panel: users, draw management, charity management, winner verification  
✅ Winner verification flow with payment status tracking  
✅ Row-Level Security on all Supabase tables  
✅ Mobile-responsive design  
✅ Protected routes with auth checks  

---

## 🚀 Deployment Guide (Step by Step)

### Step 1: Create New Supabase Project
1. Go to [supabase.com](https://supabase.com) → New account (use NEW email!)
2. Create a new project (e.g. "golf-charity-prod")
3. Note down: **Project URL** and **Anon Key** from Settings → API
4. Also copy the **Service Role Key**
5. Go to SQL Editor → paste the entire contents of `supabase/schema.sql` → Run

### Step 2: Create Admin Account
1. In Supabase → Authentication → Users → Add user
   - Email: `admin@golfcharity.com`
   - Password: `Admin@123456`
2. After creating, go to SQL Editor and run:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'admin@golfcharity.com';
   ```

### Step 3: Push to GitHub
```bash
cd golf-charity-platform
git init
git add .
git commit -m "Initial commit: Golf Charity Subscription Platform"
git remote add origin https://github.com/shiva13-ai/golf-charity-platform.git
git push -u origin main
```

### Step 4: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) → New account (use NEW email!)
2. New Project → Import from GitHub → Select `golf-charity-platform`
3. Add these environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
   ```
4. Click Deploy!

### Step 5: Test Everything
- [ ] Sign up as a new user at `/auth/signup`
- [ ] Add golf scores at `/dashboard`
- [ ] Log in as admin at `/admin`
- [ ] Run a draw in admin → Draws tab
- [ ] Verify the winning numbers appear in user dashboard

---

## Test Credentials

### Admin Account
- **Email**: admin@golfcharity.com
- **Password**: Admin@123456
- **URL**: [your-site]/admin

### Test User (create via signup)
- Sign up at [your-site]/auth/signup

---

## Project Structure
```
golf-charity-platform/
├── app/
│   ├── page.tsx              # Landing page
│   ├── auth/
│   │   ├── login/page.tsx    # User login
│   │   └── signup/page.tsx   # 3-step signup
│   ├── dashboard/page.tsx    # User dashboard
│   └── admin/
│       ├── page.tsx          # Admin login
│       └── dashboard/page.tsx # Full admin panel
├── lib/
│   ├── supabase.ts           # Browser Supabase client
│   ├── supabase-server.ts    # Server Supabase client
│   └── utils.ts              # Draw logic, formatters
├── supabase/
│   └── schema.sql            # Full DB schema + seed data
└── app/globals.css           # Design system + animations
```

---

## Database Schema
- `profiles` — User accounts (linked to Supabase auth)
- `subscriptions` — Monthly/yearly plan records with charity %
- `golf_scores` — Score entries (max 5 per user, trigger enforced)
- `charities` — Charity directory
- `draws` — Monthly draws with winning numbers & prize pools
- `draw_entries` — Score snapshots for each draw
- `draw_winners` — Winners with match type, prize, payment status

---

## Key Technical Decisions
1. **Row-Level Security**: Every table has RLS policies — users can only see their own data
2. **Rolling 5-score**: Postgres trigger automatically deletes oldest score when 6th is added
3. **Prize pool calculation**: Based on active subscriber count × plan amount × 50%
4. **Admin protection**: Double-check on every admin page load — role verified from DB
5. **Mobile-first**: All layouts use CSS Grid + Flexbox, responsive breakpoints throughout

Built by Shiva · GitHub: shiva13-ai

---

## Stripe Setup (Required for Subscription Payments)

### Step 1 — Get Stripe Keys
1. Go to [dashboard.stripe.com](https://dashboard.stripe.com) → Sign up free
2. Settings → Developers → API Keys
3. Copy **Secret key** (starts with `sk_test_...`)
4. Add to Vercel env vars as `STRIPE_SECRET_KEY`

### Step 2 — Set up Webhook (for subscription status updates)
1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://your-project.vercel.app/api/webhook`
3. Events to listen: `checkout.session.completed`, `customer.subscription.deleted`
4. Copy **Signing secret** → add to Vercel as `STRIPE_WEBHOOK_SECRET`

### Step 3 — Test locally with Stripe CLI
```bash
stripe listen --forward-to localhost:3000/api/webhook
```

---

## Subscription Flow (Updated)
1. User signs up → free account created → lands on dashboard
2. Free users: view charities, enter up to 2 scores, see draws page (locked)
3. Click "Subscribe" → `/subscribe` page → choose plan + charity → Stripe checkout
4. After payment → webhook fires → subscription row created in Supabase → full access unlocked
5. `/dashboard?subscribed=1` shows success banner

## Test Credentials (Local)
- Admin: Sign up with `admin@golfcharity.com` then run SQL: `UPDATE profiles SET role='admin' WHERE email='admin@golfcharity.com';`
- Test User: Sign up at `/auth/signup` (free account, no payment needed to test UI)
