-- Dedupes monthly (and other) campaign sends.
-- Run in the Supabase SQL editor (or via CLI) before relying on cron/admin idempotency.
-- Column names match the app's camelCase PostgREST style (see email_tracking).

create table if not exists public.email_campaign_send (
  id bigint generated always as identity primary key,
  campaign text not null,
  period text not null,
  source text not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  "queuedCount" integer not null default 0,
  "sentAt" timestamptz,
  error text,
  metadata jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique (campaign, period)
);

create index if not exists email_campaign_send_campaign_period_idx
  on public.email_campaign_send (campaign, period);

alter table public.email_campaign_send enable row level security;

-- Staff can read/write; cron uses the service role (bypasses RLS).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'email_campaign_send'
      and policyname = 'Staff can read email_campaign_send'
  ) then
    create policy "Staff can read email_campaign_send"
      on public.email_campaign_send
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.profile p
          where p."userId" = auth.uid()
            and p.role in ('coach', 'admin')
            and p.status = 'active'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'email_campaign_send'
      and policyname = 'Staff can insert email_campaign_send'
  ) then
    create policy "Staff can insert email_campaign_send"
      on public.email_campaign_send
      for insert
      to authenticated
      with check (
        exists (
          select 1
          from public.profile p
          where p."userId" = auth.uid()
            and p.role in ('coach', 'admin')
            and p.status = 'active'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'email_campaign_send'
      and policyname = 'Staff can update email_campaign_send'
  ) then
    create policy "Staff can update email_campaign_send"
      on public.email_campaign_send
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.profile p
          where p."userId" = auth.uid()
            and p.role in ('coach', 'admin')
            and p.status = 'active'
        )
      );
  end if;
end $$;

comment on table public.email_campaign_send is
  'One row per campaign+period (e.g. monthly-swim-review / 2026-08). Prevents duplicate sends.';
