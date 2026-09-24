-- GorillaPM — initial schema
-- Multi-tenant: every business table carries organization_id and is protected by
-- row-level security. Users only ever see rows of organizations they belong to.

------------------------------------------------------------------------------
-- 0. Plans and entitlements (global reference data)
------------------------------------------------------------------------------
create table public.plan_entitlements (
  plan text primary key check (plan in ('trial', 'basic', 'premium', 'gold')),
  label text not null,
  price_eur_month integer not null,
  max_users integer not null,
  max_guests integer not null,
  storage_gb integer not null,
  ai_credits integer not null,
  features text[] not null default '{}'
);

insert into public.plan_entitlements (plan, label, price_eur_month, max_users, max_guests, storage_gb, ai_credits, features) values
  ('basic',   'Basic',   39,   5,   0,    5,    20,
    array['tasks','list','kanban','calendar','eisenhower','timeline','my_work','timer','import','recurring']),
  ('premium', 'Premium', 300,  30,  50,   100,  500,
    array['tasks','list','kanban','calendar','eisenhower','timeline','my_work','timer','import','recurring',
          'hybrid','gantt','table','workload','agile','waterfall','portfolio','intake','scoring','resources',
          'timesheets','raid','meetings','goals','dashboards','reports','automations','integrations','custom_roles','stakeholder_update']),
  ('gold',    'Gold',    1500, 100, 100000, 1000, 3000,
    array['tasks','list','kanban','calendar','eisenhower','timeline','my_work','timer','import','recurring',
          'hybrid','gantt','table','workload','agile','waterfall','portfolio','intake','scoring','resources',
          'timesheets','raid','meetings','goals','dashboards','reports','automations','integrations','custom_roles','stakeholder_update',
          'scenarios','raci','change_requests','decision_log','stage_gates','finance','engineering_pack','cost_rates',
          'api','sso','audit_log','scheduled_exports','white_label']),
  -- A trial gets Premium features for 14 days.
  ('trial',   'Trial',   0,    30,  50,   100,  100,
    array['tasks','list','kanban','calendar','eisenhower','timeline','my_work','timer','import','recurring',
          'hybrid','gantt','table','workload','agile','waterfall','portfolio','intake','scoring','resources',
          'timesheets','raid','meetings','goals','dashboards','reports','automations','integrations','custom_roles','stakeholder_update']);

------------------------------------------------------------------------------
-- 1. Organizations, members, invitations, blueprint
------------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique,
  industry text,
  plan text not null default 'trial' references public.plan_entitlements (plan),
  subscription_status text not null default 'trialing'
    check (subscription_status in ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'unpaid')),
  trial_ends_at timestamptz default (now() + interval '14 days'),
  current_period_end timestamptz,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  extra_seats integer not null default 0 check (extra_seats >= 0),
  is_demo boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.memberships (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'manager', 'member', 'guest')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'manager', 'member', 'guest')),
  token text not null unique default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz
);
create index invitations_org_idx on public.invitations (organization_id);

-- The workspace blueprint: every answer from the onboarding wizard.
create table public.blueprints (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

------------------------------------------------------------------------------
-- 2. Helper functions (security definer so policies don't recurse)
------------------------------------------------------------------------------
create or replace function public.member_role(p_org uuid)
returns text language sql stable security definer set search_path = '' as $$
  select m.role from public.memberships m
  where m.organization_id = p_org and m.user_id = (select auth.uid())
$$;

create or replace function public.is_member(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = p_org and m.user_id = (select auth.uid())
  )
$$;

create or replace function public.org_is_active(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select case
      when o.plan = 'trial' then coalesce(o.trial_ends_at > now(), false)
      else o.subscription_status in ('active', 'trialing', 'past_due')
    end
    from public.organizations o where o.id = p_org
  ), false)
$$;

create or replace function public.is_admin(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.member_role(p_org) in ('owner', 'admin'), false)
$$;

create or replace function public.is_manager(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.member_role(p_org) in ('owner', 'admin', 'manager'), false)
    and public.org_is_active(p_org)
$$;

-- Can create/update work: any non-guest member of an active organization.
create or replace function public.can_write(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.member_role(p_org) in ('owner', 'admin', 'manager', 'member'), false)
    and public.org_is_active(p_org)
$$;

create or replace function public.org_has_feature(p_org uuid, p_feature text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select p_feature = any (e.features)
    from public.organizations o
    join public.plan_entitlements e on e.plan = o.plan
    where o.id = p_org
  ), false)
$$;

create or replace function public.shares_org_with(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships a
    join public.memberships b on a.organization_id = b.organization_id
    where a.user_id = (select auth.uid()) and b.user_id = p_user
  )
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

------------------------------------------------------------------------------
-- 3. Resources, programs, projects, work
------------------------------------------------------------------------------
create table public.people (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  email text,
  user_id uuid references auth.users (id) on delete set null,
  discipline text,
  role_title text,
  employment_type text not null default 'fte' check (employment_type in ('fte', 'contractor', 'backfill', 'pool')),
  capacity_hours_per_quarter numeric not null default 490 check (capacity_hours_per_quarter >= 0),
  active boolean not null default true,
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index people_org_idx on public.people (organization_id);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index programs_org_idx on public.programs (organization_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  program_id uuid references public.programs (id) on delete set null,
  code text,
  name text not null check (char_length(name) between 1 and 300),
  description text,
  scope text,
  methodology text not null default 'hybrid' check (methodology in ('waterfall', 'scrum', 'kanban', 'tasks', 'hybrid')),
  status text not null default 'active' check (status in ('not_started', 'active', 'on_hold', 'completed', 'cancelled')),
  health text not null default 'on_track' check (health in ('on_track', 'at_risk', 'behind', 'not_started', 'closed')),
  category text,
  site text,
  decision text check (decision in ('keep', 'defer', 'no_bandwidth', 'cancel', 'transfer')),
  owner_label text,
  lead_person_id uuid references public.people (id) on delete set null,
  pm_person_id uuid references public.people (id) on delete set null,
  start_date date,
  end_date date,
  budget_original numeric,
  budget_current numeric,
  committed_quarter text,
  reference_links text,
  backlog_item_id uuid,
  is_demo boolean not null default false,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index projects_org_idx on public.projects (organization_id);
create trigger projects_updated_at before update on public.projects for each row execute function public.set_updated_at();

create table public.phases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index phases_project_idx on public.phases (project_id);

create table public.sprints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  name text not null,
  goal text,
  start_date date,
  end_date date,
  status text not null default 'planned' check (status in ('planned', 'active', 'completed')),
  created_at timestamptz not null default now()
);
create index sprints_org_idx on public.sprints (organization_id);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  phase_id uuid references public.phases (id) on delete set null,
  parent_id uuid references public.tasks (id) on delete cascade,
  sprint_id uuid references public.sprints (id) on delete set null,
  title text not null check (char_length(title) between 1 and 500),
  description text,
  status text not null default 'not_started'
    check (status in ('not_started', 'planned', 'in_progress', 'blocked', 'delayed', 'completed', 'cancelled')),
  priority text not null default 'medium' check (priority in ('urgent', 'high', 'medium', 'low')),
  bucket text check (bucket in ('today', 'urgent_important', 'important_not_urgent', 'urgent_not_important', 'neither')),
  assignee_id uuid references auth.users (id) on delete set null,
  person_id uuid references public.people (id) on delete set null,
  resource_type text,
  estimate_hours numeric check (estimate_hours >= 0),
  story_points numeric check (story_points >= 0),
  start_date date,
  due_date date,
  completed_at timestamptz,
  percent_complete integer not null default 0 check (percent_complete between 0 and 100),
  position double precision not null default 0,
  labels text[] not null default '{}',
  checklist jsonb not null default '[]'::jsonb,
  reference text,
  is_demo boolean not null default false,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_org_idx on public.tasks (organization_id);
create index tasks_project_idx on public.tasks (project_id);
create index tasks_assignee_idx on public.tasks (assignee_id);
create trigger tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();

create or replace function public.tasks_completion()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
    new.completed_at := coalesce(new.completed_at, now());
    new.percent_complete := 100;
  elsif new.status <> 'completed' and tg_op = 'UPDATE' and old.status = 'completed' then
    new.completed_at := null;
  end if;
  return new;
end $$;
create trigger tasks_completion before insert or update of status on public.tasks
  for each row execute function public.tasks_completion();

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null default auth.uid(),
  body text not null check (char_length(body) between 1 and 10000),
  created_at timestamptz not null default now()
);
create index task_comments_task_idx on public.task_comments (task_id);

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  task_id uuid references public.tasks (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  minutes integer check (minutes >= 0),
  note text,
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);
create index time_entries_user_idx on public.time_entries (organization_id, user_id, started_at);

create or replace function public.time_entries_minutes()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.ended_at is not null and new.minutes is null then
    new.minutes := greatest(0, round(extract(epoch from (new.ended_at - new.started_at)) / 60))::integer;
  end if;
  return new;
end $$;
create trigger time_entries_minutes before insert or update on public.time_entries
  for each row execute function public.time_entries_minutes();

------------------------------------------------------------------------------
-- 4. Portfolio loop: intake -> backlog -> prioritise -> allocate -> M&C
------------------------------------------------------------------------------
create table public.intake_forms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  slug text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  title text not null default 'Raise a request',
  description text,
  is_public boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index intake_forms_org_idx on public.intake_forms (organization_id);

create table public.backlog_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  number integer,
  title text not null check (char_length(title) between 1 and 300),
  description text,
  justification text,
  requestor_name text,
  requestor_email text,
  requestor_role text,
  source text not null default 'internal'
    check (source in ('health_dashboard', 'internal', 'external', 'incident', 'audit')),
  pillar text,
  category text,
  site text,
  business_impact text check (business_impact in ('critical', 'high', 'medium', 'low')),
  target_quarter text,
  downtime_required boolean,
  dependencies text,
  suggested_solution text,
  suggested_owner text,
  external_link text,
  status text not null default 'new'
    check (status in ('new', 'triaged', 'ready', 'in_backlog', 'in_sprint', 'in_progress', 'blocked', 'deferred', 'cancelled', 'done')),
  rag text not null default 'none' check (rag in ('none', 'medium', 'high')),
  ready_for_prioritization boolean not null default false,
  scores jsonb not null default '{}'::jsonb,
  score numeric,
  committed_priority integer check (committed_priority between 1 and 4),
  committed_quarter text,
  planned_start date,
  planned_end date,
  percent_complete integer not null default 0 check (percent_complete between 0 and 100),
  pillar_impact text,
  kpi_moved boolean,
  new_issue_raised boolean,
  feedback_to_backlog boolean,
  mc_date date,
  parent_item_id uuid references public.backlog_items (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  is_demo boolean not null default false,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number)
);
create index backlog_items_org_idx on public.backlog_items (organization_id, status);
create trigger backlog_items_updated_at before update on public.backlog_items for each row execute function public.set_updated_at();

alter table public.projects
  add constraint projects_backlog_item_fk foreign key (backlog_item_id) references public.backlog_items (id) on delete set null;

create or replace function public.backlog_items_number()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.number is null then
    perform pg_advisory_xact_lock(hashtext('backlog:' || new.organization_id::text));
    select coalesce(max(b.number), 0) + 1 into new.number
    from public.backlog_items b where b.organization_id = new.organization_id;
  end if;
  return new;
end $$;
create trigger backlog_items_number before insert on public.backlog_items
  for each row execute function public.backlog_items_number();

-- Weighted score from the blueprint's scoring criteria:
-- score = sum(value * weight / 10). With weights 25/50/20/5 on a 1-3 scale this is
-- Safety x2.5 + Availability x5 + Compliance x2 + Energy x0.5 (range 10-30).
create or replace function public.backlog_items_score()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_criteria jsonb;
  v_c jsonb;
  v_total numeric := 0;
  v_any boolean := false;
  v_val text;
begin
  select b.config -> 'scoring' -> 'criteria' into v_criteria
  from public.blueprints b where b.organization_id = new.organization_id;
  if v_criteria is null or jsonb_typeof(v_criteria) <> 'array' then
    new.score := null;
    return new;
  end if;
  for v_c in select * from jsonb_array_elements(v_criteria) loop
    v_val := new.scores ->> (v_c ->> 'key');
    if v_val is not null and v_val ~ '^[0-9]+(\.[0-9]+)?$' then
      v_total := v_total + v_val::numeric * coalesce((v_c ->> 'weight')::numeric, 0) / 10;
      v_any := true;
    end if;
  end loop;
  new.score := case when v_any then round(v_total, 2) else null end;
  return new;
end $$;
create trigger backlog_items_score before insert or update of scores on public.backlog_items
  for each row execute function public.backlog_items_score();

create table public.allocations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  backlog_item_id uuid references public.backlog_items (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  person_id uuid references public.people (id) on delete set null,
  discipline text not null,
  quarter text,
  hours numeric not null default 0 check (hours >= 0),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  check (backlog_item_id is not null or project_id is not null)
);
create index allocations_org_idx on public.allocations (organization_id);

-- Dated updates: the weekly notes log that feeds stakeholder emails.
create table public.item_updates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  backlog_item_id uuid references public.backlog_items (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 10000),
  author_id uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index item_updates_org_idx on public.item_updates (organization_id, created_at desc);

------------------------------------------------------------------------------
-- 5. Governance
------------------------------------------------------------------------------
create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  series text,
  title text not null,
  meeting_type text not null default 'governance'
    check (meeting_type in ('governance', 'review', 'standup', 'planning', 'retro', 'other')),
  starts_at timestamptz not null,
  duration_minutes integer not null default 60 check (duration_minutes > 0),
  chair text,
  attendees text,
  agenda text,
  minutes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index meetings_org_idx on public.meetings (organization_id, starts_at);

create table public.raid_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  kind text not null check (kind in ('risk', 'assumption', 'issue', 'decision', 'action')),
  title text not null,
  description text,
  probability integer check (probability between 1 and 5),
  impact integer check (impact between 1 and 5),
  owner text,
  due_date date,
  status text not null default 'open' check (status in ('open', 'in_progress', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index raid_items_org_idx on public.raid_items (organization_id);
create trigger raid_items_updated_at before update on public.raid_items for each row execute function public.set_updated_at();

------------------------------------------------------------------------------
-- 6. Marketing leads (contact / early-access form, no tenant)
------------------------------------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  email text not null check (char_length(email) between 3 and 320),
  company text,
  team_size text,
  methodology text,
  message text check (char_length(message) <= 5000),
  source text,
  created_at timestamptz not null default now()
);

------------------------------------------------------------------------------
-- 7. Functions called by the app
------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.create_organization(p_name text, p_industry text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_org uuid;
  v_slug text;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Company name is required'; end if;
  if (select count(*) from public.organizations o where o.created_by = v_uid) >= 5 then
    raise exception 'You can create at most 5 companies';
  end if;
  v_slug := trim(both '-' from lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g')));
  v_slug := left(coalesce(nullif(v_slug, ''), 'company'), 40) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  insert into public.organizations (name, slug, industry, created_by)
  values (trim(p_name), v_slug, p_industry, v_uid)
  returning id into v_org;
  insert into public.memberships (organization_id, user_id, role) values (v_org, v_uid, 'owner');
  insert into public.blueprints (organization_id) values (v_org);
  return v_org;
end $$;

create or replace function public.accept_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text := lower(coalesce((select auth.jwt()) ->> 'email', ''));
  v_inv public.invitations;
  v_limit integer;
  v_used integer;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  select * into v_inv from public.invitations i
  where i.token = p_token and i.accepted_at is null and i.expires_at > now();
  if v_inv.id is null then raise exception 'This invitation is invalid or has expired'; end if;
  if lower(v_inv.email) <> v_email then
    raise exception 'This invitation was sent to a different email address';
  end if;
  if exists (select 1 from public.memberships m where m.organization_id = v_inv.organization_id and m.user_id = v_uid) then
    update public.invitations set accepted_at = now() where id = v_inv.id;
    return v_inv.organization_id;
  end if;
  select case when v_inv.role = 'guest' then e.max_guests else e.max_users + o.extra_seats end
    into v_limit
  from public.organizations o join public.plan_entitlements e on e.plan = o.plan
  where o.id = v_inv.organization_id;
  select count(*) into v_used from public.memberships m
  where m.organization_id = v_inv.organization_id
    and ((v_inv.role = 'guest' and m.role = 'guest') or (v_inv.role <> 'guest' and m.role <> 'guest'));
  if v_used >= v_limit then
    raise exception 'This company has used all seats on its plan';
  end if;
  insert into public.memberships (organization_id, user_id, role) values (v_inv.organization_id, v_uid, v_inv.role);
  update public.invitations set accepted_at = now() where id = v_inv.id;
  return v_inv.organization_id;
end $$;

-- Public intake: anyone with the form link can raise a backlog item.
create or replace function public.submit_intake(p_slug text, p_payload jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_form public.intake_forms;
  v_item public.backlog_items;
  v_title text := left(trim(coalesce(p_payload ->> 'title', '')), 300);
begin
  select * into v_form from public.intake_forms f where f.slug = p_slug and f.active and f.is_public;
  if v_form.id is null then raise exception 'This form is not available'; end if;
  if v_title = '' then raise exception 'A title is required'; end if;
  if not public.org_is_active(v_form.organization_id) then raise exception 'This form is not available'; end if;
  insert into public.backlog_items (
    organization_id, title, description, justification, requestor_name, requestor_email, requestor_role,
    source, site, business_impact, target_quarter, downtime_required, dependencies, suggested_solution, created_by
  ) values (
    v_form.organization_id, v_title,
    left(p_payload ->> 'description', 10000),
    left(p_payload ->> 'justification', 5000),
    left(p_payload ->> 'requestor_name', 200),
    left(p_payload ->> 'requestor_email', 320),
    left(p_payload ->> 'requestor_role', 200),
    case when p_payload ->> 'source' in ('health_dashboard', 'internal', 'external', 'incident', 'audit')
         then p_payload ->> 'source' else 'internal' end,
    left(p_payload ->> 'site', 200),
    case when p_payload ->> 'business_impact' in ('critical', 'high', 'medium', 'low')
         then p_payload ->> 'business_impact' end,
    left(p_payload ->> 'target_quarter', 50),
    case when p_payload ->> 'downtime_required' in ('true', 'false') then (p_payload ->> 'downtime_required')::boolean end,
    left(p_payload ->> 'dependencies', 5000),
    left(p_payload ->> 'suggested_solution', 5000),
    (select auth.uid())
  ) returning * into v_item;
  return 'BL-' || lpad(v_item.number::text, 3, '0');
end $$;

create or replace function public.invitation_info(p_token text)
returns table (organization_name text, email text, role text, valid boolean)
language sql stable security definer set search_path = '' as $$
  select o.name, i.email, i.role, (i.accepted_at is null and i.expires_at > now())
  from public.invitations i join public.organizations o on o.id = i.organization_id
  where i.token = p_token
$$;

create or replace function public.intake_form_public(p_slug text)
returns table (title text, description text, organization_name text, fiscal_start integer)
language sql stable security definer set search_path = '' as $$
  select f.title, f.description, o.name,
    coalesce(nullif(b.config -> 'company' ->> 'fiscalYearStartMonth', '')::integer, 1)
  from public.intake_forms f
  join public.organizations o on o.id = f.organization_id
  left join public.blueprints b on b.organization_id = f.organization_id
  where f.slug = p_slug and f.active and f.is_public and public.org_is_active(f.organization_id)
$$;

------------------------------------------------------------------------------
-- 8. Row-level security
------------------------------------------------------------------------------
alter table public.plan_entitlements enable row level security;
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.blueprints enable row level security;
alter table public.people enable row level security;
alter table public.programs enable row level security;
alter table public.projects enable row level security;
alter table public.phases enable row level security;
alter table public.sprints enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.time_entries enable row level security;
alter table public.intake_forms enable row level security;
alter table public.backlog_items enable row level security;
alter table public.allocations enable row level security;
alter table public.item_updates enable row level security;
alter table public.meetings enable row level security;
alter table public.raid_items enable row level security;
alter table public.leads enable row level security;

-- Defence in depth: anonymous visitors get nothing except what is granted below.
revoke all on all tables in schema public from anon;
grant select on public.plan_entitlements to anon;
grant insert on public.leads to anon;
revoke execute on all functions in schema public from anon, public;
grant execute on function public.submit_intake(text, jsonb) to anon, authenticated;
grant execute on function public.intake_form_public(text) to anon, authenticated;
grant execute on function public.org_is_active(uuid) to anon, authenticated;
grant execute on function
  public.member_role(uuid), public.is_member(uuid), public.is_admin(uuid), public.is_manager(uuid),
  public.can_write(uuid), public.org_has_feature(uuid, text), public.shares_org_with(uuid),
  public.create_organization(text, text), public.accept_invitation(text), public.invitation_info(text)
  to authenticated;

-- Billing fields are written only by the server (service role) from Stripe webhooks.
revoke update on public.organizations from authenticated;
grant update (name, industry) on public.organizations to authenticated;
revoke insert, delete on public.organizations from authenticated;
revoke insert on public.memberships from authenticated;
revoke update on public.memberships from authenticated;
grant update (role) on public.memberships to authenticated;
revoke insert, update, delete on public.plan_entitlements from authenticated;
revoke select, update, delete on public.leads from authenticated;

create policy "plans readable" on public.plan_entitlements for select using (true);

create policy "profiles: self or teammates" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_org_with(id));
create policy "profiles: update self" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "orgs: members read" on public.organizations for select to authenticated
  using (public.is_member(id));
create policy "orgs: admins rename" on public.organizations for update to authenticated
  using (public.is_admin(id)) with check (public.is_admin(id));

create policy "memberships: members read" on public.memberships for select to authenticated
  using (public.is_member(organization_id));
create policy "memberships: admins change roles" on public.memberships for update to authenticated
  using (public.is_admin(organization_id) and role <> 'owner')
  with check (public.is_admin(organization_id) and role <> 'owner');
create policy "memberships: admins remove, members leave" on public.memberships for delete to authenticated
  using ((public.is_admin(organization_id) and role <> 'owner') or (user_id = (select auth.uid()) and role <> 'owner'));

create policy "invitations: admins manage" on public.invitations for all to authenticated
  using (public.is_admin(organization_id)) with check (public.is_admin(organization_id));

create policy "blueprints: members read" on public.blueprints for select to authenticated
  using (public.is_member(organization_id));
create policy "blueprints: admins write" on public.blueprints for update to authenticated
  using (public.is_admin(organization_id)) with check (public.is_admin(organization_id));

-- Generic tenant tables: members read, writers write.
do $$
declare t text;
begin
  foreach t in array array['programs', 'projects', 'phases', 'tasks', 'task_comments', 'item_updates'] loop
    execute format('create policy "%1$s: members read" on public.%1$I for select to authenticated using (public.is_member(organization_id))', t);
    execute format('create policy "%1$s: writers insert" on public.%1$I for insert to authenticated with check (public.can_write(organization_id))', t);
    execute format('create policy "%1$s: writers update" on public.%1$I for update to authenticated using (public.can_write(organization_id)) with check (public.can_write(organization_id))', t);
    execute format('create policy "%1$s: writers delete" on public.%1$I for delete to authenticated using (public.can_write(organization_id))', t);
  end loop;
end $$;

-- Premium-and-up tables: writes also require the plan feature.
do $$
declare
  r record;
begin
  for r in select * from (values
    ('people', 'resources'), ('allocations', 'resources'), ('sprints', 'agile'),
    ('intake_forms', 'intake'), ('backlog_items', 'portfolio'),
    ('meetings', 'meetings'), ('raid_items', 'raid')
  ) as v(tbl, feature) loop
    execute format('create policy "%1$s: members read" on public.%1$I for select to authenticated using (public.is_member(organization_id))', r.tbl);
    execute format('create policy "%1$s: writers insert" on public.%1$I for insert to authenticated with check (public.can_write(organization_id) and public.org_has_feature(organization_id, %2$L))', r.tbl, r.feature);
    execute format('create policy "%1$s: writers update" on public.%1$I for update to authenticated using (public.can_write(organization_id)) with check (public.can_write(organization_id) and public.org_has_feature(organization_id, %2$L))', r.tbl, r.feature);
    execute format('create policy "%1$s: writers delete" on public.%1$I for delete to authenticated using (public.can_write(organization_id))', r.tbl);
  end loop;
end $$;

-- Time entries are personal: you see and edit your own; managers see the team's.
create policy "time: own or managers read" on public.time_entries for select to authenticated
  using (user_id = (select auth.uid()) or public.is_manager(organization_id));
create policy "time: own insert" on public.time_entries for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_write(organization_id));
create policy "time: own update" on public.time_entries for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and public.can_write(organization_id));
create policy "time: own delete" on public.time_entries for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "leads: anyone can submit" on public.leads for insert to anon, authenticated with check (true);
