-- LISTS: Add lists table and list_id to list_items
-- Run this migration in Supabase SQL Editor after the initial setup

-- Create lists table
create table if not exists lists (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  is_encrypted boolean default false,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Add list_id to list_items (nullable for backward compatibility)
alter table list_items add column if not exists list_id bigint references lists(id);

-- Create index for faster lookups
create index if not exists list_items_list_id_idx on list_items(list_id);
create index if not exists lists_user_id_idx on lists(user_id);

-- Migrate existing list_items: create "Shopping List" for each user and assign items
insert into lists (user_id, name, is_encrypted)
select distinct user_id, 'Shopping List', false
from list_items
where list_id is null;

update list_items li
set list_id = (select l.id from lists l where l.user_id = li.user_id and l.name = 'Shopping List' limit 1)
where li.list_id is null;

-- Enable RLS on lists
alter table lists enable row level security;

drop policy if exists "Lists owner access" on lists;
create policy "Lists owner access"
on lists for all
to authenticated
using (auth.uid() = user_id);
