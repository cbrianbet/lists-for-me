-- PROFILES
create table if not exists profiles (
  id uuid primary key references auth.users(id),
  has_onboarded boolean default false,
  expo_token text
);

-- RECIPES
create table if not exists recipes (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id),
  title text,
  steps text,
  ingredients text,
  image_url text,
  cook_time int,
  created_at timestamp default now()
);

-- LIST ITEMS
create table if not exists list_items (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id),
  name text,
  section text,
  created_at timestamp default now()
);

-- MEAL PLAN
create table if not exists meal_plan (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id),
  recipe_id bigint references recipes(id),
  planned_date date,
  created_at timestamp default now()
);

-- ENABLE RLS
alter table profiles enable row level security;
alter table recipes enable row level security;
alter table list_items enable row level security;
alter table meal_plan enable row level security;

-- RLS policies
create policy "Profiles owner access"
on profiles for all
to authenticated
using (auth.uid() = id);

create policy "Recipes owner access"
on recipes for all
to authenticated
using (auth.uid() = user_id);

create policy "List owner access"
on list_items for all
to authenticated
using (auth.uid() = user_id);

create policy "Meal plan owner access"
on meal_plan for all
to authenticated
using (auth.uid() = user_id);

---
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, has_onboarded)
  values (new.id, false)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure handle_new_user();
