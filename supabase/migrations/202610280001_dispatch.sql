-- Additive dispatch foundation. Existing ColdIQ tables are intentionally untouched.
begin;
create table public.companies (
 id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique
);
create table public.company_memberships (
 company_id uuid not null references public.companies(id),
 user_id uuid not null references auth.users(id),
 display_name text not null,
 role text not null check (role in ('admin','dispatcher','technician','viewer')),
 active boolean not null default true,
 primary key (company_id,user_id)
);
create table public.dispatch_zones (
 company_id uuid not null references public.companies(id), code integer not null,
 name text not null, primary key(company_id,code)
);
create table public.dispatch_priorities (
 company_id uuid not null references public.companies(id), level integer not null check(level between 1 and 4),
 label text not null, emergency boolean not null default false,
 response_hours integer check(response_hours > 0), overtime_approved boolean not null default false,
 primary key(company_id,level)
);
-- Membership checks run as the owner to avoid recursive RLS on memberships.
create function public.dispatch_role(tenant uuid) returns text
language sql stable security definer set search_path = '' as $$
 select role from public.company_memberships where company_id=tenant and user_id=auth.uid() and active
$$;
revoke all on function public.dispatch_role(uuid) from public;
grant execute on function public.dispatch_role(uuid) to authenticated;
create table public.dispatch_jobs (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id),
 store_name text not null check(length(trim(store_name)) between 1 and 200),
 store_number text not null default '', address text not null check(length(trim(address)) between 1 and 500),
 contact_name text not null default '', contact_phone text not null default '',
 simpro_reference text not null default '', customer_reference text not null default '',
 reason text not null check(length(trim(reason)) between 1 and 5000),
 trade text not null check(trade in ('HVAC','Refrigeration')),
 zone integer not null, priority integer not null,
 assigned_to uuid,
 status text not null default 'open' check(status in ('open','in_progress','completed','cancelled')),
 overtime_status text not null default 'not_requested' check(overtime_status in ('not_requested','requested','approved','declined')),
 overtime_decided_by uuid references auth.users(id), overtime_decided_at timestamptz,
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 version integer not null default 1,
 foreign key(company_id,zone) references public.dispatch_zones(company_id,code),
 foreign key(company_id,priority) references public.dispatch_priorities(company_id,level),
 foreign key(company_id,assigned_to) references public.company_memberships(company_id,user_id)
);
create index dispatch_jobs_company_created on public.dispatch_jobs(company_id,created_at desc);
create index company_memberships_user on public.company_memberships(user_id) where active;
create function public.guard_dispatch_job() returns trigger
language plpgsql security definer set search_path = '' as $$
declare automatic_ot boolean;
begin
 if TG_OP='UPDATE' then
  if new.company_id<>old.company_id or new.id<>old.id or new.created_by<>old.created_by or new.created_at<>old.created_at then
   raise exception 'Job identity cannot change' using errcode='23514';
  end if;
  new.version := old.version+1;
 else
  new.created_by := auth.uid(); new.version := 1;
 end if;
 if new.assigned_to is not null and not exists (
  select 1 from public.company_memberships where company_id=new.company_id and user_id=new.assigned_to and active and role='technician'
 ) then raise exception 'Choose an active technician in this company' using errcode='23514'; end if;
 select overtime_approved into automatic_ot from public.dispatch_priorities where company_id=new.company_id and level=new.priority;
 -- Re-evaluate OT on priority changes; never carry automatic approval to a normal call.
 if automatic_ot then
  new.overtime_status := 'approved'; new.overtime_decided_by := null; new.overtime_decided_at := null;
 else
  if TG_OP='UPDATE' and new.priority<>old.priority then new.overtime_status := 'not_requested'; end if;
  if TG_OP='INSERT' or new.overtime_status is distinct from old.overtime_status or new.priority is distinct from old.priority then
   if new.overtime_status in ('approved','declined') then
    if public.dispatch_role(new.company_id) is distinct from 'admin' then raise exception 'Company admin must decide overtime' using errcode='42501'; end if;
    new.overtime_decided_by := auth.uid(); new.overtime_decided_at := now();
   else new.overtime_decided_by := null; new.overtime_decided_at := null;
   end if;
  else
   new.overtime_decided_by := old.overtime_decided_by; new.overtime_decided_at := old.overtime_decided_at;
  end if;
 end if;
 new.updated_at := now();
 return new;
end $$;
create trigger guard_dispatch_job before insert or update on public.dispatch_jobs for each row execute function public.guard_dispatch_job();
-- A trigger function needs no EXECUTE grant to fire, so close its RPC endpoint.
revoke all on function public.guard_dispatch_job() from public, anon, authenticated;

alter table public.companies enable row level security;
alter table public.company_memberships enable row level security;
alter table public.dispatch_zones enable row level security;
alter table public.dispatch_priorities enable row level security;
alter table public.dispatch_jobs enable row level security;
create policy company_read on public.companies for select to authenticated using(public.dispatch_role(id) is not null);
create policy membership_read on public.company_memberships for select to authenticated using(public.dispatch_role(company_id) is not null);
create policy zone_read on public.dispatch_zones for select to authenticated using(public.dispatch_role(company_id) is not null);
create policy priority_read on public.dispatch_priorities for select to authenticated using(public.dispatch_role(company_id) is not null);
create policy job_read on public.dispatch_jobs for select to authenticated using(public.dispatch_role(company_id) is not null);
create policy job_create on public.dispatch_jobs for insert to authenticated with check(public.dispatch_role(company_id) in ('admin','dispatcher'));
create policy job_update on public.dispatch_jobs for update to authenticated using(public.dispatch_role(company_id) in ('admin','dispatcher')) with check(public.dispatch_role(company_id) in ('admin','dispatcher'));
-- No client membership/config writes or deletes. Provisioning is a trusted database operation.
grant select on public.companies,public.company_memberships,public.dispatch_zones,public.dispatch_priorities,public.dispatch_jobs to anon,authenticated;
grant insert,update on public.dispatch_jobs to authenticated;
grant all privileges on public.companies,public.company_memberships,public.dispatch_zones,public.dispatch_priorities,public.dispatch_jobs to service_role;

insert into public.companies(name,slug) values ('Major Refrigeration','major-refrigeration');
insert into public.dispatch_zones(company_id,code,name)
 select c.id,z.code,z.name from public.companies c cross join (values
 (1,'Niagara–Mississauga'),(2,'Toronto/North'),(3,'London/Kitchener'),(4,'Windsor'),(5,'New Brunswick'),(6,'Nova Scotia')
 ) z(code,name) where c.slug='major-refrigeration';
insert into public.dispatch_priorities(company_id,level,label,emergency,response_hours,overtime_approved)
 select c.id,p.level,p.label,p.emergency,p.hours,p.emergency from public.companies c cross join (values
 (1,'LVL 1',true,2),(2,'LVL 2',true,4),(3,'LVL 3',false,null::integer),(4,'LVL 4',false,null::integer)
 ) p(level,label,emergency,hours) where c.slug='major-refrigeration';
commit;
