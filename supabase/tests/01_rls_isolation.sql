-- LOCAL TEST ONLY: proves company data separation, roles and plan limits.
-- Run with: npm run test:db   (see scripts/test-db.sh)
\set ON_ERROR_STOP on
\set QUIET on

create or replace function public.t_assert(p_ok boolean, p_msg text) returns void language plpgsql as $$
begin
  if p_ok is distinct from true then raise exception 'ASSERTION FAILED: %', p_msg; end if;
  raise notice 'ok - %', p_msg;
end $$;
grant execute on function public.t_assert(boolean, text) to authenticated, anon;

-- Returns true if the statement fails (e.g. RLS or privilege error).
create or replace function public.t_fails(p_sql text) returns boolean language plpgsql as $$
begin
  execute p_sql;
  return false;
exception when others then
  return true;
end $$;
grant execute on function public.t_fails(text) to authenticated, anon;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@alpha.test', '{"full_name":"Alice"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@beta.test', '{"full_name":"Bob"}'),
  ('00000000-0000-0000-0000-00000000000c', 'carol@guest.test', '{}');

select public.t_assert((select count(*) = 3 from public.profiles), 'profiles are created on sign-up');

-- Alice creates company Alpha --------------------------------------------------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","email":"alice@alpha.test","role":"authenticated"}', false);
select public.create_organization('Alpha Engineering BV', 'engineering') as org_a \gset

update public.blueprints set config = '{"scoring":{"scale":3,"criteria":[
  {"key":"safety","label":"Safety","weight":25},
  {"key":"availability","label":"Availability","weight":50},
  {"key":"compliance","label":"Compliance","weight":20},
  {"key":"energy","label":"Energy","weight":5}]}}'::jsonb
where organization_id = :'org_a';

insert into public.projects (organization_id, name) values (:'org_a', 'Transformer replacement') returning id as project_a \gset
insert into public.tasks (organization_id, project_id, title) values (:'org_a', :'project_a', 'Write SOW');
insert into public.backlog_items (organization_id, title, scores)
  values (:'org_a', 'UPS battery end of life', '{"safety":2,"availability":3,"compliance":3,"energy":1}');
insert into public.backlog_items (organization_id, title, scores)
  values (:'org_a', 'Sprinkler remediation', '{"safety":3,"availability":3,"compliance":3,"energy":3}');
insert into public.time_entries (organization_id, started_at, ended_at)
  values (:'org_a', now() - interval '90 minutes', now());

select public.t_assert((select count(*) = 1 from public.organizations), 'Alice sees her company');
select public.t_assert((select role = 'owner' from public.memberships where organization_id = :'org_a'), 'Alice is owner');
select public.t_assert((select array_agg(number order by number) = '{1,2}' from public.backlog_items), 'backlog items are numbered 1, 2');
select public.t_assert((select score = 26.5 from public.backlog_items where number = 1), 'weighted score 2x2.5 + 3x5 + 3x2 + 1x0.5 = 26.5');
select public.t_assert((select score = 30 from public.backlog_items where number = 2), 'max score is 30');
select public.t_assert((select minutes = 90 from public.time_entries), 'time entry minutes are computed');
select public.t_assert(public.t_fails($$update public.organizations set plan = 'gold'$$), 'owner cannot upgrade the plan without paying');
select public.t_assert(public.t_fails($$update public.organizations set trial_ends_at = now() + interval '10 years'$$), 'owner cannot extend the trial');
select public.t_assert(public.t_fails(format($$insert into public.memberships (organization_id, user_id, role) values (%L, '00000000-0000-0000-0000-00000000000b', 'admin')$$, :'org_a')), 'members cannot be inserted directly');

insert into public.invitations (organization_id, email, role) values (:'org_a', 'bob@beta.test', 'member') returning token as bob_token \gset
insert into public.invitations (organization_id, email, role) values (:'org_a', 'carol@guest.test', 'guest') returning token as carol_token \gset

-- Bob, in his own company Beta, must see nothing of Alpha -----------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","email":"bob@beta.test","role":"authenticated"}', false);
select public.create_organization('Beta Consulting', null) as org_b \gset

select public.t_assert((select count(*) = 1 from public.organizations), 'Bob sees only his own company');
select public.t_assert((select count(*) = 0 from public.projects), 'Bob sees no Alpha projects');
select public.t_assert((select count(*) = 0 from public.tasks), 'Bob sees no Alpha tasks');
select public.t_assert((select count(*) = 0 from public.backlog_items), 'Bob sees no Alpha backlog');
select public.t_assert((select count(*) = 0 from public.time_entries), 'Bob sees no Alpha time entries');
select public.t_assert((select count(*) = 0 from public.invitations), 'Bob sees no Alpha invitations');
select public.t_assert((select count(*) = 1 from public.profiles), 'Bob sees only his own profile');
select public.t_assert(public.t_fails(format($$insert into public.tasks (organization_id, title) values (%L, 'sneaky')$$, :'org_a')), 'Bob cannot write into Alpha');
update public.tasks set title = 'hacked' where organization_id = :'org_a';
select public.t_assert(public.t_fails(format($$select public.accept_invitation(%L)$$, :'carol_token')), 'Bob cannot use an invitation sent to someone else');

-- Bob accepts his invitation and joins Alpha as a member ------------------------
select public.accept_invitation(:'bob_token');
select public.t_assert((select count(*) = 2 from public.organizations), 'after joining, Bob sees both companies');
select public.t_assert((select title = 'Write SOW' from public.tasks where organization_id = :'org_a'), 'the earlier update by an outsider changed nothing');
select public.t_assert((select count(*) = 0 from public.time_entries where organization_id = :'org_a'), 'members do not see other people''s time entries');
select public.t_assert(public.t_fails(format($$update public.memberships set role = 'owner' where organization_id = %L$$, :'org_a')) or
  (select count(*) = 0 from public.memberships where organization_id = :'org_a' and user_id = '00000000-0000-0000-0000-00000000000b' and role = 'owner'),
  'a member cannot promote himself to owner');
insert into public.tasks (organization_id, project_id, title) values (:'org_a', :'project_a', 'Bob''s task');

-- Carol joins as a guest: read-only --------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","email":"carol@guest.test","role":"authenticated"}', false);
select public.accept_invitation(:'carol_token');
select public.t_assert((select count(*) = 2 from public.tasks), 'guest can read tasks');
select public.t_assert(public.t_fails(format($$insert into public.tasks (organization_id, title) values (%L, 'guest task')$$, :'org_a')), 'guest cannot create tasks');

-- Anonymous visitor ------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '', false);
insert into public.intake_forms (organization_id, slug, title) values (:'org_a', 'alpha-intake', 'Raise a request');
set role anon;
select public.t_assert(public.submit_intake('alpha-intake', '{"title":"Water ingress at substation","source":"incident","business_impact":"high"}') = 'BL-003', 'public intake creates BL-003');
select public.t_assert(public.t_fails($$select * from public.tasks$$), 'anonymous visitors cannot read tasks');
select public.t_assert(public.t_fails($$select * from public.organizations$$), 'anonymous visitors cannot read companies');
insert into public.leads (name, email, message) values ('Visitor', 'v@example.test', 'Interested');
select public.t_assert(public.t_fails($$select * from public.leads$$), 'anonymous visitors cannot read leads');

-- Plan limits -------------------------------------------------------------------
reset role;
update public.organizations set plan = 'basic', subscription_status = 'active' where id = :'org_a';
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","email":"alice@alpha.test","role":"authenticated"}', false);
insert into public.tasks (organization_id, title) values (:'org_a', 'Basic plan task');
select public.t_assert(public.t_fails(format($$insert into public.backlog_items (organization_id, title) values (%L, 'needs Premium')$$, :'org_a')), 'Basic plan cannot use the portfolio backlog');
select public.t_assert((select count(*) = 1 from public.time_entries), 'owner still sees own time entry');

reset role;
update public.organizations set plan = 'trial', subscription_status = 'trialing', trial_ends_at = now() - interval '1 day' where id = :'org_a';
set role authenticated;
select public.t_assert(public.t_fails(format($$insert into public.tasks (organization_id, title) values (%L, 'after trial')$$, :'org_a')), 'expired trial is read-only');
select public.t_assert((select count(*) >= 3 from public.tasks where organization_id = :'org_a'), 'expired trial can still read its data');

reset role;
\echo 'ALL DATABASE TESTS PASSED'
