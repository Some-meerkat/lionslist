-- ============================================================
-- LionsList Database Schema
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ─── Profiles ────────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text unique not null,
  school text not null,
  graduation_year int not null check (graduation_year between 2020 and 2035),
  whatsapp text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

-- ─── Marketplaces ────────────────────────────────────────────
create table marketplaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text,
  description text not null,
  pricing_mode text not null default 'any' check (pricing_mode in ('free', 'any', 'max')),
  price_max numeric(10, 2),
  allow_pictures boolean default true,
  expiry_date date,
  school_restrictions text[] default '{}',
  creator_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now()
);

-- ─── Listings ────────────────────────────────────────────────
create table listings (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null,
  quantity int not null default 1 check (quantity >= 1),
  price numeric(10, 2) not null default 0,
  note text,
  sold boolean default false,
  marketplace_id uuid not null references marketplaces(id) on delete cascade,
  seller_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now()
);

-- ─── Listing Images ──────────────────────────────────────────
create table listing_images (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references listings(id) on delete cascade,
  image_url text not null,
  display_order int not null default 0,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table profiles enable row level security;
alter table marketplaces enable row level security;
alter table listings enable row level security;
alter table listing_images enable row level security;

-- Profiles
create policy "Profiles are viewable by authenticated users"
  on profiles for select to authenticated using (true);

create policy "Users can insert their own profile"
  on profiles for insert to authenticated with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update to authenticated using (auth.uid() = id);

-- Marketplaces
create policy "Marketplaces are viewable by authenticated users"
  on marketplaces for select to authenticated using (true);

create policy "Authenticated users can create marketplaces"
  on marketplaces for insert to authenticated with check (auth.uid() = creator_id);

create policy "Creators can update their own marketplaces"
  on marketplaces for update to authenticated using (auth.uid() = creator_id);

create policy "Creators can delete their own marketplaces"
  on marketplaces for delete to authenticated using (auth.uid() = creator_id);

-- Listings
create policy "Listings are viewable by authenticated users"
  on listings for select to authenticated using (true);

create policy "Authenticated users can create listings"
  on listings for insert to authenticated with check (auth.uid() = seller_id);

create policy "Sellers can update their own listings"
  on listings for update to authenticated using (auth.uid() = seller_id);

create policy "Sellers can delete their own listings"
  on listings for delete to authenticated using (auth.uid() = seller_id);

-- Listing Images
create policy "Listing images are viewable by authenticated users"
  on listing_images for select to authenticated using (true);

create policy "Users can insert images for their own listings"
  on listing_images for insert to authenticated
  with check (
    exists (
      select 1 from listings where listings.id = listing_id and listings.seller_id = auth.uid()
    )
  );

create policy "Users can delete images for their own listings"
  on listing_images for delete to authenticated
  using (
    exists (
      select 1 from listings where listings.id = listing_id and listings.seller_id = auth.uid()
    )
  );

-- ============================================================
-- Storage Bucket
-- ============================================================

insert into storage.buckets (id, name, public) values ('listing-images', 'listing-images', true);

create policy "Anyone can read listing images"
  on storage.objects for select using (bucket_id = 'listing-images');

create policy "Authenticated users can upload listing images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and octet_length(decode(encode(''::bytea, 'base64'), 'base64')) <= 5242880
  );

create policy "Users can delete their own listing images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
