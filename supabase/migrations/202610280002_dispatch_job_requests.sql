-- Technicians asking for a call. Additive: dispatch_jobs and its guard trigger
-- are untouched, so assignment stays a dispatcher's decision — a request only
-- records that a technician wants the call.
create table public.dispatch_job_requests (
 job_id uuid not null references public.dispatch_jobs(id) on delete cascade,
 company_id uuid not null references public.companies(id),
 user_id uuid not null references auth.users(id),
 note text not null default '' check (length(note) <= 500),
 created_at timestamptz not null default now(),
 primary key (job_id, user_id),
 -- Asking for a call means being an active member of the company that owns it.
 foreign key (company_id, user_id) references public.company_memberships(company_id, user_id)
);
create index dispatch_job_requests_job on public.dispatch_job_requests(job_id);

-- The row must name its own author, belong to a technician of that company, and
-- point at a job in the same company — a request cannot be filed for someone
-- else, by a dispatcher, or across tenants.
create function public.guard_job_request() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if new.user_id <> auth.uid() then
  raise exception 'A request names its own author' using errcode='42501';
 end if;
 if public.dispatch_role(new.company_id) is distinct from 'technician' then
  raise exception 'Only technicians ask for calls' using errcode='42501';
 end if;
 if not exists (
  select 1 from public.dispatch_jobs j
  where j.id = new.job_id and j.company_id = new.company_id
 ) then raise exception 'That call is not in this company' using errcode='23503'; end if;
 return new;
end $$;
revoke all on function public.guard_job_request() from public, anon, authenticated;
create trigger guard_job_request before insert or update on public.dispatch_job_requests
 for each row execute function public.guard_job_request();

alter table public.dispatch_job_requests enable row level security;
-- Everyone on the board sees who asked, so a dispatcher can act on it.
create policy job_request_read on public.dispatch_job_requests for select to authenticated
 using (public.dispatch_role(company_id) is not null);
create policy job_request_create on public.dispatch_job_requests for insert to authenticated
 with check (user_id = auth.uid() and public.dispatch_role(company_id) = 'technician');
-- A technician may withdraw their own; a dispatcher may clear one once actioned.
create policy job_request_delete on public.dispatch_job_requests for delete to authenticated
 using (
  user_id = auth.uid()
  or public.dispatch_role(company_id) in ('admin','dispatcher')
 );

grant select on public.dispatch_job_requests to anon, authenticated;
grant insert, delete on public.dispatch_job_requests to authenticated;
grant all privileges on public.dispatch_job_requests to service_role;
