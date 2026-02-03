-- Add optional note field to list_items
alter table list_items add column if not exists note text;

