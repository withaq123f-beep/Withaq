/* =========================================================
   حلقات وثاق القرآنية — منطق الموقع
   يعمل بقاعدة بيانات Supabase (الإعدادات في config.js)
   ========================================================= */
'use strict';

const CFG = window.WITHAQ_CONFIG || {};
const SITE = {
  name: CFG.SITE_NAME || 'حلقات وثاق القرآنية',
  tagline: CFG.TAGLINE || 'أفئدةٌ تُضاء بالوحي',
};
const LOGO = 'assets/logo.png';
const MARK = 'assets/mark.png';

/* ---------------- السور وعدد آياتها ---------------- */
const SURAHS = [
  ['الفاتحة',7],['البقرة',286],['آل عمران',200],['النساء',176],['المائدة',120],['الأنعام',165],['الأعراف',206],['الأنفال',75],['التوبة',129],['يونس',109],
  ['هود',123],['يوسف',111],['الرعد',43],['إبراهيم',52],['الحجر',99],['النحل',128],['الإسراء',111],['الكهف',110],['مريم',98],['طه',135],
  ['الأنبياء',112],['الحج',78],['المؤمنون',118],['النور',64],['الفرقان',77],['الشعراء',227],['النمل',93],['القصص',88],['العنكبوت',69],['الروم',60],
  ['لقمان',34],['السجدة',30],['الأحزاب',73],['سبأ',54],['فاطر',45],['يس',83],['الصافات',182],['ص',88],['الزمر',75],['غافر',85],
  ['فصلت',54],['الشورى',53],['الزخرف',89],['الدخان',59],['الجاثية',37],['الأحقاف',35],['محمد',38],['الفتح',29],['الحجرات',18],['ق',45],
  ['الذاريات',60],['الطور',49],['النجم',62],['القمر',55],['الرحمن',78],['الواقعة',96],['الحديد',29],['المجادلة',22],['الحشر',24],['الممتحنة',13],
  ['الصف',14],['الجمعة',11],['المنافقون',11],['التغابن',18],['الطلاق',12],['التحريم',12],['الملك',30],['القلم',52],['الحاقة',52],['المعارج',44],
  ['نوح',28],['الجن',28],['المزمل',20],['المدثر',56],['القيامة',40],['الإنسان',31],['المرسلات',50],['النبأ',40],['النازعات',46],['عبس',42],
  ['التكوير',29],['الانفطار',19],['المطففين',36],['الانشقاق',25],['البروج',22],['الطارق',17],['الأعلى',19],['الغاشية',26],['الفجر',30],['البلد',20],
  ['الشمس',15],['الليل',21],['الضحى',11],['الشرح',8],['التين',8],['العلق',19],['القدر',5],['البينة',8],['الزلزلة',8],['العاديات',11],
  ['القارعة',11],['التكاثر',8],['العصر',3],['الهمزة',9],['الفيل',5],['قريش',4],['الماعون',7],['الكوثر',3],['الكافرون',6],['النصر',3],
  ['المسد',5],['الإخلاص',4],['الفلق',5],['الناس',6],
];
const AYAH_START = []; // الفهرس العام لأوَّل آية في كل سورة
{ let acc = 0; for (const [, n] of SURAHS) { AYAH_START.push(acc); acc += n; } }
const ayahIndex = (s, a) => AYAH_START[s - 1] + (a - 1);
function rangeCount(fs, fa, ts, ta) {
  if (!fs || !fa || !ts || !ta) return 0;
  return Math.abs(ayahIndex(ts, ta) - ayahIndex(fs, fa)) + 1;
}
const posText = (s, a) => (s ? `${SURAHS[s - 1][0]} ${a || ''}`.trim() : '');
function rangeText(fs, fa, ts, ta) {
  if (!fs || !ts) return '';
  if (fs === ts) return `${SURAHS[fs - 1][0]} ${fa}–${ta}`;
  return `${posText(fs, fa)} ← ${posText(ts, ta)}`;
}
function nextPos(s, a) {
  if (!s) return null;
  if (a < SURAHS[s - 1][1]) return [s, a + 1];
  return s < 114 ? [s + 1, 1] : [s, a];
}

/* ---------------- مسمَّيات ---------------- */
const ATT = { present: 'حاضرة', late: 'متأخرة', absent: 'غائبة', excused: 'مستأذنة' };
const STAFF_ATT = { present: 'حاضرة', late: 'متأخرة', absent: 'غائبة', excused: 'معتذرة' };
const CTYPE = { memo_review: 'حفظ ومراجعة', fixation: 'تثبيت', unified: 'حفظ موحَّد' };
const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5]; // يبدأ الأسبوع بالسبت
function daysText(days = []) {
  const ord = WEEK_ORDER.filter((d) => days.includes(d));
  if (!ord.length) return 'لم تُحدَّد الأيام';
  const pos = ord.map((d) => WEEK_ORDER.indexOf(d));
  const consecutive = pos.every((p, i) => !i || p === pos[i - 1] + 1);
  if (consecutive && ord.length > 2) return `من ${DAYS[ord[0]]} إلى ${DAYS[ord[ord.length - 1]]}`;
  return ord.map((d) => DAYS[d]).join('، ');
}
// يوم البطاقة: المسارات اليومية في أيامها، والأسبوعية في يوم السرد فقط
function isEntryDay(track, date) {
  if (!track) return false;
  const wd = new Date(date + 'T12:00:00').getDay();
  if (track.entry_mode === 'weekly') return wd === (track.sard_day ?? (track.days || []).slice(-1)[0]) || (track.days || []).includes(wd);
  return (track.days || []).includes(wd);
}
function lastEntryDay(track, upTo) {
  let d = upTo;
  for (let i = 0; i < 7; i++) { if (isEntryDay(track, d)) return d; d = addDays(d, -1); }
  return upTo;
}
// ---- توقيت مكة (UTC+3) لمهام مسؤولات المسارات: تُغلق مهام اليوم الساعة ٥ صباحًا من اليوم التالي ----
function meccaNow() { return new Date(Date.now() + 3 * 3600e3); }
function taskDay() {
  const m = meccaNow(); if (m.getUTCHours() < 5) m.setUTCDate(m.getUTCDate() - 1);
  return `${m.getUTCFullYear()}-${String(m.getUTCMonth() + 1).padStart(2, '0')}-${String(m.getUTCDate()).padStart(2, '0')}`;
}
function taskDeadline(d) { const [y, mo, da] = d.split('-').map(Number); return new Date(Date.UTC(y, mo - 1, da + 1, 2, 0, 0)); } // ٥ص مكة = ٢ UTC
function taskOpen(d) { return d <= taskDay() && Date.now() < taskDeadline(d).getTime(); }
function timeLeft(d) {
  const ms = taskDeadline(d).getTime() - Date.now(); if (ms <= 0) return '';
  const h = Math.floor(ms / 3600e3); const m = Math.floor((ms % 3600e3) / 60e3);
  return h ? `${h} ساعة و${m} دقيقة` : `${m} دقيقة`;
}
const GRADE = { excellent: 'ممتاز', good: 'جيد', repeat: 'تحتاج إعادة' };
const ROLE = { admin: 'القائدة', supervisor: 'مسؤولة مسار', teacher: 'مشرفة حلقة', instructor: 'معلِّمة حلقة', student: 'طالبة', pending: 'بانتظار التفعيل', disabled: 'مؤرشفة' };
const ACTIVE_ROLES = ['admin', 'supervisor', 'teacher']; // المعلِّمات والطالبات بلا حسابات، بياناتهن في القاعدة

/* ---------------- أدوات عامة ---------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
/** ينظّف بنود قالب البطاقة: يتجاهل عنوان البطاقة وسطر الاسم، ويزيل الزخارف والتطويل والتشكيل والنقطتين */
function cleanTemplateItems(text) {
  const strip = (s) => String(s).replace(/[ً-ٟـٰ]/g, '').replace(/[*_~`]/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  return String(text || '').split('\n').map((raw) => {
    const t = strip(raw);
    if (!t || /^بطاقة\s*(ال)?حضور/.test(t) || t === 'الاسم') return null;
    return t;
  }).filter(Boolean);
}
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const dateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => dateStr(new Date());
function addDays(s, n) { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return dateStr(d); }
function monthStart() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`; }
const LOCALE = 'ar-u-nu-latn';
function fmtDate(s, opts = { weekday: 'long', day: 'numeric', month: 'long' }) {
  try { return new Date(s + 'T12:00:00').toLocaleDateString(LOCALE, opts); } catch { return s; }
}
const fmtShort = (s) => fmtDate(s, { day: 'numeric', month: 'short' });
const firstName = (n) => { const w = String(n || '').trim().split(/\s+/); return (['بنت', 'أم', 'ام'].includes(w[0]) && w[1] ? `${w[0]} ${w[1]}` : w[0]) || ''; };
const initial = (n) => String(n || '؟').trim().charAt(0);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const byName = (a, b) => String(a.full_name || a.name).localeCompare(String(b.full_name || b.name), 'ar', { numeric: true });

function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function modal(html, onMount) {
  const bg = document.createElement('div');
  bg.className = 'veil';
  bg.innerHTML = `<div class="dialog" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(bg);
  const close = () => bg.remove();
  bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('[data-close]')) close(); });
  onMount && onMount(bg.firstElementChild, close);
  const first = bg.querySelector('input,select,textarea');
  first && setTimeout(() => first.focus(), 50);
  return close;
}

function confirmBox(text, okLabel = 'تأكيد') {
  return new Promise((resolve) => {
    modal(`<h2>${esc(text)}</h2><div class="actions"><button class="btn danger" data-ok>${esc(okLabel)}</button><button class="btn ghost" data-close>إلغاء</button></div>`,
      (m, close) => { m.querySelector('[data-ok]').onclick = () => { close(); resolve(true); }; m.parentElement.addEventListener('click', (e) => { if (e.target.closest('[data-close]') || e.target === m.parentElement) resolve(false); }); });
  });
}

function surahOptions(selected, placeholder = 'السورة') {
  let o = `<option value="">${placeholder}</option>`;
  SURAHS.forEach(([n], i) => { o += `<option value="${i + 1}"${+selected === i + 1 ? ' selected' : ''}>${i + 1}. ${n}</option>`; });
  return o;
}

function downloadCSV(name, header, rows) {
  const line = (r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');
  const csv = '﻿' + [line(header), ...rows.map(line)].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `${name}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
}

function translateError(msg = '') {
  const m = String(msg).toLowerCase();
  if (m.includes('row-level security') || m.includes('permission')) return 'ليست لديكِ صلاحية لهذا الإجراء';
  if (m.includes('already registered') || m.includes('duplicate key') && m.includes('username')) return 'هذا البريد مسجَّل مسبقًا، سجِّلي الدخول';
  if (m.includes('duplicate key')) return 'هذا السجل موجود مسبقًا';
  if (m.includes('foreign key')) return 'لا يمكن الحذف لوجود بيانات مرتبطة به';
  if (m.includes('password')) return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
  if (m.includes('invalid') && m.includes('email')) return 'اكتبي بريدًا إلكترونيًّا صحيحًا';
  if (m.includes('rate limit')) return 'تعذَّر إرسال بريد التأكيد الآن (تجاوز الحدِّ)، أبلغي القائدة';
  if (m.includes('sending') && m.includes('email')) return 'تعذَّر إرسال بريد التأكيد، أبلغي القائدة';
  if (m.includes('not confirmed')) return 'بريدكِ غير مؤكَّد بعد، أبلغي القائدة';
  if (m.includes('failed to fetch') || m.includes('network')) return 'تعذَّر الاتصال، تأكدي من الإنترنت';
  return msg || 'حدث خطأ غير متوقع';
}

/* =========================================================
   طبقة البيانات — واجهة واحدة لنسختين
   ========================================================= */
function applyFilters(rows, f = {}) {
  return rows.filter((r) =>
    Object.entries(f.eq || {}).every(([k, v]) => r[k] === v) &&
    Object.entries(f.in || {}).every(([k, v]) => v.includes(r[k])) &&
    Object.entries(f.gte || {}).every(([k, v]) => r[k] >= v) &&
    Object.entries(f.lte || {}).every(([k, v]) => r[k] <= v));
}

function supabaseBackend() {
  let sb;
  const email = (u) => String(u).trim().toLowerCase();
  const run = async (p) => { const { data, error } = await p; if (error) throw new Error(translateError(error.message)); return data; };
  const loadScript = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('تعذَّر تحميل مكتبة Supabase')); document.head.appendChild(s); });
  return {
    mode: 'live',
    async init() {
      await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
      sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
    },
    async currentProfile() {
      const { data } = await sb.auth.getSession();
      if (!data.session) return null;
      return run(sb.from('profiles').select('*').eq('id', data.session.user.id).maybeSingle());
    },
    async signIn(u, p) {
      const { error } = await sb.auth.signInWithPassword({ email: email(u), password: p });
      if (error) throw new Error(/confirm/i.test(error.message) ? 'أكِّدي بريدكِ أولًا من الرابط الذي وصلكِ، ثم ادخلي' : 'البريد أو كلمة المرور غير صحيحة');
    },
    signupOptions: () => run(sb.rpc('signup_options')),
    archiveAccount: (uid, archive) => run(sb.rpc('set_account_archived', { uid, archive })),
    setCircleTeacher: (cid, tid) => run(sb.rpc('set_circle_teacher', { cid, tid })),
    async signUp(name, u, p, requested, track, circles) {
      const { data, error } = await sb.auth.signUp({ email: email(u), password: p, options: { data: { full_name: name, requested_role: requested || null, requested_track: track ? String(track) : null, requested_circles: (circles || []).map(String) }, emailRedirectTo: location.origin + location.pathname } });
      if (error) throw new Error(translateError(error.message));
      if (!data.session) return 'confirm'; // التأكيد مفعَّل: وصلها رابط على بريدها
    },
    signOut: () => sb.auth.signOut(),
    async changePassword(p) { await run(sb.auth.updateUser({ password: p })); },
    async list(table, f = {}) {
      const out = []; const step = 1000;
      for (let from = 0; ; from += step) {
        let q = sb.from(table).select('*');
        for (const [k, v] of Object.entries(f.eq || {})) q = q.eq(k, v);
        for (const [k, v] of Object.entries(f.in || {})) q = q.in(k, v.length ? v : [-1]);
        for (const [k, v] of Object.entries(f.gte || {})) q = q.gte(k, v);
        for (const [k, v] of Object.entries(f.lte || {})) q = q.lte(k, v);
        const rows = await run(q.order('id').range(from, from + step - 1));
        out.push(...rows);
        if (rows.length < step) break;
      }
      return out;
    },
    insert: (t, row) => run(sb.from(t).insert(row).select().single()),
    update: (t, id, patch) => run(sb.from(t).update(patch).eq('id', id).select().single()),
    remove: (t, id) => run(sb.from(t).delete().eq('id', id)),
    upsert: (t, rows, onConflict) => run(sb.from(t).upsert(rows, { onConflict }).select()),
  };
}

let api = null;

/* =========================================================
   الحالة والصلاحيات
   ========================================================= */
const S = { me: null, profiles: [], tracks: [], circles: [], students: [], enrollments: [], teachers: [] };

async function loadAll() {
  const [profiles, tracks, circles, students, enrollments, teachers] = await Promise.all([
    api.list('profiles'), api.list('tracks'), api.list('circles'), api.list('students'), api.list('enrollments'), api.list('teachers'),
  ]);
  Object.assign(S, { teachers: teachers.sort(byName), profiles, tracks: tracks.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id), circles: circles.sort(byName), students: students.sort(byName), enrollments });
}

const role = () => S.me?.role;
const isAdmin = () => role() === 'admin';
const isSup = () => role() === 'supervisor';
const isIns = () => role() === 'instructor';
const isStu = () => role() === 'student';
const canEditStudents = () => isAdmin() || isSup();
const canEnter = () => isAdmin() || isSup() || role() === 'teacher';
const teacherById = (id) => S.teachers.find((t) => t.id === id);
const instructorName = (c) => teacherById(c?.teacher_ref)?.full_name || c?.teacher_name || '';
const profileName = (id) => S.profiles.find((p) => p.id === id)?.full_name || '—';
const trackName = (id) => S.tracks.find((t) => t.id === id)?.name || '—';
// مسارات مسؤولة المسار: مسارها الأساسي من التسجيل + ما أسندته القائدة لها
const trackIdsOf = (p) => [...new Set([...(p?.track_ids || []), p?.track_id].filter(Boolean))];
const myTrackIds = () => (isSup() ? trackIdsOf(S.me) : []);
const inMyTracks = (tid) => myTrackIds().includes(tid);
// حلقات اختارتها المشرفة عند التسجيل ولم تُربط بحسابها (محجوزة لغيرها أو لم يتم الربط)
const unlinkedHint = () => {
  const req = (S.me?.requested_circles || []).map((id) => circleById(+id)).filter((c) => c && c.teacher_id !== S.me.id);
  return req.length ? ` اخترتِ «${req.map((c) => c.name).join('، ')}» لكنها لم تُربط بحسابكِ بعد (قد تكون مُسنَدة لمشرفة أخرى)، وستؤكدها القائدة.` : '';
};
const trackNames = (ids) => ids.map(trackName).join('، ') || '—';
const circleById = (id) => S.circles.find((c) => c.id === id);
const studentById = (id) => S.students.find((s) => s.id === id);

function myCircles(includeInactive = false) {
  return S.circles.filter((c) => (includeInactive || c.active) && (
    isAdmin() || (isSup() && inMyTracks(c.track_id)) || (role() === 'teacher' && c.teacher_id === S.me.id)
    || (isIns() && c.instructor_id === S.me.id)
    || (isStu() && S.enrollments.some((e) => e.active && e.circle_id === c.id && e.student_id === S.me.student_id))));
}
const activeEnrollments = (circleIds) => {
  const set = new Set(circleIds);
  return S.enrollments.filter((e) => e.active && set.has(e.circle_id));
};
function visibleStudents() {
  if (isAdmin()) return S.students;
  if (isStu()) return S.students.filter((s) => s.id === S.me.student_id);
  const mine = new Set(myCircles(true).map((c) => c.id));
  const ids = new Set(S.enrollments.filter((e) => mine.has(e.circle_id) && e.active).map((e) => e.student_id));
  const past = new Set(S.enrollments.filter((e) => mine.has(e.circle_id)).map((e) => e.student_id));
  return S.students.filter((s) => ids.has(s.id) || (!s.active && past.has(s.id)));
}
const studentCircles = (sid) => S.enrollments.filter((e) => e.student_id === sid && e.active).map((e) => circleById(e.circle_id)).filter(Boolean);

async function getRecords(from, to, enrollmentIds) {
  const f = { gte: { record_date: from }, lte: { record_date: to } };
  if (enrollmentIds) f.in = { enrollment_id: enrollmentIds };
  return api.list('daily_records', f);
}


/* =========================================================
   الأجزاء والزخرفة
   ========================================================= */
// بداية كل جزء [سورة، آية]
const JUZ_START = [[1,1],[2,142],[2,253],[3,93],[4,24],[4,148],[5,82],[6,111],[7,88],[8,41],[9,93],[11,6],[12,53],[15,1],[17,1],[18,75],[21,1],[23,1],[25,21],[27,56],[29,46],[33,31],[36,28],[39,32],[41,47],[46,1],[51,31],[58,1],[67,1],[78,1]];
const JUZ_IDX = JUZ_START.map(([s, a]) => ayahIndex(s, a)).concat([6236]);
const AYAHS_PER_JUZ = 6236 / 30;

// نسبة ما غطَّته النطاقات من كل جزء
function juzCoverage(ranges) {
  const covered = new Uint8Array(6236);
  for (const [fs, fa, ts, ta] of ranges) {
    if (!fs || !fa || !ts || !ta) continue;
    let a = ayahIndex(fs, fa), b = ayahIndex(ts, ta);
    if (a > b) [a, b] = [b, a];
    for (let i = a; i <= b && i < 6236; i++) covered[i] = 1;
  }
  return JUZ_IDX.slice(0, 30).map((start, j) => {
    const end = JUZ_IDX[j + 1]; let n = 0;
    for (let i = start; i < end; i++) n += covered[i];
    return n / (end - start);
  });
}

const HIJRI = (d = new Date()) => { try { return d.toLocaleDateString('ar-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return ''; } };

const ICON = {
  home: '<path d="M4 10.5 12 4l8 6.5V20H14.5v-5.5h-5V20H4z"/>',
  entry: '<path d="M5 4h11l3 3v13H5z"/><path d="M8.5 10h7M8.5 13.5h7M8.5 17h4"/>',
  students: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c.7-3.2 2.8-5 5.5-5s4.8 1.8 5.5 5"/><path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.5 14.8c1.7.6 2.7 2.2 3 4.7"/>',
  reports: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
  staff: '<circle cx="12" cy="8" r="3.4"/><path d="M5.5 20c.8-3.8 3.3-5.8 6.5-5.8s5.7 2 6.5 5.8"/><path d="M12 14.2 10.6 17 12 20l1.4-3z"/>',
  settings: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  tasks: '<path d="M9 5h10M9 12h10M9 19h10"/><path d="m3.5 5 1.2 1.2L7 4M3.5 12l1.2 1.2L7 11M3.5 19l1.2 1.2L7 18"/>',
  sard: '<path d="M4 5.5c2.5-1 5-1 8 1 3-2 5.5-2 8-1V19c-2.5-1-5-1-8 1-3-2-5.5-2-8-1z"/><path d="M12 6.5V20"/>',
  account: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6"/>',
  out: '<path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/>',
};
const icon = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;

// طرف ترويسة السورة: قوس مزدوج ونجمة ثُمانية
const CART_END = `<svg class="end" viewBox="0 0 46 74" aria-hidden="true">
  <path d="M46 8H31C17 8 12 20 9 30c-2 5-2 9 0 14 3 10 8 22 22 22h15z" fill="#fbeef3" stroke="#8fa052" stroke-width="1.5"/>
  <path d="M46 12H31.5C20 12 16 22 13.5 31c-1.4 4-1.4 8 0 12 2.5 9 6.5 19 18 19H46" fill="none" stroke="#8fa052" stroke-width=".8" opacity=".55"/>
  <g transform="translate(26 37)"><rect x="-6" y="-6" width="12" height="12" fill="#e99bb8"/><rect x="-6" y="-6" width="12" height="12" fill="#e99bb8" transform="rotate(45)"/><circle r="2.6" fill="#fffcfd"/></g>
</svg>`;
const cartouche = (title, sub = '') => `
  <header class="cartouche">${CART_END}<div class="band"><h1>${esc(title)}</h1></div>${CART_END.replace('class="end"', 'class="end flip"')}</header>
  ${sub ? `<p class="page-sub">${sub}</p>` : ''}`;

// حلقة الأجزاء الثلاثين
function juzRing(filled) {
  const cx = 66, cy = 66, r1 = 46, r2 = 62, n = 30, gap = 2.2;
  let out = '';
  for (let i = 0; i < n; i++) {
    const a0 = ((i * 360) / n + gap / 2 - 90) * Math.PI / 180;
    const a1 = (((i + 1) * 360) / n - gap / 2 - 90) * Math.PI / 180;
    const p = (r, a) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
    const part = Math.max(0, Math.min(1, filled - i));
    const fill = part >= 1 ? '#e99bb8' : part > 0 ? '#f3c7d7' : '#f3e7ec';
    out += `<path class="ring-seg" d="M${p(r2, a0)} A${r2} ${r2} 0 0 1 ${p(r2, a1)} L${p(r1, a1)} A${r1} ${r1} 0 0 0 ${p(r1, a0)} Z" fill="${fill}"/>`;
  }
  const laps = Math.floor(filled / 30);
  return `<svg viewBox="0 0 132 132" role="img" aria-label="${filled.toFixed(1)} جزء">${out}
    <text x="66" y="66" text-anchor="middle" font-family="Amiri, serif" font-weight="700" font-size="30" fill="#4f5b25">${Math.min(filled, 30).toFixed(filled < 10 ? 1 : 0)}</text>
    <text x="66" y="86" text-anchor="middle" font-family="Plex Arabic, sans-serif" font-size="10" fill="#a08f97">${laps ? `+${laps} ختمة` : 'من ٣٠ جزءًا'}</text></svg>`;
}

const attTag = (a) => `<span class="tag ${a === 'present' ? 'olive' : a === 'absent' ? 'red' : a === 'late' ? 'amber' : 'blue'}">${ATT[a]}</span>`;

/* =========================================================
   الدخول
   ========================================================= */
function renderAuth(mode = 'login', error = '', info = '') {
  $('#app').innerHTML = `
  <div class="gate">
    <section class="gate-art"><div class="frame"></div>
      <div><img src="${LOGO}" alt="${esc(SITE.name)}"><p class="motto">${esc(SITE.tagline)}</p>
      <p class="verse">﴿ وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا وَلَا تَفَرَّقُوا ﴾</p></div>
    </section>
    <section class="gate-form"><div class="box">
      <h2>${mode === 'login' ? 'أهلًا بكِ' : 'حساب جديد'}</h2>
      <p class="lead">${mode === 'login' ? 'ادخلي لمتابعة الحلقات والطالبات.' : 'لمشرفات الحلقات ومسؤولات المسارات. تُفعِّله القائدة بعد التسجيل.'}</p>
      <form id="authForm" autocomplete="on">
        ${mode === 'signup' ? `<label class="field">الاسم الكامل<input class="input" name="name" required></label>
        <label class="field">نوع الحساب<select class="input" name="requested" required>
          <option value="teacher">مشرفة حلقة</option><option value="supervisor">مسؤولة مسار</option></select></label>
        <label class="field">المسار<select class="input" name="track"><option value="">جارٍ تحميل المسارات…</option></select></label>
        <div class="field" id="circleBox">حلقاتكِ (يمكن اختيار حلقات من مسارات مختلفة: اختاري المسار ثم الحلقة، ثم مسارًا آخر)<div class="choices" id="circleChoices"><span class="hint-line">اختاري المسار أولًا</span></div><div class="choices" id="circlePicked" style="margin-top:8px"></div></div>` : ''}
        <label class="field">البريد الإلكتروني<input class="input" name="username" type="email" required dir="ltr" autocomplete="email" inputmode="email"></label>
        <label class="field">كلمة المرور<input class="input" name="password" type="password" required minlength="6" dir="ltr" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}"></label>
        ${error ? `<div class="error" role="alert">${esc(error)}</div>` : ''}
        ${info ? `<div class="banner" role="status" style="margin:0">${esc(info)}</div>` : ''}
        <button class="btn block" type="submit">${mode === 'login' ? 'دخول' : 'إنشاء الحساب'}</button>
      </form>
      <p class="switch-line">${mode === 'login' ? 'ليس لديكِ حساب؟<button class="linkish" data-mode="signup">أنشئي حسابًا</button>' : 'لديكِ حساب؟<button class="linkish" data-mode="login">سجِّلي الدخول</button>'}</p>

    </div></section>
  </div>`;
  $('[data-mode]').onclick = (e) => renderAuth(e.target.dataset.mode);
  if (mode === 'signup') loadSignupOptions();
  $('#authForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target); const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      if (mode === 'signup') {
        const circlesPicked = [...SIGNUP_PICKED];
        if (fd.get('requested') === 'supervisor' && !fd.get('track')) { btn.disabled = false; toast('اختاري مساركِ', 'bad'); return; }
        if (fd.get('requested') === 'teacher' && !circlesPicked.length) { btn.disabled = false; toast('اختاري حلقتكِ', 'bad'); return; }
        const r = await api.signUp(fd.get('name').trim(), fd.get('username'), fd.get('password'), fd.get('requested'), +fd.get('track') || null, fd.get('requested') === 'teacher' ? circlesPicked : []);
        if (r === 'confirm') { renderAuth('login', '', 'أُنشئ حسابكِ 🌸 افتحي رابط التأكيد الذي وصل إلى بريدكِ، ثم ادخلي.'); return; }
      } else await api.signIn(fd.get('username'), fd.get('password'));
      start();
    } catch (err) { renderAuth(mode, err.message); }
  };
}

// خيارات التسجيل: المسار، والحلقات الشاغرة لمشرفة الحلقة (من مسارات مختلفة)
const SIGNUP_PICKED = new Set();
async function loadSignupOptions() {
  const form = $('#authForm'); if (!form) return;
  const trackSel = form.querySelector('[name=track]'); const roleSel = form.querySelector('[name=requested]');
  const box = $('#circleBox'); const list = $('#circleChoices'); const picked = $('#circlePicked');
  SIGNUP_PICKED.clear();
  let opts;
  try { opts = await api.signupOptions(); } catch (err) { trackSel.innerHTML = '<option value="">تعذَّر تحميل المسارات، حدِّثي الصفحة</option>'; return; }
  const tname = (id) => (opts.tracks || []).find((t) => t.id === id)?.name || '';
  trackSel.innerHTML = '<option value="">اختاري المسار</option>' + (opts.tracks || []).map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('');
  const drawPicked = () => {
    const cs = (opts.circles || []).filter((c) => SIGNUP_PICKED.has(c.id));
    picked.innerHTML = cs.length ? `<span class="hint-line">اخترتِ:</span>${cs.map((c) => `<button type="button" class="tag rose" data-unpick="${c.id}" style="border:0;cursor:pointer">${esc(c.name)} ✕</button>`).join('')}` : '';
    $$('[data-unpick]', picked).forEach((b) => (b.onclick = () => { SIGNUP_PICKED.delete(+b.dataset.unpick); drawPicked(); drawCircles(); }));
  };
  const drawCircles = () => {
    const tid = +trackSel.value;
    const cs = (opts.circles || []).filter((c) => c.track_id === tid).sort((a, b) => String(a.name).localeCompare(String(b.name), 'ar', { numeric: true }));
    list.innerHTML = !tid ? '<span class="hint-line">اختاري المسار أولًا</span>' : cs.map((c) => `<label class="choice${c.taken ? ' taken' : ''}"><input type="checkbox" value="${c.id}" ${c.taken ? 'disabled' : ''} ${SIGNUP_PICKED.has(c.id) ? 'checked' : ''} style="accent-color:var(--rose-deep)"> ${esc(c.name)}${c.taken ? ' (لها مشرفة)' : ''}</label>`).join('') || '<span class="hint-line">لا حلقات في هذا المسار</span>';
    $$('input', list).forEach((x) => (x.onchange = () => { x.checked ? SIGNUP_PICKED.add(+x.value) : SIGNUP_PICKED.delete(+x.value); drawPicked(); }));
  };
  const syncRole = () => box.classList.toggle('hidden', roleSel.value !== 'teacher');
  trackSel.onchange = drawCircles; roleSel.onchange = syncRole; syncRole();
}

function renderPending() {
  const off = role() === 'disabled';
  $('#app').innerHTML = `<div class="waiting"><img src="${LOGO}" alt="">
    <h2>${off ? 'حسابكِ موقوف' : `أهلًا ${esc(firstName(S.me.full_name))} 🌸`}</h2>
    <p>${off ? 'تواصلي مع القائدة لإعادة تفعيله.' : 'أُنشئ حسابكِ، وينتظر تفعيل القائدة وتحديد دوركِ. 🌿'}</p>
    <button class="btn ghost" id="out">تسجيل الخروج</button></div>`;
  $('#out').onclick = async () => { await api.signOut(); start(); };
}

/* =========================================================
   الهيكل
   ========================================================= */
function navItems() {
  if (isStu()) return [['home', 'تقدُّمي'], ['account', 'حسابي']];
  const items = [['home', 'الرئيسية']];
  if (canEnter()) items.push(['entry', 'الإدخال من الواتساب']);
  items.push(['students', 'الطالبات'], ['reports', 'التقارير']);
  if (canEnter()) items.push(['sard', 'السرد الأسبوعي']);
  if (isAdmin() || isSup()) items.push(['tasks', 'المهام اليومية']);
  if (isAdmin() || isSup()) items.push(['staff', 'الكادر']);
  if (isAdmin()) items.push(['settings', 'المسارات والحلقات']);
  items.push(['account', 'حسابي']);
  return items;
}
const SHORT = { sard: 'السرد', home: 'الرئيسية', entry: 'الإدخال', students: 'الطالبات', reports: 'التقارير', tasks: 'المهام', staff: 'الكادر', settings: 'الحلقات', account: 'حسابي' };

function renderShell() {
  const items = navItems();
  const pri = isAdmin() ? ['home', 'tasks', 'sard', 'students', 'reports'] : isSup() ? ['home', 'tasks', 'entry', 'sard', 'students'] : ['home', 'entry', 'sard', 'students', 'reports', 'account'];
  const dockItems = pri.map((k) => items.find(([x]) => x === k)).filter(Boolean).slice(0, 5);
  $('#app').innerHTML = `
  <div class="app">
    <aside class="rail">
      <a class="brand" href="#/home"><img src="${LOGO}" alt="${esc(SITE.name)}"></a>
      <nav>${items.filter(([k]) => k !== 'account').map(([k, l]) => `<a class="nav" href="#/${k}" data-nav="${k}">${icon(k)}<span>${l}</span></a>`).join('')}</nav>
      <a class="me" href="#/account" data-nav="account"><span class="initial">${esc(initial(S.me.full_name))}</span>
        <span class="who"><b>${esc(S.me.full_name)}</b><span>${ROLE[role()]}</span></span></a>
    </aside>
    <div>
      <header class="topbar"><img src="${MARK}" alt=""><span class="t">${esc(SITE.name)}</span><span class="sp"></span>
        <a href="#/account" aria-label="حسابي"><span class="initial">${esc(initial(S.me.full_name))}</span></a></header>
      <main id="view"></main>
    </div>
    <nav class="dock">${dockItems.map(([k, l]) => `<a href="#/${k}" data-nav="${k}">${icon(k)}<span>${isStu() ? l : SHORT[k]}</span></a>`).join('')}</nav>
  </div>`;
}

const PAGES = {};
async function route() {
  const [, page = 'home', arg] = (location.hash || '#/home').split('/');
  const allowed = navItems().map(([k]) => k).concat(['student']);
  const key = allowed.includes(page) ? page : 'home';
  $$('[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === key || (key === 'student' && a.dataset.nav === 'students')));
  const v = $('#view');
  v.innerHTML = '<div class="loading"><div class="spin"></div></div>';
  window.scrollTo(0, 0);
  try { await PAGES[key](v, arg); } catch (err) { console.error(err); v.innerHTML = `<div class="wrap"><div class="error">${esc(translateError(err.message))}</div></div>`; }
}

/* =========================================================
   الرئيسية
   ========================================================= */
PAGES.home = async (v) => {
  if (isStu()) return PAGES.student(v, S.me.student_id);
  const t = today(); const from = addDays(t, -29); const from14 = addDays(t, -13); const from7 = addDays(t, -6);
  const circles = myCircles();
  const enr = activeEnrollments(circles.map((c) => c.id));
  const enrById = Object.fromEntries(enr.map((e) => [e.id, e]));
  const recs = (await getRecords(from, t)).filter((r) => enrById[r.enrollment_id]);
  const r14 = recs.filter((r) => r.record_date >= from14);
  const todayRecs = recs.filter((r) => r.record_date === t);
  const came = (r) => r.attendance === 'present' || r.attendance === 'late';
  const studentCount = new Set(enr.map((e) => e.student_id)).size;
  const monthPages = recs.filter((r) => r.record_date >= monthStart()).reduce((n, r) => n + memoPages(r), 0);

  const circleRows = circles.filter((c) => isEntryDay(trackOfCircle(c), t)).map((c) => {
    const ce = enr.filter((e) => e.circle_id === c.id);
    const done = todayRecs.filter((r) => enrById[r.enrollment_id].circle_id === c.id).length;
    const cr = r14.filter((r) => enrById[r.enrollment_id].circle_id === c.id);
    const rate = pct(cr.filter(came).length, cr.length);
    const st = !ce.length ? ['gray', 'لا طالبات'] : done >= ce.length ? ['olive', 'اكتمل اليوم'] : done ? ['amber', `${done} من ${ce.length}`] : ['red', 'لم يُدخل'];
    return { c, ce, done, rate, st };
  }).filter((x) => x.ce.length).sort((a, b) => (a.done >= a.ce.length) - (b.done >= b.ce.length) || a.rate - b.rate);
  const shownRows = circleRows.slice(0, 10); const hiddenDone = circleRows.length - shownRows.length;

  const abs = {};
  r14.forEach((r) => { if (r.attendance === 'absent') abs[r.enrollment_id] = (abs[r.enrollment_id] || 0) + 1; });
  const absentees = Object.entries(abs).filter(([, n]) => n >= 3).map(([id, n]) => ({ e: enrById[id], n })).sort((a, b) => b.n - a.n).slice(0, 6);

  const memo = {};
  recs.filter((r) => r.record_date >= from7).forEach((r) => {
    const sid = enrById[r.enrollment_id].student_id;
    memo[sid] = (memo[sid] || 0) + memoPages(r);
  });
  const top = Object.entries(memo).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const scope = isAdmin() ? 'كل حلقات المقرأة' : isSup() ? trackNames(myTrackIds()) : circles.map((c) => c.name).join('، ') || ('لم تُسنَد إليكِ حلقة بعد.' + unlinkedHint());
  const juz = monthPages / 20;
  const shortToday = todayRecs.filter((r) => r.shortcoming).length;
  const shortBy = {};
  r14.forEach((r) => { if (r.shortcoming) shortBy[r.enrollment_id] = (shortBy[r.enrollment_id] || 0) + 1; });
  const shorters = Object.entries(shortBy).filter(([, n]) => n >= 3).map(([id, n]) => ({ e: enrById[id], n })).sort((a, b) => b.n - a.n).slice(0, 6);
  // شريط المهام اليومية
  let banner = '';
  if (isAdmin() || isSup()) {
    const td = taskDay();
    const ts = tracksOn(td).filter((t) => isAdmin() || inMyTracks(t.id));
    const tcs = S.circles.filter((c) => c.active && ts.some((t) => t.id === c.track_id));
    const done = tcs.length ? await api.list('daily_tasks', { eq: { task_date: td }, in: { circle_id: tcs.map((c) => c.id) } }) : [];
    const doneSet = new Set(done.map((x) => x.circle_id));
    if (tcs.length && isAdmin()) {
      const full = ts.filter((t) => { const cs = tcs.filter((c) => c.track_id === t.id); return cs.length && cs.every((c) => doneSet.has(c.id)); }).length;
      banner = `<a class="banner ${full < ts.length ? 'warn' : ''}" href="#/tasks"><span><b>مهام مسؤولات المسارات:</b> أتمَّت ${full} من ${ts.length}</span><span class="s">تُغلق بعد ${timeLeft(td)}</span></a>`;
    } else if (tcs.length) {
      const n = tcs.filter((c) => doneSet.has(c.id)).length;
      banner = `<a class="banner ${n < tcs.length ? 'warn' : ''}" href="#/tasks"><span><b>مهامكِ اليوم:</b> ${n === tcs.length ? 'أتممتِها كلها 🌿' : `أُتمَّت ${n} من ${tcs.length} حلقة`}</span><span class="s">تُغلق بعد ${timeLeft(td)}</span></a>`;
    }
  }
  if (canEnter()) {
    const so = await sardOverview(myCircles());
    const lim = so.rows.filter((r) => r.streak >= SARD_LIMIT).length;
    if (lim) banner += `<a class="banner warn" href="#/sard" style="background:var(--red-wash);border-color:#eec2bf"><span><b>السرد الأسبوعي:</b> ${lim} ${lim === 1 ? 'طالبة وصلت' : lim === 2 ? 'طالبتان وصلتا' : 'طالبات وصلن'} حدَّ الحذف</span><span class="s">عرض</span></a>`;
    else if (so.missingCircles.length) banner += `<a class="banner warn" href="#/sard"><span><b>السرد الأسبوعي:</b> لم يُسجَّل لـ${so.missingCircles.length} حلقة</span><span class="s">تسجيل</span></a>`;
  }
  v.innerHTML = `<div class="wrap">
  <section class="greet">
    <div><h1>أهلًا بكِ يا ${esc(firstName(S.me.full_name))} 🌸</h1>
      <p class="dates">${fmtDate(t)}، <b>${HIJRI()}</b></p>
      <p class="dates">${esc(scope)}</p></div>
    <div class="harvest">${juzRing(juz)}<div><div class="big num">${Math.round(monthPages).toLocaleString('en')}</div>
      <div class="lbl">وجهًا حفظته الطالبات هذا الشهر</div><div class="harvest-juz">تعادل ${juz.toFixed(1)} جزءًا</div></div></div>
  </section>
  ${banner}
  <div class="strip">
    <div><div class="n rose num">${studentCount}</div><div class="l">طالبة في الحلقات</div></div>
    <div><div class="n olive num">${todayRecs.filter(came).length}</div><div class="l">حضرن اليوم</div></div>
    <div><div class="n red num">${todayRecs.filter((r) => r.attendance === 'absent').length}</div><div class="l">غبن اليوم</div></div>
    <div><div class="n num" style="color:var(--amber)">${shortToday}</div><div class="l">قصَّرن اليوم</div></div>
  </div>
  <div class="split">
    <section class="sheet"><h2>إدخال اليوم <small>الحضور في أسبوعين</small></h2><div class="lines">
      ${shownRows.map(({ c, rate, st }) => `<a class="line" href="${canEnter() ? '#/entry' : '#/reports'}" data-circle="${c.id}">
        <div class="grow"><div class="t">${esc(c.name)}</div><div class="s">${esc(c.teacher_id ? profileName(c.teacher_id) : 'بلا مشرفة')}${instructorName(c) ? `، المعلِّمة: ${esc(instructorName(c))}` : ''}</div></div>
        <div class="meter ${rate < 60 ? 'bad' : rate < 80 ? 'warn' : ''}" title="${rate}%"><i style="width:${rate}%"></i></div>
        <span class="tag ${st[0]}">${st[1]}</span></a>`).join('') || '<div class="empty">لا توجد حلقات فيها طالبات بعد</div>'}
      ${hiddenDone > 0 ? `<p class="hint-line" style="padding:8px 4px 0">و${hiddenDone} حلقات أخرى، التفاصيل في التقارير</p>` : ''}
    </div></section>
    <section class="sheet"><h2>غياب متكرر <small>٣ مرات فأكثر في أسبوعين</small></h2><div class="lines">
      ${absentees.map(({ e, n }) => `<a class="line" href="#/student/${e.student_id}"><span class="initial rose">${esc(initial(studentById(e.student_id)?.full_name))}</span>
        <div class="grow"><div class="t">${esc(studentById(e.student_id)?.full_name)}</div><div class="s">${esc(circleById(e.circle_id)?.name)}</div></div>
        <span class="tag red">${n} غياب</span></a>`).join('') || '<div class="empty">لا غياب متكرر، الحمد لله 🌿</div>'}
    </div></section>
  </div>
  <div class="split" style="margin-top:16px">
  <section class="sheet"><h2>تقصير متكرر <small>٣ مرات فأكثر في أسبوعين</small></h2><div class="lines">
    ${shorters.map(({ e, n }) => `<a class="line" href="#/student/${e.student_id}"><span class="initial rose">${esc(initial(studentById(e.student_id)?.full_name))}</span>
      <div class="grow"><div class="t">${esc(studentById(e.student_id)?.full_name)}</div><div class="s">${esc(circleById(e.circle_id)?.name)}</div></div>
      <span class="tag amber">${n} تقصير</span></a>`).join('') || '<div class="empty">لا تقصير متكرر 🌿</div>'}
  </div></section>
  <section class="sheet"><h2>الأكثر حفظًا هذا الأسبوع</h2><div class="lines">
    ${top.map(([sid, n], i) => `<a class="line" href="#/student/${sid}"><span class="rank">${i + 1}</span>
      <div class="grow"><div class="t">${esc(studentById(+sid)?.full_name)}</div><div class="s">${esc(studentCircles(+sid).map((c) => c.name).join('، '))}</div></div>
      <span class="tag olive">${fmtPages(n)}</span></a>`).join('') || '<div class="empty">لم يُسجَّل حفظ هذا الأسبوع بعد</div>'}
  </div></section></div></div>`;
  $$('[data-circle]', v).forEach((a) => a.addEventListener('click', () => { ENTRY.circleId = +a.dataset.circle; ENTRY.date = today(); }));
};

/* =========================================================
   الإدخال اليومي
   ========================================================= */
const ENTRY = { circleId: null, date: null, text: '', dateTouched: false };
const SURAH_INFO = SURAHS.map(([name, ayahs]) => ({ name, ayahs }));
const surahNo = (name) => { const n = CardKit.norm(name); const i = SURAHS.findIndex(([s]) => CardKit.norm(s) === n); return i >= 0 ? i + 1 : null; };
const pagesOfRange = (fs, fa, ts, ta) => rangeCount(fs, fa, ts, ta) * 604 / 6236;
// مقدار الحفظ بالأوجه: من البطاقة، أو محسوبًا من النطاق
const memoPages = (r) => (r.memo_pages != null ? +r.memo_pages : pagesOfRange(r.memo_from_surah, r.memo_from_ayah, r.memo_to_surah, r.memo_to_ayah));
const reviewPages = (r) => (r.review_pages != null ? +r.review_pages : pagesOfRange(r.review_from_surah, r.review_from_ayah, r.review_to_surah, r.review_to_ayah));
const fmtPages = (p) => { const n = Math.round(p * 10) / 10; return `${n} ${n === 1 ? 'وجه' : n === 2 ? 'وجهان' : 'أوجه'}`; };
const trackOfCircle = (c) => S.tracks.find((t) => t.id === c?.track_id);

PAGES.entry = async (v) => {
  const circles = myCircles();
  if (!circles.length) { v.innerHTML = `<div class="wrap">${cartouche('الإدخال من الواتساب')}<div class="sheet empty">لم تُسنَد إليكِ حلقة بعد.${esc(unlinkedHint())} تواصلي مع القائدة 🌿</div></div>`; return; }
  if (!circles.some((c) => c.id === ENTRY.circleId)) ENTRY.circleId = circles[0].id;
  const circle = circleById(ENTRY.circleId);
  const track = trackOfCircle(circle);
  if (!ENTRY.dateTouched || !ENTRY.date) ENTRY.date = track?.entry_mode === 'weekly' ? lastEntryDay(track, today()) : today();
  // حالة كل حلقة من حلقاتها في هذا اليوم (لمن عندها أكثر من حلقة)
  let chipStatus = {};
  if (circles.length > 1 && circles.length <= 8) {
    const allEnr = activeEnrollments(circles.map((c) => c.id));
    const recs = allEnr.length ? await getRecords(ENTRY.date, ENTRY.date, allEnr.map((e) => e.id)) : [];
    const eCircle = Object.fromEntries(allEnr.map((e) => [e.id, e.circle_id]));
    circles.forEach((c) => { chipStatus[c.id] = { total: allEnr.filter((e) => e.circle_id === c.id).length, done: recs.filter((r) => eCircle[r.enrollment_id] === c.id).length }; });
  }
  const template = track?.card_items || [];
  const enr = activeEnrollments([circle.id]).map((e) => ({ e, s: studentById(e.student_id) })).filter((x) => x.s && x.s.active).sort((a, b) => byName(a.s, b.s));
  const existing = enr.length ? await getRecords(ENTRY.date, ENTRY.date, enr.map((x) => x.e.id)) : [];
  const wd = new Date(ENTRY.date + 'T12:00:00').getDay();
  const offDay = track && !isEntryDay(track, ENTRY.date);
  const weekly = track?.entry_mode === 'weekly';
  // المسار الأسبوعي: حضور يومي بلا بطاقة في أيام المسار، وبطاقة السرد يوم السرد فقط
  const attendOnly = weekly && wd !== (track.sard_day ?? 3) && (track.days || []).includes(wd);

  v.innerHTML = `<div class="wrap">
  ${cartouche('الإدخال من الواتساب', `${esc(circle.name)}، مسار ${esc(track?.name || '')}`)}
  ${Object.keys(chipStatus).length ? `<div class="circle-chips" role="tablist" aria-label="حلقاتي">${circles.map((c) => { const st = chipStatus[c.id]; const full = st.total && st.done >= st.total;
      return `<button class="cchip${c.id === circle.id ? ' on' : ''}" data-cid="${c.id}" role="tab" aria-selected="${c.id === circle.id}"><b>${esc(c.name)}</b><small class="${full ? 'ok' : st.done ? 'part' : ''}">${!st.total ? 'لا طالبات' : full ? 'اكتمل' : `${st.done} من ${st.total}`}</small></button>`; }).join('')}</div>` : ''}
  <div class="entry-head"${Object.keys(chipStatus).length ? ' style="grid-template-columns:1fr"' : ''}>
    <label class="field${Object.keys(chipStatus).length ? ' hidden' : ''}">الحلقة<select class="input" id="eCircle">${circles.map((c) => `<option value="${c.id}"${c.id === circle.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
    <label class="field">اليوم<input class="input" type="date" id="eDate" value="${ENTRY.date}" max="${today()}"></label>
  </div>
  ${weekly ? `<div class="banner"><span>مسار ${esc(track.name)} حضوره <b>يومي</b> (${daysText(track.days)}) بلا بطاقات، وتُرسل <b>بطاقة السرد</b> يوم ${DAYS[track.sard_day ?? 3]} بعد السرد على الأهل، وحفظها يسجِّل السرد الأسبوعي تلقائيًّا.</span></div>` : ''}
  ${offDay ? `<div class="banner warn"><span>${DAYS[wd]} ليس يوم بطاقات مسار ${esc(track.name)} (${weekly ? `حضور ${daysText(track.days)}، وبطاقة السرد يوم ${DAYS[track.sard_day ?? 3]}` : daysText(track.days)}).</span></div>` : ''}
  ${attendOnly ? attendanceSheet() : ''}
  <section class="sheet"${attendOnly ? ' hidden' : ''}>
    <h2>بطاقات اليوم <small>${existing.length ? `سبق حفظ ${existing.length} من ${enr.length}، والحفظ الجديد يحدِّثها` : `${enr.length} طالبة في الحلقة`}</small></h2>
    <p style="color:var(--ink-2);margin-bottom:10px">انسخي بطاقات الطالبات من الواتساب كما هي، والصقيها هنا. يمكن لصق عدة بطاقات معًا.</p>
    <div class="choices" style="margin-bottom:10px">${template.map((l) => `<span class="tag gray">${esc(l)}</span>`).join('') || '<span class="tag amber">لم تُحدَّد بنود بطاقة هذا المسار</span>'}</div>
    <textarea class="input cards-box" id="cardsText" placeholder="بطاقة الحضور&#10;الاسم : …&#10;اليوم : …">${esc(ENTRY.text)}</textarea>
    <button class="btn block" id="readCards" style="margin-top:10px">قراءة البطاقات</button>
  </section>
  <div id="review"></div></div>`;

  function attendanceSheet() {
    const byE = Object.fromEntries(existing.map((r) => [r.enrollment_id, r.attendance]));
    return `<section class="sheet" id="attSheet"><h2>حضور اليوم <small>${enr.length} طالبة</small></h2>
      <p style="color:var(--ink-2);margin-bottom:10px">اليوم حضور فقط، بلا بطاقات. تُحفظ فقط من تحدّدين حالتها.</p>
      <div class="entry-meta"><span></span><button class="btn sm quiet" id="allHere" type="button">الكل حاضرات</button></div>
      <div id="attList">${enr.map((x) => `<article class="stu" data-eid="${x.e.id}" data-att="${byE[x.e.id] || ''}"><div class="stu-head"><span class="initial">${esc(initial(x.s.full_name))}</span><b>${esc(x.s.full_name)}</b></div>
        <div class="choices">${[['present', 'حضرت'], ['absent', 'لم تحضر'], ['excused', 'مستأذنة']].map(([k, l]) => `<button type="button" class="choice${byE[x.e.id] === k ? ' on' : ''}" data-k="${k}">${l}</button>`).join('')}</div></article>`).join('') || '<div class="empty">لا طالبات في الحلقة</div>'}</div>
      <div class="save-dock"><button class="btn" id="saveAtt" type="button">حفظ الحضور</button></div></section>`;
  }
  if (attendOnly) {
    $$('#attList .choice', v).forEach((b) => (b.onclick = () => { const c = b.closest('.stu'); c.dataset.att = b.dataset.k; $$('.choice', c).forEach((x) => x.classList.toggle('on', x === b)); }));
    $('#allHere').onclick = () => $$('#attList .stu', v).forEach((c) => { c.dataset.att = 'present'; $$('.choice', c).forEach((x) => x.classList.toggle('on', x.dataset.k === 'present')); });
    $('#saveAtt').onclick = async () => {
      const list = $$('#attList .stu', v).filter((c) => c.dataset.att).map((c) => ({ enrollment_id: +c.dataset.eid, record_date: ENTRY.date, attendance: c.dataset.att, grade: null, note: null, entered_by: S.me.id, updated_at: new Date().toISOString(),
        memo_from_surah: null, memo_from_ayah: null, memo_to_surah: null, memo_to_ayah: null, review_from_surah: null, review_from_ayah: null, review_to_surah: null, review_to_ayah: null,
        memo_pages: null, review_pages: null, card: null, shortcoming: false, shortcoming_items: null }));
      if (!list.length) { toast('حدِّدي حالة طالبة واحدة على الأقل', 'bad'); return; }
      const btn = $('#saveAtt'); btn.disabled = true;
      try { await api.upsert('daily_records', list, 'enrollment_id,record_date'); toast(`حُفظ حضور ${list.length} طالبة 🌸`, 'ok'); route(); }
      catch (err) { toast(translateError(err.message), 'bad'); btn.disabled = false; }
    };
  }

  $('#eCircle').onchange = (e) => { ENTRY.circleId = +e.target.value; ENTRY.text = ''; ENTRY.dateTouched = false; route(); };
  $$('.cchip', v).forEach((b) => (b.onclick = () => { if (+b.dataset.cid === ENTRY.circleId) return; ENTRY.circleId = +b.dataset.cid; ENTRY.text = ''; route(); }));
  $('#eDate').onchange = (e) => { if (e.target.value) { ENTRY.date = e.target.value; ENTRY.dateTouched = true; route(); } };
  $('#cardsText').oninput = (e) => { ENTRY.text = e.target.value; };
  $('#readCards').onclick = () => readAndReview();

  function readAndReview() {
    const text = $('#cardsText').value;
    const cards = CardKit.splitWithaqCards(text);
    if (!cards.length) { toast('لم أجد بطاقات في النص. تأكدي أن البنود مكتوبة بصيغة «البند : القيمة»', 'bad'); return; }
    const refs = enr.map((x) => ({ id: x.e.id, name: x.s.full_name }));
    const parsed = cards.map((card) => {
      let m = CardKit.matchStudent(card.name, refs);
      if (m.kind === 'none' && card.sender) m = CardKit.matchStudent(card.sender, refs);
      const ev = CardKit.evaluateCard(card, template);
      const surah = card.items.find((i) => i.key === 'surah')?.value || '';
      const amt = (k) => { const it = card.items.find((i) => i.key === k); return it ? CardKit.readAmount(it.value, it.label, k === 'memo' ? surah : '', SURAH_INFO) : null; };
      return { card, m, ev, excused: !!card.excused, memo: amt('memo'), review: amt('review') };
    });
    const counts = {};
    parsed.forEach((p) => { if (p.m.kind === 'matched') counts[p.m.student.id] = (counts[p.m.student.id] || 0) + 1; });
    const amountText = (a) => !a ? '' : a.range ? `${a.range.surahStart} ${a.range.ayahStart}${a.range.surahEnd !== a.range.surahStart ? ` إلى ${a.range.surahEnd}` : ''}–${a.range.ayahEnd}` : a.pages != null ? fmtPages(a.pages) : '';

    $('#review').innerHTML = `
    <section class="sheet" style="margin-top:16px"><h2>البطاقات المقروءة <small>${parsed.length}</small></h2>
      ${parsed.map((p, i) => {
        const opts = (p.m.kind === 'ambiguous' ? p.m.candidates : refs);
        const sel = p.m.kind === 'matched' ? p.m.student.id : '';
        const dayBad = p.card.day != null && p.card.day !== wd;
        return `<article class="stu card-review ${p.ev.missing.length ? 'short' : 'marked'}" data-i="${i}">
          <div class="stu-head" style="flex-wrap:wrap"><b>${esc(p.card.name || p.card.sender || 'بلا اسم')}</b>
            ${p.excused ? '<span class="tag amber">معتذرة</span>' : p.ev.missing.length ? `<span class="tag red">تقصير: ${p.ev.missing.length}</span>` : '<span class="tag olive">مكتملة</span>'}
            ${dayBad ? `<span class="tag amber">البطاقة ليوم ${DAYS[p.card.day]}</span>` : ''}
            ${p.m.kind === 'matched' && counts[p.m.student.id] > 1 ? '<span class="tag amber">مكرَّرة، تُعتمد الأخيرة</span>' : ''}</div>
          <label class="field">الحالة<select class="input sm att" aria-label="الحالة"><option value="present"${p.excused ? '' : ' selected'}>حضرت</option><option value="excused"${p.excused ? ' selected' : ''}>مستأذنة / معتذرة</option></select></label>
          <label class="field">الطالبة<select class="input sm pick" aria-label="الطالبة">
            <option value="">${p.m.kind === 'ambiguous' ? 'أكثر من طالبة بهذا الاسم، اختاري' : p.m.kind === 'none' ? 'لم أجد الاسم في الحلقة، اختاري' : ''}</option>
            ${opts.map((o) => `<option value="${o.id}"${o.id === sel ? ' selected' : ''}>${esc(o.name)}</option>`).join('')}</select></label>
          <div class="card-items">${p.ev.rows.map((r) => `<div class="ci ${r.ok ? '' : 'bad'}"><span>${esc(r.label)}</span><b>${r.value ? esc(r.value) : (r.present ? 'فارغ' : 'غير موجود')}</b></div>`).join('')}</div>
          ${(p.memo && amountText(p.memo)) || (p.review && amountText(p.review)) ? `<p class="hint-line">${p.memo && amountText(p.memo) ? `الحفظ: ${esc(amountText(p.memo))}` : ''}${p.memo && amountText(p.memo) && p.review && amountText(p.review) ? '، ' : ''}${p.review && amountText(p.review) ? `المراجعة: ${esc(amountText(p.review))}` : ''}</p>` : ''}
        </article>`;
      }).join('')}
    </section>
    <section class="sheet" id="noCard"><h2>لم تُرسل بطاقة <small id="noCardCount"></small></h2><div id="noCardList"></div></section>
    <div class="save-dock"><button class="btn" id="saveCards">حفظ الإدخال</button></div>`;

    const drawNoCard = () => {
      const picked = new Set($$('.card-review .pick', v).map((s) => +s.value).filter(Boolean));
      const rest = enr.filter((x) => !picked.has(x.e.id));
      $('#noCardCount').textContent = rest.length ? `${rest.length}` : '';
      const prev = Object.fromEntries($$('#noCardList .stu', v).map((c) => [c.dataset.eid, c.dataset.att]));
      const savedBy = Object.fromEntries(existing.map((r) => [r.enrollment_id, r]));
      $('#noCardList').innerHTML = rest.map((x) => {
        // من لها سجل محفوظ لهذا اليوم تبقى كما هي، فلا تمحو دفعةٌ جديدة حضورَ الدفعات السابقة
        const saved = savedBy[x.e.id];
        const att = prev[x.e.id] ?? (saved ? 'keep' : 'absent');
        const opts = saved ? [['keep', `كما هي: ${ATT[saved.attendance] || ''}`], ['absent', 'غائبة'], ['excused', 'مستأذنة']] : [['absent', 'غائبة'], ['excused', 'مستأذنة'], ['', 'بلا تسجيل']];
        return `<article class="stu" data-eid="${x.e.id}" data-att="${att}"><div class="stu-head"><span class="initial">${esc(initial(x.s.full_name))}</span><b>${esc(x.s.full_name)}</b></div>
        <div class="choices">${opts.map(([k, l]) => `<button type="button" class="choice${att === k ? ' on' : ''}" data-v="${k || 'none'}" data-k="${k}">${l}</button>`).join('')}</div></article>`;
      }).join('') || '<div class="empty">وصلت بطاقات كل الطالبات 🌸</div>';
      $$('#noCardList .choice', v).forEach((b) => (b.onclick = () => { const c = b.closest('.stu'); c.dataset.att = b.dataset.k; $$('.choice', c).forEach((x) => x.classList.toggle('on', x === b)); }));
    };
    drawNoCard();
    $$('.card-review .pick', v).forEach((s) => (s.onchange = drawNoCard));
    $('#review').scrollIntoView({ behavior: 'smooth', block: 'start' });

    $('#saveCards').onclick = async () => {
      const rows = new Map(); const unpicked = [];
      $$('.card-review', v).forEach((el) => {
        const p = parsed[+el.dataset.i]; const eid = +el.querySelector('.pick').value;
        if (!eid) { unpicked.push(p.card.name || p.card.sender || 'بطاقة بلا اسم'); return; }
        const exc = el.querySelector('.att')?.value === 'excused';
        if (exc) { rows.set(eid, { enrollment_id: eid, record_date: ENTRY.date, attendance: 'excused', grade: null, note: null, entered_by: S.me.id, updated_at: new Date().toISOString(),
          memo_from_surah: null, memo_from_ayah: null, memo_to_surah: null, memo_to_ayah: null, review_from_surah: null, review_from_ayah: null, review_to_surah: null, review_to_ayah: null,
          memo_pages: null, review_pages: null, card: null, shortcoming: false, shortcoming_items: null }); return; }
        const row = { enrollment_id: eid, record_date: ENTRY.date, attendance: 'present', grade: null, note: null, entered_by: S.me.id, updated_at: new Date().toISOString(),
          memo_from_surah: null, memo_from_ayah: null, memo_to_surah: null, memo_to_ayah: null, review_from_surah: null, review_from_ayah: null, review_to_surah: null, review_to_ayah: null,
          memo_pages: null, review_pages: null,
          card: p.ev.rows.map((r) => ({ label: r.label, value: r.value, ok: r.ok })), shortcoming: p.ev.missing.length > 0, shortcoming_items: p.ev.missing };
        for (const [k, a] of [['memo', p.memo], ['review', p.review]]) {
          if (!a) continue;
          if (a.range) {
            const fs = surahNo(a.range.surahStart); const ts = surahNo(a.range.surahEnd);
            if (fs && ts) Object.assign(row, { [`${k}_from_surah`]: fs, [`${k}_from_ayah`]: a.range.ayahStart, [`${k}_to_surah`]: ts, [`${k}_to_ayah`]: a.range.ayahEnd, [`${k}_pages`]: Math.round(pagesOfRange(fs, a.range.ayahStart, ts, a.range.ayahEnd) * 100) / 100 });
          } else if (a.pages != null) row[`${k}_pages`] = Math.round(a.pages * 100) / 100;
        }
        rows.set(eid, row);
      });
      if (unpicked.length) { toast(`حدِّدي الطالبة لبطاقة: ${unpicked[0]}`, 'bad'); return; }
      const carded = rows.size; let newAbsent = 0;
      $$('#noCardList .stu', v).forEach((c) => {
        if (!c.dataset.att || c.dataset.att === 'keep') return;
        if (c.dataset.att === 'absent' && !existing.some((r) => r.enrollment_id === +c.dataset.eid && r.attendance === 'absent')) newAbsent++;
        rows.set(+c.dataset.eid, { enrollment_id: +c.dataset.eid, record_date: ENTRY.date, attendance: c.dataset.att, grade: null, note: null, entered_by: S.me.id, updated_at: new Date().toISOString(),
          memo_from_surah: null, memo_from_ayah: null, memo_to_surah: null, memo_to_ayah: null, review_from_surah: null, review_from_ayah: null, review_to_surah: null, review_to_ayah: null,
          memo_pages: null, review_pages: null, card: null, shortcoming: false, shortcoming_items: null });
      });
      const list = [...rows.values()];
      if (!list.length) { toast('لا يوجد ما يُحفظ', 'bad'); return; }
      // حماية من الخطأ الشائع: لصقُ جزءٍ من البطاقات ثم الحفظ، فيُسجَّل غياب الباقيات
      if (newAbsent >= 3 && newAbsent > carded) {
        if (!(await confirmBox(`قرأتُ ${carded} بطاقة فقط، وسيُسجَّل غياب ${newAbsent} طالبة لأنه لم تصل لهن بطاقة. هل لصقتِ كل بطاقات اليوم؟`, 'نعم، سجِّليهن غائبات'))) return;
      }
      const btn = $('#saveCards'); btn.disabled = true; btn.textContent = 'جارٍ الحفظ…';
      try {
        await api.upsert('daily_records', list, 'enrollment_id,record_date');
        // المسارات الأسبوعية: البطاقة تُرسل بعد السرد على الأهل، فتسجِّل السرد تلقائيًّا
        if (weekly && track.sard_day === wd) {
          const sardRows = list.filter((r) => r.attendance !== 'excused').map((r) => ({ enrollment_id: r.enrollment_id, sard_date: ENTRY.date, done: r.attendance === 'present', note: 'من بطاقة الأسبوع', recorded_by: S.me.id, updated_at: new Date().toISOString() }));
          if (sardRows.length) await api.upsert('weekly_sard', sardRows, 'enrollment_id,sard_date');
        }
        const short = list.filter((r) => r.shortcoming).length;
        ENTRY.text = '';
        toast(`حُفظ إدخال ${list.length} طالبة${short ? `، منهن ${short} مقصِّرة` : ''} 🌸`, 'ok'); route();
      } catch (err) { toast(translateError(err.message), 'bad'); btn.disabled = false; btn.textContent = 'حفظ الإدخال'; }
    };
  }
};

/* =========================================================
   الطالبات
   ========================================================= */
const STU = { q: '', circle: '' };
PAGES.students = async (v) => {
  const circles = myCircles();
  v.innerHTML = `<div class="wrap">${cartouche('الطالبات', '<span id="stuCount"></span>')}
  <div class="toolbar">
    <input class="input" id="stuQ" type="search" placeholder="ابحثي بالاسم أو الهاتف" value="${esc(STU.q)}" aria-label="بحث">
    <select class="input" id="stuC" aria-label="الحلقة"><option value="">كل الحلقات</option>${circles.map((c) => `<option value="${c.id}"${+STU.circle === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}<option value="archive"${STU.circle === 'archive' ? ' selected' : ''}>الأرشيف</option>${isAdmin() ? `<option value="none"${STU.circle === 'none' ? ' selected' : ''}>بلا حلقة</option>` : ''}</select>
    ${canEditStudents() ? '<div class="end"><button class="btn" id="addStu">إضافة طالبة</button></div>' : ''}
  </div>
  <section class="sheet"><div class="lines" id="stuList"></div></section></div>`;
  const draw = () => {
    let list = visibleStudents().filter((s) => STU.circle === 'archive' ? !s.active : s.active);
    if (STU.circle === 'archive') { /* المؤرشفات فقط */ }
    else if (STU.circle === 'none') list = list.filter((s) => !studentCircles(s.id).length);
    else if (STU.circle) list = list.filter((s) => studentCircles(s.id).some((c) => c.id === +STU.circle));
    if (STU.q) list = list.filter((s) => s.full_name.includes(STU.q) || (s.phone || '').includes(STU.q));
    $('#stuList').innerHTML = list.map((s) => `<a class="line" href="#/student/${s.id}"><span class="initial">${esc(initial(s.full_name))}</span>
      <div class="grow"><div class="t">${esc(s.full_name)}</div><div class="s">${esc(studentCircles(s.id).map((c) => c.name).join('، ') || 'بلا حلقة')}</div></div>
      ${s.active ? '' : '<span class="tag gray">مؤرشفة</span>'}</a>`).join('') || `<div class="empty">${STU.circle === 'archive' ? 'الأرشيف فارغ' : 'لا نتائج. جرِّبي اسمًا آخر.'}</div>`;
    $('#stuCount').textContent = `${list.length} طالبة`;
  };
  draw();
  $('#stuQ').oninput = (e) => { STU.q = e.target.value.trim(); draw(); };
  $('#stuC').onchange = (e) => { STU.circle = e.target.value; draw(); };
  const add = $('#addStu'); if (add) add.onclick = () => studentForm();
};

// ---- حقول مشتركة: البلد، والمسار ثم الحلقة ----
const COUNTRIES = ['السعودية', 'موريتانيا', 'اليمن', 'مصر', 'السودان', 'الأردن', 'سوريا', 'فلسطين', 'العراق', 'الكويت', 'الإمارات', 'قطر', 'البحرين', 'عُمان', 'المغرب', 'الجزائر', 'تونس', 'ليبيا', 'الصومال', 'تشاد', 'مالي', 'السنغال', 'تركيا', 'إندونيسيا', 'ماليزيا', 'باكستان', 'الهند', 'نيجيريا'];
const countryList = `<datalist id="countries">${COUNTRIES.map((c) => `<option value="${c}">`).join('')}</datalist>`;
function trackCircleFields({ multi = false, selected = [], current = null } = {}) {
  const circles = myCircles();
  const tracks = S.tracks.filter((t) => circles.some((c) => c.track_id === t.id));
  const firstSel = circles.find((c) => selected.includes(c.id));
  const tSel = firstSel?.track_id || (tracks.length === 1 ? tracks[0].id : '');
  return `<label class="field">المسار<select class="input" name="tc_track"><option value="">اختاري المسار</option>${tracks.map((t) => `<option value="${t.id}"${t.id === tSel ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label>
    <div class="field ${multi ? 'full' : ''}" data-tc-box data-multi="${multi ? 1 : 0}" data-selected="${selected.join(',')}" data-current="${current ?? ''}">${multi ? 'حلقتها (يمكن أكثر من حلقة)' : 'الحلقة'}<div data-tc-list></div></div>`;
}
function wireTrackCircle(m) {
  const tsel = m.querySelector('[name=tc_track]'); const box = m.querySelector('[data-tc-box]'); if (!tsel || !box) return;
  const list = box.querySelector('[data-tc-list]'); const multi = box.dataset.multi === '1';
  const selected = (box.dataset.selected || '').split(',').filter(Boolean).map(Number); const current = +box.dataset.current || null;
  const draw = () => {
    const cs = myCircles().filter((c) => c.track_id === +tsel.value).sort(byName);
    if (!tsel.value) { list.innerHTML = '<span class="hint-line">اختاري المسار أولًا</span>'; return; }
    if (multi) list.innerHTML = `<div class="choices">${cs.map((c) => { const other = c.teacher_ref && c.teacher_ref !== current ? teacherById(c.teacher_ref)?.full_name : '';
        return `<label class="choice"><input type="checkbox" name="tc_circle" value="${c.id}" ${selected.includes(c.id) ? 'checked' : ''} style="accent-color:var(--rose-deep)"> ${esc(c.name)}${other ? ` <small style="color:var(--ink-3)">(${esc(other)})</small>` : ''}</label>`; }).join('') || '<span class="hint-line">لا حلقات</span>'}</div>`;
    else list.innerHTML = `<select class="input" name="tc_circle"><option value="">بدون حلقة الآن</option>${cs.map((c) => `<option value="${c.id}"${selected.includes(c.id) ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select>`;
  };
  tsel.onchange = draw; draw();
}

function studentForm(s = null) {
  modal(`<h2>${s ? 'تعديل بيانات الطالبة' : 'طالبة جديدة'}</h2>
    <form class="form-grid" id="sf">${countryList}
      <label class="field full">الاسم الكامل<input class="input" name="full_name" required value="${esc(s?.full_name)}"></label>
      <label class="field">رقم الهاتف<input class="input" name="phone" inputmode="tel" dir="ltr" value="${esc(s?.phone)}"></label>
      <label class="field">العمر<input class="input" name="age" type="number" min="3" max="100" inputmode="numeric" value="${esc(s?.age)}"></label>
      <label class="field">البلد<input class="input" name="nationality" list="countries" value="${esc(s?.nationality)}"></label>
      <label class="field">بلد الإقامة<input class="input" name="residence" list="countries" value="${esc(s?.residence)}"></label>
      ${s ? '' : trackCircleFields({ selected: STU.circle && STU.circle !== 'none' ? [+STU.circle] : [] })}
      <div class="actions full"><button class="btn" type="submit">${s ? 'حفظ التعديل' : 'إضافة الطالبة'}</button><button class="btn ghost" type="button" data-close>إلغاء</button></div>
    </form>`, (m, close) => {
    wireTrackCircle(m);
    m.querySelector('#sf').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const row = { full_name: fd.get('full_name').trim(), phone: fd.get('phone').trim() || null, age: +fd.get('age') || null, nationality: fd.get('nationality').trim() || null, residence: fd.get('residence').trim() || null };
      try {
        if (s) await api.update('students', s.id, row);
        else {
          const created = await api.insert('students', { ...row, active: true, joined_at: today() });
          const cid = +fd.get('tc_circle');
          if (cid) await api.insert('enrollments', { student_id: created.id, circle_id: cid, active: true, started_at: today() });
        }
        await loadAll(); close(); toast(s ? 'حُفظ التعديل 🌸' : 'أُضيفت الطالبة 🌸', 'ok'); route();
      } catch (err) { toast(translateError(err.message), 'bad'); }
    };
  });
}

PAGES.student = async (v, arg) => {
  const s = studentById(+arg);
  if (!s || !visibleStudents().includes(s)) { v.innerHTML = '<div class="wrap"><div class="sheet empty">الطالبة غير موجودة أو خارج نطاق صلاحياتكِ</div></div>'; return; }
  const enrs = S.enrollments.filter((e) => e.student_id === s.id);
  const recs = enrs.length ? await api.list('daily_records', { in: { enrollment_id: enrs.map((e) => e.id) } }) : [];
  recs.sort((a, b) => b.record_date.localeCompare(a.record_date));
  const cnt = (k) => recs.filter((r) => r.attendance === k).length;
  const memoTotal = Math.round(recs.reduce((n, r) => n + memoPages(r), 0) * 10) / 10;
  const lastM = recs.find((r) => r.memo_to_surah);
  const cov = juzCoverage(recs.map((r) => [r.memo_from_surah, r.memo_from_ayah, r.memo_to_surah, r.memo_to_ayah]));
  const enrCircle = Object.fromEntries(enrs.map((e) => [e.id, circleById(e.circle_id)]));
  const editable = canEditStudents();

  const accounts = S.profiles.filter((p) => p.role === 'student' && p.student_id === s.id);
  const sardEnr = enrs.filter((e) => e.active && trackOfCircle(circleById(e.circle_id))?.sard_day != null);
  let sardRow = null;
  if (sardEnr.length) {
    const sards = await api.list('weekly_sard', { in: { enrollment_id: sardEnr.map((e) => e.id) } });
    const byKey = Object.fromEntries(sards.map((x) => [`${x.enrollment_id}|${x.sard_date}`, x]));
    const e = sardEnr[0]; const dates = sardDates(trackOfCircle(circleById(e.circle_id)), 6);
    sardRow = { e, dates, ...sardStreak(e, dates, byKey) };
  }
  v.innerHTML = `<div class="wrap">
  ${isStu() ? cartouche('تقدُّمي', `أهلًا بكِ يا ${esc(firstName(s.full_name))} 🌸 ${fmtDate(today())}، ${HIJRI()}`) : ''}
  <section class="sheet">
    <div class="profile"><span class="initial lg rose">${esc(initial(s.full_name))}</span>
      <div class="grow"><h2>${esc(s.full_name)}</h2>
        <div class="choices">${studentCircles(s.id).map((c) => `<span class="tag rose">${esc(c.name)}</span>`).join('') || '<span class="tag gray">بلا حلقة</span>'}${s.active ? '' : '<span class="tag gray">غير نشطة</span>'}</div></div>
      ${editable ? '<button class="btn sm ghost" id="editStu">تعديل البيانات</button>' : ''}${editable ? (s.active ? '<button class="btn sm danger" id="arcStu">أرشفة</button>' : '<button class="btn sm" id="arcStu">إرجاع من الأرشيف</button>') : ''}</div>
    <dl class="facts">
      <div><dt>هاتف الطالبة</dt><dd dir="ltr" style="text-align:right">${esc(s.phone || '—')}</dd></div>
      <div><dt>العمر</dt><dd>${s.age ? `${s.age} سنة` : '—'}</dd></div>
      <div><dt>البلد</dt><dd>${esc(s.nationality || '—')}</dd></div>
      <div><dt>بلد الإقامة</dt><dd>${esc(s.residence || '—')}</dd></div>
      ${s.guardian_phone ? `<div><dt>هاتف وليِّ الأمر</dt><dd dir="ltr" style="text-align:right">${esc(s.guardian_phone)}</dd></div>` : ''}
      <div><dt>الالتحاق</dt><dd>${s.joined_at ? fmtDate(s.joined_at, { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</dd></div>
      <div><dt>آخر موضع حفظ</dt><dd>${lastM ? esc(posText(lastM.memo_to_surah, lastM.memo_to_ayah)) : '—'}</dd></div>
      ${sardRow ? `<div><dt>السرد الأسبوعي (آخر ٤)</dt><dd>${trailHtml(sardRow)} ${sardRow.streak >= SARD_LIMIT ? '<span class="tag red">وصلت حدَّ الحذف</span>' : sardRow.streak ? '<span class="tag amber">فاتها أسبوع</span>' : ''}</dd></div>` : ''}
      ${studentCircles(s.id).some((c) => instructorName(c)) ? `<div><dt>المعلِّمة</dt><dd>${esc(studentCircles(s.id).map((c) => instructorName(c)).filter(Boolean).join('، '))}</dd></div>` : ''}
    </dl>
    ${s.notes ? `<p style="margin-top:12px;color:var(--ink-2)">${esc(s.notes)}</p>` : ''}
  </section>
  <div class="strip" style="margin-top:16px">
    <div><div class="n olive num">${pct(cnt('present') + cnt('late'), recs.length)}%</div><div class="l">نسبة الحضور</div></div>
    <div><div class="n red num">${cnt('absent')}</div><div class="l">مرات الغياب</div></div>
    <div><div class="n rose num">${memoTotal}</div><div class="l">وجهًا محفوظًا</div></div>
    <div><div class="n num" style="color:var(--amber)">${recs.filter((r) => r.shortcoming).length}</div><div class="l">مرات التقصير</div></div>
  </div>
  <section class="sheet"><h2>خريطة الأجزاء <small>ما سُجِّل من حفظ في الموقع</small></h2>
    <div class="juzmap">${cov.map((c, i) => `<div class="juz ${c >= 0.999 ? 'full' : c > 0 ? 'some' : ''}" title="الجزء ${i + 1}: ${Math.round(c * 100)}%"><i style="height:${Math.round(c * 100)}%"></i><span>${i + 1}</span></div>`).join('')}</div>
    <div class="legend"><span><i style="background:#f3e7ec;border:1px solid var(--rule)"></i>لم يُسجَّل</span><span><i style="background:var(--rose)"></i>جزئي</span><span><i style="background:var(--olive)"></i>جزء كامل</span></div>
  </section>
  <section class="sheet"><h2>الحلقات</h2><div class="lines">
    ${enrs.map((e) => `<div class="line"><div class="grow"><div class="t">${esc(circleById(e.circle_id)?.name)}</div><div class="s">${e.active ? 'منذ' : 'انتهت في'} ${fmtShort(e.active ? e.started_at : (e.ended_at || e.started_at))}</div></div>
      ${e.active ? (editable ? `<button class="btn sm ghost" data-move="${e.id}">نقل</button><button class="btn sm danger" data-end="${e.id}">إنهاء</button>` : '<span class="tag olive">حالية</span>') : '<span class="tag gray">سابقة</span>'}</div>`).join('') || '<div class="empty">لم تلتحق بحلقة بعد</div>'}
  </div>${editable ? '<button class="btn sm quiet" id="enrollBtn" style="margin-top:12px">إضافة إلى حلقة</button>' : ''}</section>
  <section class="sheet"><h2>السجل <small>آخر ٤٠ يومًا مسجَّلًا</small></h2><div class="lines timeline">
    ${recs.slice(0, 40).map((r) => `<div class="line"><div class="when">${fmtShort(r.record_date)}</div><div class="grow">
      <div class="choices">${attTag(r.attendance)}${r.shortcoming ? '<span class="tag amber">تقصير</span>' : ''}${r.grade ? `<span class="tag ${r.grade === 'repeat' ? 'red' : 'rose'}">${GRADE[r.grade]}</span>` : ''}${enrs.length > 1 ? `<span class="tag gray">${esc(enrCircle[r.enrollment_id]?.name)}</span>` : ''}</div>
      ${r.memo_to_surah ? `<div class="s">حفظ: ${esc(rangeText(r.memo_from_surah, r.memo_from_ayah, r.memo_to_surah, r.memo_to_ayah))}</div>` : ''}
      ${r.review_to_surah ? `<div class="s">مراجعة: ${esc(rangeText(r.review_from_surah, r.review_from_ayah, r.review_to_surah, r.review_to_ayah))}</div>` : ''}
      ${!r.memo_to_surah && r.memo_pages ? `<div class="s">حفظ: ${fmtPages(+r.memo_pages)}</div>` : ''}
      ${!r.review_to_surah && r.review_pages ? `<div class="s">مراجعة: ${fmtPages(+r.review_pages)}</div>` : ''}
      ${r.shortcoming && r.shortcoming_items?.length ? `<div class="s" style="color:var(--amber)">أخلَّت بـ: ${esc(r.shortcoming_items.join('، '))}</div>` : ''}
      ${r.note ? `<div class="s">ملاحظة: ${esc(r.note)}</div>` : ''}</div>${!isStu() ? `<button class="btn sm quiet" data-rec="${r.id}">تعديل</button>` : ''}</div>`).join('') || '<div class="empty">لا سجل بعد</div>'}
  </div></section></div>`;

  const ed = $('#editStu'); if (ed) ed.onclick = () => studentForm(s);
  // تعديل سجل يوم أو حذفه (لمن لها صلاحية الحلقة: المشرفة ومسؤولة المسار والقائدة)
  $$('[data-rec]', v).forEach((b) => (b.onclick = () => {
    const r = recs.find((x) => x.id === +b.dataset.rec); if (!r) return;
    modal(`<h2>سجل ${esc(fmtShort(r.record_date))}</h2>
      <label class="field">الحضور<select class="input" id="rAtt">${Object.entries(ATT).map(([k, l]) => `<option value="${k}"${r.attendance === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field"><span>تقصير</span><select class="input" id="rShort"><option value="0"${!r.shortcoming ? ' selected' : ''}>بلا تقصير</option><option value="1"${r.shortcoming ? ' selected' : ''}>تقصير</option></select></label>
      <label class="field">ملاحظة<input class="input" id="rNote" value="${esc(r.note || '')}"></label>
      <div class="actions"><button class="btn" id="rSave">حفظ</button><button class="btn danger" id="rDel">حذف السجل</button><button class="btn ghost" data-close>إلغاء</button></div>`,
    (m, close) => {
      m.querySelector('#rSave').onclick = async () => {
        try {
          const sh = m.querySelector('#rShort').value === '1';
          await api.update('daily_records', r.id, { attendance: m.querySelector('#rAtt').value, shortcoming: sh, shortcoming_items: sh ? r.shortcoming_items : null, note: m.querySelector('#rNote').value.trim() || null, entered_by: S.me.id, updated_at: new Date().toISOString() });
          close(); toast('تم التعديل 🌸', 'ok'); route();
        } catch (err) { toast(translateError(err.message), 'bad'); }
      };
      m.querySelector('#rDel').onclick = async () => {
        if (!(await confirmBox('حذف سجل هذا اليوم؟ يصير اليوم بلا تسجيل، ويمكنكِ إعادة إدخاله من الإدخال.', 'حذف'))) return;
        try { await api.remove('daily_records', r.id); close(); toast('حُذف السجل', 'ok'); route(); } catch (err) { toast(translateError(err.message), 'bad'); }
      };
    });
  }));
  const ar = $('#arcStu'); if (ar) ar.onclick = async () => {
    try {
      if (s.active) {
        if (!(await confirmBox(`أرشفة ${s.full_name}؟ تخرج من حلقتها وقوائم الإدخال، وتبقى بياناتها وسجلاتها، ويمكن إرجاعها متى شئتِ.`, 'أرشفة'))) return;
        for (const e of S.enrollments.filter((x) => x.student_id === s.id && x.active)) await api.update('enrollments', e.id, { active: false, ended_at: today() });
        await api.update('students', s.id, { active: false });
        toast('أُرشفت الطالبة', 'ok');
      } else {
        await api.update('students', s.id, { active: true });
        const last = S.enrollments.filter((x) => x.student_id === s.id).sort((a, b) => String(b.ended_at || '').localeCompare(String(a.ended_at || '')) || b.id - a.id)[0];
        const back = last && myCircles().some((c) => c.id === last.circle_id);
        if (back) await api.insert('enrollments', { student_id: s.id, circle_id: last.circle_id, active: true, started_at: today() });
        toast(back ? `رجعت إلى ${circleById(last.circle_id)?.name} 🌸` : 'رجعت من الأرشيف 🌸 أضيفيها إلى حلقة', 'ok');
      }
      await loadAll(); route();
    } catch (err) { toast(translateError(err.message), 'bad'); }
  };
  const activeIds = enrs.filter((e) => e.active).map((e) => e.circle_id);
  const pickCircle = (title, onPick) => {
    const options = myCircles().filter((c) => !activeIds.includes(c.id));
    if (!options.length) { toast('لا توجد حلقة أخرى متاحة', 'bad'); return; }
    modal(`<h2>${title}</h2><label class="field">الحلقة<select class="input" id="pc">${options.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
      <div class="actions"><button class="btn" id="pcOk">${title}</button><button class="btn ghost" data-close>إلغاء</button></div>`,
    (m, close) => { m.querySelector('#pcOk').onclick = async () => { try { await onPick(+m.querySelector('#pc').value); await loadAll(); close(); toast('تم 🌸', 'ok'); route(); } catch (err) { toast(translateError(err.message), 'bad'); } }; });
  };
  const en = $('#enrollBtn'); if (en) en.onclick = () => pickCircle('إضافة إلى حلقة', (cid) => api.insert('enrollments', { student_id: s.id, circle_id: cid, active: true, started_at: today() }));
  $$('[data-move]', v).forEach((b) => (b.onclick = () => pickCircle('نقل إلى حلقة', async (cid) => {
    await api.update('enrollments', +b.dataset.move, { active: false, ended_at: today() });
    await api.insert('enrollments', { student_id: s.id, circle_id: cid, active: true, started_at: today() });
  })));
  $$('[data-end]', v).forEach((b) => (b.onclick = async () => {
    if (!(await confirmBox('إنهاء التحاق الطالبة بهذه الحلقة؟ يبقى سجلُّها محفوظًا.', 'إنهاء الالتحاق'))) return;
    try { await api.update('enrollments', +b.dataset.end, { active: false, ended_at: today() }); await loadAll(); route(); } catch (err) { toast(translateError(err.message), 'bad'); }
  }));
};

/* =========================================================
   التقارير
   ========================================================= */
const REP = { from: null, to: null, track: '', circle: '', tab: 'students' };
PAGES.reports = async (v) => {
  REP.from = REP.from || monthStart(); REP.to = REP.to || today();
  let circles = myCircles(true);
  const tracksAvail = S.tracks.filter((t) => circles.some((c) => c.track_id === t.id));
  if (REP.track) circles = circles.filter((c) => c.track_id === +REP.track);
  if (REP.circle) circles = circles.filter((c) => c.id === +REP.circle);
  const cids = circles.map((c) => c.id);
  const enrAll = S.enrollments.filter((e) => cids.includes(e.circle_id));
  const enrById = Object.fromEntries(enrAll.map((e) => [e.id, e]));
  const recs = (await getRecords(REP.from, REP.to)).filter((r) => enrById[r.enrollment_id]);
  const memoOf = (r) => memoPages(r);
  const r1 = (x) => Math.round(x * 10) / 10;

  const per = {};
  recs.forEach((r) => {
    const p = per[r.enrollment_id] ||= { present: 0, late: 0, absent: 0, excused: 0, memo: 0, review: 0, repeat: 0, last: null, lastDate: '' };
    p[r.attendance]++; p.memo += memoOf(r);
    p.review += reviewPages(r);
    if (r.shortcoming) p.repeat++;
    if (r.memo_to_surah && r.record_date >= p.lastDate) { p.last = [r.memo_to_surah, r.memo_to_ayah]; p.lastDate = r.record_date; }
  });
  const stuRows = Object.entries(per).map(([eid, p]) => {
    const e = enrById[eid]; const total = p.present + p.late + p.absent + p.excused;
    return [studentById(e.student_id)?.full_name || '—', circleById(e.circle_id)?.name, p.present, p.late, p.absent, p.excused, pct(p.present + p.late, total) + '%', r1(p.memo), r1(p.review), p.repeat, p.last ? posText(...p.last) : '—'];
  }).sort((a, b) => String(a[1]).localeCompare(String(b[1]), 'ar') || String(a[0]).localeCompare(String(b[0]), 'ar'));
  const cirRows = circles.map((c) => {
    const cr = recs.filter((r) => enrById[r.enrollment_id].circle_id === c.id);
    return [c.name, trackName(c.track_id), profileName(c.teacher_id), instructorName(c) || '—', activeEnrollments([c.id]).length, new Set(cr.map((r) => r.record_date)).size,
      pct(cr.filter((r) => r.attendance === 'present' || r.attendance === 'late').length, cr.length) + '%', cr.filter((r) => r.attendance === 'absent').length, cr.filter((r) => r.shortcoming).length, r1(cr.reduce((n, r) => n + memoOf(r), 0))];
  });
  const teacherIds = [...new Set(circles.map((c) => c.teacher_id).filter(Boolean))];
  const sa = teacherIds.length ? await api.list('staff_attendance', { gte: { record_date: REP.from }, lte: { record_date: REP.to }, in: { profile_id: teacherIds } }) : [];
  const staffRows = teacherIds.map((pid) => {
    const mine = sa.filter((x) => x.profile_id === pid); const c = (k) => mine.filter((x) => x.status === k).length;
    return [profileName(pid), circles.filter((x) => x.teacher_id === pid).map((x) => x.name).join('، '), c('present'), c('late'), c('absent'), c('excused')];
  }).sort((a, b) => b[4] - a[4]);

  const TABS = {
    students: ['الطالبات', ['الطالبة', 'الحلقة', 'حضور', 'تأخر', 'غياب', 'استئذان', 'نسبة الحضور', 'أوجه الحفظ', 'أوجه المراجعة', 'مرات التقصير', 'آخر موضع'], stuRows, 2],
    circles: ['الحلقات', ['الحلقة', 'المسار', 'مشرفة الحلقة', 'المعلِّمة', 'الطالبات', 'أيام الإدخال', 'نسبة الحضور', 'مرات الغياب', 'مرات التقصير', 'أوجه الحفظ'], cirRows, 4],
    staff: ['المشرفات', ['مشرفة الحلقة', 'الحلقات', 'حضور', 'تأخر', 'غياب', 'اعتذار'], staffRows, 2],
  };
  const [label, head, rows, numFrom] = TABS[REP.tab];
  const longDate = (d) => fmtDate(d, { day: 'numeric', month: 'long', year: 'numeric' });

  v.innerHTML = `<div class="wrap">
  <div class="print-only"><img src="${LOGO}" alt=""><h2>تقرير ${label}</h2><p>من ${longDate(REP.from)} إلى ${longDate(REP.to)}</p></div>
  <div class="no-print">${cartouche('التقارير', `${recs.length} سجلًّا من ${longDate(REP.from)} إلى ${longDate(REP.to)}`)}</div>
  <div class="toolbar">
    <label class="field">من<input class="input" type="date" id="rFrom" value="${REP.from}"></label>
    <label class="field">إلى<input class="input" type="date" id="rTo" value="${REP.to}"></label>
    ${tracksAvail.length > 1 ? `<label class="field">المسار<select class="input" id="rTrack"><option value="">كل المسارات</option>${tracksAvail.map((t) => `<option value="${t.id}"${+REP.track === t.id ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label>` : ''}
    <label class="field">الحلقة<select class="input" id="rCircle"><option value="">كل الحلقات</option>${myCircles(true).filter((c) => !REP.track || c.track_id === +REP.track).map((c) => `<option value="${c.id}"${+REP.circle === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
    <div class="end"><button class="btn sm quiet" id="csv">تنزيل Excel</button><button class="btn sm ghost" id="prt">طباعة</button></div>
  </div>
  <div class="tabs" role="tablist">${Object.entries(TABS).map(([k, [l]]) => `<button class="tab${REP.tab === k ? ' on' : ''}" role="tab" aria-selected="${REP.tab === k}" data-tab="${k}">${l}</button>`).join('')}</div>
  ${rows.length ? `<div class="table-wrap"><table><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td class="${i >= numFrom ? 'num' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
    : '<div class="sheet empty">لا بيانات في هذه الفترة. وسِّعي نطاق التاريخ أو اختاري حلقة أخرى.</div>'}</div>`;

  const set = (k) => (e) => { REP[k] = e.target.value; if (k === 'track') REP.circle = ''; route(); };
  $('#rFrom').onchange = set('from'); $('#rTo').onchange = set('to');
  const rt = $('#rTrack'); if (rt) rt.onchange = set('track');
  $('#rCircle').onchange = set('circle');
  $$('[data-tab]', v).forEach((b) => (b.onclick = () => { REP.tab = b.dataset.tab; route(); }));
  $('#csv').onclick = () => downloadCSV(`تقرير-${label}-${REP.from}-${REP.to}`, head, rows);
  $('#prt').onclick = () => window.print();
};

/* =========================================================
   المعلِّمات
   ========================================================= */
const STF = { date: null };
PAGES.staff = async (v) => {
  STF.date = STF.date || today();
  const pending = S.profiles.filter((p) => p.role === 'pending');
  const staff = S.profiles.filter((p) => !['pending', 'student', 'disabled'].includes(p.role)).sort(byName);
  const archived = S.profiles.filter((p) => p.role === 'disabled').sort(byName);
  const leadSups = isSup() ? S.profiles.filter((p) => p.role === 'teacher' && S.circles.some((c) => c.teacher_id === p.id) && S.circles.filter((c) => c.teacher_id === p.id).every((c) => inMyTracks(c.track_id))).sort(byName) : [];
  const leadArch = isSup() ? archived.filter((p) => inMyTracks(p.archived_track) && ['teacher', 'pending', null, undefined].includes(p.archived_role)) : [];
  const teachers = isAdmin()
    ? S.profiles.filter((p) => p.role === 'teacher' || (!['pending', 'disabled'].includes(p.role) && S.circles.some((c) => c.teacher_id === p.id))).sort(byName)
    : [...new Set(myCircles().map((c) => c.teacher_id).filter(Boolean))].map((id) => S.profiles.find((p) => p.id === id)).filter(Boolean).sort(byName);
  const att = teachers.length ? await api.list('staff_attendance', { eq: { record_date: STF.date }, in: { profile_id: teachers.map((t) => t.id) } }) : [];
  const by = Object.fromEntries(att.map((a) => [a.profile_id, a]));
  const circlesOf = (id) => S.circles.filter((c) => c.teacher_id === id).map((c) => c.name).join('، ');

  v.innerHTML = `<div class="wrap">${cartouche('الكادر', 'الحسابات وحضور مشرفات الحلقات')}
  ${isAdmin() && pending.length ? `<section class="sheet"><h2>بانتظار التفعيل <small>${pending.length}</small></h2><div class="lines">
    ${pending.map((p) => `<div class="line"><span class="initial rose">${esc(initial(p.full_name))}</span><div class="grow"><div class="t">${esc(p.full_name)}</div><div class="s"><span dir="ltr">${esc(p.username)}</span>${p.requested_role ? `، ${ROLE[p.requested_role] || ''}` : ''}${p.requested_role === 'supervisor' && p.track_id ? ` (${esc(trackName(p.track_id))})` : ''}${S.circles.some((c) => c.teacher_id === p.id) ? ` (${esc(S.circles.filter((c) => c.teacher_id === p.id).map((c) => c.name).join('، '))})` : ''}</div></div><button class="btn sm" data-edit="${esc(p.id)}">تفعيل</button></div>`).join('')}
  </div></section>` : ''}
  <section class="sheet"><h2>حضور مشرفات الحلقات</h2>
    <label class="field" style="max-width:220px;margin-bottom:12px">اليوم<input class="input" type="date" id="sDate" value="${STF.date}" max="${today()}"></label>
    <div id="sAtt">${teachers.map((t) => `<article class="stu" data-pid="${esc(t.id)}" data-att="${by[t.id]?.status || ''}">
      <div class="stu-head"><span class="initial">${esc(initial(t.full_name))}</span><b>${esc(t.full_name)}</b><span class="last">${esc(circlesOf(t.id) || 'بلا حلقة')}</span></div>
      <div class="choices">${Object.entries(STAFF_ATT).map(([k, l]) => `<button type="button" class="choice${by[t.id]?.status === k ? ' on' : ''}" data-v="${k}">${l}</button>`).join('')}</div>
      <input class="input sm note" placeholder="ملاحظة (اختياري)" value="${esc(by[t.id]?.note || '')}" style="margin-top:10px" aria-label="ملاحظة"></article>`).join('') || '<div class="empty">لا مشرفات في نطاقكِ</div>'}</div>
    ${teachers.length ? '<button class="btn block" id="saveStaff" style="margin-top:14px">حفظ الحضور</button>' : ''}
  </section>
  ${isAdmin() ? `<section class="sheet"><h2>الكادر <small>${staff.length}</small></h2><div class="lines">
    ${staff.map((p) => `<button class="line" data-edit="${esc(p.id)}"><span class="initial">${esc(initial(p.full_name))}</span><div class="grow"><div class="t">${esc(p.full_name)}</div>
      <div class="s">${p.role === 'supervisor' ? esc(trackNames(trackIdsOf(p))) : esc(circlesOf(p.id) || '—')}</div></div>
      <span class="tag ${p.role === 'admin' ? 'rose' : p.role === 'supervisor' ? 'olive' : p.role === 'disabled' ? 'gray' : p.role === 'instructor' ? 'blue' : 'amber'}">${ROLE[p.role]}</span></button>`).join('')}
    ${archived.length ? `<details style="margin-top:12px"><summary style="cursor:pointer;color:var(--ink-3)">الأرشيف (${archived.length})</summary><div class="lines">${archived.map((p) => `<button class="line" data-edit="${esc(p.id)}"><span class="initial">${esc(initial(p.full_name))}</span><div class="grow"><div class="t">${esc(p.full_name)}</div><div class="s">${esc(ROLE[p.archived_role] || '')}</div></div><span class="tag gray">مؤرشفة</span></button>`).join('')}</div></details>` : ''}
  </div></section>
  ` : ''}
  ${isSup() ? `<section class="sheet"><h2>مشرفات حلقات مساري <small>${leadSups.length}</small></h2><div class="lines">
    ${leadSups.map((p) => `<div class="line"><span class="initial">${esc(initial(p.full_name))}</span><div class="grow"><div class="t">${esc(p.full_name)}</div><div class="s">${esc(circlesOf(p.id) || '—')}</div></div><button class="btn sm danger" data-arc="${esc(p.id)}">أرشفة</button></div>`).join('') || '<div class="empty">لا مشرفات في مساركِ</div>'}
    ${leadArch.length ? `<h3 style="margin:14px 0 6px;font-size:.95rem;color:var(--ink-3)">الأرشيف</h3>${leadArch.map((p) => `<div class="line"><span class="initial">${esc(initial(p.full_name))}</span><div class="grow"><div class="t">${esc(p.full_name)}</div></div><button class="btn sm" data-arc="${esc(p.id)}">إرجاع</button></div>`).join('')}` : ''}
  </div></section>` : ''}
  <section class="sheet"><h2>معلِّمات الحلقات <small>${S.teachers.filter((t) => t.active).length}، بلا حسابات دخول</small></h2>
    ${isAdmin() || isSup() ? '<button class="btn sm quiet" id="addTeacher" style="margin-bottom:8px">إضافة معلِّمة</button>' : ''}
    <div class="lines">${S.teachers.filter((t) => t.active).map((t) => { const cs = S.circles.filter((c) => c.teacher_ref === t.id).map((c) => c.name);
      return `<button class="line" data-teacher="${t.id}"><span class="initial">${esc(initial(t.full_name))}</span><div class="grow"><div class="t">${esc(t.full_name)}</div>
      <div class="s">${esc(cs.join('، ') || 'بلا حلقة')}${t.residence ? `، ${esc(t.residence)}` : ''}${t.phone ? `، <span dir="ltr">${esc(t.phone)}</span>` : ''}</div></div></button>`; }).join('') || '<div class="empty">لم تُضف معلِّمات بعد</div>'}</div>
    ${S.teachers.some((t) => !t.active) ? `<details style="margin-top:12px"><summary style="cursor:pointer;color:var(--ink-3)">الأرشيف (${S.teachers.filter((t) => !t.active).length})</summary><div class="lines">${S.teachers.filter((t) => !t.active).map((t) => `<button class="line" data-teacher="${t.id}"><span class="initial">${esc(initial(t.full_name))}</span><div class="grow"><div class="t">${esc(t.full_name)}</div></div><span class="tag gray">مؤرشفة</span></button>`).join('')}</div></details>` : ''}
  </section></div>`;

  $('#sDate').onchange = (e) => { if (e.target.value) { STF.date = e.target.value; route(); } };
  $$('#sAtt .choice', v).forEach((b) => (b.onclick = () => {
    const card = b.closest('.stu'); const on = card.dataset.att === b.dataset.v;
    card.dataset.att = on ? '' : b.dataset.v;
    $$('.choice', card).forEach((x) => x.classList.toggle('on', !on && x === b));
  }));
  const sv = $('#saveStaff');
  if (sv) sv.onclick = async () => {
    const rows = $$('#sAtt .stu', v).filter((c) => c.dataset.att).map((c) => ({ profile_id: c.dataset.pid, record_date: STF.date, status: c.dataset.att, note: c.querySelector('.note').value.trim() || null, recorded_by: S.me.id, updated_at: new Date().toISOString() }));
    if (!rows.length) { toast('حدِّدي حالة مشرفة واحدة على الأقل', 'bad'); return; }
    sv.disabled = true;
    try { await api.upsert('staff_attendance', rows, 'profile_id,record_date'); toast('حُفظ الحضور 🌿', 'ok'); route(); }
    catch (err) { toast(translateError(err.message), 'bad'); sv.disabled = false; }
  };
  $$('[data-arc]', v).forEach((b) => (b.onclick = () => archiveAccount(S.profiles.find((p) => p.id === b.dataset.arc))));
  $$('[data-edit]', v).forEach((b) => (b.onclick = () => profileForm(S.profiles.find((p) => p.id === b.dataset.edit))));
  const at = $('#addTeacher'); if (at) at.onclick = () => teacherForm();
  $$('[data-teacher]', v).forEach((b) => (b.onclick = () => { if (isAdmin() || isSup()) teacherForm(teacherById(+b.dataset.teacher)); }));
};

async function archiveRestorePrompt(p) {
  if (await confirmBox(`حساب ${p.full_name} في الأرشيف${p.archived_role ? ` (كانت ${ROLE[p.archived_role] || ''})` : ''}. إرجاعه؟`, 'إرجاع من الأرشيف')) archiveAccount(p);
}
async function archiveAccount(p) {
  const on = p.role !== 'disabled';
  if (on && !(await confirmBox(`أرشفة حساب ${p.full_name}؟ لن تستطيع الدخول، وتبقى بياناتها وسجلاتها، وتصير حلقاتها شاغرة. يمكن إرجاعها متى شئتِ.`, 'أرشفة'))) return;
  try { await api.archiveAccount(p.id, on); await loadAll(); toast(on ? 'أُرشف الحساب' : 'رجع الحساب 🌸', 'ok'); route(); }
  catch (err) { toast(translateError(err.message), 'bad'); }
}

function profileForm(p) {
  if (p.role === 'disabled') { archiveRestorePrompt(p); return; }
  const self = p.id === S.me.id;
  const initialRole = p.role === 'pending' ? (['teacher', 'supervisor'].includes(p.requested_role) ? p.requested_role : 'teacher') : p.role;
  modal(`<h2>${p.role === 'pending' ? 'تفعيل الحساب' : 'بيانات الحساب'}</h2>
    <form class="form-grid" id="pf">
      <label class="field full">الاسم<input class="input" name="full_name" required value="${esc(p.full_name)}"></label>
      ${p.role === 'pending' && ROLE[p.requested_role] ? `<p class="full" style="color:var(--ink-2);font-size:.88rem">سجَّلت بوصفها: <b>${ROLE[p.requested_role]}</b>${p.requested_role === 'supervisor' && p.track_id ? `، مسار ${esc(trackName(p.track_id))}` : ''}${(p.requested_circles || []).length ? `، الحلقات: ${esc(p.requested_circles.map((id) => circleById(+id)?.name).filter(Boolean).join('، '))}` : ''}</p>` : ''}
      ${(p.requested_circles || []).some((id) => circleById(+id)) ? `<div class="full"><p style="font-size:.88rem;margin-bottom:6px">الحلقات التي اختارتها عند التسجيل:</p>
        ${(p.requested_circles || []).map((id) => circleById(+id)).filter(Boolean).map((c) => c.teacher_id === p.id
          ? `<div class="choices" style="margin-bottom:6px"><span class="tag olive">${esc(c.name)}: مربوطة بحسابها</span></div>`
          : `<div class="choices" style="margin-bottom:6px;align-items:center"><span class="tag ${c.teacher_id ? 'red' : 'amber'}">${esc(c.name)}: ${c.teacher_id ? 'عند ' + esc(profileName(c.teacher_id)) : 'غير مربوطة'}</span><button type="button" class="btn sm ${c.teacher_id ? 'ghost' : ''}" data-claim="${c.id}">${c.teacher_id ? 'نقلها إليها' : 'ربطها بها'}</button></div>`).join('')}</div>` : ''}
      ${S.circles.some((c) => c.teacher_id === p.id) ? `<p class="full" style="color:var(--olive-deep);font-size:.88rem">مربوطة بحلقات: ${esc(S.circles.filter((c) => c.teacher_id === p.id).map((c) => c.name).join('، '))}</p>` : ''}
      <label class="field full">الدور<select class="input" name="role" ${self ? 'disabled' : ''}>${['teacher', 'supervisor', 'admin'].map((r) => `<option value="${r}"${initialRole === r ? ' selected' : ''}>${ROLE[r]}</option>`).join('')}</select></label>
      <fieldset class="field full" id="trackField" style="border:0;padding:0;margin:0"><legend style="margin-bottom:6px">مساراتها <small style="color:var(--ink-3)">(يمكن اختيار أكثر من مسار)</small></legend>
        <div class="choices">${S.tracks.map((t) => `<label class="check"><input type="checkbox" name="track_ids" value="${t.id}"${trackIdsOf(p).includes(t.id) ? ' checked' : ''}> ${esc(t.name)}</label>`).join('')}</div></fieldset>
      <p class="full" id="roleHint" style="color:var(--ink-3);font-size:.86rem"></p>
      <div class="actions full"><button class="btn" type="submit">${p.role === 'pending' ? 'تفعيل الحساب' : 'حفظ'}</button>${!self && isAdmin() ? `<button class="btn danger" type="button" id="arcAcc">${p.role === 'pending' ? 'رفض وأرشفة' : 'أرشفة الحساب'}</button>` : ''}<button class="btn ghost" type="button" data-close>إلغاء</button></div>
    </form>`, (m, close) => {
    const rs = m.querySelector('[name=role]'); const tf = m.querySelector('#trackField'); const hint = m.querySelector('#roleHint');
    const HINTS = { teacher: 'تُسنَد حلقاتها من «المسارات والحلقات»، وهي من تُدخل بطاقات الواتساب والسرد.', supervisor: 'تُدخل المهام اليومية لحلقات مسارها.', admin: 'صلاحيات كاملة.', disabled: 'لن تتمكن من الدخول.' };
    const sync = () => { tf.classList.toggle('hidden', rs.value !== 'supervisor'); hint.textContent = HINTS[rs.value] || ''; };
    rs.onchange = sync; sync();
    $$('[data-claim]', m).forEach((b) => (b.onclick = async () => {
      const c = circleById(+b.dataset.claim);
      close();
      if (c.teacher_id && c.teacher_id !== p.id && !(await confirmBox(`حلقة ${c.name} عند ${profileName(c.teacher_id)} الآن. تنقلينها إلى ${p.full_name}؟`, 'نعم، انقليها'))) return;
      try { await api.update('circles', c.id, { teacher_id: p.id }); await loadAll(); toast(`رُبطت ${c.name} بحساب ${p.full_name} 🌸`, 'ok'); route(); }
      catch (err) { toast(translateError(err.message), 'bad'); }
    }));
    const da = m.querySelector('#arcAcc'); if (da) da.onclick = async () => { close(); archiveAccount(p); };
    m.querySelector('#pf').onsubmit = async (e) => {
      e.preventDefault(); const fd = new FormData(e.target);
      const patch = { full_name: fd.get('full_name').trim() };
      if (!self) {
        patch.role = fd.get('role');
        const picked = patch.role === 'supervisor' ? fd.getAll('track_ids').map(Number).filter(Boolean) : [];
        patch.track_ids = picked;
        patch.track_id = picked.includes(p.track_id) ? p.track_id : (picked[0] || null); // الأساسي يبقى إن بقي مختارًا
      }
      if (patch.role === 'supervisor' && !patch.track_id) { toast('اختاري مسارًا واحدًا على الأقل لمسؤولة المسار', 'bad'); return; }
      try { await api.update('profiles', p.id, patch); await loadAll(); close(); toast(p.role === 'pending' ? 'فُعِّل الحساب 🌸' : 'حُفظ 🌸', 'ok'); route(); }
      catch (err) { toast(translateError(err.message), 'bad'); }
    };
  });
}

// معلِّمات الحلقات: بيانات فقط بلا حسابات دخول
// مسؤولة المسار تؤرشف معلِّمة حلقات مسارها فقط
const canArchiveTeacher = (t) => isAdmin() || (isSup() && S.circles.filter((c) => c.teacher_ref === t.id).every((c) => inMyTracks(c.track_id)));
function teacherForm(t = null) {
  const mine = t ? S.circles.filter((c) => c.teacher_ref === t.id).map((c) => c.id) : [];
  modal(`<h2>${t ? 'بيانات المعلِّمة' : 'معلِّمة جديدة'}</h2>
    <form class="form-grid" id="tcf">${countryList}
      <label class="field full">الاسم الكامل<input class="input" name="full_name" required value="${esc(t?.full_name)}"></label>
      <label class="field">رقم الهاتف<input class="input" name="phone" inputmode="tel" dir="ltr" value="${esc(t?.phone)}"></label>
      <label class="field">العمر<input class="input" name="age" type="number" min="10" max="100" inputmode="numeric" value="${esc(t?.age)}"></label>
      <label class="field">البلد<input class="input" name="nationality" list="countries" value="${esc(t?.nationality)}"></label>
      <label class="field">بلد الإقامة<input class="input" name="residence" list="countries" value="${esc(t?.residence)}"></label>
      ${trackCircleFields({ multi: true, selected: mine, current: t?.id })}
      <div class="actions full"><button class="btn" type="submit">${t ? 'حفظ' : 'إضافة المعلِّمة'}</button>${t && canArchiveTeacher(t) ? `<button class="btn ${t.active ? 'danger' : ''}" type="button" id="arcTc">${t.active ? 'أرشفة' : 'إرجاع من الأرشيف'}</button>` : ''}<button class="btn ghost" type="button" data-close>إلغاء</button></div>
    </form>`, (m, close) => {
    wireTrackCircle(m);
    m.querySelector('#tcf').onsubmit = async (e) => {
      e.preventDefault(); const fd = new FormData(e.target);
      const row = { full_name: fd.get('full_name').trim(), phone: fd.get('phone').trim() || null, age: +fd.get('age') || null, nationality: fd.get('nationality').trim() || null, residence: fd.get('residence').trim() || null, active: t ? t.active : true };
      const shown = $$('[name=tc_circle]', m).map((x) => +x.value);
      const picked = new Set(fd.getAll('tc_circle').map(Number));
      try {
        const saved = t ? await api.update('teachers', t.id, row) : await api.insert('teachers', row);
        const tid = t ? t.id : saved.id;
        for (const cid of shown) {
          const had = mine.includes(cid);
          if (picked.has(cid) && !had) await api.setCircleTeacher(cid, tid);
          if (!picked.has(cid) && had) await api.setCircleTeacher(cid, null);
        }
        await loadAll(); close(); toast(t ? 'حُفظت بيانات المعلِّمة 🌸' : 'أُضيفت المعلِّمة 🌸', 'ok'); route();
      } catch (err) { toast(translateError(err.message), 'bad'); }
    };
    const d = m.querySelector('#arcTc'); if (d) d.onclick = async () => {
      close();
      const mineCs = S.circles.filter((c) => c.teacher_ref === t.id);
      if (t.active && !(await confirmBox(`أرشفة ${t.full_name}؟ تبقى بياناتها${mineCs.length ? `، وتصير ${mineCs.length} حلقة بلا معلِّمة` : ''}. يمكن إرجاعها متى شئتِ.`, 'أرشفة'))) return;
      try {
        if (t.active) for (const c of mineCs) await api.setCircleTeacher(c.id, null);
        await api.update('teachers', t.id, { active: !t.active });
        await loadAll(); toast(t.active ? 'أُرشفت المعلِّمة' : 'رجعت المعلِّمة 🌸', 'ok'); route();
      } catch (err) { toast(translateError(err.message), 'bad'); }
    };
  });
}

/* =========================================================
   المسارات والحلقات
   ========================================================= */
PAGES.settings = async (v) => {
  const supOpts = S.profiles.filter((p) => ['teacher', 'supervisor', 'admin'].includes(p.role)).sort(byName);
  const leadOf = (tid) => S.profiles.filter((p) => p.role === 'supervisor' && trackIdsOf(p).includes(tid)).map((p) => p.full_name).join('، ');
  v.innerHTML = `<div class="wrap">${cartouche('المسارات والحلقات', `المسارات: ${S.tracks.length}، الحلقات: ${S.circles.length}`)}
  <div class="toolbar"><div class="end"><button class="btn ghost" id="addTrack">مسار جديد</button><button class="btn" id="addCircle">حلقة جديدة</button></div></div>
  ${S.tracks.map((t) => {
    const cs = S.circles.filter((c) => c.track_id === t.id).sort(byName);
    return `<section class="sheet"><h2>مسار ${esc(t.name)} <button class="btn sm ghost" data-track="${t.id}">تعديل المسار</button></h2>
      <div class="choices" style="margin:-4px 0 10px">${t.description ? `<span class="tag gray">${esc(t.description)}</span>` : ''}${t.category ? `<span class="tag rose">${esc(t.category)}</span>` : ''}<span class="tag olive">${CTYPE[t.circle_type] || ''}</span><span class="tag blue">${daysText(t.days)}</span>${t.entry_mode === 'weekly' ? '<span class="tag rose">بطاقة أسبوعية</span>' : ''}<span class="tag ${t.sard_day == null ? 'gray' : 'amber'}">${t.sard_day == null ? 'بلا سرد' : `السرد: ${DAYS[t.sard_day]}`}</span></div>
      ${(t.card_items || []).length ? `<p class="s" style="color:var(--ink-3);font-size:.84rem;margin-bottom:4px">بنود البطاقة: ${esc(t.card_items.join('، '))}</p>` : ''}
      <p class="s" style="color:var(--ink-3);font-size:.86rem;margin-bottom:6px">مسؤولة المسار: ${esc(leadOf(t.id) || 'لم تُحدَّد بعد')}</p>
      <div class="lines">${cs.map((c) => `<button class="line" data-circle="${c.id}"><div class="grow"><div class="t">${esc(c.name)}</div>
        <div class="s">مشرفة الحلقة: ${esc(c.teacher_id ? profileName(c.teacher_id) : 'لم تُحدَّد')}${instructorName(c) ? `، المعلِّمة: ${esc(instructorName(c))}` : ''}</div></div>
        <span class="tag ${c.active ? 'olive' : 'gray'}">${c.active ? activeEnrollments([c.id]).length + ' طالبة' : 'متوقفة'}</span></button>`).join('') || '<div class="empty">لا حلقات في هذا المسار بعد</div>'}</div></section>`;
  }).join('') || '<div class="sheet empty">ابدئي بإضافة مسار، ثم حلقاته 🌿</div>'}</div>`;

  const trackForm = (t = null) => modal(`<h2>${t ? 'تعديل المسار' : 'مسار جديد'}</h2><form class="form-grid" id="tf">
      <label class="field">اسم المسار<input class="input" name="name" required placeholder="مثال: رِكاز" value="${esc(t?.name)}"></label>
      <label class="field">الفئة<input class="input" name="category" list="cats" placeholder="جامعيات" value="${esc(t?.category)}"><datalist id="cats"><option value="ناشئة"><option value="أطفال"><option value="جامعيات"><option value="خاتمات"></datalist></label>
      <label class="field full">وصف مختصر<input class="input" name="description" placeholder="مثال: حفظ حُر، رواية حفص" value="${esc(t?.description)}"></label>
      <label class="field">نوع الحلقة<select class="input" name="circle_type">${Object.entries(CTYPE).map(([k, l]) => `<option value="${k}"${(t?.circle_type || 'memo_review') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field">الترتيب<input class="input" name="sort_order" type="number" value="${t?.sort_order ?? S.tracks.length + 1}"></label>
      <label class="field">بطاقة الحضور<select class="input" name="entry_mode"><option value="daily"${(t?.entry_mode || 'daily') === 'daily' ? ' selected' : ''}>يومية في أيام المسار</option><option value="weekly"${t?.entry_mode === 'weekly' ? ' selected' : ''}>أسبوعية يوم السرد</option></select></label>
      <label class="field">يوم السرد الأسبوعي<select class="input" name="sard_day"><option value="">غير مطالَب بالسرد</option>${WEEK_ORDER.map((d) => `<option value="${d}"${t?.sard_day === d || (!t && d === 4) ? ' selected' : ''}>${DAYS[d]}</option>`).join('')}</select></label>
      <fieldset class="field full" style="border:0;padding:0;margin:0"><legend style="margin-bottom:6px">الأيام</legend><div class="choices">
        ${WEEK_ORDER.map((d) => `<label class="choice"><input type="checkbox" name="days" value="${d}" ${(t?.days || [0, 1, 2, 3]).includes(d) ? 'checked' : ''} style="accent-color:var(--rose-deep)"> ${DAYS[d]}</label>`).join('')}</div></fieldset>
      <label class="field full">بنود بطاقة الحضور (بندٌ في كل سطر، وأي بند ناقص يُحسب تقصيرًا)<textarea class="input" name="card_items" rows="5" placeholder="عدد أوجه الحفظ&#10;عدد أوجه المراجعة&#10;سماع القارئ">${esc((t?.card_items || []).join('\n'))}</textarea></label>
      ${t ? '' : '<label class="check full"><input type="checkbox" name="mk" checked> أنشئي ١٠ حلقات لهذا المسار تلقائيًّا</label>'}
      <div class="actions full"><button class="btn" type="submit">${t ? 'حفظ' : 'إضافة المسار'}</button>${t ? '<button class="btn danger" type="button" id="delT">حذف المسار</button>' : ''}<button class="btn ghost" type="button" data-close>إلغاء</button></div></form>`,
  (m, close) => {
    m.querySelector('#tf').onsubmit = async (e) => {
      e.preventDefault(); const fd = new FormData(e.target);
      const row = { name: fd.get('name').trim(), category: fd.get('category').trim() || null, description: fd.get('description').trim() || null, circle_type: fd.get('circle_type'), days: fd.getAll('days').map(Number).sort(), sort_order: +fd.get('sort_order') || 0, card_items: cleanTemplateItems(fd.get('card_items')), sard_day: fd.get('sard_day') === '' ? null : +fd.get('sard_day'), entry_mode: fd.get('entry_mode') };
      if (row.entry_mode === 'weekly' && row.sard_day == null) { toast('البطاقة الأسبوعية تحتاج يوم سرد للمسار', 'bad'); return; }
      if (!row.days.length) { toast('اختاري يومًا واحدًا على الأقل', 'bad'); return; }
      try {
        if (t) await api.update('tracks', t.id, row);
        else {
          const created = await api.insert('tracks', row);
          if (fd.get('mk')) for (let i = 1; i <= 10; i++) await api.insert('circles', { name: `${row.name} ${i}`, track_id: created.id, active: true });
        }
        await loadAll(); close(); toast(t ? 'حُفظ المسار 🌸' : 'أُضيف المسار وحلقاته 🌸', 'ok'); route();
      } catch (err) { toast(translateError(err.message), 'bad'); }
    };
    const d = m.querySelector('#delT'); if (d) d.onclick = async () => {
      if (S.circles.some((c) => c.track_id === t.id)) { toast('احذفي حلقات المسار أو انقليها أولًا', 'bad'); return; }
      try { await api.remove('tracks', t.id); await loadAll(); close(); route(); } catch (err) { toast(translateError(err.message), 'bad'); }
    };
  });

  const circleForm = (c = null) => {
    if (!S.tracks.length) { toast('أضيفي مسارًا أولًا', 'bad'); return; }
    modal(`<h2>${c ? 'تعديل الحلقة' : 'حلقة جديدة'}</h2><form class="form-grid" id="cf">
      <label class="field">اسم الحلقة<input class="input" name="name" required value="${esc(c?.name)}"></label>
      <label class="field">المسار<select class="input" name="track_id">${S.tracks.map((t) => `<option value="${t.id}"${c?.track_id === t.id ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label>
      <label class="field">مشرفة الحلقة (تُدخل البيانات)<select class="input" name="teacher_id"><option value="">لم تُحدَّد</option>${supOpts.map((p) => `<option value="${esc(p.id)}"${c?.teacher_id === p.id ? ' selected' : ''}>${esc(p.full_name)}</option>`).join('')}</select></label>
      <label class="field">معلِّمة الحلقة<select class="input" name="teacher_ref"><option value="">لم تُحدَّد</option>${S.teachers.filter((t) => t.active || t.id === c?.teacher_ref).map((t) => `<option value="${t.id}"${c?.teacher_ref === t.id ? ' selected' : ''}>${esc(t.full_name)}</option>`).join('')}</select></label>
      <label class="field full">الوقت<input class="input" name="schedule" placeholder="مثال: بعد العصر" value="${esc(c?.schedule)}"></label>
      ${c ? `<label class="check full"><input type="checkbox" name="active"${c.active ? ' checked' : ''}> الحلقة قائمة</label>` : ''}
      <div class="actions full"><button class="btn" type="submit">حفظ</button>${c ? '<button class="btn danger" type="button" id="delC">حذف الحلقة</button>' : ''}<button class="btn ghost" type="button" data-close>إلغاء</button></div></form>`,
    (m, close) => {
      m.querySelector('#cf').onsubmit = async (e) => {
        e.preventDefault(); const fd = new FormData(e.target);
        const row = { name: fd.get('name').trim(), track_id: +fd.get('track_id'), teacher_id: fd.get('teacher_id') || null, teacher_ref: +fd.get('teacher_ref') || null, schedule: fd.get('schedule').trim() || null, active: c ? !!fd.get('active') : true };
        try { c ? await api.update('circles', c.id, row) : await api.insert('circles', row); await loadAll(); close(); toast('حُفظت الحلقة 🌸', 'ok'); route(); } catch (err) { toast(translateError(err.message), 'bad'); }
      };
      const del = m.querySelector('#delC'); if (del) del.onclick = async () => {
        const n = activeEnrollments([c.id]).length;
        close();
        if (!(await confirmBox(n ? `حذف «${c.name}»؟ فيها ${n} طالبة، وسيُحذف التحاقهن بها وسجلُّ الحلقة نهائيًّا.` : `حذف «${c.name}» نهائيًّا؟`, 'حذف الحلقة'))) return;
        try { await api.remove('circles', c.id); await loadAll(); toast('حُذفت الحلقة', 'ok'); route(); } catch (err) { toast(translateError(err.message), 'bad'); }
      };
    });
  };
  $('#addTrack').onclick = () => trackForm();
  $('#addCircle').onclick = () => circleForm();
  $$('[data-track]', v).forEach((b) => (b.onclick = () => trackForm(S.tracks.find((t) => t.id === +b.dataset.track))));
  $$('[data-circle]', v).forEach((b) => (b.onclick = () => circleForm(circleById(+b.dataset.circle))));
};

/* =========================================================
   المهام اليومية لمسؤولات المسارات
   لكل حلقة: عدد الحاضرات والغائبات والمعتذرات، وتُغلق ٥ صباحًا بتوقيت مكة
   ========================================================= */
const TASK = { date: null, open: null };
const tracksOn = (date) => S.tracks.filter((t) => isEntryDay(t, date));

PAGES.tasks = async (v) => {
  const current = taskDay();
  TASK.date = TASK.date || current;
  const date = TASK.date;
  const myTracks = (isAdmin() ? tracksOn(date) : tracksOn(date).filter((t) => inMyTracks(t.id)));
  const circles = S.circles.filter((c) => c.active && myTracks.some((t) => t.id === c.track_id));
  const cids = circles.map((c) => c.id);
  const tasks = cids.length ? await api.list('daily_tasks', { eq: { task_date: date }, in: { circle_id: cids } }) : [];
  const byCircle = Object.fromEntries(tasks.map((x) => [x.circle_id, x]));
  const open = taskOpen(date);
  const left = timeLeft(date);
  const dateLine = `${fmtDate(date)}${date === current ? '' : ' (يوم سابق)'}`;
  const deadlineLine = open ? `تُغلق المهام بعد ${left}، الساعة ٥ صباحًا بتوقيت مكة` : (date > current ? 'لم يبدأ هذا اليوم بعد' : 'انتهى وقت هذه المهام');

  // ---------- مسؤولة المسار ----------
  if (isSup()) {
    const mine = S.tracks.filter((x) => inMyTracks(x.id));
    const tname = mine.map((x) => x.name).join('، ');
    if (!mine.length) { v.innerHTML = `<div class="wrap">${cartouche('المهام اليومية')}<div class="sheet empty">لم يُحدَّد مسارُكِ بعد. تواصلي مع القائدة.</div></div>`; return; }
    const enrIds = activeEnrollments(cids).map((e) => e.id);
    const recs = enrIds.length ? await getRecords(date, date, enrIds) : [];
    const enrCircle = Object.fromEntries(activeEnrollments(cids).map((e) => [e.id, e.circle_id]));
    const fromEntry = (cid, kinds) => recs.filter((r) => enrCircle[r.enrollment_id] === cid && kinds.includes(r.attendance)).length;
    const done = circles.filter((c) => byCircle[c.id]).length;
    const editable = open || isAdmin();
    v.innerHTML = `<div class="wrap">${cartouche('المهام اليومية', `${mine.length > 1 ? 'مساراتكِ' : 'مسار'} ${esc(tname)}، ${dateLine}`)}
    <div class="strip" style="grid-template-columns:repeat(2,1fr)">
      <div><div class="n ${done === circles.length && circles.length ? 'olive' : 'rose'} num">${done} / ${circles.length}</div><div class="l">حلقة أُتمَّت مهمتها</div></div>
      <div><div class="n num" style="font-size:1.15rem;padding-top:8px">${open ? left : '—'}</div><div class="l">${deadlineLine}</div></div>
    </div>
    <div class="toolbar"><label class="field">اليوم<input class="input" type="date" id="tDate" value="${date}" max="${current}"></label></div>
    ${!circles.length ? `<div class="sheet empty">لا مهام لـ${mine.length > 1 ? 'مساراتكِ' : 'مسار ' + esc(tname)} في هذا اليوم (${mine.map((t) => `${esc(t.name)}: ${t.entry_mode === 'weekly' ? `حضور ${daysText(t.days)} + بطاقة السرد يوم ${DAYS[t.sard_day ?? 3]}` : daysText(t.days)}`).join('، ')}).</div>` : `
    <div id="tList">${circles.map((c) => {
      const x = byCircle[c.id];
      const hint = recs.some((r) => enrCircle[r.enrollment_id] === c.id) ? `حسب إدخال المشرفة: ${fromEntry(c.id, ['present', 'late'])} حاضرة، ${fromEntry(c.id, ['absent'])} غائبة، ${fromEntry(c.id, ['excused'])} معتذرة` : 'لم تُدخل مشرفة الحلقة بيانات هذا اليوم بعد';
      return `<article class="stu${x ? ' marked' : ''}" data-cid="${c.id}">
        <div class="stu-head"><b>${esc(c.name)}</b>${x ? '<span class="tag olive">تمَّت</span>' : '<span class="tag amber">لم تتم</span>'}</div>
        <div class="task-grid">
          <label class="field">عدد الحاضرات<input class="input" type="number" min="0" inputmode="numeric" data-k="present_count" value="${x?.present_count ?? ''}" ${editable ? '' : 'disabled'}></label>
          <label class="field">عدد الغائبات<input class="input" type="number" min="0" inputmode="numeric" data-k="absent_count" value="${x?.absent_count ?? ''}" ${editable ? '' : 'disabled'}></label>
          <label class="field">عدد المعتذرات<input class="input" type="number" min="0" inputmode="numeric" data-k="excused_count" value="${x?.excused_count ?? ''}" ${editable ? '' : 'disabled'}></label>
        </div>
        <p class="hint-line">${hint}</p></article>`;
    }).join('')}</div>
    ${editable ? '<div class="save-dock"><button class="btn" id="saveTasks">حفظ المهام</button></div>' : '<div class="sheet empty" style="margin-top:12px">انتهى وقت هذه المهام، ولا يمكن تعديلها.</div>'}`}</div>`;
    $('#tDate').onchange = (e) => { if (e.target.value) { TASK.date = e.target.value; route(); } };
    const sv = $('#saveTasks');
    if (sv) sv.onclick = async () => {
      if (!taskOpen(date) && !isAdmin()) { toast('انتهى وقت هذه المهام', 'bad'); route(); return; }
      const rows = []; const bad = [];
      $$('#tList .stu', v).forEach((card) => {
        const val = (k) => card.querySelector(`[data-k="${k}"]`).value;
        const vals = ['present_count', 'absent_count', 'excused_count'].map(val);
        if (vals.every((x) => x === '')) return;
        if (vals.some((x) => x === '')) { bad.push(card.querySelector('b').textContent); return; }
        rows.push({ circle_id: +card.dataset.cid, task_date: date, present_count: +vals[0], absent_count: +vals[1], excused_count: +vals[2], done_by: S.me.id, updated_at: new Date().toISOString() });
      });
      if (bad.length) { toast(`${bad[0]}: اكتبي الأعداد الثلاثة (صفر إن لم يوجد)`, 'bad'); return; }
      if (!rows.length) { toast('اكتبي أعداد حلقة واحدة على الأقل', 'bad'); return; }
      sv.disabled = true;
      try { await api.upsert('daily_tasks', rows, 'circle_id,task_date'); toast(`حُفظت مهام ${rows.length} حلقة 🌿`, 'ok'); route(); }
      catch (err) { toast(translateError(err.message), 'bad'); sv.disabled = false; }
    };
    return;
  }

  // ---------- القائدة: من أتمَّت ومن لم تُتم ----------
  const leads = (tid) => S.profiles.filter((p) => p.role === 'supervisor' && trackIdsOf(p).includes(tid));
  const rows = myTracks.map((t) => {
    const cs = circles.filter((c) => c.track_id === t.id);
    const done = cs.filter((c) => byCircle[c.id]).length;
    const sum = (k) => cs.reduce((n, c) => n + (byCircle[c.id]?.[k] || 0), 0);
    return { t, cs, done, total: cs.length, present: sum('present_count'), absent: sum('absent_count'), excused: sum('excused_count') };
  });
  const complete = rows.filter((r) => r.total && r.done === r.total).length;
  const status = (r) => !r.total ? ['gray', 'لا حلقات'] : r.done === r.total ? ['olive', 'أتمَّت المهام'] : r.done ? ['amber', `${r.done} من ${r.total}`] : ['red', 'لم تبدأ'];
  v.innerHTML = `<div class="wrap">${cartouche('المهام اليومية', dateLine)}
  <div class="strip">
    <div><div class="n olive num">${complete}</div><div class="l">مسؤولة أتمَّت مهامها</div></div>
    <div><div class="n red num">${rows.length - complete}</div><div class="l">لم تُتم بعد</div></div>
    <div><div class="n num">${rows.reduce((n, r) => n + r.present, 0)}</div><div class="l">حاضرة (حسب المهام)</div></div>
    <div><div class="n num" style="font-size:1.1rem;padding-top:8px">${open ? left : '—'}</div><div class="l">${open ? 'حتى إغلاق المهام (٥ص مكة)' : deadlineLine}</div></div>
  </div>
  <div class="toolbar"><label class="field">اليوم<input class="input" type="date" id="tDate" value="${date}" max="${current}"></label></div>
  ${rows.length ? `<section class="sheet"><div class="lines">${rows.map((r) => {
    const st = status(r);
    return `<details class="task-row"><summary class="line"><div class="grow"><div class="t">مسار ${esc(r.t.name)}</div>
      <div class="s">${esc(leads(r.t.id).map((p) => p.full_name).join('، ') || 'بلا مسؤولة')}</div>
      <div class="s num">${r.present} حاضرة، ${r.absent} غائبة، ${r.excused} معتذرة</div></div>
      <span class="tag ${st[0]}">${st[1]}</span></summary>
      <div class="table-wrap" style="margin:4px 0 12px"><table><thead><tr><th>الحلقة</th><th>الحاضرات</th><th>الغائبات</th><th>المعتذرات</th><th>الحالة</th></tr></thead><tbody>
      ${r.cs.map((c) => { const x = byCircle[c.id]; return `<tr><td>${esc(c.name)}</td><td class="num">${x ? x.present_count : '—'}</td><td class="num">${x ? x.absent_count : '—'}</td><td class="num">${x ? x.excused_count : '—'}</td><td>${x ? '<span class="tag olive">تمَّت</span>' : '<span class="tag red">لم تتم</span>'}</td></tr>`; }).join('')}
      </tbody></table></div></details>`;
  }).join('')}</div></section>` : '<div class="sheet empty">لا مسارات لها حلقات في هذا اليوم.</div>'}</div>`;
  $('#tDate').onchange = (e) => { if (e.target.value) { TASK.date = e.target.value; route(); } };
};

/* =========================================================
   السرد الأسبوعي الإلزامي
   من لم تسرد أسبوعين متتاليين تصل حدَّ الحذف من المقرأة
   ========================================================= */
const SARD = { circleId: null, date: null };
const SARD_LIMIT = 2;
// آخر أيام سرد المسار (من الأحدث)، حتى اليوم
function sardDates(track, n = 6, upTo = today()) {
  if (track?.sard_day == null) return [];
  const out = []; let d = upTo;
  for (let i = 0; i < 7 && new Date(d + 'T12:00:00').getDay() !== track.sard_day; i++) d = addDays(d, -1);
  for (let i = 0; i < n; i++) { out.push(d); d = addDays(d, -7); }
  return out;
}
const sardTracks = () => S.tracks.filter((t) => t.sard_day != null);
// عدد الأسابيع المتتالية التي لم تسرد فيها (من الأحدث)، ولا يُحسب أسبوع لم يُسجَّل
function sardStreak(enr, dates, byKey) {
  let streak = 0; let unrecorded = 0; const trail = [];
  for (const d of dates) {
    if (enr.started_at && d < enr.started_at) break;
    const x = byKey[`${enr.id}|${d}`];
    trail.push(x ? (x.done ? 'done' : 'miss') : 'none');
  }
  for (const t of trail) { if (t === 'miss') streak++; else if (t === 'none' && streak === 0) unrecorded++; else break; }
  return { streak, trail, unrecorded };
}
async function sardOverview(circles) {
  const rows = [];
  const enrs = activeEnrollments(circles.map((c) => c.id));
  if (!enrs.length) return { rows, missingCircles: [] };
  const from = addDays(today(), -60);
  const sards = await api.list('weekly_sard', { gte: { sard_date: from }, in: { enrollment_id: enrs.map((e) => e.id) } });
  const byKey = Object.fromEntries(sards.map((x) => [`${x.enrollment_id}|${x.sard_date}`, x]));
  const missingCircles = [];
  circles.forEach((c) => {
    const t = trackOfCircle(c); const dates = sardDates(t, 6);
    if (!dates.length) return;
    const ce = enrs.filter((e) => e.circle_id === c.id);
    if (ce.length && !ce.some((e) => byKey[`${e.id}|${dates[0]}`])) missingCircles.push({ c, date: dates[0] });
    ce.forEach((e) => { const st = sardStreak(e, dates, byKey); rows.push({ e, c, t, dates, ...st }); });
  });
  return { rows, missingCircles, byKey };
}
const trailHtml = (r) => `<span class="trail">${r.trail.slice(0, 4).map((x, i) => `<i class="${x}" title="${fmtShort(r.dates[i])}: ${x === 'done' ? 'سردت' : x === 'miss' ? 'لم تسرد' : 'لم يُسجَّل'}"></i>`).join('')}</span>`;

PAGES.sard = async (v) => {
  const circles = myCircles().filter((c) => trackOfCircle(c)?.sard_day != null);
  if (!circles.length) { v.innerHTML = `<div class="wrap">${cartouche('السرد الأسبوعي')}<div class="sheet empty">لا حلقات مطالَبة بالسرد في نطاقكِ (مسارا تمكين ووهج غير مطالَبين).</div></div>`; return; }
  if (!circles.some((c) => c.id === SARD.circleId)) SARD.circleId = circles[0].id;
  const circle = circleById(SARD.circleId); const track = trackOfCircle(circle);
  const dates = sardDates(track, 6);
  if (!SARD.date || !dates.includes(SARD.date)) SARD.date = dates[0];
  const enr = activeEnrollments([circle.id]).map((e) => ({ e, s: studentById(e.student_id) })).filter((x) => x.s).sort((a, b) => byName(a.s, b.s));
  const { rows, missingCircles, byKey } = await sardOverview(myCircles());
  const limit = rows.filter((r) => r.streak >= SARD_LIMIT).sort((a, b) => b.streak - a.streak);
  const warn = rows.filter((r) => r.streak === SARD_LIMIT - 1);
  const canRemove = isAdmin() || isSup();

  v.innerHTML = `<div class="wrap">${cartouche('السرد الأسبوعي', 'الخميس لمسارات الجامعيات، والأربعاء للأطفال والناشئة. من لم تسرد أسبوعين متتاليين تصل حدَّ الحذف.')}
  <p class="legend" style="justify-content:center;margin:-10px 0 16px">المربعات آخر ٤ أسابيع، الأحدث على اليمين: <span><i style="background:var(--olive)"></i>سردت</span><span><i style="background:var(--red)"></i>لم تسرد</span><span><i style="background:#efe6ea"></i>لم يُسجَّل</span></p>
  <section class="sheet"><h2>وصلن حدَّ الحذف <small>أسبوعان متتاليان دون سرد</small></h2><div class="lines">
    ${limit.map((r) => `<div class="line"><span class="initial rose">${esc(initial(studentById(r.e.student_id)?.full_name))}</span>
      <div class="grow"><a class="t" href="#/student/${r.e.student_id}">${esc(studentById(r.e.student_id)?.full_name)}</a><div class="s">${esc(r.c.name)}، فاتها ${r.streak} ${r.streak === 2 ? 'أسبوعان' : 'أسابيع'}</div></div>
      ${trailHtml(r)}${canRemove ? `<button class="btn sm danger" data-remove="${r.e.student_id}">حذفها من المقرأة</button>` : '<span class="tag red">وصلت الحد</span>'}</div>`).join('') || '<div class="empty">لا طالبة وصلت الحد، الحمد لله 🌿</div>'}
  </div></section>
  ${warn.length ? `<section class="sheet"><h2>إنذار <small>فاتها سرد الأسبوع الماضي، والأسبوع القادم حاسم</small></h2><div class="lines">
    ${warn.map((r) => `<a class="line" href="#/student/${r.e.student_id}"><span class="initial">${esc(initial(studentById(r.e.student_id)?.full_name))}</span>
      <div class="grow"><div class="t">${esc(studentById(r.e.student_id)?.full_name)}</div><div class="s">${esc(r.c.name)}</div></div>${trailHtml(r)}<span class="tag amber">أسبوع واحد</span></a>`).join('')}
  </div></section>` : ''}
  ${missingCircles.length ? `<section class="sheet"><h2>لم يُسجَّل سرد آخر أسبوع <small>${missingCircles.length} حلقة</small></h2><div class="choices">
    ${missingCircles.map(({ c, date }) => `<button class="tag amber" style="border:0;cursor:pointer" data-goto="${c.id}" data-date="${date}">${esc(c.name)}، ${fmtShort(date)}</button>`).join('')}</div></section>` : ''}

  <section class="sheet" id="sardEntry"><h2>تسجيل السرد</h2>
    <div class="entry-head">
      <label class="field">الحلقة<select class="input" id="sCircle">${circles.map((c) => `<option value="${c.id}"${c.id === circle.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
      <label class="field">يوم السرد<select class="input" id="sDate">${dates.map((d) => `<option value="${d}"${d === SARD.date ? ' selected' : ''}>${fmtDate(d)}</option>`).join('')}</select></label>
    </div>
    <div class="entry-meta"><span>مسار ${esc(track.name)}: السرد يوم ${DAYS[track.sard_day]}</span><button class="btn sm quiet" id="allDone">سردت البقية</button></div>
    <div id="sList">${enr.map(({ e, s }) => {
      const x = byKey?.[`${e.id}|${SARD.date}`]; const st = x ? (x.done ? 'done' : 'miss') : '';
      const r = rows.find((y) => y.e.id === e.id);
      return `<article class="stu${x ? ' marked' : ''}" data-eid="${e.id}" data-st="${st}">
        <div class="stu-head"><span class="initial">${esc(initial(s.full_name))}</span><b>${esc(s.full_name)}</b>${r ? trailHtml(r) : ''}</div>
        <div class="choices"><button type="button" class="choice${st === 'done' ? ' on' : ''}" data-v="present" data-k="done">سردت</button><button type="button" class="choice${st === 'miss' ? ' on' : ''}" data-v="absent" data-k="miss">لم تسرد</button></div>
      </article>`;
    }).join('') || '<div class="empty">لا طالبات في هذه الحلقة</div>'}</div>
    ${enr.length ? '<button class="btn block" id="saveSard" style="margin-top:14px">حفظ السرد</button>' : ''}
  </section></div>`;

  $('#sCircle').onchange = (e) => { SARD.circleId = +e.target.value; SARD.date = null; route(); };
  $('#sDate').onchange = (e) => { SARD.date = e.target.value; route(); };
  $$('[data-goto]', v).forEach((b) => (b.onclick = () => { SARD.circleId = +b.dataset.goto; SARD.date = b.dataset.date; route(); }));
  const setSt = (card, st) => { card.dataset.st = st; $$('.choice', card).forEach((x) => x.classList.toggle('on', x.dataset.k === st)); };
  $$('#sList .choice', v).forEach((b) => (b.onclick = () => { const c = b.closest('.stu'); setSt(c, c.dataset.st === b.dataset.k ? '' : b.dataset.k); }));
  const ad = $('#allDone'); if (ad) ad.onclick = () => $$('#sList .stu', v).forEach((c) => { if (!c.dataset.st) setSt(c, 'done'); });
  const sv = $('#saveSard');
  if (sv) sv.onclick = async () => {
    const list = $$('#sList .stu', v).filter((c) => c.dataset.st).map((c) => ({ enrollment_id: +c.dataset.eid, sard_date: SARD.date, done: c.dataset.st === 'done', note: null, recorded_by: S.me.id, updated_at: new Date().toISOString() }));
    if (!list.length) { toast('حدِّدي حالة طالبة واحدة على الأقل', 'bad'); return; }
    sv.disabled = true;
    try { await api.upsert('weekly_sard', list, 'enrollment_id,sard_date'); toast(`حُفظ سرد ${list.length} طالبة 🌿`, 'ok'); route(); }
    catch (err) { toast(translateError(err.message), 'bad'); sv.disabled = false; }
  };
  $$('[data-remove]', v).forEach((b) => (b.onclick = async () => {
    const st = studentById(+b.dataset.remove);
    if (!(await confirmBox(`أرشفة ${st.full_name}؟ تخرج من حلقتها، وتبقى بياناتها وسجلاتها في الأرشيف.`, 'أرشفة'))) return;
    try {
      for (const e of S.enrollments.filter((x) => x.student_id === st.id && x.active)) await api.update('enrollments', e.id, { active: false, ended_at: today() });
      await api.update('students', st.id, { active: false, notes: [st.notes, `أُرشفت لعدم السرد أسبوعين متتاليين (${fmtShort(today())})`].filter(Boolean).join('\n') });
      await loadAll(); toast('أُرشفت', 'ok'); route();
    } catch (err) { toast(translateError(err.message), 'bad'); }
  }));
};

/* =========================================================
   حسابي
   ========================================================= */
PAGES.account = async (v) => {
  const mine = S.circles.filter((c) => c.teacher_id === S.me.id);
  v.innerHTML = `<div class="wrap">${cartouche('حسابي')}
  <section class="sheet"><div class="profile"><span class="initial lg">${esc(initial(S.me.full_name))}</span>
    <div class="grow"><h2>${esc(S.me.full_name)}</h2><div style="color:var(--ink-3)" dir="ltr">${esc(S.me.username)}</div></div></div>
    <dl class="facts"><div><dt>الدور</dt><dd>${ROLE[role()]}</dd></div>
      ${isSup() ? `<div><dt>${myTrackIds().length > 1 ? 'المسارات' : 'المسار'}</dt><dd>${esc(trackNames(myTrackIds()))}</dd></div>` : ''}
      ${mine.length ? `<div><dt>حلقاتي</dt><dd>${esc(mine.map((c) => c.name).join('، '))}</dd></div>` : ''}</dl></section>
  ${api.mode !== 'none' ? `<section class="sheet"><h2>تغيير كلمة المرور</h2>
    <form id="pw" style="display:grid;gap:10px;max-width:360px"><input class="input" type="password" name="p1" minlength="6" required placeholder="كلمة المرور الجديدة" dir="ltr" aria-label="كلمة المرور الجديدة"><input class="input" type="password" name="p2" minlength="6" required placeholder="أعيدي كتابتها" dir="ltr" aria-label="تأكيد كلمة المرور"><button class="btn" type="submit">تغيير كلمة المرور</button></form></section>` : ''}
  ${navItems().filter(([k]) => k !== 'account' && !$$('.dock a').some((a) => a.dataset.nav === k)).length ? `<section class="sheet more-links"><h2>صفحات أخرى</h2><div class="lines">${navItems().filter(([k]) => k !== 'account' && !$$('.dock a').some((a) => a.dataset.nav === k)).map(([k, l]) => `<a class="line" href="#/${k}">${icon(k).replace('<svg', '<svg width="20" height="20"')}<div class="grow t">${l}</div></a>`).join('')}</div></section>` : ''}
  <section class="sheet"><button class="btn danger block" id="logout">تسجيل الخروج</button></section></div>`;
  const pw = $('#pw');
  if (pw) pw.onsubmit = async (e) => {
    e.preventDefault(); const fd = new FormData(e.target);
    if (fd.get('p1') !== fd.get('p2')) { toast('كلمتا المرور غير متطابقتين', 'bad'); return; }
    try { await api.changePassword(fd.get('p1')); e.target.reset(); toast('تغيَّرت كلمة المرور 🌿', 'ok'); } catch (err) { toast(translateError(err.message), 'bad'); }
  };
  $('#logout').onclick = async () => { await api.signOut(); location.hash = ''; start(); };
};

/* =========================================================
   التشغيل
   ========================================================= */
let booted = false;
function renderSetup() {
  $('#app').innerHTML = `<div class="waiting"><img src="${LOGO}" alt=""><h2>الموقع غير مربوط بقاعدة البيانات</h2>
    <p>افتحي ملف <b dir="ltr">config.js</b> وضعي فيه رابط مشروع Supabase والمفتاح العام (anon أو publishable).</p></div>`;
}
async function start() {
  try {
    if (!booted) {
      api = window.WITHAQ_BACKEND ? window.WITHAQ_BACKEND() : (CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY ? supabaseBackend() : null);
      if (!api) { renderSetup(); return; }
      await api.init(); booted = true; window.addEventListener('hashchange', () => S.me && ACTIVE_ROLES.includes(role()) && route()); }
    S.me = await api.currentProfile();
    if (!S.me) { renderAuth(); return; }
    if (!ACTIVE_ROLES.includes(S.me.role)) { renderPending(); return; }
    await loadAll(); renderShell(); route();
  } catch (err) {
    console.error(err);
    $('#app').innerHTML = `<div class="waiting"><img src="${LOGO}" alt=""><div class="error">${esc(translateError(err.message))}</div><button class="btn" onclick="location.reload()">إعادة المحاولة</button></div>`;
  }
}
document.title = SITE.name;
start();
