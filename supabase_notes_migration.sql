-- Add note fields and global notes table

-- Recipe-level notes
alter table recipes add column if not exists note text;

-- List-level notes (separate from list_items.note)
alter table lists add column if not exists note text;

-- Global notes table
create table if not exists notes (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) not null,
  title text not null default 'Untitled note',
  body text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

alter table notes enable row level security;

drop policy if exists "Notes owner access" on notes;
create policy "Notes owner access"
on notes for all
to authenticated
using (auth.uid() = user_id);

