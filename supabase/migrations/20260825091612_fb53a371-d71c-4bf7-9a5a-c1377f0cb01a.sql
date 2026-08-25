
create table if not exists public.auth_otp_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  purpose text not null default 'signin',
  attempts int not null default 0,
  max_attempts int not null default 5,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  delivery_channel text,
  delivered boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists auth_otp_codes_phone_idx on public.auth_otp_codes (phone, created_at desc);
alter table public.auth_otp_codes enable row level security;
revoke all on public.auth_otp_codes from anon, authenticated;
grant all on public.auth_otp_codes to service_role;

create table if not exists public.auth_rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.auth_rate_limits enable row level security;
revoke all on public.auth_rate_limits from anon, authenticated;
grant all on public.auth_rate_limits to service_role;

drop policy if exists "Users add own non-admin roles" on public.user_roles;
create policy "Users add own customer role" on public.user_roles
  for insert to authenticated
  with check (auth.uid() = user_id and role = 'customer'::app_role);
