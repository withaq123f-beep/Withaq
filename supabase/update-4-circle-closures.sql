-- حلقة لم تُعقد في يوم (اعتذار المعلمة أو إجازة): لا يُسجَّل غياب للطالبات
create table if not exists public.circle_closures (
  id           bigint generated always as identity primary key,
  circle_id    bigint not null references public.circles(id) on delete cascade,
  closure_date date not null,
  reason       text not null check (reason in ('teacher_excused','leave')),
  note         text,
  recorded_by  uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (circle_id, closure_date)
);
alter table public.circle_closures enable row level security;
drop policy if exists closures_select on public.circle_closures;
create policy closures_select on public.circle_closures for select using (public.is_staff() or public.can_manage_circle(circle_id));
drop policy if exists closures_write on public.circle_closures;
create policy closures_write on public.circle_closures for all using (public.can_manage_circle(circle_id)) with check (public.can_manage_circle(circle_id));
