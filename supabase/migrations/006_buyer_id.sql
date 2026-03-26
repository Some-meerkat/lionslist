alter table listings add column if not exists buyer_id uuid references profiles(id);
