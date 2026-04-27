alter table coupons
  add column if not exists source_url text;

create index if not exists coupons_source_url_idx on coupons (source_url);
