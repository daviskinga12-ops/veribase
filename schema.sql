-- ============================================================
-- VERIBASE DATABASE SCHEMA
-- Run this entire file in your Supabase SQL Editor
-- Project: https://app.supabase.com → SQL Editor → New Query
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- BUSINESSES TABLE
-- Every registered company on Veribase
-- ============================================================
create table if not exists businesses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  kra_pin text unique,
  brs_number text,
  industry text not null,
  location text not null,
  phone text,
  website text,
  description text,
  verified boolean default false,
  subscription_status text default 'free' check (subscription_status in ('free','active','expired')),
  subscription_expires_at timestamptz,
  logo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- STAFF RECORDS TABLE
-- Employment history logged by businesses
-- ============================================================
create table if not exists staff_records (
  id uuid primary key default uuid_generate_v4(),
  logged_by uuid references businesses(id) on delete cascade not null,
  subject_name text not null,
  subject_id_number text not null,
  subject_phone text,
  position text not null,
  employment_start date not null,
  employment_end date,
  exit_reason text check (exit_reason in ('resigned','dismissed','contract_end','redundancy','other')),
  performance_rating integer check (performance_rating between 1 and 5),
  reliability_rating integer check (reliability_rating between 1 and 5),
  rehire_recommended boolean default true,
  notes text,
  is_disputed boolean default false,
  is_active boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- SUPPLIER RECORDS TABLE
-- Supplier relationships and ratings
-- ============================================================
create table if not exists supplier_records (
  id uuid primary key default uuid_generate_v4(),
  logged_by uuid references businesses(id) on delete cascade not null,
  supplier_name text not null,
  supplier_kra_pin text,
  supplier_phone text,
  supplier_email text,
  industry text,
  goods_services text not null,
  relationship_start date not null,
  relationship_end date,
  relationship_active boolean default true,
  delivery_rating integer check (delivery_rating between 1 and 5),
  quality_rating integer check (quality_rating between 1 and 5),
  payment_behavior text check (payment_behavior in ('always_on_time','usually_on_time','sometimes_late','often_late','defaulted')),
  total_business_volume_kshs bigint,
  would_recommend boolean default true,
  notes text,
  is_disputed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- DISPUTES TABLE
-- Any business can dispute a record about them
-- ============================================================
create table if not exists disputes (
  id uuid primary key default uuid_generate_v4(),
  disputed_by uuid references businesses(id) on delete cascade not null,
  record_type text not null check (record_type in ('staff','supplier')),
  record_id uuid not null,
  reason text not null,
  evidence_description text,
  status text default 'open' check (status in ('open','under_review','resolved','rejected')),
  admin_notes text,
  resolved_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- SUBSCRIPTIONS TABLE
-- Payment history
-- ============================================================
create table if not exists subscriptions (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  plan text not null check (plan in ('starter','professional','enterprise')),
  amount_kshs integer not null,
  mpesa_transaction_id text,
  mpesa_phone text,
  period_start timestamptz not null,
  period_end timestamptz not null,
  status text default 'pending' check (status in ('pending','active','expired','failed')),
  created_at timestamptz default now()
);

-- ============================================================
-- SEARCH LOGS TABLE
-- Track what businesses are searching (for analytics)
-- ============================================================
create table if not exists search_logs (
  id uuid primary key default uuid_generate_v4(),
  searched_by uuid references businesses(id) on delete cascade,
  search_type text check (search_type in ('staff','supplier','business')),
  search_query text,
  results_count integer,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Critical: without this anyone can read/write everything
-- ============================================================

alter table businesses enable row level security;
alter table staff_records enable row level security;
alter table supplier_records enable row level security;
alter table disputes enable row level security;
alter table subscriptions enable row level security;
alter table search_logs enable row level security;

-- BUSINESSES policies
create policy "Users can view all businesses" on businesses for select using (true);
create policy "Users can create their own business" on businesses for insert with check (auth.uid() = user_id);
create policy "Users can update their own business" on businesses for update using (auth.uid() = user_id);

-- STAFF RECORDS policies
create policy "Subscribed users can view staff records" on staff_records for select using (
  exists (select 1 from businesses where user_id = auth.uid() and subscription_status = 'active')
  or exists (select 1 from businesses where user_id = auth.uid() and id = staff_records.logged_by)
);
create policy "Businesses can insert staff records" on staff_records for insert with check (
  exists (select 1 from businesses where id = logged_by and user_id = auth.uid())
);
create policy "Businesses can update their own staff records" on staff_records for update using (
  exists (select 1 from businesses where id = logged_by and user_id = auth.uid())
);

-- SUPPLIER RECORDS policies
create policy "Subscribed users can view supplier records" on supplier_records for select using (
  exists (select 1 from businesses where user_id = auth.uid() and subscription_status = 'active')
  or exists (select 1 from businesses where user_id = auth.uid() and id = supplier_records.logged_by)
);
create policy "Businesses can insert supplier records" on supplier_records for insert with check (
  exists (select 1 from businesses where id = logged_by and user_id = auth.uid())
);
create policy "Businesses can update their own supplier records" on supplier_records for update using (
  exists (select 1 from businesses where id = logged_by and user_id = auth.uid())
);

-- DISPUTES policies
create policy "Businesses can view their own disputes" on disputes for select using (
  exists (select 1 from businesses where id = disputed_by and user_id = auth.uid())
);
create policy "Businesses can create disputes" on disputes for insert with check (
  exists (select 1 from businesses where id = disputed_by and user_id = auth.uid())
);

-- SUBSCRIPTIONS policies
create policy "Businesses can view their own subscriptions" on subscriptions for select using (
  exists (select 1 from businesses where id = business_id and user_id = auth.uid())
);

-- SEARCH LOGS policies
create policy "Businesses can insert search logs" on search_logs for insert with check (
  exists (select 1 from businesses where id = searched_by and user_id = auth.uid())
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
create index if not exists idx_staff_subject_id on staff_records(subject_id_number);
create index if not exists idx_staff_subject_name on staff_records using gin(to_tsvector('english', subject_name));
create index if not exists idx_supplier_name on supplier_records using gin(to_tsvector('english', supplier_name));
create index if not exists idx_supplier_kra on supplier_records(supplier_kra_pin);
create index if not exists idx_businesses_name on businesses using gin(to_tsvector('english', name));
create index if not exists idx_staff_logged_by on staff_records(logged_by);
create index if not exists idx_supplier_logged_by on supplier_records(logged_by);

-- ============================================================
-- SEED DATA (optional - 5 sample Nairobi businesses)
-- Remove this section if you don't want sample data
-- ============================================================
-- Note: These are fictional examples for demonstration only

-- ============================================================
-- DONE
-- Your Veribase database is ready.
-- Next: copy your Supabase URL and anon key into app.html
-- ============================================================
