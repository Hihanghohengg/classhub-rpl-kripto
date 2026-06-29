create extension if not exists pgcrypto;

drop table if exists group_members cascade;
drop table if exists generated_groups cascade;
drop table if exists group_sessions cascade;
drop table if exists course_meetings cascade;
drop table if exists announcements cascade;
drop table if exists assignments cascade;
drop table if exists calendar_events cascade;
drop table if exists weekly_schedules cascade;
drop table if exists time_slots cascade;
drop table if exists courses cascade;
drop table if exists user_credentials cascade;
drop table if exists profiles cascade;

drop function if exists register_app_user(text, text, text, text, date);
drop function if exists login_app_user(text, text);

create table profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  nickname text not null,
  npm text not null unique,
  birth_date date,
  role text not null default 'student',
  theme_preference text not null default 'system',
  font_size_preference text not null default 'normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_credentials (
  profile_id uuid primary key references profiles(id) on delete cascade,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lecturer text,
  description text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table time_slots (
  id uuid primary key default gen_random_uuid(),
  slot_number int not null unique,
  start_time time not null,
  end_time time not null,
  label text not null,
  is_active boolean not null default true
);

insert into time_slots (slot_number, start_time, end_time, label) values
(1, '08:00', '08:50', 'Jam ke-1'),
(2, '08:50', '09:40', 'Jam ke-2'),
(3, '10:00', '10:50', 'Jam ke-3'),
(4, '10:50', '11:40', 'Jam ke-4'),
(5, '11:40', '12:30', 'Jam ke-5'),
(6, '13:15', '14:05', 'Jam ke-6'),
(7, '14:05', '14:55', 'Jam ke-7'),
(8, '14:55', '15:45', 'Jam ke-8');

create table weekly_schedules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  day_of_week text not null check (day_of_week in ('monday','tuesday','wednesday','thursday','friday')),
  start_slot_id uuid not null references time_slots(id),
  end_slot_id uuid not null references time_slots(id),
  room text,
  notes text,
  is_active boolean not null default true,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) on delete set null,
  event_type text not null default 'replacement_class',
  event_date date not null,
  start_slot_id uuid references time_slots(id),
  end_slot_id uuid references time_slots(id),
  custom_start_time time,
  custom_end_time time,
  mode text check (mode in ('online','offline')),
  room text,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) on delete set null,
  title text not null,
  assignment_type text not null default 'individual',
  priority text not null default 'medium',
  status text not null default 'not_started',
  deadline timestamptz,
  submitted_at timestamptz,
  submission_status text default 'not_submitted',
  description text,
  link_url text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table announcements (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  is_pinned boolean not null default false,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table course_meetings (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  meeting_number int,
  meeting_date date,
  topic text not null,
  summary text,
  key_points text,
  assignment_note text,
  material_link text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table group_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  course_id uuid references courses(id) on delete set null,
  grouping_method text not null,
  group_count int,
  members_per_group int,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table generated_groups (
  id uuid primary key default gen_random_uuid(),
  group_session_id uuid not null references group_sessions(id) on delete cascade,
  group_number int not null,
  created_at timestamptz not null default now()
);

create table group_members (
  id uuid primary key default gen_random_uuid(),
  generated_group_id uuid not null references generated_groups(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function register_app_user(
  p_full_name text,
  p_nickname text,
  p_npm text,
  p_password text,
  p_birth_date date
)
returns table (
  id uuid,
  full_name text,
  nickname text,
  npm text,
  birth_date date,
  role text,
  theme_preference text,
  font_size_preference text
)
language plpgsql
security definer
as $$
declare
  v_profile_id uuid;
begin
  if exists (select 1 from profiles where profiles.npm = p_npm) then
    raise exception 'NPM sudah terdaftar.';
  end if;

  insert into profiles (
    full_name,
    nickname,
    npm,
    birth_date,
    role,
    theme_preference,
    font_size_preference
  )
  values (
    p_full_name,
    p_nickname,
    p_npm,
    p_birth_date,
    'student',
    'system',
    'normal'
  )
  returning profiles.id into v_profile_id;

  insert into user_credentials (
    profile_id,
    password_hash
  )
  values (
    v_profile_id,
    crypt(p_password, gen_salt('bf'))
  );

  return query
  select
    p.id,
    p.full_name,
    p.nickname,
    p.npm,
    p.birth_date,
    p.role,
    p.theme_preference,
    p.font_size_preference
  from profiles p
  where p.id = v_profile_id;
end;
$$;

create or replace function login_app_user(
  p_npm text,
  p_password text
)
returns table (
  id uuid,
  full_name text,
  nickname text,
  npm text,
  birth_date date,
  role text,
  theme_preference text,
  font_size_preference text
)
language plpgsql
security definer
as $$
begin
  return query
  select
    p.id,
    p.full_name,
    p.nickname,
    p.npm,
    p.birth_date,
    p.role,
    p.theme_preference,
    p.font_size_preference
  from profiles p
  join user_credentials c on c.profile_id = p.id
  where p.npm = p_npm
    and c.password_hash = crypt(p_password, c.password_hash);

  if not found then
    raise exception 'NPM atau password tidak sesuai.';
  end if;
end;
$$;

grant usage on schema public to anon;
grant select, insert, update, delete on profiles to anon;
grant select, insert, update, delete on courses to anon;
grant select, insert, update, delete on time_slots to anon;
grant select, insert, update, delete on weekly_schedules to anon;
grant select, insert, update, delete on calendar_events to anon;
grant select, insert, update, delete on assignments to anon;
grant select, insert, update, delete on announcements to anon;
grant select, insert, update, delete on course_meetings to anon;
grant select, insert, update, delete on group_sessions to anon;
grant select, insert, update, delete on generated_groups to anon;
grant select, insert, update, delete on group_members to anon;

revoke all on user_credentials from anon;
grant execute on function register_app_user(text, text, text, text, date) to anon;
grant execute on function login_app_user(text, text) to anon;