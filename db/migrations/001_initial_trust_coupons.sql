create extension if not exists pgcrypto;

create type coupon_region as enum ('CZ', 'EU', 'US');
create type coupon_source as enum ('curated', 'community', 'affiliate', 'partner_feed');
create type coupon_status as enum ('active', 'disabled', 'expired', 'rejected', 'pending');
create type coupon_attempt_result as enum (
  'success',
  'failed_invalid',
  'failed_expired',
  'failed_ineligible',
  'failed_checkout_changed',
  'skipped_local_only',
  'error'
);
create type submission_status as enum ('pending', 'approved', 'rejected');

create table merchants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  primary_domain text not null,
  region coupon_region not null default 'CZ',
  adapter_id text not null,
  enabled boolean not null default true,
  affiliate_disclosure_required boolean not null default false,
  fallback_behavior text not null default 'ranked_display',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table coupons (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  region coupon_region not null,
  code text not null,
  title text not null,
  description text,
  status coupon_status not null default 'pending',
  source coupon_source not null,
  source_confidence numeric not null default 0.5 check (source_confidence >= 0 and source_confidence <= 1),
  starts_at timestamptz,
  expires_at timestamptz,
  last_verified_at timestamptz,
  success_rate_30d numeric check (success_rate_30d is null or (success_rate_30d >= 0 and success_rate_30d <= 1)),
  observed_savings_minor integer check (observed_savings_minor is null or observed_savings_minor >= 0),
  observed_final_total_minor integer check (observed_final_total_minor is null or observed_final_total_minor >= 0),
  currency char(3) not null default 'CZK',
  affiliate_network text,
  affiliate_disclosure text,
  merchant_constraints text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, code)
);

create table coupon_submissions (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  region coupon_region not null,
  code text not null,
  title text,
  source_url text,
  notes text,
  status submission_status not null default 'pending',
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table coupon_attempts (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  coupon_id uuid references coupons(id) on delete set null,
  region coupon_region not null,
  result coupon_attempt_result not null,
  attempted_at timestamptz not null,
  currency char(3) not null,
  subtotal_before_minor integer,
  final_total_before_minor integer,
  final_total_after_minor integer,
  savings_minor integer,
  extension_version text,
  adapter_id text,
  privacy_mode text not null,
  created_at timestamptz not null default now()
);

create table worker_jobs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  status text not null,
  payload jsonb not null default '{}',
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into merchants (slug, display_name, primary_domain, region, adapter_id, affiliate_disclosure_required)
values
  ('alza', 'Alza', 'alza.cz', 'CZ', 'cz.alza.checkout.v1', true),
  ('notino', 'Notino', 'notino.cz', 'CZ', 'cz.notino.checkout.v1', true),
  ('zalando', 'Zalando', 'zalando.cz', 'EU', 'eu.zalando.checkout.v1', true),
  ('about-you', 'About You', 'aboutyou.cz', 'EU', 'eu.about-you.checkout.v1', true)
on conflict (slug) do nothing;

create index coupons_lookup_idx on coupons (merchant_id, region, status, expires_at);
create index attempts_merchant_created_idx on coupon_attempts (merchant_id, created_at desc);
create index submissions_status_idx on coupon_submissions (status, created_at desc);
