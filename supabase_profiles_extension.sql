-- Extend profiles table with optional user preferences and metadata
alter table profiles
  add column if not exists display_name text,
  add column if not exists avatar_url text,
  add column if not exists tts_rate numeric,
  add column if not exists tts_pitch numeric,
  add column if not exists tts_lang text,
  add column if not exists theme text,
  add column if not exists default_list_type text,
  add column if not exists default_list_year boolean;

