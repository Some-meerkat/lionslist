create table feedback (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  message text not null,
  created_at timestamptz default now()
);

alter table feedback enable row level security;

create policy "Users can insert feedback"
  on feedback for insert
  with check (user_id = auth.uid());

create policy "Users can view their own feedback"
  on feedback for select
  using (user_id = auth.uid());
