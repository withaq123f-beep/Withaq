-- =====================================================================
--  حلقات وثاق القرآنية — قاعدة البيانات
--  انسخي هذا الملف كاملًا في Supabase ← SQL Editor ← New query ← Run
--  (يُشغَّل مرة واحدة على مشروع جديد)
-- =====================================================================

-- ---------- الحسابات ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  username    text unique not null,
  role        text not null default 'pending'
              check (role in ('admin','supervisor','teacher','instructor','student','pending','disabled')),
              -- admin القائدة، supervisor مسؤولة مسار، teacher مشرفة حلقة، instructor معلِّمة حلقة، student طالبة
  track_id    bigint,               -- لمسؤولة المسار: مسارها
  student_id  bigint,               -- لحساب الطالبة: سجلُّها في جدول الطالبات
  requested_role text,              -- نوع الحساب الذي اختارته عند التسجيل
  phone       text,
  created_at  timestamptz not null default now()
);

-- ---------- المسارات والحلقات ----------
create table if not exists public.tracks (
  id          bigint generated always as identity primary key,
  name        text not null,
  description text,                 -- مثل: حفظ حُر، رواية حفص
  category    text,                 -- الفئة: ناشئة، أطفال، جامعيات، خاتمات
  circle_type text not null default 'memo_review'
              check (circle_type in ('memo_review','fixation','unified')), -- حفظ ومراجعة / تثبيت / حفظ موحد
  days        int[] not null default '{0,1,2,3}', -- أيام الحلقات: 0 الأحد … 6 السبت
  card_items  text[] not null default '{}',      -- بنود بطاقة الحضور في الواتساب، كل بند ناقص = تقصير
  sard_day    int check (sard_day between 0 and 6), -- يوم السرد الأسبوعي الإلزامي (4 الخميس، 3 الأربعاء)، فارغ = غير مطالَب
  entry_mode  text not null default 'daily' check (entry_mode in ('daily','weekly')), -- بطاقة يومية، أو أسبوعية يوم السرد
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.profiles
  drop constraint if exists profiles_track_fk,
  add constraint profiles_track_fk foreign key (track_id) references public.tracks(id) on delete set null;

-- معلِّمات الحلقات: بيانات فقط بلا حسابات دخول
create table if not exists public.teachers (
  id          bigint generated always as identity primary key,
  full_name   text not null,
  phone       text,
  notes       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.circles (
  id          bigint generated always as identity primary key,
  name        text not null,
  track_id    bigint not null references public.tracks(id) on delete restrict,
  teacher_id  uuid references public.profiles(id) on delete set null, -- مشرفة الحلقة (تُدخل البيانات)
  teacher_name text,                -- اسم معلِّمة الحلقة (إن لم يكن لها حساب)
  instructor_id uuid references public.profiles(id) on delete set null, -- (قديم، غير مستخدم)
  teacher_ref bigint references public.teachers(id) on delete set null, -- معلِّمة الحلقة من جدول المعلِّمات
  schedule    text,                 -- الوقت، مثل: بعد العصر
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------- الطالبات ----------
create table if not exists public.students (
  id             bigint generated always as identity primary key,
  full_name      text not null,
  phone          text,
  guardian_phone text,
  birth_year     int,
  notes          text,
  joined_at      date not null default current_date,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

alter table public.profiles
  drop constraint if exists profiles_student_fk,
  add constraint profiles_student_fk foreign key (student_id) references public.students(id) on delete set null;

-- التحاق الطالبة بحلقة (يمكن أن تكون في أكثر من حلقة)
create table if not exists public.enrollments (
  id          bigint generated always as identity primary key,
  student_id  bigint not null references public.students(id) on delete cascade,
  circle_id   bigint not null references public.circles(id) on delete cascade,
  active      boolean not null default true,
  started_at  date not null default current_date,
  ended_at    date,
  created_at  timestamptz not null default now()
);
create unique index if not exists enrollments_one_active
  on public.enrollments(student_id, circle_id) where active;

-- ---------- السجل اليومي ----------
create table if not exists public.daily_records (
  id               bigint generated always as identity primary key,
  enrollment_id    bigint not null references public.enrollments(id) on delete cascade,
  record_date      date not null,
  attendance       text not null check (attendance in ('present','late','absent','excused')),
  memo_from_surah  int check (memo_from_surah between 1 and 114),
  memo_from_ayah   int,
  memo_to_surah    int check (memo_to_surah between 1 and 114),
  memo_to_ayah     int,
  review_from_surah int check (review_from_surah between 1 and 114),
  review_from_ayah  int,
  review_to_surah   int check (review_to_surah between 1 and 114),
  review_to_ayah    int,
  grade            text check (grade in ('excellent','good','repeat')),
  memo_pages       numeric,          -- مقدار الحفظ بالأوجه (من البطاقة)
  review_pages     numeric,          -- مقدار المراجعة بالأوجه
  card             jsonb,            -- بنود البطاقة كما كُتبت: [{label, value, ok}]
  shortcoming      boolean not null default false,
  shortcoming_items text[],          -- البنود التي أخلَّت بها الطالبة
  note             text,
  entered_by       uuid references public.profiles(id) on delete set null,
  updated_at       timestamptz not null default now(),
  unique (enrollment_id, record_date)
);
create index if not exists daily_records_date on public.daily_records(record_date);

-- ---------- حضور المعلِّمات ----------
create table if not exists public.staff_attendance (
  id           bigint generated always as identity primary key,
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  record_date  date not null,
  status       text not null check (status in ('present','late','absent','excused')),
  note         text,
  recorded_by  uuid references public.profiles(id) on delete set null,
  updated_at   timestamptz not null default now(),
  unique (profile_id, record_date)
);

-- ---------- السرد الأسبوعي الإلزامي ----------
-- من لم تسرد أسبوعين متتاليين تصل حدَّ الحذف من المقرأة
create table if not exists public.weekly_sard (
  id             bigint generated always as identity primary key,
  enrollment_id  bigint not null references public.enrollments(id) on delete cascade,
  sard_date      date not null,
  done           boolean not null,
  note           text,
  recorded_by    uuid references public.profiles(id) on delete set null,
  updated_at     timestamptz not null default now(),
  unique (enrollment_id, sard_date)
);
create index if not exists weekly_sard_date on public.weekly_sard(sard_date);

-- ---------- المهام اليومية لمسؤولة المسار ----------
-- لكل حلقة في كل يوم: عدد الحاضرات والغائبات والمعتذرات.
-- تُغلق مهام اليوم الساعة ٥ صباحًا بتوقيت مكة من اليوم التالي.
create table if not exists public.daily_tasks (
  id             bigint generated always as identity primary key,
  circle_id      bigint not null references public.circles(id) on delete cascade,
  task_date      date not null,
  present_count  int not null check (present_count >= 0),
  absent_count   int not null check (absent_count >= 0),
  excused_count  int not null check (excused_count >= 0),
  done_by        uuid references public.profiles(id) on delete set null,
  updated_at     timestamptz not null default now(),
  unique (circle_id, task_date)
);
create index if not exists daily_tasks_date on public.daily_tasks(task_date);

-- =====================================================================
--  دوال مساعدة للصلاحيات
-- =====================================================================
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.my_track() returns bigint
language sql stable security definer set search_path = public as $$
  select track_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('admin','supervisor','teacher') from public.profiles where id = auth.uid()), false)
$$;

-- أي حساب مفعَّل (بما فيه المعلِّمة والطالبة)
create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('admin','supervisor','teacher','instructor','student') from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.my_student_id() returns bigint
language sql stable security definer set search_path = public as $$
  select student_id from public.profiles where id = auth.uid() and role = 'student'
$$;

-- هل تُدرِّس المعلِّمة الحالية في هذه الحلقة؟
create or replace function public.teaches_circle(cid bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.circles c join public.profiles p on p.id = auth.uid()
                 where c.id = cid and p.role = 'instructor' and c.instructor_id = p.id)
$$;

-- هل يحق للمستخدمة التعامل مع هذه الحلقة؟
create or replace function public.can_manage_circle(cid bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.circles c
    join public.profiles p on p.id = auth.uid()
    where c.id = cid and (
      p.role = 'admin'
      or (p.role = 'supervisor' and c.track_id = p.track_id)
      or (p.role = 'teacher' and c.teacher_id = p.id)
    )
  )
$$;

create or replace function public.can_manage_enrollment(eid bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select public.can_manage_circle((select circle_id from public.enrollments where id = eid))
$$;

-- إنشاء ملف تلقائي عند التسجيل. أوَّل حساب يُنشأ يصبح مديرة المقرأة.
-- الحلقات التي اختارتها المشرفة عند التسجيل
alter table public.profiles add column if not exists requested_circles bigint[];

-- قائمة المسارات والحلقات لصفحة التسجيل (أسماء فقط، قبل الدخول)
create or replace function public.signup_options() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'tracks', coalesce((select json_agg(json_build_object('id', t.id, 'name', t.name) order by t.sort_order, t.id) from public.tracks t), '[]'::json),
    'circles', coalesce((select json_agg(json_build_object('id', c.id, 'name', c.name, 'track_id', c.track_id, 'taken', c.teacher_id is not null) order by c.id)
                         from public.circles c where c.active), '[]'::json)
  )
$$;
grant execute on function public.signup_options() to anon, authenticated;

-- عند التسجيل: الدخول بالبريد، ودور القائدة لبريدها فقط (غيِّريه لمقرأة أخرى)،
-- ويُحفظ المسار لمسؤولة المسار، وتُربط المشرفة بحلقاتها الشاغرة مباشرة
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  req_role text := new.raw_user_meta_data->>'requested_role';
  req_track bigint;
  req_circles bigint[];
begin
  if coalesce(new.raw_user_meta_data->>'requested_track', '') ~ '^\d+$' then
    req_track := (new.raw_user_meta_data->>'requested_track')::bigint;
    if not exists (select 1 from public.tracks where id = req_track) then req_track := null; end if;
  end if;
  select array_agg(x::bigint) into req_circles
  from jsonb_array_elements_text(case when jsonb_typeof(new.raw_user_meta_data->'requested_circles') = 'array'
                                      then new.raw_user_meta_data->'requested_circles' else '[]'::jsonb end) x
  where x ~ '^\d+$';
  insert into public.profiles (id, full_name, username, role, requested_role, track_id, requested_circles)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
    lower(new.email),
    case when lower(new.email) = 'withaq123f@gmail.com' then 'admin' else 'pending' end,
    req_role,
    case when req_role = 'supervisor' then req_track end,
    case when req_role = 'teacher' then req_circles end
  );
  if req_role = 'teacher' and req_circles is not null then
    update public.circles set teacher_id = new.id where id = any(req_circles) and teacher_id is null;
  end if;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- منع غير المديرة من تغيير دورها بنفسها
create or replace function public.protect_profile_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    new.track_id := old.track_id;
    new.student_id := old.student_id;
  end if;
  return new;
end $$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- =====================================================================
--  سياسات الأمان (RLS)
-- =====================================================================
alter table public.profiles         enable row level security;
alter table public.tracks           enable row level security;
alter table public.circles          enable row level security;
alter table public.students         enable row level security;
alter table public.enrollments      enable row level security;
alter table public.daily_records    enable row level security;
alter table public.staff_attendance enable row level security;
alter table public.daily_tasks      enable row level security;
alter table public.weekly_sard      enable row level security;
alter table public.teachers         enable row level security;

-- الملفات: كل عضوة ترى ملفها، والكادر يرى الكادر، والمديرة تعدِّل الجميع
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_staff() or (public.is_member() and role not in ('student','pending','disabled')));
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles for delete
  using (public.is_admin());

-- المسارات والحلقات: يقرؤها الكادر، وتديرها المديرة
drop policy if exists tracks_select on public.tracks;
create policy tracks_select on public.tracks for select using (public.is_member());
drop policy if exists tracks_write on public.tracks;
create policy tracks_write on public.tracks for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists circles_select on public.circles;
create policy circles_select on public.circles for select using (public.is_member());
drop policy if exists circles_write on public.circles;
create policy circles_write on public.circles for all
  using (public.is_admin()) with check (public.is_admin());

-- الطالبات: يقرؤهن الكادر، وتضيف وتعدِّل المديرة والمشرفات
drop policy if exists students_select on public.students;
create policy students_select on public.students for select using (
  public.is_staff()
  or id = public.my_student_id()
  or exists (select 1 from public.enrollments e where e.student_id = students.id and public.teaches_circle(e.circle_id)));
drop policy if exists students_insert on public.students;
create policy students_insert on public.students for insert
  with check (public.my_role() in ('admin','supervisor'));
drop policy if exists students_update on public.students;
create policy students_update on public.students for update
  using (public.my_role() in ('admin','supervisor'));
drop policy if exists students_delete on public.students;
create policy students_delete on public.students for delete using (public.is_admin());

-- الالتحاق
drop policy if exists enroll_select on public.enrollments;
create policy enroll_select on public.enrollments for select using (
  public.is_staff() or student_id = public.my_student_id() or public.teaches_circle(circle_id));
drop policy if exists enroll_write on public.enrollments;
create policy enroll_write on public.enrollments for all
  using (public.my_role() in ('admin','supervisor') and public.can_manage_circle(circle_id))
  with check (public.my_role() in ('admin','supervisor') and public.can_manage_circle(circle_id));

-- السجل اليومي: يقرؤه الكادر، وتكتبه صاحبة الحلقة ومشرفتها والمديرة
drop policy if exists records_select on public.daily_records;
create policy records_select on public.daily_records for select using (
  public.is_staff()
  or exists (select 1 from public.enrollments e where e.id = enrollment_id
             and (e.student_id = public.my_student_id() or public.teaches_circle(e.circle_id))));
drop policy if exists records_write on public.daily_records;
create policy records_write on public.daily_records for all
  using (public.can_manage_enrollment(enrollment_id))
  with check (public.can_manage_enrollment(enrollment_id));

-- حضور المعلِّمات: يقرؤه الكادر، وتسجِّله المديرة والمشرفات
drop policy if exists staff_att_select on public.staff_attendance;
create policy staff_att_select on public.staff_attendance for select using (public.is_staff());
drop policy if exists staff_att_write on public.staff_attendance;
create policy staff_att_write on public.staff_attendance for all
  using (public.my_role() in ('admin','supervisor'))
  with check (public.my_role() in ('admin','supervisor'));

-- المهام اليومية: يقرؤها الكادر، وتكتبها مسؤولة المسار لحلقات مسارها قبل الموعد، والقائدة في أي وقت
create or replace function public.task_open(d date) returns boolean
language sql stable as $$
  select d <= (now() at time zone 'Asia/Riyadh')::date
     and (now() at time zone 'Asia/Riyadh') < (d + interval '1 day 5 hours')
$$;

drop policy if exists tasks_select on public.daily_tasks;
create policy tasks_select on public.daily_tasks for select using (public.is_staff());
drop policy if exists tasks_write on public.daily_tasks;
create policy tasks_write on public.daily_tasks for all
  using (public.is_admin() or (public.my_role() = 'supervisor'
         and exists (select 1 from public.circles c where c.id = circle_id and c.track_id = public.my_track())
         and public.task_open(task_date)))
  with check (public.is_admin() or (public.my_role() = 'supervisor'
         and exists (select 1 from public.circles c where c.id = circle_id and c.track_id = public.my_track())
         and public.task_open(task_date)));

-- السرد: يقرؤه الكادر والطالبة صاحبته ومعلِّمة حلقتها، وتسجِّله صاحبة الحلقة ومسؤولة مسارها والقائدة
drop policy if exists sard_select on public.weekly_sard;
create policy sard_select on public.weekly_sard for select using (
  public.is_staff()
  or exists (select 1 from public.enrollments e where e.id = enrollment_id
             and (e.student_id = public.my_student_id() or public.teaches_circle(e.circle_id))));
drop policy if exists sard_write on public.weekly_sard;
create policy sard_write on public.weekly_sard for all
  using (public.can_manage_enrollment(enrollment_id))
  with check (public.can_manage_enrollment(enrollment_id));

-- المعلِّمات: يقرأ بياناتهن الكادر، وتديرها القائدة ومسؤولات المسارات
drop policy if exists teachers_select on public.teachers;
create policy teachers_select on public.teachers for select using (public.is_staff());
drop policy if exists teachers_write on public.teachers;
create policy teachers_write on public.teachers for all
  using (public.my_role() in ('admin','supervisor')) with check (public.my_role() in ('admin','supervisor'));

-- =====================================================================
--  المسارات والحلقات الابتدائية (تُضاف مرة واحدة إذا كانت القاعدة فارغة)
--  كل مسار ١٠ حلقات، وتستطيع القائدة الحذف والإضافة بعد ذلك
-- =====================================================================
do $$
declare
  t record; tid bigint; i int;
begin
  if exists (select 1 from public.tracks) then return; end if;
  for t in select * from (values
    (1,  'كنف',   null,                       'ناشئة',   'memo_review', '{0,1,2}'::int[]),
    (2,  'بُنيان', null,                       'أطفال',   'memo_review', '{0,1,2}'::int[]),
    (3,  'تمكين', null,                       'خاتمات',  'fixation',    '{0,1,2,3,4}'::int[]),
    (4,  'رِكاز', 'حفظ حُر، رواية حفص',         'جامعيات', 'memo_review', '{0,1,2,3}'::int[]),
    (5,  'وثيق',  'حفظ حُر، رواية حفص',         'جامعيات', 'memo_review', '{0,1,2,3}'::int[]),
    (6,  'ثبات',  'حفظ موحَّد',                 'جامعيات', 'unified',     '{0,1,2,3}'::int[]),
    (7,  'رتاد',  'حفظ حُر، رواية ورش',         'جامعيات', 'memo_review', '{0,1,2,3}'::int[]),
    (8,  'النور', 'حفظ حُر',                    'جامعيات', 'memo_review', '{6,0,1,2,3}'::int[]),
    (9,  'ضياء',  'تلقين للمبتدئات',            'جامعيات', 'memo_review', '{6,0,1,2,3}'::int[]),
    (10, 'وهج',   null,                       'خاتمات',  'fixation',    '{0,1,2,3,4}'::int[])
  ) as v(ord, name, note, cat, ctype, days)
  loop
    insert into public.tracks (name, description, category, circle_type, days, sort_order, entry_mode, sard_day, card_items)
    values (t.name, t.note, t.cat, t.ctype, t.days, t.ord,
      case when t.cat in ('أطفال','ناشئة') then 'weekly' else 'daily' end,
      case when t.ctype = 'fixation' then null when t.cat in ('أطفال','ناشئة') then 3 else 4 end,
      case
        when t.name = 'ضياء' then array['مقدار الحفظ','مقدار المراجعة','سماع القارئ','قراءة التفسير']
        when t.name = 'النور' then array['عدد أوجه الحفظ','عدد أوجه المراجعة','سماع القارئ','قراءة التفسير']
        when t.ctype = 'fixation' then array['مقدار الحفظ الجديد','مقدار المراجعة التراكمية','مقدار المراجعة القديمة','سماع النصاب','التسميع مع الرفيقة']
        when t.ctype = 'unified' then array['اسم السورة','مقدار الحفظ','مقدار المراجعة','سماع النصاب']
        else array['عدد أوجه الحفظ','عدد أوجه المراجعة','سماع القارئ']
      end) returning id into tid;
    for i in 1..10 loop
      insert into public.circles (name, track_id) values (t.name || ' ' || i, tid);
    end loop;
  end loop;
end $$;
