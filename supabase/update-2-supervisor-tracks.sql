-- =====================================================================
--  ترقية: مسؤولة المسار تشرف على أكثر من مسار
--  مسارها الأساسي يبقى في profiles.track_id (الذي اختارته عند التسجيل)،
--  وتُسنِد القائدة لها المسارات الأخرى بعد التفعيل في profiles.track_ids.
--  آمن لإعادة التشغيل.
-- =====================================================================
alter table public.profiles add column if not exists track_ids bigint[] not null default '{}';

-- كل مسارات مسؤولة المسار الحالية (الأساسي + المُسنَدة)؛ فارغة لغيرها
create or replace function public.my_tracks() returns bigint[]
language sql stable security definer set search_path = public as $$
  select coalesce((
    select array(select distinct x from unnest(array_append(coalesce(track_ids, '{}'::bigint[]), track_id)) x where x is not null)
    from public.profiles where id = auth.uid() and role = 'supervisor'
  ), '{}'::bigint[])
$$;
revoke execute on function public.my_tracks() from public, anon;
grant execute on function public.my_tracks() to authenticated;

create or replace function public.can_manage_circle(cid bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.circles c
    join public.profiles p on p.id = auth.uid()
    where c.id = cid and (
      p.role = 'admin'
      or (p.role = 'supervisor' and c.track_id = any(public.my_tracks()))
      or (p.role = 'teacher' and c.teacher_id = p.id)
    )
  )
$$;

-- لا تُسنِد مسؤولةُ مسارٍ لنفسها مسارات: الإسناد للقائدة وحدها
create or replace function public.protect_profile_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() and coalesce(current_setting('withaq.bypass', true), '') <> '1' then
    new.role := old.role; new.track_id := old.track_id; new.track_ids := old.track_ids; new.student_id := old.student_id;
    new.archived_role := old.archived_role; new.archived_track := old.archived_track;
  end if;
  return new;
end $$;
revoke execute on function public.protect_profile_role() from public, anon, authenticated;

-- مهام المسارات اليومية: لكل مسارات مسؤولة المسار
drop policy if exists tasks_write on public.daily_tasks;
create policy tasks_write on public.daily_tasks for all
  using (public.is_admin() or (public.my_role() = 'supervisor'
         and exists (select 1 from public.circles c where c.id = circle_id and c.track_id = any(public.my_tracks()))
         and public.task_open(task_date)))
  with check (public.is_admin() or (public.my_role() = 'supervisor'
         and exists (select 1 from public.circles c where c.id = circle_id and c.track_id = any(public.my_tracks()))
         and public.task_open(task_date)));

-- أرشفة مشرفة حلقات: لمسؤولة المسار إن كانت كل حلقات المشرفة ضمن مساراتها
create or replace function public.set_account_archived(uid uuid, archive boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  t public.profiles%rowtype;
  me_role text := public.my_role();
  me_tracks bigint[] := public.my_tracks();
  their_track bigint;
begin
  select * into t from public.profiles where id = uid;
  if not found then raise exception 'not found'; end if;
  if uid = auth.uid() then raise exception 'cannot archive yourself'; end if;
  select c.track_id into their_track from public.circles c where c.teacher_id = uid limit 1;
  if me_role = 'admin' then null;
  elsif me_role = 'supervisor' then
    if archive then
      if not (t.role in ('teacher', 'pending')
              and exists (select 1 from public.circles c where c.teacher_id = uid and c.track_id = any(me_tracks))
              and not exists (select 1 from public.circles c where c.teacher_id = uid and not (c.track_id = any(me_tracks))))
      then raise exception 'permission denied'; end if;
    else
      if not (t.role = 'disabled' and t.archived_track = any(me_tracks) and coalesce(t.archived_role, 'teacher') in ('teacher', 'pending')) then raise exception 'permission denied'; end if;
    end if;
  else raise exception 'permission denied';
  end if;
  perform set_config('withaq.bypass', '1', true);
  if archive then
    if t.role <> 'disabled' then
      update public.profiles set archived_role = t.role, archived_track = coalesce(their_track, t.track_id, me_tracks[1]), role = 'disabled' where id = uid;
      update public.circles set teacher_id = null where teacher_id = uid;
    end if;
  elsif t.role = 'disabled' then
    update public.profiles set role = coalesce(t.archived_role, 'pending'), archived_role = null, archived_track = null where id = uid;
  end if;
  perform set_config('withaq.bypass', '', true);
end $$;
revoke execute on function public.set_account_archived(uuid, boolean) from public, anon;
grant execute on function public.set_account_archived(uuid, boolean) to authenticated;
