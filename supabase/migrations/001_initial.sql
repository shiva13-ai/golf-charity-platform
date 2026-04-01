-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  phone text,
  subscription_plan text check (subscription_plan in ('monthly', 'yearly')) default null,
  subscription_status text check (subscription_status in ('active', 'inactive', 'cancelled', 'lapsed')) default 'inactive',
  subscription_start timestamptz,
  subscription_renewal timestamptz,
  charity_id uuid,
  charity_contribution_pct int default 10,
  role text check (role in ('user', 'admin')) default 'user',
  stripe_customer_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Charities table
create table charities (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  long_description text,
  image_url text,
  category text,
  website text,
  featured boolean default false,
  active boolean default true,
  total_raised numeric(10,2) default 0,
  created_at timestamptz default now()
);

-- Golf scores table
create table golf_scores (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade,
  score int check (score >= 1 and score <= 45),
  played_date date not null,
  created_at timestamptz default now()
);

-- Subscriptions table
create table subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade,
  plan text check (plan in ('monthly', 'yearly')) not null,
  amount numeric(10,2) not null,
  status text check (status in ('active', 'cancelled', 'lapsed')) default 'active',
  stripe_subscription_id text,
  started_at timestamptz default now(),
  renewal_at timestamptz,
  cancelled_at timestamptz
);

-- Draws table
create table draws (
  id uuid default uuid_generate_v4() primary key,
  draw_month date not null,
  draw_numbers int[] not null,
  algorithm text check (algorithm in ('random', 'weighted')) default 'random',
  status text check (status in ('draft', 'simulation', 'published')) default 'draft',
  total_prize_pool numeric(10,2) default 0,
  jackpot_pool numeric(10,2) default 0,
  jackpot_rollover boolean default false,
  published_at timestamptz,
  created_at timestamptz default now()
);

-- Draw entries / results table
create table draw_results (
  id uuid default uuid_generate_v4() primary key,
  draw_id uuid references draws(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  matched_numbers int[],
  match_count int,
  prize_amount numeric(10,2) default 0,
  match_tier text check (match_tier in ('5-match', '4-match', '3-match', 'no-match')),
  created_at timestamptz default now()
);

-- Winners verification table
create table winners (
  id uuid default uuid_generate_v4() primary key,
  draw_result_id uuid references draw_results(id),
  user_id uuid references profiles(id),
  draw_id uuid references draws(id),
  prize_amount numeric(10,2),
  match_tier text,
  proof_url text,
  verification_status text check (verification_status in ('pending', 'approved', 'rejected')) default 'pending',
  payout_status text check (payout_status in ('pending', 'paid')) default 'pending',
  admin_notes text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz default now()
);

-- Seed charities
insert into charities (name, description, long_description, category, featured, image_url) values
  ('Green Fairways Foundation', 'Supporting underprivileged youth access to golf and green spaces.', 'Green Fairways Foundation is dedicated to making golf accessible to all, regardless of background or income. We fund junior golf programs, maintain public courses, and provide equipment to schools in underserved communities.', 'Youth & Sports', true, 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=400'),
  ('Cancer Research UK Golf', 'Raising vital funds for cancer research through the golf community.', 'We unite the golfing community to fund groundbreaking cancer research. Every subscription and donation goes directly to scientists working to find cures for all types of cancer.', 'Health & Medical', true, 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400'),
  ('Ocean Conservation Trust', 'Protecting marine ecosystems through sustainable golf course practices.', 'Working with golf courses across the UK to adopt water-saving and eco-friendly practices, while funding direct ocean clean-up and marine habitat restoration projects.', 'Environment', false, 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400'),
  ('Veterans on the Fairway', 'Golf therapy and social programs for military veterans.', 'Using the proven therapeutic power of golf to support military veterans dealing with PTSD, physical injuries, and social isolation. We run weekly sessions and national tournaments.', 'Veterans & Military', false, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'),
  ('Junior Golf Academy', 'Free golf coaching and mentorship for children aged 8–16.', 'Our academy provides free professional coaching, equipment loans, and tournament entry to talented young golfers who would otherwise have no access to the sport.', 'Youth & Sports', true, 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=400');

-- RLS Policies
alter table profiles enable row level security;
alter table golf_scores enable row level security;
alter table subscriptions enable row level security;
alter table draws enable row level security;
alter table draw_results enable row level security;
alter table winners enable row level security;
alter table charities enable row level security;

-- Profiles policies
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Admins can view all profiles" on profiles for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can update all profiles" on profiles for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Golf scores policies
create policy "Users can manage own scores" on golf_scores for all using (auth.uid() = user_id);
create policy "Admins can manage all scores" on golf_scores for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Charities public read
create policy "Anyone can view charities" on charities for select using (true);
create policy "Admins can manage charities" on charities for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Draws public read for published
create policy "Anyone can view published draws" on draws for select using (status = 'published');
create policy "Admins can manage draws" on draws for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Draw results
create policy "Users can view own results" on draw_results for select using (auth.uid() = user_id);
create policy "Admins can manage draw results" on draw_results for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Winners
create policy "Users can view own winnings" on winners for select using (auth.uid() = user_id);
create policy "Users can submit proof" on winners for update using (auth.uid() = user_id);
create policy "Admins can manage winners" on winners for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Subscriptions
create policy "Users can view own subscriptions" on subscriptions for select using (auth.uid() = user_id);
create policy "Admins can manage subscriptions" on subscriptions for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Function to handle new user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
