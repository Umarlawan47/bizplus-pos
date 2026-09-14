-- BizPlus POS Supabase database
-- Run this SQL in Supabase SQL Editor BEFORE using the application.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text default '',
  business_name text default 'BizPlus',
  phone text default '',
  address text default '',
  currency text default 'NGN',
  created_at timestamptz default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sku text,
  category text default '',
  description text default '',
  selling_price numeric(14,2) not null default 0,
  cost_price numeric(14,2) not null default 0,
  stock integer not null default 0,
  low_stock_threshold integer not null default 5,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text default '',
  email text default '',
  address text default '',
  created_at timestamptz default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  invoice_no text not null,
  subtotal numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  profit numeric(14,2) not null default 0,
  payment_method text not null default 'Cash',
  created_at timestamptz default now()
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null default 1,
  unit_price numeric(14,2) not null default 0,
  cost_price numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  created_at timestamptz default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'Other',
  amount numeric(14,2) not null default 0,
  note text default '',
  created_at timestamptz default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  category text not null default 'Other',
  message text not null,
  status text not null default 'Open',
  created_at timestamptz default now()
);

-- Profile creation trigger for new signups.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, business_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    coalesce(new.raw_user_meta_data->>'business_name','BizPlus')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Enable Row Level Security.
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.expenses enable row level security;
alter table public.support_tickets enable row level security;

-- Drop old policies so this script can be safely re-run.
do $$ declare r record; begin
  for r in (select policyname, tablename from pg_policies where schemaname='public' and tablename in ('profiles','products','customers','sales','sale_items','expenses','support_tickets')) loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy "profiles own data" on public.profiles for all using (auth.uid()=id) with check (auth.uid()=id);
create policy "products own data" on public.products for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "customers own data" on public.customers for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "sales own data" on public.sales for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "sale items own data" on public.sale_items for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "expenses own data" on public.expenses for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "support own data" on public.support_tickets for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- Useful indexes.
create index if not exists products_user_id_idx on public.products(user_id);
create index if not exists customers_user_id_idx on public.customers(user_id);
create index if not exists sales_user_id_created_idx on public.sales(user_id, created_at desc);
create index if not exists sale_items_sale_id_idx on public.sale_items(sale_id);
create index if not exists expenses_user_id_created_idx on public.expenses(user_id, created_at desc);
create index if not exists support_user_id_created_idx on public.support_tickets(user_id, created_at desc);
