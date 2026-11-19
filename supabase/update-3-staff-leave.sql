-- حالة «إجازة» لحضور المشرفات، وخيار الإجازة حسب المسار
alter table public.staff_attendance drop constraint if exists staff_attendance_status_check;
alter table public.staff_attendance add constraint staff_attendance_status_check check (status in ('present','late','absent','excused','leave'));
alter table public.tracks add column if not exists allow_leave boolean not null default true;
