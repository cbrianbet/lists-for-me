-- Add optional year field to lists and list_items
alter table lists add column if not exists year integer;
alter table list_items add column if not exists year integer;
