const CardKit = (() => {
// قارئ بطاقات "تحضير" الواتساب — يحوّل النص الملصوق إلى بيانات منظّمة.
// وحدة نقية بلا اعتماد على التطبيق: تُمرَّر لها قائمة السور (الاسم + عدد الآيات).
// المبدأ: لا تخمين صامت — كل ما فيه التباس يُعلَّم "check" مع ملاحظة تشرح السبب.
// ─── تطبيع النص ──────────────────────────────────────────────────
const INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g;
const TASHKEEL = /[\u064B-\u065F\u0670]/g;
/** حذف فقط (بدون تغيير أطوال بعد هذه الخطوة) + تحويل الأرقام والشرطات */
function clean(s) {
    let t = s.replace(INVISIBLE, "").replace(TASHKEEL, "");
    t = t
        .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
        .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
    // الكشيدة بين رقمين تعني شرطة: ٧٦ـ٩٦
    t = t.replace(/(\d)\s*\u0640+\s*(\d)/g, "$1-$2");
    t = t.replace(/\u0640/g, "");
    t = t.replace(/[–—−]/g, "-");
    t = t.replace(/[*_~`>•·▪●◦]/g, " ");
    return t;
}
/** تطبيع حرف بحرف (يحفظ الأطوال) لأغراض المطابقة */
function fold(s) {
    return s
        .replace(/[أإآٱ]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/ة/g, "ه")
        .replace(/ؤ/g, "و")
        .replace(/ئ/g, "ي");
}
/** تطبيع كامل للمطابقة: حذف الهمزة المفردة وتوحيد المسافات */
function norm(s) {
    return fold(clean(s)).replace(/ء/g, "").replace(/\s+/g, " ").trim();
}
// ─── السور ───────────────────────────────────────────────────────
const ALIASES = {
    ياسين: "يس",
    الدهر: "الانسان",
    عمران: "ال عمران",
    "بني اسرائيل": "الاسراء",
    عم: "النبا",
    تبارك: "الملك",
};
// حدود الأجزاء (نفس JUZ_RANGES في quran.ts) لقراءة «جزء عم» و«جزء ٢٩»
const JUZ_BOUNDS = [
    ["الفاتحة", 1, "البقرة", 141], ["البقرة", 142, "البقرة", 252], ["البقرة", 253, "آل عمران", 92], ["آل عمران", 93, "النساء", 23],
    ["النساء", 24, "النساء", 147], ["النساء", 148, "المائدة", 81], ["المائدة", 82, "الأنعام", 110], ["الأنعام", 111, "الأعراف", 87],
    ["الأعراف", 88, "الأنفال", 40], ["الأنفال", 41, "التوبة", 92], ["التوبة", 93, "هود", 5], ["هود", 6, "يوسف", 52],
    ["يوسف", 53, "إبراهيم", 52], ["الحجر", 1, "النحل", 128], ["الإسراء", 1, "الكهف", 74], ["الكهف", 75, "طه", 135],
    ["الأنبياء", 1, "الحج", 78], ["المؤمنون", 1, "الفرقان", 20], ["الفرقان", 21, "النمل", 55], ["النمل", 56, "العنكبوت", 45],
    ["العنكبوت", 46, "الأحزاب", 30], ["الأحزاب", 31, "يس", 27], ["يس", 28, "الزمر", 31], ["الزمر", 32, "فصلت", 46],
    ["فصلت", 47, "الجاثية", 37], ["الأحقاف", 1, "الذاريات", 30], ["الذاريات", 31, "الحديد", 29], ["المجادلة", 1, "التحريم", 12],
    ["الملك", 1, "المرسلات", 50], ["النبأ", 1, "الناس", 6],
];
const JUZ_NAMES = { "عم": 30, "تبارك": 29, "قد سمع": 28 };
/** «جزء عم» / «الجزء ٢٩» / «جزء تبارك كامل» وحدها (بلا سور أو أرقام أخرى) → نطاق الجزء. */
function detectJuz(text) {
    const n = norm(text);
    const m = /(?:^|\s)(?:ال)?جزء?\s+(عم|تبارك|قد سمع|\d{1,2})(?=\s|$)/.exec(n);
    if (!m)
        return null;
    const rest = n.replace(m[0], " ").replace(/(^|\s)(كامل|كامله|معكوس|بالعكس|من|الي|الاخير)(?=\s|$)/g, " ").trim();
    if (rest)
        return null;
    const num = /^\d+$/.test(m[1]) ? Number(m[1]) : JUZ_NAMES[m[1]];
    const b = num ? JUZ_BOUNDS[num - 1] : undefined;
    if (!b)
        return null;
    return { surahStart: b[0], ayahStart: b[1], surahEnd: b[2], ayahEnd: b[3] };
}
function buildSurahIndex(list) {
    const byNorm = new Map();
    list.forEach((s, i) => byNorm.set(norm(s.name), i));
    for (const [alias, target] of Object.entries(ALIASES)) {
        const idx = byNorm.get(target);
        if (idx !== undefined && !byNorm.has(alias))
            byNorm.set(alias, idx);
    }
    return { list, byNorm };
}
const SKIP_WORDS = new Set([
    "سوره", "السوره", "من", "ايه", "ايات", "الايه", "الايات", "اية", "كامله", "كامل", "كاملة",
]);
const UNIT_WORDS = new Set(["صفحه", "صفحات", "وجه", "اوجه", "جزء", "جز", "الجز", "اجزاء", "اجزا", "حزب", "ربع", "ثمن"]);
const TO_WORDS = new Set(["الي", "حتي", "-"]);
/** تقسيم كلمة ملتصقة من عدة سور: "القارعةوالعاديات" → [القارعة، العاديات] */
function segmentSurahs(w, si) {
    if (w.length < 3)
        return null;
    const whole = si.byNorm.get(w);
    if (whole !== undefined)
        return [whole];
    for (let len = w.length - 1; len >= 3; len--) {
        const head = si.byNorm.get(w.slice(0, len));
        if (head === undefined)
            continue;
        let rest = w.slice(len).replace(/^و/, "");
        if (!rest)
            return [head];
        const tries = [rest, rest.replace(/^ال(?=ال)/, ""), "ال" + rest];
        for (const r of tries) {
            const tail = segmentSurahs(r, si);
            if (tail)
                return [head, ...tail];
        }
    }
    return null;
}
function tokenize(text, si) {
    const words = norm(text)
        .replace(/(\d)([^\d\s-])/g, "$1 $2")
        .replace(/([^\d\s-])(\d)/g, "$1 $2")
        .replace(/-/g, " - ")
        .replace(/[،,;:()[\]{}/\\.]+/g, " ")
        .split(/\s+/)
        .filter(Boolean);
    const items = [];
    for (let i = 0; i < words.length; i++) {
        const w = words[i];
        // "ال عمران" كلمتان
        if (w === "ال" && words[i + 1] === "عمران") {
            items.push({ t: "s", idx: si.byNorm.get("ال عمران") });
            i++;
            continue;
        }
        if (/^\d+$/.test(w)) {
            items.push({ t: "n", v: Number(w) });
            continue;
        }
        if (TO_WORDS.has(w)) {
            items.push({ t: "to" });
            continue;
        }
        if (w === "نهايه" || w === "اخر" || w === "آخر") {
            items.push({ t: "end" });
            continue;
        }
        if (SKIP_WORDS.has(w)) {
            items.push({ t: "skip" });
            continue;
        }
        if (UNIT_WORDS.has(w)) {
            items.push({ t: "unit", w });
            continue;
        }
        let idx = si.byNorm.get(w);
        if (idx === undefined && w.startsWith("و") && w.length > 2)
            idx = si.byNorm.get(w.slice(1));
        if (idx === undefined && w.startsWith("ال") === false) {
            // بدون "ال" التعريف: شمس → الشمس
            idx = si.byNorm.get("ال" + w);
        }
        if (idx !== undefined) {
            items.push({ t: "s", idx });
            continue;
        }
        const seg = segmentSurahs(w.startsWith("و") ? w.slice(1) : w, si) ?? segmentSurahs(w, si);
        if (seg && seg.length > 1) {
            for (const k of seg)
                items.push({ t: "s", idx: k });
            continue;
        }
        items.push({ t: "unknown", w });
    }
    return items;
}
function emptyField(raw = "") {
    return { raw, range: null, status: "empty", notes: [] };
}
function checkField(raw, notes, range = null) {
    return { raw, range, status: "check", notes };
}
function validateRange(r, si) {
    const notes = [];
    const check = (name, ayah) => {
        const idx = si.byNorm.get(norm(name));
        if (idx === undefined) {
            notes.push(`سورة غير معروفة: ${name}`);
            return;
        }
        const max = si.list[idx].ayahs;
        if (ayah < 1 || ayah > max)
            notes.push(`الآية ${ayah} خارج ${name} (عدد آياتها ${max})`);
    };
    check(r.surahStart, r.ayahStart);
    check(r.surahEnd, r.ayahEnd);
    return notes;
}
function parseRange(raw, surahs, index) {
    const si = index ?? buildSurahIndex(surahs);
    const trimmed = raw.replace(INVISIBLE, "").trim();
    if (!norm(trimmed))
        return emptyField(trimmed);
    const items = tokenize(trimmed, si);
    const S = items.filter((x) => x.t === "s");
    const N = items.filter((x) => x.t === "n");
    const hasTo = items.some((x) => x.t === "to");
    const hasEnd = items.some((x) => x.t === "end");
    const hasFrom = /(^|\s)من(\s|$)/.test(norm(trimmed));
    const units = items.filter((x) => x.t === "unit");
    const unknown = items.filter((x) => x.t === "unknown").map((x) => x.w);
    const name = (i) => si.list[i].name;
    const last = (i) => si.list[i].ayahs;
    const finish = (range, notes = []) => {
        const bound = validateRange(range, si);
        const all = [...notes, ...bound];
        if (unknown.length)
            all.push(`كلمات لم أفهمها: ${unknown.join("، ")}`);
        return { raw: trimmed, range, status: all.length ? "check" : "ok", notes: all };
    };
    const juz = detectJuz(trimmed);
    if (juz) {
        const bound = validateRange(juz, si);
        return { raw: trimmed, range: juz, status: bound.length ? "check" : "ok", notes: bound };
    }
    // «جزء عم من النبأ ١ إلى النازعات ٢٠»: كلمة «جزء» هنا وصف، والنطاق مكتوب بالسور والآيات
    const juzWordOnly = units.length > 0 && units.every((u) => u.w === "جز" || u.w === "جزء" || u.w === "الجز") && S.length > 0;
    if (units.length && !juzWordOnly) {
        return checkField(trimmed, ["مكتوبة بالصفحات/الأجزاء — أحتاج أرقام الآيات"]);
    }
    if (S.length === 0) {
        return checkField(trimmed, ["لم أتعرف على اسم السورة"]);
    }
    // ── سورة واحدة ──
    if (S.length === 1) {
        const i = S[0].idx;
        if (N.length === 0) {
            if (hasEnd)
                return checkField(trimmed, ["ذُكرت \"نهاية السورة\" بدون رقم بداية"]);
            return finish({ surahStart: name(i), ayahStart: 1, surahEnd: name(i), ayahEnd: last(i) });
        }
        if (N.length === 1) {
            const n = N[0].v;
            if (hasEnd || (hasFrom && hasTo)) {
                return finish({ surahStart: name(i), ayahStart: n, surahEnd: name(i), ayahEnd: last(i) }, ["اعتبرتها من الآية المذكورة إلى نهاية السورة"]);
            }
            return checkField(trimmed, ["ذُكرت آية واحدة فقط — حدّدي البداية والنهاية"], { surahStart: name(i), ayahStart: n, surahEnd: name(i), ayahEnd: n });
        }
        if (N.length === 2) {
            let [a, b] = [N[0].v, N[1].v];
            const notes = [];
            if (a > b) {
                [a, b] = [b, a];
                notes.push("كانت الآيتان بترتيب معكوس فعدّلتهما");
            }
            return finish({ surahStart: name(i), ayahStart: a, surahEnd: name(i), ayahEnd: b }, notes);
        }
        return checkField(trimmed, ["أرقام أكثر من المتوقع"]);
    }
    // ── عدة سور ──
    // نمط: سورة رقم سورة رقم  (الملك 1 - المرسلات 50)
    const seq = items.filter((x) => x.t === "s" || x.t === "n");
    if (S.length === 2 && N.length === 2 && seq.length === 4 && seq[0].t === "s" && seq[1].t === "n" && seq[2].t === "s" && seq[3].t === "n") {
        return finish({ surahStart: name(seq[0].idx), ayahStart: seq[1].v, surahEnd: name(seq[2].idx), ayahEnd: seq[3].v });
    }
    // رقم واحد مع عدة سور: "الفرقان من آية 84 إلى نهاية السورة الشعراء"
    if (N.length === 1) {
        const n = N[0].v;
        const lastS = S[S.length - 1].idx;
        const firstS = S[0].idx;
        if (n <= last(firstS) && !hasEnd) {
            return checkField(trimmed, ["رقم واحد مع أكثر من سورة — حدّدي المقصود"]);
        }
        if (n <= last(lastS)) {
            return checkField(trimmed, [
                `الآية ${n} أكبر من عدد آيات ${name(firstS)} (${last(firstS)}) فاعتبرتها من ${name(lastS)} إلى نهايتها`,
            ], { surahStart: name(lastS), ayahStart: n, surahEnd: name(lastS), ayahEnd: last(lastS) });
        }
        return checkField(trimmed, ["لم أستطع ربط الرقم بسورة"]);
    }
    // سور كاملة بلا أرقام
    if (N.length === 0) {
        const nums = S.map((x) => x.idx);
        const lo = Math.min(...nums);
        const hi = Math.max(...nums);
        const asc = nums.every((v, k) => k === 0 || v === nums[k - 1] + 1);
        const desc = nums.every((v, k) => k === 0 || v === nums[k - 1] - 1);
        const range = { surahStart: name(lo), ayahStart: 1, surahEnd: name(hi), ayahEnd: last(hi) };
        if (hasTo || asc || desc)
            return finish(range);
        return checkField(trimmed, [
            "السور غير متصلة — اعتبرتها من أول سورة إلى آخر سورة (كل ما بينهما)، تأكدي",
        ], range);
    }
    return checkField(trimmed, ["صيغة غير مألوفة"]);
}
// ─── تقسيم النص إلى بطاقات ───────────────────────────────────────
const PREFIX_RE = /^\s*\[([^\]]*)\]\s*([^:]*?)\s*:\s*(.*)$/;
function parseSentDate(stamp) {
    const m = /(\d{1,2})\s*\/\s*(\d{1,2})/.exec(clean(stamp));
    return m ? { d: Number(m[1]), m: Number(m[2]) } : { d: null, m: null };
}
function cleanSender(s) {
    const part = s.split("|")[0].replace(INVISIBLE, "").trim();
    return part || null;
}
function splitCards(text) {
    const cards = [];
    let cur = null;
    for (const line of text.split(/\r?\n/)) {
        const m = PREFIX_RE.exec(line);
        const isHeader = norm(line).includes("تحضير");
        if (m) {
            const sd = parseSentDate(m[1] ?? "");
            cur = { sender: cleanSender(m[2]), lines: [m[3] ?? ""], hasHeader: norm(m[3] ?? "").includes("تحضير"), sentDay: sd.d, sentMonth: sd.m };
            cards.push(cur);
            continue;
        }
        if (isHeader && (!cur || cur.hasHeader)) {
            cur = { sender: null, lines: [line], hasHeader: true, sentDay: null, sentMonth: null };
            cards.push(cur);
            continue;
        }
        if (isHeader && cur)
            cur.hasHeader = true;
        if (cur)
            cur.lines.push(line);
    }
    return cards.filter((c) => {
        const f = fold(clean(c.lines.join("\n")));
        return /النصاب/.test(f) || /اسم\s*الحبيب/.test(f);
    });
}
// ─── استخراج الحقول ──────────────────────────────────────────────
const LABELS = [
    { key: "name", re: /اسم\s*الحبيب\S*\s*:?/ },
    { key: "memorize", re: /النصاب\s*الجديد\s*:?/ },
    { key: "listen", re: /سماع[^:\n]*?(?:مرات|مره)\s*:?/ },
    { key: "near", re: /المراجعه\s*القريب\S*\s*:?/ },
    { key: "far", re: /المراجعه\s*البعيد\S*\s*:?/ },
];
function extractFields(body) {
    const c = clean(body).replace(/\*/g, " ");
    const f = fold(c); // نفس الطول — الفهارس متطابقة
    const hits = [];
    for (const { key, re } of LABELS) {
        const m = re.exec(f);
        if (m)
            hits.push({ key, start: m.index, end: m.index + m[0].length });
    }
    hits.sort((a, b) => a.start - b.start);
    const out = { name: "", memorize: "", listen: "", near: "", far: "" };
    hits.forEach((h, i) => {
        const next = hits[i + 1]?.start ?? c.length;
        out[h.key] = c.slice(h.end, next).replace(/\s+/g, " ").trim();
    });
    return out;
}
function parseListen(rawBody, value) {
    const v = value + " " + rawBody.split("\n").find((l) => /سماع/.test(fold(clean(l))))?.replace(/^.*?(?:مرات|مره)/, "");
    if (/✅|✔|☑/.test(v) || /(^|\s)نعم(\s|$)/.test(norm(value)))
        return true;
    if (/❌|✖|✗/.test(v) || /(^|\s)لا(\s|$)/.test(norm(value)))
        return false;
    return null;
}
function parseCards(text, surahs) {
    const si = buildSurahIndex(surahs);
    return splitCards(text).map((rc, index) => {
        const body = rc.lines.join("\n");
        const f = extractFields(body);
        const warnings = [];
        const name = f.name.replace(/[✅❌✔✖✨]/g, "").replace(/\s+/g, " ").trim();
        if (!name)
            warnings.push("لم أجد اسم الطالبة في البطاقة");
        // اسم جوال مكتوب بالإنجليزية أو رقم جوال لا يُقارن بالاسم العربي (كان يُظهر تحذيرًا خاطئًا)
        if (rc.sender && name && /[\u0621-\u064A]/.test(rc.sender)) {
            const a = norm(rc.sender).split(" ")[0];
            const b = norm(name).split(" ")[0];
            if (a && b && a !== b)
                warnings.push(`أُرسلت من جوال "${rc.sender}" لكن الاسم في البطاقة "${name}"`);
        }
        const memorize = parseRange(f.memorize, surahs, si);
        const near = parseRange(f.near, surahs, si);
        const far = parseRange(f.far, surahs, si);
        if (memorize.status === "empty")
            warnings.push("النصاب الجديد فارغ");
        return {
            index,
            sender: rc.sender,
            name,
            memorize,
            near,
            far,
            listened: parseListen(body, f.listen),
            sentDay: rc.sentDay,
            sentMonth: rc.sentMonth,
            warnings,
        };
    });
}
// ─── مطابقة الاسم مع طالبات الحلقة ───────────────────────────────
function matchStudent(cardName, students, senderName) {
    const tryName = (nm) => {
        const ct = norm(nm).split(" ").filter(Boolean);
        if (ct.length === 0)
            return [];
        const cands = students.filter((s) => {
            const st = norm(s.name).split(" ");
            return ct.every((t) => st.includes(t));
        });
        if (cands.length <= 1)
            return cands;
        const prefix = cands.filter((s) => {
            const st = norm(s.name).split(" ");
            return ct.every((t, i) => st[i] === t);
        });
        return prefix.length ? prefix : cands;
    };
    const found = tryName(cardName);
    if (found.length === 1)
        return { kind: "matched", student: found[0] };
    if (found.length > 1)
        return { kind: "ambiguous", candidates: found };
    return { kind: "none" };
}
// ─── رسائل معلمات الأطفال ─────────────────────────────────────────
// شكل حر: كل طفل إما مرقّم مع سطري «الحفظ :» و«المراجعة :»، أو سطر واحد «الاسم: مراجعة …».
// قد تذكر عدة سور («التكاثر والقارعة»، «الهمزة، العصر، التكاثر»، «التكاثر، القارعة، العاديات ١-٥»)،
// وقد يُكسر السطر قبل أرقام الآيات. كلمة «غائب/غائبة» بجانب الطفل تجعله غائبًا.
const CHILD_LEAD_WORDS = /^(?:(?:مراجعه|مراجعة|حفظ|تجميع|سوره|سورة|تسميع)\s+)+/;
/** نطاق من عدة سور (كل سورة كاملة أو بآيات) → نطاق واحد متصل في ترتيب المصحف. */
function parseChildRange(raw, surahs, index) {
    const si = index ?? buildSurahIndex(surahs);
    const trimmed = raw.replace(INVISIBLE, "").replace(/[.。]+\s*$/, "").trim();
    const body = norm(trimmed).replace(CHILD_LEAD_WORDS, "").trim();
    if (!body)
        return emptyField(trimmed);
    const direct = parseRange(body, surahs, si);
    if (direct.status !== "check")
        return { ...direct, raw: trimmed };
    // سور متعددة، لكل سورة آياتها (إن ذُكرت)
    const items = tokenize(body, si).filter((x) => x.t !== "skip" && x.t !== "to");
    const unknown = items.filter((x) => x.t === "unknown").map((x) => x.w).filter((w) => w !== "و");
    const segs = [];
    const notes = [];
    for (let k = 0; k < items.length; k++) {
        const it = items[k];
        if (it.t !== "s")
            continue;
        const nums = [];
        while (items[k + 1]?.t === "n")
            nums.push(items[++k].v);
        const max = si.list[it.idx].ayahs;
        if (nums.length === 0)
            segs.push({ idx: it.idx, a: 1, b: max });
        else if (nums.length === 2)
            segs.push({ idx: it.idx, a: Math.min(nums[0], nums[1]), b: Math.max(nums[0], nums[1]) });
        else {
            notes.push(`${si.list[it.idx].name}: رقم آية غير مكتمل`);
            segs.push({ idx: it.idx, a: nums[0] ?? 1, b: nums[0] ?? max });
        }
    }
    if (segs.length === 0)
        return direct;
    // ترتيب المصحف وفحص الاتصال
    const sorted = [...segs].sort((x, y) => x.idx - y.idx || x.a - y.a);
    for (let k = 1; k < sorted.length; k++) {
        const p = sorted[k - 1], c = sorted[k];
        const pEndsSurah = p.b >= si.list[p.idx].ayahs;
        const contiguous = (c.idx === p.idx && c.a <= p.b + 1) || (c.idx === p.idx + 1 && pEndsSurah && c.a === 1);
        if (!contiguous) {
            notes.push("السور غير متصلة — اعتبرتها من أول موضع إلى آخر موضع، تأكدي");
            break;
        }
    }
    const first = sorted[0], last = sorted[sorted.length - 1];
    const range = { surahStart: si.list[first.idx].name, ayahStart: first.a, surahEnd: si.list[last.idx].name, ayahEnd: last.b };
    const bound = validateRange(range, si);
    const all = [...notes, ...bound, ...(unknown.length ? [`كلمات لم أفهمها: ${unknown.join("، ")}`] : [])];
    return { raw: trimmed, range, status: all.length ? "check" : "ok", notes: all };
}
const CHILD_SKIP_LINE = /(حلقه|المعلمه|المشرفه|نصاب|يوم\s+(الاحد|الاثنين|الثلاثا|الاربعا|الخميس)|^[\s─━ـ\-=_~•·.]*$)/;
const CHILD_MEM_LABEL = /^(?:ال)?حفظ\s*:\s*/;
const CHILD_REV_LABEL = /^(?:ال)?مراجع\S*\s*:\s*/;
const ABSENT_RE = /(غائب|غايب|غياب|لم\s*(يحضر|تحضر)|متغيب)/;
/** تحليل رسالة معلمة أطفال كاملة إلى بطاقة لكل طفل. */
function parseChildrenMessage(text, surahs) {
    const si = buildSurahIndex(surahs);
    const entries = [];
    let cur = null;
    const stripName = (s) => clean(s).replace(/[^ء-ي\s]/g, " ").replace(/\s+/g, " ").trim();
    for (const rawLine of text.split(/\r?\n/)) {
        const line = clean(rawLine).replace(/^\s*\[[^\]]*\][^:]*:\s*/, "").trim(); // بادئة نسخ واتساب [التاريخ] المرسِل:
        const f = fold(line).replace(/ء/g, "");
        if (!line)
            continue;
        if (CHILD_SKIP_LINE.test(f) && !CHILD_MEM_LABEL.test(f) && !CHILD_REV_LABEL.test(f))
            continue;
        if (CHILD_MEM_LABEL.test(f) && cur) {
            cur.mem = line.replace(/^[^:]*:\s*/, "");
            cur.last = "mem";
            if (ABSENT_RE.test(f))
                cur.absent = true;
            continue;
        }
        if (CHILD_REV_LABEL.test(f) && cur) {
            cur.rev = line.replace(/^[^:]*:\s*/, "");
            cur.last = "rev";
            if (ABSENT_RE.test(f))
                cur.absent = true;
            continue;
        }
        // «١- الاسم» (طفل جديد مرقّم)
        const numbered = /^\s*\d{1,3}\s*[-.)]?\s*(.+)$/.exec(line);
        if (numbered && !/:/.test(numbered[1]) && stripName(numbered[1]).length > 1) {
            cur = { name: stripName(numbered[1]), mem: "", rev: "", absent: ABSENT_RE.test(f), last: null, loose: "" };
            entries.push(cur);
            continue;
        }
        // «الاسم: مراجعة …» (سطر واحد)
        const colon = /^([^:]{1,30}):\s*(.*)$/.exec(line);
        if (colon && stripName(colon[1]).split(" ").length <= 3 && stripName(colon[1]).length > 1) {
            const content = colon[2];
            const cf = fold(content);
            cur = { name: stripName(colon[1].replace(/^\s*\d{1,3}\s*[-.)]?\s*/, "")), mem: "", rev: "", absent: ABSENT_RE.test(cf), last: null, loose: "" };
            const revAt = cf.search(/مراجع/);
            const memAt = cf.search(/(^|\s)حفظ/);
            if (revAt >= 0 && memAt >= 0) {
                if (memAt < revAt) {
                    cur.mem = content.slice(memAt, revAt);
                    cur.rev = content.slice(revAt);
                    cur.last = "rev";
                }
                else {
                    cur.rev = content.slice(revAt, memAt);
                    cur.mem = content.slice(memAt);
                    cur.last = "mem";
                }
            }
            else if (revAt >= 0) {
                cur.rev = content;
                cur.last = "rev";
            }
            else if (memAt >= 0) {
                cur.mem = content;
                cur.last = "mem";
            }
            else {
                cur.loose = content;
                cur.last = null;
            }
            entries.push(cur);
            continue;
        }
        // سطر مكسور يكمل الحقل السابق («١-٥.»)، أو «غائب» وحدها
        if (cur) {
            if (ABSENT_RE.test(f)) {
                cur.absent = true;
                continue;
            }
            if (cur.last === "mem")
                cur.mem += " " + line;
            else if (cur.last === "rev")
                cur.rev += " " + line;
            else
                cur.loose += " " + line;
        }
    }
    return entries.map((e, index) => {
        const warnings = [];
        let memRaw = e.mem;
        if (!memRaw && !e.rev && e.loose) {
            memRaw = e.loose;
            warnings.push("لم يُذكر «حفظ» أو «مراجعة» — اعتبرته حفظًا، تأكدي");
        }
        const memorize = e.absent ? emptyField(memRaw) : parseChildRange(memRaw, surahs, si);
        const review = e.absent ? emptyField(e.rev) : parseChildRange(e.rev, surahs, si);
        if (!e.name)
            warnings.push("لم أجد اسم الطفل");
        return {
            index, sender: null, name: e.name,
            memorize, review, near: emptyField(), far: emptyField(),
            absent: e.absent, listened: null, sentDay: null, sentMonth: null, warnings,
        };
    });
}


// ═════════ بطاقات حلقات وثاق ═════════
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}\u{2190}-\u{21FF}]/gu;
function cleanLine(l) { return clean(String(l).replace(/[✅✔☑✓]/g, ' نعم ').replace(/[❌✖✗⛔]/g, ' لا ').replace(EMOJI_RE, ' ')).replace(/[|｜]/g, ' ').replace(/\s+/g, ' ').trim(); }
const WEEKDAYS_N = ['الاحد', 'الاثنين', 'الثلاثا', 'الاربعا', 'الخميس', 'الجمعه', 'السبت'];

/** المفتاح الموحَّد لبند البطاقة من عنوانه */
function itemKey(label) {
  const f = norm(label);
  if (/اسم\s*السور/.test(f)) return 'surah';
  if (/^(ال)?اسم(\s|$)/.test(f) || /^اسم\s*(الطالب|الحبيب)/.test(f)) return 'name';
  if (/^(ال)?يوم(\s|$)/.test(f) || /^التاريخ/.test(f)) return 'day';
  if (/مرات\s*السماع|عدد\s*مرات/.test(f)) return 'listen_count';
  if (/سماع/.test(f)) return 'listen';
  if (/تفسير/.test(f)) return 'tafsir';
  if (/تسميع/.test(f)) return 'recite';
  if (/مراجع\S*\s*القديم/.test(f)) return 'review_old';
  if (/مراجع/.test(f)) return 'review';
  if (/حفظ/.test(f)) return 'memo';
  return 'x:' + f;
}

/** تقسيم النص الملصوق إلى بطاقات (رسالة لكل بطاقة) */
function splitWithaqCards(text) {
  const PREFIX = /^\s*\[([^\]]*)\]\s*([^:]*?)\s*:\s*(.*)$/;
  const cards = []; let cur = null;
  // عنوان بند الاسم في السطر (إن كان السطر «الاسم : ...»)، لتمييز بداية بطاقة جديدة
  const nameLabel = (l) => { const t = cleanLine(l); const k = t.indexOf(':'); if (k <= 0) return null; const lab = t.slice(0, k).trim(); return itemKey(lab) === 'name' ? norm(lab) : null; };
  const hasItems = (c) => c.lines.some((l) => { const t = cleanLine(l); const k = t.indexOf(':'); return k > 0 && !itemKey(t.slice(0, k)).startsWith('x:') && !/بطاقه\s*الحضور/.test(norm(t)); });
  for (const line of String(text).split(/\r?\n/)) {
    const m = PREFIX.exec(line);
    if (m) { cur = { sender: (m[2] || '').split('|')[0].trim() || null, lines: [m[3] || ''], nameLabel: nameLabel(m[3] || '') }; cards.push(cur); continue; }
    const isHead = /بطاقه\s*الحضور/.test(norm(cleanLine(line)));
    if (isHead && (!cur || hasItems(cur))) { cur = { sender: null, lines: [line] }; cards.push(cur); continue; }
    // بطاقات متتالية بلا عنوان ولا بادئة: تكرُّر بند «الاسم» نفسه يعني بطاقة جديدة، وإلا قُرئت كلها بطاقةً واحدة
    const nl = nameLabel(line);
    if (nl && cur && cur.nameLabel === nl) cur = null;
    if (!cur) { cur = { sender: null, lines: [] }; cards.push(cur); }
    if (nl && !cur.nameLabel) cur.nameLabel = nl;
    cur.lines.push(line);
  }
  return cards.map((c) => readCard(c)).filter((c) => c.items.length);
}

const NEGATIVE = /(^|\s)(لا|لم|ما|كلا|ابدا|صفر|0)(\s|$)/;
function isNegative(v) { return /[❌✖✗⛔]/.test(v) || NEGATIVE.test(norm(v)); }

function readCard(rc) {
  const items = []; let name = ''; let day = null; let excused = false;
  for (const raw of rc.lines) {
    const line = cleanLine(raw);
    if (!line) continue;
    const n = norm(line);
    if (/(معتذر|مستاذن|استئذان|استيذان|اعتذار|اعتذر|عذر)/.test(n)) excused = true;
    if (!day) { const wd = WEEKDAYS_N.findIndex((d) => n.includes(d)); if (wd >= 0) day = wd; }
    const ci = line.indexOf(':');
    if (ci < 0) continue;
    const label = line.slice(0, ci).trim(); const value = line.slice(ci + 1).trim();
    if (!label || /بطاقه\s*الحضور/.test(norm(label)) || /معاد\s*توجيه/.test(norm(label))) continue;
    const key = itemKey(label);
    if (key === 'name') { name = value.replace(/\s+/g, ' ').trim(); continue; }
    if (key === 'day') { const wd = WEEKDAYS_N.findIndex((d) => norm(value).includes(d)); if (wd >= 0) day = wd; continue; }
    if (key === 'x:') continue;
    items.push({ key, label, value });
  }
  return { sender: rc.sender, name, day, items, excused };
}

const WORD_NUM = { 'وجه': 1, 'وجهين': 2, 'وجهان': 2, 'صفحه': 1, 'صفحتين': 2, 'صفحتان': 2, 'نصف': 0.5, 'ربع': 0.25, 'ثمن': 0.125, 'واحد': 1, 'اثنين': 2, 'ثلاث': 3, 'ثلاثه': 3, 'اربع': 4, 'اربعه': 4, 'خمس': 5, 'خمسه': 5, 'ست': 6, 'سته': 6, 'سبع': 7, 'عشر': 10 };
/** مقدار الحفظ أو المراجعة → عدد الأوجه (الصفحات)، ونطاق بالسورة والآية إن كُتب */
function readAmount(value, label, surahText, surahs) {
  const v = norm(value);
  if (!v || isNegative(value)) return { pages: 0, range: null };
  const src = surahText ? `${surahText} ${value}` : value;
  try {
    const pr = parseRange(src, surahs);
    if (pr.range && (pr.status === 'ok' || pr.range.surahStart)) return { pages: null, range: pr.range };
  } catch (e) { /* نصٌّ بلا سورة */ }
  const num = (() => { const m = /(\d+(?:[.,]\d+)?)/.exec(v); return m ? parseFloat(m[1].replace(',', '.')) : null; })();
  const has = (re) => re.test(v);
  let qty = num;
  if (qty == null) { for (const [w, n] of Object.entries(WORD_NUM)) if (new RegExp(`(^|\\s)${w}(\\s|$)`).test(v)) { qty = (qty || 0) + n; } }
  if (qty == null) return { pages: null, range: null };
  if (has(/جز/)) return { pages: qty * 20, range: null };
  if (has(/حزب|احزاب/)) return { pages: (qty < 1 ? qty : qty) * 10, range: null };
  if (has(/(^|\s)(ربع|ثمن)(\s|$)/) && num == null) return { pages: qty * 10, range: null }; // ربع = ربع حزب
  if (has(/سطر|اسطر/)) return { pages: qty / 15, range: null };
  if (has(/ايه|ايات|اية/)) return { pages: qty / 10.3, range: null };
  return { pages: qty, range: null }; // أوجه أو صفحات
}

/** تقييم البطاقة على قالب المسار: كل بند فارغ أو منفي أو ناقص = تقصير */
function evaluateCard(card, template) {
  const tmpl = (template || []).map((l) => ({ label: l, key: itemKey(l) })).filter((t) => t.key !== 'name' && t.key !== 'day');
  const keys = tmpl.length ? tmpl : card.items.map((i) => ({ label: i.label, key: i.key }));
  const rows = keys.map((t) => {
    const it = card.items.find((i) => i.key === t.key);
    const value = it ? it.value : '';
    const ok = !!norm(value) && !isNegative(value);
    return { key: t.key, label: t.label, value, ok, present: !!it };
  });
  // بنود زائدة في البطاقة ليست في القالب تُعرض ولا تُحسب
  const extra = card.items.filter((i) => !keys.some((t) => t.key === i.key)).map((i) => ({ key: i.key, label: i.label, value: i.value, ok: true, present: true, extra: true }));
  return { rows: rows.concat(extra), missing: rows.filter((r) => !r.ok).map((r) => r.label) };
}

return { norm, fold, clean, parseRange, matchStudent, splitWithaqCards, readAmount, evaluateCard, itemKey, isNegative };

})();
