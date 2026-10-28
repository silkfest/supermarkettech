-- What a technician sees, and the zones they choose to watch.

-- A technician's board is their own work: calls nobody has taken, plus theirs.
-- Hiding rows in the page would not be a restriction, so the policy decides.
-- Admins, dispatchers and viewers still see the whole board.
drop policy job_read on public.dispatch_jobs;
create policy job_read on public.dispatch_jobs for select to authenticated
 using (
  public.dispatch_role(company_id) in ('admin','dispatcher','viewer')
  or (
   public.dispatch_role(company_id) = 'technician'
   and (assigned_to is null or assigned_to = auth.uid())
  )
 );

-- The zones a member watches. The saved list is their default: it is what the
-- board opens with. Empty means every zone.
create table public.dispatch_zone_preferences (
 company_id uuid not null references public.companies(id),
 user_id uuid not null references auth.users(id),
 zones integer[] not null default '{}',
 updated_at timestamptz not null default now(),
 primary key (company_id, user_id),
 foreign key (company_id, user_id) references public.company_memberships(company_id, user_id)
);

-- PostgREST is reachable with the member's own token, so the codes are checked
-- here rather than only in the page: an array cannot carry a foreign key.
create function public.guard_zone_preference() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if new.user_id <> auth.uid() then
  raise exception 'A preference names its own owner' using errcode='42501';
 end if;
 -- Alias the unnested column explicitly: a bare `code` here binds to
 -- dispatch_zones.code in the inner scope and compares the column to itself,
 -- which passes every time and validates nothing.
 if exists (
  select 1 from unnest(new.zones) as wanted(code)
  where not exists (
   select 1 from public.dispatch_zones z
   where z.company_id = new.company_id and z.code = wanted.code
  )
 ) then raise exception 'Unknown zone for this company' using errcode='23503'; end if;
 new.updated_at := now();
 return new;
end $$;
revoke all on function public.guard_zone_preference() from public, anon, authenticated;
create trigger guard_zone_preference before insert or update on public.dispatch_zone_preferences
 for each row execute function public.guard_zone_preference();

alter table public.dispatch_zone_preferences enable row level security;
-- A preference is private: yours to read and yours to change, nobody else's.
create policy zone_pref_read on public.dispatch_zone_preferences for select to authenticated
 using (user_id = auth.uid() and public.dispatch_role(company_id) is not null);
create policy zone_pref_write on public.dispatch_zone_preferences for insert to authenticated
 with check (user_id = auth.uid() and public.dispatch_role(company_id) is not null);
create policy zone_pref_update on public.dispatch_zone_preferences for update to authenticated
 using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select on public.dispatch_zone_preferences to anon, authenticated;
grant insert, update on public.dispatch_zone_preferences to authenticated;
grant all privileges on public.dispatch_zone_preferences to service_role;
