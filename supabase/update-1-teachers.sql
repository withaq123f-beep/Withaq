-- =====================================================================
--  تحديث ١: معلِّمات الحلقات بلا حسابات دخول
--  شغِّليه مرة واحدة في Supabase ← SQL Editor ← New query ← Run
--  آمن: لا يحذف أي بيانات، ويمكن تشغيله أكثر من مرة
-- =====================================================================

-- جدول المعلِّمات (بيانات فقط)
create table if not exists public.teachers (
  id          bigint generated always as identity primary key,
  full_name   text not null,
  phone       text,
  notes       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ربط كل حلقة بمعلِّمتها
alter table public.circles add column if not exists teacher_ref bigint references public.teachers(id) on delete set null;

-- نقل أسماء المعلِّمات المكتوبة سابقًا في الحلقات إلى الجدول الجديد
insert into public.teachers (full_name)
select distinct trim(c.teacher_name) from public.circles c
where coalesce(trim(c.teacher_name), '') <> ''
  and not exists (select 1 from public.teachers t where t.full_name = trim(c.teacher_name));

update public.circles c set teacher_ref = t.id
from public.teachers t
where c.teacher_ref is null and coalesce(trim(c.teacher_name), '') <> '' and t.full_name = trim(c.teacher_name);

-- الصلاحيات: يقرأ الكادر، وتدير القائدة ومسؤولات المسارات
alter table public.teachers enable row level security;
drop policy if exists teachers_select on public.teachers;
create policy teachers_select on public.teachers for select using (public.is_staff());
drop policy if exists teachers_write on public.teachers;
create policy teachers_write on public.teachers for all
  using (public.my_role() in ('admin','supervisor')) with check (public.my_role() in ('admin','supervisor'));
