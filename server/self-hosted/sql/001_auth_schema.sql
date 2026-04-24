create extension if not exists "pgcrypto";

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  email_normalized citext not null unique,
  password_hash text,
  email_verified_at timestamptz,
  session_version integer not null default 1,
  refresh_token_version integer not null default 1,
  reauth_required_at timestamptz,
  locked_until timestamptz,
  failed_login_count integer not null default 0,
  webauthn_user_handle text not null unique default encode(gen_random_bytes(32), 'base64'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists auth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  token_type text not null check (token_type in ('verify_email', 'password_reset', 'magic_link', 'account_recovery')),
  token_hash text not null,
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists auth_tokens_single_use_idx
  on auth_tokens (token_type, token_hash);

create table if not exists mfa_totp_factors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  secret_ciphertext text not null,
  label text not null,
  verified_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists mfa_backup_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists passkey_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  transports text[] not null default '{}',
  backed_up boolean not null default false,
  device_type text not null default 'singleDevice',
  nickname text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create table if not exists oauth_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  provider text not null,
  provider_subject text not null,
  profile jsonb not null default '{}'::jsonb,
  linked_at timestamptz not null default now(),
  unique (provider, provider_subject)
);

create table if not exists refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  token_family_id uuid not null,
  token_hash text not null unique,
  previous_token_id uuid references refresh_tokens(id) on delete set null,
  replaced_by_token_id uuid references refresh_tokens(id) on delete set null,
  revoked_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid references app_users(id) on delete set null,
  event_type text not null,
  ip inet,
  user_agent text,
  status text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists user_sessions (
  sid varchar not null primary key,
  sess json not null,
  expire timestamptz not null
);

create index if not exists user_sessions_expire_idx on user_sessions (expire);
create index if not exists audit_logs_event_idx on audit_logs (event_type, created_at desc);
create index if not exists refresh_tokens_user_idx on refresh_tokens (user_id, created_at desc);
